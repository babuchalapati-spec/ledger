const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  role: { type: String, enum: ['owner', 'staff'], required: true },
  action: { type: String, enum: ['create', 'update', 'delete'], required: true },
  entityType: { type: String, required: true },
  entityId: { type: String, default: '' },
  summary: { type: String, required: true },
}, { timestamps: true });

module.exports = (conn) => conn.models.ActivityLog || conn.model('ActivityLog', activityLogSchema);
