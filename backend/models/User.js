const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true, unique: true },
  passwordHash: { type: String, required: true },
  passwordSalt: { type: String, required: true },
  securityQuestion: { type: String, default: '' },
  securityAnswerHash: { type: String, default: '' },
  securityAnswerSalt: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
