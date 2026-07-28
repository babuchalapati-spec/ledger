const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  businessName: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  gstNumber: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
}, { timestamps: true });

module.exports = (conn) => conn.models.Settings || conn.model('Settings', settingsSchema);
