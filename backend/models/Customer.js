const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  address: { type: String, trim: true, default: '' },
  gstNumber: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  openingBalance: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
