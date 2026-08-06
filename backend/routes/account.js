const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const PlatformUser = require('../models/PlatformUser');
const LoginSession = require('../models/LoginSession');
const { requireAuth, requireOwner } = require('../middleware/auth');
const { hashPassword } = require('../utils/password');

const normalizeAnswer = (s) => (s || '').trim().toLowerCase();
const normalizeEmail = (s) => (s || '').trim().toLowerCase();

// Current account's profile + module permissions, and the users who can log into it
router.get('/me', requireAuth, async (req, res) => {
  try {
    const account = await Account.findById(req.user.accountId).lean();
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json({
      businessName: account.businessName,
      status: account.status,
      modules: account.modules,
      role: req.user.role,
      email: req.user.email,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login/logout history for this account's staff, owner-only
router.get('/sessions', requireAuth, requireOwner, async (req, res) => {
  try {
    const sessions = await LoginSession.find({ account: req.user.accountId })
      .sort({ loginAt: -1 })
      .limit(200)
      .lean();
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', requireAuth, async (req, res) => {
  try {
    const users = await PlatformUser.find({ account: req.user.accountId }).select('email role createdAt').sort({ email: 1 }).lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add another login (staff account) to the current business account
router.post('/users', requireAuth, async (req, res) => {
  try {
    const { email, password, securityQuestion, securityAnswer } = req.body;
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (!securityQuestion || !securityAnswer) {
      return res.status(400).json({ error: 'A recovery question and answer are required so this account can be recovered later' });
    }

    const existing = await PlatformUser.findOne({ email: cleanEmail });
    if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

    const { hash, salt } = hashPassword(password);
    const { hash: aHash, salt: aSalt } = hashPassword(normalizeAnswer(securityAnswer));
    const user = await PlatformUser.create({
      email: cleanEmail,
      passwordHash: hash,
      passwordSalt: salt,
      account: req.user.accountId,
      role: 'staff',
      securityQuestion,
      securityAnswerHash: aHash,
      securityAnswerSalt: aSalt,
    });
    res.status(201).json({ email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:email', requireAuth, async (req, res) => {
  try {
    const remaining = await PlatformUser.countDocuments({ account: req.user.accountId, email: { $ne: req.params.email } });
    if (remaining === 0) return res.status(400).json({ error: 'At least one login is required for this account' });

    const deleted = await PlatformUser.findOneAndDelete({ account: req.user.accountId, email: req.params.email });
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
