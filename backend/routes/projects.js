const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const getProjectModel = require('../models/tenant/Project');
const getProjectExpenseModel = require('../models/tenant/ProjectExpense');
const { requireAuth } = require('../middleware/auth');
const { computeSettlement } = require('../utils/settlement');
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

function deleteUploadedFiles(files) {
  (files || []).forEach((f) => {
    if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
  });
}

// List all projects with a quick spend total
router.get('/', async (req, res) => {
  try {
    const Project = getProjectModel(req.tenantConn);
    const ProjectExpense = getProjectExpenseModel(req.tenantConn);
    const projects = await Project.find().sort({ createdAt: -1 }).lean();

    const withTotals = await Promise.all(projects.map(async (p) => {
      const expenses = await ProjectExpense.find({ project: p._id }).lean();
      const total = expenses.reduce((s, e) => s + e.amount, 0);
      return { ...p, totalSpent: total, expenseCount: expenses.length };
    }));

    res.json(withTotals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a project: name + the people splitting it
router.post('/', async (req, res) => {
  try {
    const Project = getProjectModel(req.tenantConn);
    const { name, people } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Project name is required' });
    const cleanPeople = (people || []).map((p) => (p || '').trim()).filter(Boolean);
    if (cleanPeople.length < 2) return res.status(400).json({ error: 'Add at least 2 people to split expenses' });

    const project = await Project.create({ name, people: cleanPeople });
    await logActivity(req, { action: 'create', entityType: 'Project', entityId: project._id, summary: `Created project "${project.name}"` });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Project detail: people, expenses, and the computed settlement
router.get('/:id', async (req, res) => {
  try {
    const Project = getProjectModel(req.tenantConn);
    const ProjectExpense = getProjectExpenseModel(req.tenantConn);
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const expenses = await ProjectExpense.find({ project: project._id }).sort({ date: 1, createdAt: 1 }).lean();
    const settlement = computeSettlement(project.people, expenses);

    res.json({ project, expenses, settlement });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit a project's name or people list
router.put('/:id', async (req, res) => {
  try {
    const Project = getProjectModel(req.tenantConn);
    const { name, people } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'Project name is required' });
      project.name = name;
    }
    if (people !== undefined) {
      const cleanPeople = people.map((p) => (p || '').trim()).filter(Boolean);
      if (cleanPeople.length < 2) return res.status(400).json({ error: 'Add at least 2 people to split expenses' });
      project.people = cleanPeople;
    }
    await project.save();
    await logActivity(req, { action: 'update', entityType: 'Project', entityId: project._id, summary: `Updated project "${project.name}"` });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a project and all its expenses (and attached receipts)
router.delete('/:id', async (req, res) => {
  try {
    const Project = getProjectModel(req.tenantConn);
    const ProjectExpense = getProjectExpenseModel(req.tenantConn);
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const expenses = await ProjectExpense.find({ project: project._id });
    expenses.forEach((e) => {
      e.receipts.forEach((r) => {
        const filePath = path.join(uploadDir, r.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    });
    await ProjectExpense.deleteMany({ project: project._id });

    await logActivity(req, { action: 'delete', entityType: 'Project', entityId: project._id, summary: `Deleted project "${project.name}" and its expenses` });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add an expense (who spent how much, with an optional receipt)
router.post('/:id/expenses', upload.array('receipts', 5), async (req, res) => {
  try {
    const Project = getProjectModel(req.tenantConn);
    const ProjectExpense = getProjectExpenseModel(req.tenantConn);
    const project = await Project.findById(req.params.id);
    if (!project) {
      deleteUploadedFiles(req.files);
      return res.status(404).json({ error: 'Project not found' });
    }

    const { person, date, description, amount } = req.body;
    if (!person || !project.people.includes(person)) {
      deleteUploadedFiles(req.files);
      return res.status(400).json({ error: 'person must be one of the project\'s people' });
    }
    if (!(Number(amount) > 0)) {
      deleteUploadedFiles(req.files);
      return res.status(400).json({ error: 'A positive amount is required' });
    }

    const receipts = (req.files || []).map((f) => ({
      filename: f.filename,
      originalName: f.originalname,
      path: `/uploads/${f.filename}`,
      mimeType: f.mimetype,
    }));

    const expense = await ProjectExpense.create({
      project: project._id,
      person,
      date: date ? new Date(date) : new Date(),
      description,
      amount: Number(amount),
      receipts,
    });

    await logActivity(req, { action: 'create', entityType: 'ProjectExpense', entityId: expense._id, summary: `Added expense of ₹${expense.amount} for ${expense.person} on project "${project.name}"` });
    res.status(201).json(expense);
  } catch (err) {
    deleteUploadedFiles(req.files);
    res.status(500).json({ error: err.message });
  }
});

// Delete a single expense
router.delete('/:id/expenses/:expenseId', async (req, res) => {
  try {
    const ProjectExpense = getProjectExpenseModel(req.tenantConn);
    const expense = await ProjectExpense.findOneAndDelete({ _id: req.params.expenseId, project: req.params.id });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    expense.receipts.forEach((r) => {
      const filePath = path.join(uploadDir, r.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    await logActivity(req, { action: 'delete', entityType: 'ProjectExpense', entityId: expense._id, summary: `Deleted expense of ₹${expense.amount} for ${expense.person}` });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
