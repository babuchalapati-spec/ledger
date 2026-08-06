const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const getAttendanceModel = require('../models/tenant/Attendance');
const getSettingsModel = require('../models/tenant/Settings');
const PlatformUser = require('../models/PlatformUser');
const { requireAuth, requireOwner } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLog');
const { todayIST } = require('../utils/istTime');
const { generatePayslipPdf } = require('../utils/generatePayslipPdf');

function resolveMonth(queryMonth) {
  return /^\d{4}-\d{2}$/.test(queryMonth) ? queryMonth : todayIST().slice(0, 7);
}

function workingDaysFor(month) {
  const [year, monthNum] = month.split('-').map(Number);
  return new Date(year, monthNum, 0).getDate();
}

function calcSalary({ monthlySalary, daysPresent, workingDays }) {
  return Math.round((daysPresent / workingDays) * (monthlySalary || 0));
}

router.use(requireAuth);

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, or WEBP photos are allowed'));
  },
});

// Mark today's attendance for the current user (one per day, photo required)
router.post('/check-in', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'A photo is required to mark attendance' });
    const Attendance = getAttendanceModel(req.tenantConn);
    const { lat, lng } = req.body;

    const attendance = await Attendance.create({
      userEmail: req.user.email,
      date: todayIST(),
      photo: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: `/uploads/${req.file.filename}`,
        mimeType: req.file.mimetype,
      },
      lat: lat !== undefined && lat !== '' ? Number(lat) : undefined,
      lng: lng !== undefined && lng !== '' ? Number(lng) : undefined,
    });

    await logActivity(req, { action: 'create', entityType: 'Attendance', entityId: attendance._id, summary: 'Marked attendance for today' });
    res.status(201).json(attendance);
  } catch (err) {
    if (fs.existsSync(req.file?.path)) fs.unlinkSync(req.file.path);
    if (err.code === 11000) return res.status(409).json({ error: 'Already marked attendance today' });
    res.status(500).json({ error: err.message });
  }
});

// Whether the current user has already checked in today
router.get('/today', async (req, res) => {
  try {
    const Attendance = getAttendanceModel(req.tenantConn);
    const record = await Attendance.findOne({ userEmail: req.user.email, date: todayIST() }).lean();
    res.json({ checkedIn: !!record, record: record || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Role-aware: owner sees everyone's records (optionally filtered); staff only ever see their own.
router.get('/', async (req, res) => {
  try {
    const Attendance = getAttendanceModel(req.tenantConn);
    const { userEmail, from, to } = req.query;

    const filter = {};
    if (req.user.role === 'owner') {
      if (userEmail) filter.userEmail = userEmail;
    } else {
      filter.userEmail = req.user.email;
    }
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const records = await Attendance.find(filter).sort({ date: -1, checkedInAt: -1 }).limit(limit).lean();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Salary for each staff login for a given month, prorated by attendance. Owner-only.
router.get('/salary', requireOwner, async (req, res) => {
  try {
    const month = resolveMonth(req.query.month);
    const workingDays = workingDaysFor(month);

    const users = await PlatformUser.find({ account: req.user.accountId }).select('email role monthlySalary').lean();

    const Attendance = getAttendanceModel(req.tenantConn);
    const records = await Attendance.find({ date: { $gte: `${month}-01`, $lte: `${month}-31` } }).select('userEmail').lean();
    const daysPresentByEmail = {};
    records.forEach((r) => { daysPresentByEmail[r.userEmail] = (daysPresentByEmail[r.userEmail] || 0) + 1; });

    const report = users.map((u) => {
      const daysPresent = daysPresentByEmail[u.email] || 0;
      const monthlySalary = u.monthlySalary || 0;
      return {
        email: u.email,
        role: u.role,
        monthlySalary,
        workingDays,
        daysPresent,
        calculatedSalary: calcSalary({ monthlySalary, daysPresent, workingDays }),
      };
    });

    res.json({ month, workingDays, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Printable payslip PDF for one staff login for a given month. Owner-only.
router.get('/payslip/:email/pdf', requireOwner, async (req, res) => {
  try {
    const user = await PlatformUser.findOne({ account: req.user.accountId, email: req.params.email }).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const month = resolveMonth(req.query.month);
    const workingDays = workingDaysFor(month);

    const Attendance = getAttendanceModel(req.tenantConn);
    const records = await Attendance.find({ userEmail: user.email, date: { $gte: `${month}-01`, $lte: `${month}-31` } })
      .sort({ date: 1 }).select('date').lean();
    const presentDates = records.map((r) => r.date);
    const daysPresent = presentDates.length;
    const monthlySalary = user.monthlySalary || 0;

    const Settings = getSettingsModel(req.tenantConn);
    const business = await Settings.findOne().lean();

    const download = req.query.download === '1';
    const filename = `payslip-${user.email}-${month}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${filename}"`);

    generatePayslipPdf({
      business,
      month,
      summary: { email: user.email, role: user.role, monthlySalary, workingDays, daysPresent, calculatedSalary: calcSalary({ monthlySalary, daysPresent, workingDays }) },
      presentDates,
    }, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
