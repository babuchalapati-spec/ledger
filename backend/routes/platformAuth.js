const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Account = require('../models/Account');
const PlatformUser = require('../models/PlatformUser');
const Plan = require('../models/Plan');
const PlatformSettings = require('../models/PlatformSettings');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signUserToken } = require('../utils/jwt');
const { TRIAL_DURATION_MS, isTrialExpired } = require('../utils/trial');

const normalizeAnswer = (s) => (s || '').trim().toLowerCase();
const normalizeEmail = (s) => (s || '').trim().toLowerCase();

function generateDbName() {
  return `ledger_tenant_${crypto.randomBytes(6).toString('hex')}`;
}

// Public sign-up: creates a new business account (its own tenant database) and its first (owner) login
router.post('/register', async (req, res) => {
  try {
    const { businessName, email, password, securityQuestion, securityAnswer } = req.body;
    const cleanEmail = normalizeEmail(email);
    if (!businessName || !businessName.trim()) return res.status(400).json({ error: 'Business name is required' });
    if (!cleanEmail || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (!securityQuestion || !securityAnswer) {
      return res.status(400).json({ error: 'A recovery question and answer are required so this account can be recovered later' });
    }

    const existing = await PlatformUser.findOne({ email: cleanEmail });
    if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

    const account = await Account.create({
      businessName,
      dbName: generateDbName(),
      status: 'trial',
      trialEndsAt: new Date(Date.now() + TRIAL_DURATION_MS),
      // Full access during the trial day, so there's something to actually try.
      modules: { groceryInventory: true, deliveries: true, projects: true },
    });

    const { hash, salt } = hashPassword(password);
    const { hash: aHash, salt: aSalt } = hashPassword(normalizeAnswer(securityAnswer));
    const user = await PlatformUser.create({
      email: cleanEmail,
      passwordHash: hash,
      passwordSalt: salt,
      account: account._id,
      role: 'owner',
      securityQuestion,
      securityAnswerHash: aHash,
      securityAnswerSalt: aSalt,
    });

    const token = signUserToken({ userId: user._id, accountId: account._id, dbName: account.dbName, role: user.role });
    res.status(201).json({ token, businessName: account.businessName, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const cleanEmail = normalizeEmail(req.body.email);
    const { password } = req.body;
    const user = await PlatformUser.findOne({ email: cleanEmail });
    if (!user || !verifyPassword(password || '', user.passwordHash, user.passwordSalt)) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }
    const account = await Account.findById(user.account);
    if (!account) return res.status(500).json({ error: 'Account record missing for this login' });

    if (isTrialExpired(account)) {
      account.status = 'expired';
      await account.save();
    }
    if (account.status === 'expired') {
      return res.status(402).json({ error: 'Your free trial has ended. Please complete payment to keep using this app.', trialExpired: true });
    }
    if (account.status === 'suspended' || account.status === 'cancelled') {
      return res.status(403).json({ error: 'This account is not active. Please contact support.' });
    }

    const token = signUserToken({ userId: user._id, accountId: account._id, dbName: account.dbName, role: user.role });
    res.json({ token, businessName: account.businessName, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/security-question', async (req, res) => {
  try {
    const user = await PlatformUser.findOne({ email: normalizeEmail(req.query.email) });
    res.json({ question: user?.securityQuestion || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, securityAnswer, newPassword } = req.body;
    const user = await PlatformUser.findOne({ email: normalizeEmail(email) });
    if (!user || !user.securityAnswerHash) {
      return res.status(400).json({ error: 'No recovery question is set for this account' });
    }
    if (!newPassword) return res.status(400).json({ error: 'A new password is required' });

    const ok = verifyPassword(normalizeAnswer(securityAnswer), user.securityAnswerHash, user.securityAnswerSalt);
    if (!ok) return res.status(401).json({ error: 'That answer is not correct' });

    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Consumes a one-time reset link that Super Admin generated for a tenant who lost
// both their password and their security answer (see routes/superadmin.js).
router.post('/reset-with-link', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token) return res.status(400).json({ error: 'Reset link is missing its token' });
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'A new password of at least 6 characters is required' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await PlatformUser.findOne({ resetTokenHash: tokenHash });
    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired' });
    }

    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    user.resetTokenHash = '';
    user.resetTokenExpiresAt = undefined;
    await user.save();
    res.json({ success: true, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: what a customer sees on the trial-expired / upgrade screen
router.get('/plans', async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ price: 1 });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/platform-settings', async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) settings = await PlatformSettings.create({});
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
