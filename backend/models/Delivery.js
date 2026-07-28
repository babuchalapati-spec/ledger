const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  deliveryTime: { type: Date, required: true },
  items: { type: String, required: true, trim: true },
  notes: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['pending', 'delivered'], default: 'pending' },
  deliveredAt: { type: Date },
  invoiceDocuments: [{
    filename: String,
    originalName: String,
    path: String,
    mimeType: String,
  }],
}, { timestamps: true });

deliverySchema.index({ deliveryTime: 1 });

module.exports = mongoose.model('Delivery', deliverySchema);
