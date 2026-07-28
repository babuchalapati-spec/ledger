const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const getCustomerModel = require('../models/tenant/Customer');
const getEntryModel = require('../models/tenant/Entry');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// List all customers with running balance summary
router.get('/', async (req, res) => {
  try {
    const Customer = getCustomerModel(req.tenantConn);
    const Entry = getEntryModel(req.tenantConn);

    const customers = await Customer.find().sort({ name: 1 }).lean();
    const summaries = await Entry.aggregate([
      {
        $group: {
          _id: '$customer',
          totalBills: { $sum: { $cond: [{ $eq: ['$type', 'bill'] }, '$amount', 0] } },
          totalPayments: { $sum: { $cond: [{ $eq: ['$type', 'payment'] }, '$amount', 0] } },
        },
      },
    ]);
    const summaryMap = {};
    summaries.forEach((s) => { summaryMap[s._id.toString()] = s; });

    const result = customers.map((c) => {
      const s = summaryMap[c._id.toString()] || { totalBills: 0, totalPayments: 0 };
      return {
        ...c,
        totalBills: s.totalBills,
        totalPayments: s.totalPayments,
        balance: (c.openingBalance || 0) + s.totalBills - s.totalPayments,
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single customer
router.get('/:id', async (req, res) => {
  try {
    const Customer = getCustomerModel(req.tenantConn);
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create customer
router.post('/', async (req, res) => {
  try {
    const Customer = getCustomerModel(req.tenantConn);
    const { name, address, gstNumber, phone, openingBalance } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Customer name is required' });
    const customer = await Customer.create({
      name,
      address,
      gstNumber,
      phone,
      openingBalance: Number(openingBalance) || 0,
    });
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const Customer = getCustomerModel(req.tenantConn);
    const { name, address, gstNumber, phone, openingBalance } = req.body;
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { name, address, gstNumber, phone, openingBalance: Number(openingBalance) || 0 },
      { new: true, runValidators: true }
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete customer (and their entries + attached files)
router.delete('/:id', async (req, res) => {
  try {
    const Customer = getCustomerModel(req.tenantConn);
    const Entry = getEntryModel(req.tenantConn);

    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const entries = await Entry.find({ customer: req.params.id });
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
    entries.forEach((entry) => {
      entry.documents.forEach((d) => {
        const filePath = path.join(uploadDir, d.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    });

    await Entry.deleteMany({ customer: req.params.id });
    res.json({ message: 'Customer and their ledger entries deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
