const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Entry = require('../models/Entry');
const Settings = require('../models/Settings');
const { generateLedgerPdf } = require('../utils/generateLedgerPdf');

router.get('/:customerId/pdf', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.customerId).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const business = await Settings.findOne().lean();

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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ledger-${customer.name.replace(/\s+/g, '_')}.pdf"`);

    generateLedgerPdf({ customer, entries: withBalance, openingBalance, totalBills, totalPayments, balance, business }, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
