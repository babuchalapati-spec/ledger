const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const SuperAdmin = require('../models/SuperAdmin');
const Account = require('../models/Account');
const Plan = require('../models/Plan');
const PlatformSettings = require('../models/PlatformSettings');
const PlatformUser = require('../models/PlatformUser');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signSuperAdminToken } = require('../utils/jwt');
const { requireSuperAdmin } = require('../middleware/auth');
const { getTenantConnection } = require('../db/tenantConnections');
const getCustomerModel = require('../models/tenant/Customer');
const getEntryModel = require('../models/tenant/Entry');
const getOrderModel = require('../models/tenant/Order');
const getDeliveryModel = require('../models/tenant/Delivery');

// Super Admin changes their own password
router.put('/change-password', requireSuperAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'A new password of at least 6 characters is required' });
    }
    const admin = await SuperAdmin.findById(req.superAdmin.superAdminId);
    if (!admin || !verifyPassword(currentPassword || '', admin.passwordHash, admin.passwordSalt)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const { hash, salt } = hashPassword(newPassword);
    admin.passwordHash = hash;
    admin.passwordSalt = salt;
    await admin.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

async function getTenantSummary(dbName) {
  const empty = { customers: 0, entries: 0, orders: 0, deliveries: 0, lastActivityAt: null };
  try {
    const conn = getTenantConnection(dbName);
    const Customer = getCustomerModel(conn);
    const Entry = getEntryModel(conn);
    const Order = getOrderModel(conn);
    const Delivery = getDeliveryModel(conn);

    const [customers, entries, orders, deliveries, lastEntry, lastOrder, lastDelivery] = await Promise.all([
      Customer.countDocuments(),
      Entry.countDocuments(),
      Order.countDocuments(),
      Delivery.countDocuments(),
      Entry.findOne().sort({ updatedAt: -1 }).select('updatedAt').lean(),
      Order.findOne().sort({ updatedAt: -1 }).select('updatedAt').lean(),
      Delivery.findOne().sort({ updatedAt: -1 }).select('updatedAt').lean(),
    ]);

    const candidates = [lastEntry, lastOrder, lastDelivery].filter(Boolean).map((doc) => doc.updatedAt);
    const lastActivityAt = candidates.length ? new Date(Math.max(...candidates.map((d) => new Date(d).getTime()))) : null;

    return { customers, entries, orders, deliveries, lastActivityAt };
  } catch (err) {
    return empty;
  }
}

router.get('/accounts', requireSuperAdmin, async (req, res) => {
  try {
    const accounts = await Account.find().sort({ createdAt: -1 }).lean();
    const owners = await PlatformUser.find({ account: { $in: accounts.map((a) => a._id) } }).select('email account role').lean();
    const ownerByAccount = new Map();
    for (const u of owners) {
      if (u.role === 'owner' || !ownerByAccount.has(String(u.account))) ownerByAccount.set(String(u.account), u.email);
    }

    const results = await Promise.all(accounts.map(async (a) => ({
      ...a,
      ownerEmail: ownerByAccount.get(String(a._id)) || null,
      stats: await getTenantSummary(a.dbName),
    })));

    res.json(results);
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
      if (modules.projects !== undefined) account.modules.projects = !!modules.projects;
    }
    await account.save();
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const RESET_LINK_TTL_MS = 60 * 60 * 1000; // 1 hour
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Generate a one-time password-reset link for a tenant's owner login, for when they've
// lost both their password and their security-question answer. Super Admin copies the
// link and sends it to them manually (WhatsApp/SMS/email) — no email service required.
router.post('/accounts/:id/reset-link', requireSuperAdmin, async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const owner = await PlatformUser.findOne({ account: account._id, role: 'owner' })
      || await PlatformUser.findOne({ account: account._id });
    if (!owner) return res.status(404).json({ error: 'No login found for this business' });

    const token = crypto.randomBytes(32).toString('hex');
    owner.resetTokenHash = hashToken(token);
    owner.resetTokenExpiresAt = new Date(Date.now() + RESET_LINK_TTL_MS);
    await owner.save();

    res.json({ token, email: owner.email, expiresAt: owner.resetTokenExpiresAt });
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
      modules: { groceryInventory: !!modules?.groceryInventory, deliveries: !!modules?.deliveries, projects: !!modules?.projects },
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
      if (modules.projects !== undefined) plan.modules.projects = !!modules.projects;
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
