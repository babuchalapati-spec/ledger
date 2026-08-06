const express = require('express');
const router = express.Router();
const getActivityLogModel = require('../models/tenant/ActivityLog');
const { requireAuth, requireOwner } = require('../middleware/auth');

router.use(requireAuth, requireOwner);

// Staff activity log for the current tenant: who created/updated/deleted what, and when.
router.get('/', async (req, res) => {
  try {
    const ActivityLog = getActivityLogModel(req.tenantConn);
    const { entityType, userEmail, action, from, to } = req.query;

    const filter = {};
    if (entityType) filter.entityType = entityType;
    if (userEmail) filter.userEmail = userEmail;
    if (action) filter.action = action;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const logs = await ActivityLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
