const getActivityLogModel = require('../models/tenant/ActivityLog');

// Records who did what for the tenant's Staff Activity page. Deliberately never
// throws — a logging failure must not break the real request that triggered it.
async function logActivity(req, { action, entityType, entityId, summary }) {
  try {
    const ActivityLog = getActivityLogModel(req.tenantConn);
    await ActivityLog.create({
      userEmail: req.user.email,
      role: req.user.role,
      action,
      entityType,
      entityId: entityId ? String(entityId) : '',
      summary,
    });
  } catch (err) {
    console.error('activity log failed:', err.message);
  }
}

module.exports = { logActivity };
