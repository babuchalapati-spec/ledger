const express = require('express');
const router = express.Router();
const SuperAdmin = require('../models/SuperAdmin');
const Account = require('../models/Account');
const Plan = require('../models/Plan');
const PlatformSettings = require('../models/PlatformSettings');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signSuperAdminToken } = require('../utils/jwt');
const { requireSuperAdmin } = require('../middleware/auth');

async function getPlatformSettingsSingleton() {
  let settings = await PlatformSettings.findOne();
  if (!settings) settings = await PlatformSettings.create({});
  return settings;
}

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

// Plans (Super Admin manages what's on offer; a public route elsewhere exposes active ones)
router.get('/plans', requireSuperAdmin, async (req, res) => {
  try {
    const plans = await Plan.find().sort({ price: 1 });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/plans', requireSuperAdmin, async (req, res) => {
  try {
    const { name, price, billingPeriod, description, modules } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Plan name is required' });
    if (!(Number(price) >= 0)) return res.status(400).json({ error: 'A valid price is required' });

    const plan = await Plan.create({
      name,
      price: Number(price),
      billingPeriod: billingPeriod || 'monthly',
      description,
      modules: { groceryInventory: !!modules?.groceryInventory, deliveries: !!modules?.deliveries },
    });
    res.status(201).json(plan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/plans/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { name, price, billingPeriod, description, modules, isActive } = req.body;
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    if (name !== undefined) plan.name = name;
    if (price !== undefined) plan.price = Number(price);
    if (billingPeriod !== undefined) plan.billingPeriod = billingPeriod;
    if (description !== undefined) plan.description = description;
    if (isActive !== undefined) plan.isActive = !!isActive;
    if (modules !== undefined) {
      if (modules.groceryInventory !== undefined) plan.modules.groceryInventory = !!modules.groceryInventory;
      if (modules.deliveries !== undefined) plan.modules.deliveries = !!modules.deliveries;
    }
    await plan.save();
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/plans/:id', requireSuperAdmin, async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json({ message: 'Plan deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Text/contact info shown on the trial-expired upgrade screen
router.get('/platform-settings', requireSuperAdmin, async (req, res) => {
  try {
    res.json(await getPlatformSettingsSingleton());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/platform-settings', requireSuperAdmin, async (req, res) => {
  try {
    const { upgradeMessage, contactPhone, contactWhatsApp, contactEmail } = req.body;
    const settings = await getPlatformSettingsSingleton();
    if (upgradeMessage !== undefined) settings.upgradeMessage = upgradeMessage;
    if (contactPhone !== undefined) settings.contactPhone = contactPhone;
    if (contactWhatsApp !== undefined) settings.contactWhatsApp = contactWhatsApp;
    if (contactEmail !== undefined) settings.contactEmail = contactEmail;
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
