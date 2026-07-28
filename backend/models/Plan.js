const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  billingPeriod: { type: String, enum: ['monthly', 'yearly', 'one-time'], default: 'monthly' },
  description: { type: String, trim: true, default: '' },
  modules: {
    groceryInventory: { type: Boolean, default: false },
    deliveries: { type: Boolean, default: false },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
