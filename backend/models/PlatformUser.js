const mongoose = require('mongoose');

const platformUserSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  passwordHash: { type: String, required: true },
  passwordSalt: { type: String, required: true },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
  role: { type: String, enum: ['owner', 'staff'], default: 'owner' },
  securityQuestion: { type: String, default: '' },
  securityAnswerHash: { type: String, default: '' },
  securityAnswerSalt: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('PlatformUser', platformUserSchema);
