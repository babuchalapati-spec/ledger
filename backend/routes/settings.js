const express = require('express');
const router = express.Router();
const getSettingsModel = require('../models/tenant/Settings');
const { requireAuth, requireOwner } = require('../middleware/auth');

router.use(requireAuth);

// There is only ever one settings document per tenant.
async function getSingleton(Settings) {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  return settings;
}

router.get('/', async (req, res) => {
  try {
    const Settings = getSettingsModel(req.tenantConn);
    const settings = await getSingleton(Settings);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', requireOwner, async (req, res) => {
  try {
    const Settings = getSettingsModel(req.tenantConn);
    const { businessName, address, gstNumber, phone, premisesLat, premisesLng, premisesRadiusMeters, attendanceCutoffTime } = req.body;
    const settings = await getSingleton(Settings);
    settings.businessName = businessName ?? settings.businessName;
    settings.address = address ?? settings.address;
    settings.gstNumber = gstNumber ?? settings.gstNumber;
    settings.phone = phone ?? settings.phone;
    if (premisesLat !== undefined) settings.premisesLat = premisesLat === '' ? undefined : Number(premisesLat);
    if (premisesLng !== undefined) settings.premisesLng = premisesLng === '' ? undefined : Number(premisesLng);
    if (premisesRadiusMeters !== undefined) settings.premisesRadiusMeters = Number(premisesRadiusMeters) || 200;
    if (attendanceCutoffTime !== undefined) settings.attendanceCutoffTime = attendanceCutoffTime;
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
