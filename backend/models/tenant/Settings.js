const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  businessName: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  gstNumber: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  premisesLat: { type: Number },
  premisesLng: { type: Number },
  premisesRadiusMeters: { type: Number, default: 200 },
  attendanceCutoffTime: { type: String, trim: true, default: '' }, // 'HH:mm', 24h — empty = absence SMS off
  lastAbsenceCheckDate: { type: String, trim: true, default: '' }, // 'YYYY-MM-DD'
}, { timestamps: true });

module.exports = (conn) => conn.models.Settings || conn.model('Settings', settingsSchema);
