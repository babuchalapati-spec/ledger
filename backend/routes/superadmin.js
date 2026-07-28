const express = require('express');
const router = express.Router();
const SuperAdmin = require('../models/SuperAdmin');
const Account = require('../models/Account');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signSuperAdminToken } = require('../utils/jwt');
const { requireSuperAdmin } = require('../middleware/auth');

const normalizeEmail = (s) => (s || '').trim().toLowerCase();

// Bootstrap: only works while no super admin exists yet
router.post('/register', async (req, res) => {
  try {
    const count = await SuperAdmin.countDocuments();
    if (count > 0) return res.status(403).json({ error: 'A super admin already exists' });

    const { email, password } = req.body;
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !password) return res.status(400).json({ error: 'Email and password are required' });

    const { hash, salt } = hashPassword(password);
    const admin = await SuperAdmin.create({ email: cleanEmail, passwordHash: hash, passwordSalt: salt });
    const token = signSuperAdminToken({ superAdminId: admin._id });
    res.status(201).json({ token, email: admin.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/exists', async (req, res) => {
  try {
    const count = await SuperAdmin.countDocuments();
    res.json({ exists: count > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const cleanEmail = normalizeEmail(req.body.email);
    const { password } = req.body;
    const admin = await SuperAdmin.findOne({ email: cleanEmail });
    if (!admin || !verifyPassword(password || '', admin.passwordHash, admin.passwordSalt)) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }
    const token = signSuperAdminToken({ superAdminId: admin._id });
    res.json({ token, email: admin.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/accounts', requireSuperAdmin, async (req, res) => {
  try {
    const accounts = await Account.find().sort({ createdAt: -1 });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/accounts/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { status, modules } = req.body;
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    if (status !== undefined) account.status = status;
    if (modules !== undefined) {
      if (modules.groceryInventory !== undefined) account.modules.groceryInventory = !!modules.groceryInventory;
      if (modules.deliveries !== undefined) account.modules.deliveries = !!modules.deliveries;
    }
    await account.save();
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
