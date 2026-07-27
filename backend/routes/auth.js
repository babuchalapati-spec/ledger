const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { hashPassword, verifyPassword } = require('../utils/password');

const normalizeAnswer = (s) => (s || '').trim().toLowerCase();

// Whether any user accounts exist. If none do, the app is fully open (no lock)
// until someone creates the first account from Settings.
router.get('/status', async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ hasUsers: count > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Usernames only, for the login screen's user picker and the Settings management list.
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ username: 1 }).select('username createdAt').lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: (username || '').trim() });
    if (!user || !verifyPassword(password || '', user.passwordHash, user.passwordSalt)) {
      return res.status(401).json({ error: 'Incorrect username or password' });
    }
    res.json({ success: true, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Creates a new user account. Anyone can create the FIRST account (bootstrapping,
// no one is logged in yet). Once at least one account exists, the app is locked,
// so reaching this route again already implies the caller got past the login screen.
router.post('/users', async (req, res) => {
  try {
    const { username, password, securityQuestion, securityAnswer } = req.body;
    const cleanUsername = (username || '').trim();
    if (!cleanUsername || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (!securityQuestion || !securityAnswer) {
      return res.status(400).json({ error: 'A recovery question and answer are required so this account can be recovered later' });
    }
    const existing = await User.findOne({ username: cleanUsername });
    if (existing) return res.status(409).json({ error: 'That username is already taken' });

    const { hash, salt } = hashPassword(password);
    const { hash: aHash, salt: aSalt } = hashPassword(normalizeAnswer(securityAnswer));
    const user = await User.create({
      username: cleanUsername,
      passwordHash: hash,
      passwordSalt: salt,
      securityQuestion,
      securityAnswerHash: aHash,
      securityAnswerSalt: aSalt,
    });
    res.status(201).json({ username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:username', async (req, res) => {
  try {
    const remainingCount = await User.countDocuments({ username: { $ne: req.params.username } });
    const deleted = await User.findOneAndDelete({ username: req.params.username });
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User removed', hasUsers: remainingCount > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/security-question', async (req, res) => {
  try {
    const user = await User.findOne({ username: (req.query.username || '').trim() });
    res.json({ question: user?.securityQuestion || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recovers access by answering the security question, then sets a new password.
router.post('/reset-password', async (req, res) => {
  try {
    const { username, securityAnswer, newPassword } = req.body;
    const user = await User.findOne({ username: (username || '').trim() });
    if (!user || !user.securityAnswerHash) {
      return res.status(400).json({ error: 'No recovery question is set for this account' });
    }
    if (!newPassword) {
      return res.status(400).json({ error: 'A new password is required' });
    }
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
