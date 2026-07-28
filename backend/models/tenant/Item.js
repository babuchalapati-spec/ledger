const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  nameTelugu: { type: String, trim: true, default: '' },
  category: { type: String, trim: true, default: 'General' },
  unitType: { type: String, enum: ['weight', 'volume', 'count'], required: true },
  pricePerUnit: { type: Number, default: 0, min: 0 },
  stockQty: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

itemSchema.index({ name: 1 }, { unique: true });

module.exports = (conn) => conn.models.Item || conn.model('Item', itemSchema);
