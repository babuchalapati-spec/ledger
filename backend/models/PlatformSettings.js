const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema({
  upgradeMessage: {
    type: String,
    trim: true,
    default: 'Your free trial has ended. Choose a plan below and contact us to keep using the app.',
  },
  contactPhone: { type: String, trim: true, default: '' },
  contactWhatsApp: { type: String, trim: true, default: '' },
  contactEmail: { type: String, trim: true, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
