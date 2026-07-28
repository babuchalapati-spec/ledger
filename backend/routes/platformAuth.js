const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Account = require('../models/Account');
const PlatformUser = require('../models/PlatformUser');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signUserToken } = require('../utils/jwt');

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

module.exports = router;
