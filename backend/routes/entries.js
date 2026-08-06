const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const getEntryModel = require('../models/tenant/Entry');
const getCustomerModel = require('../models/tenant/Customer');
const { requireAuth } = require('../middleware/auth');
const { extractSingleBill, extractStatement } = require('../utils/billExtraction');
const { logActivity } = require('../utils/activityLog');

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

const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WEBP images or PDF files are allowed'));
  },
});

// List entries for a customer, sorted by date (ledger order), with running balance
router.get('/customer/:customerId', async (req, res) => {
  try {
    const Customer = getCustomerModel(req.tenantConn);
    const Entry = getEntryModel(req.tenantConn);

    const customer = await Customer.findById(req.params.customerId).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const entries = await Entry.find({ customer: req.params.customerId })
      .sort({ date: 1, createdAt: 1 })
      .lean();

    const openingBalance = customer.openingBalance || 0;
    let balance = openingBalance;
    let totalBills = 0;
    let totalPayments = 0;
    const withBalance = entries.map((e) => {
      if (e.type === 'bill') {
        balance += e.amount;
        totalBills += e.amount;
      } else {
        balance -= e.amount;
        totalPayments += e.amount;
      }
      return { ...e, runningBalance: balance };
    });

    res.json({ entries: withBalance, openingBalance, totalBills, totalPayments, balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function deleteUploadedFiles(files) {
  (files || []).forEach((f) => {
    if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
  });
}

// Create entry (bill or payment) with optional document uploads
router.post('/', upload.array('documents', 5), async (req, res) => {
  try {
    const Entry = getEntryModel(req.tenantConn);
    const { customer, date, type, description, billNumber, amount, paymentMode } = req.body;
    if (!customer || !date || !type || !amount || !(Number(amount) > 0)) {
      deleteUploadedFiles(req.files);
      return res.status(400).json({ error: 'customer, date, type and a positive amount are required' });
    }
    if (!['bill', 'payment'].includes(type)) {
      deleteUploadedFiles(req.files);
      return res.status(400).json({ error: 'type must be bill or payment' });
    }

    const documents = (req.files || []).map((f) => ({
      filename: f.filename,
      originalName: f.originalname,
      path: `/uploads/${f.filename}`,
      mimeType: f.mimetype,
    }));

    const entry = await Entry.create({
      customer,
      date: new Date(date),
      type,
      description,
      billNumber: type === 'bill' ? billNumber : '',
      amount: Number(amount),
      paymentMode: type === 'payment' ? paymentMode : '',
      documents,
    });

    await logActivity(req, { action: 'create', entityType: 'Entry', entityId: entry._id, summary: `Created ${entry.type} entry of ₹${entry.amount} for a customer` });
    res.status(201).json(entry);
  } catch (err) {
    deleteUploadedFiles(req.files);
    res.status(500).json({ error: err.message });
  }
});

// AI: read a single bill photo/PDF and extract bill number, amount, description
router.post('/extract-bill', upload.single('bill'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'A bill photo or PDF is required' });
  try {
    const extracted = await extractSingleBill(req.file.path, req.file.mimetype);
    res.json(extracted);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not read the bill' });
  } finally {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
});

// AI: read a full account statement (photo/PDF) and extract every transaction
router.post('/parse-statement', upload.single('statement'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'A statement photo or PDF is required' });
  try {
    const transactions = await extractStatement(req.file.path, req.file.mimetype);
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not read the statement' });
  } finally {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
});

// Create many entries at once for one customer (used after reviewing a parsed statement)
router.post('/bulk', async (req, res) => {
  try {
    const Entry = getEntryModel(req.tenantConn);
    const { customer, entries } = req.body;
    if (!customer || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'customer and a non-empty entries array are required' });
    }
    for (const e of entries) {
      if (!e.date || !e.type || !['bill', 'payment'].includes(e.type) || !(Number(e.amount) > 0)) {
        return res.status(400).json({ error: 'Each entry needs a date, a valid type, and a positive amount' });
      }
    }

    const docs = entries.map((e) => ({
      customer,
      date: new Date(e.date),
      type: e.type,
      description: e.description || '',
      billNumber: e.type === 'bill' ? (e.billNumber || '') : '',
      amount: Number(e.amount),
      paymentMode: e.type === 'payment' ? (e.paymentMode || '') : '',
    }));

    const created = await Entry.insertMany(docs);
    await logActivity(req, { action: 'create', entityType: 'Entry', entityId: '', summary: `Bulk-created ${created.length} entries from a parsed statement` });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update entry
router.put('/:id', upload.array('documents', 5), async (req, res) => {
  try {
    const Entry = getEntryModel(req.tenantConn);
    const { date, type, description, billNumber, amount, paymentMode, keepDocuments } = req.body;

    if (amount !== undefined && !(Number(amount) > 0)) {
      deleteUploadedFiles(req.files);
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const entry = await Entry.findById(req.params.id);
    if (!entry) {
      deleteUploadedFiles(req.files);
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (date) entry.date = new Date(date);
    if (type) entry.type = type;
    if (description !== undefined) entry.description = description;
    if (billNumber !== undefined) entry.billNumber = entry.type === 'bill' ? billNumber : '';
    if (amount !== undefined) entry.amount = Number(amount);
    entry.paymentMode = entry.type === 'payment' ? (paymentMode || '') : '';
    if (entry.type !== 'bill') entry.billNumber = '';

    // keepDocuments: JSON array of document filenames to retain from existing set
    if (keepDocuments !== undefined) {
      let keep;
      try {
        keep = JSON.parse(keepDocuments);
      } catch {
        deleteUploadedFiles(req.files);
        return res.status(400).json({ error: 'keepDocuments must be valid JSON' });
      }
      const removed = entry.documents.filter((d) => !keep.includes(d.filename));
      removed.forEach((d) => {
        const filePath = path.join(uploadDir, d.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
      entry.documents = entry.documents.filter((d) => keep.includes(d.filename));
    }

    const newDocs = (req.files || []).map((f) => ({
      filename: f.filename,
      originalName: f.originalname,
      path: `/uploads/${f.filename}`,
      mimeType: f.mimetype,
    }));
    entry.documents.push(...newDocs);

    await entry.save();
    await logActivity(req, { action: 'update', entityType: 'Entry', entityId: entry._id, summary: `Updated ${entry.type} entry of ₹${entry.amount}` });
    res.json(entry);
  } catch (err) {
    deleteUploadedFiles(req.files);
    res.status(500).json({ error: err.message });
  }
});

// Delete entry
router.delete('/:id', async (req, res) => {
  try {
    const Entry = getEntryModel(req.tenantConn);
    const entry = await Entry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    entry.documents.forEach((d) => {
      const filePath = path.join(uploadDir, d.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
    await logActivity(req, { action: 'delete', entityType: 'Entry', entityId: entry._id, summary: `Deleted ${entry.type} entry of ₹${entry.amount}` });
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
