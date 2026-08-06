const mongoose = require('mongoose');

const loginSessionSchema = new mongoose.Schema({
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformUser', required: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['owner', 'staff'], required: true },
  loginAt: { type: Date, required: true, default: Date.now },
  logoutAt: { type: Date },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('LoginSession', loginSessionSchema);
