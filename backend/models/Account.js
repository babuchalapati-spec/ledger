const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  businessName: { type: String, required: true, trim: true },
  dbName: { type: String, required: true, unique: true, trim: true },
  status: { type: String, enum: ['trial', 'active', 'suspended', 'cancelled', 'expired'], default: 'trial' },
  trialEndsAt: { type: Date },
  modules: {
    groceryInventory: { type: Boolean, default: false },
    deliveries: { type: Boolean, default: false },
    projects: { type: Boolean, default: false },
  },
}, { timestamps: true });

module.exports = mongoose.model('Account', accountSchema);
