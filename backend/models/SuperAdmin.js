const mongoose = require('mongoose');

const superAdminSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  passwordHash: { type: String, required: true },
  passwordSalt: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
