const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

// There is only ever one settings document (this app runs for a single business).
async function getSingleton() {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  return settings;
}

router.get('/', async (req, res) => {
  try {
    const settings = await getSingleton();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const { businessName, address, gstNumber, phone } = req.body;
    const settings = await getSingleton();
    settings.businessName = businessName ?? settings.businessName;
    settings.address = address ?? settings.address;
    settings.gstNumber = gstNumber ?? settings.gstNumber;
    settings.phone = phone ?? settings.phone;
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
