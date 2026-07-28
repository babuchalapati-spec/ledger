const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  name: { type: String, required: true },
  nameTelugu: { type: String, trim: true, default: '' },
  unitType: { type: String, required: true },
  unitLabel: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  qtyStandard: { type: Number, required: true, min: 0 },
  pricePerUnit: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  date: { type: Date, required: true, default: Date.now },
  orderedFor: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
  items: { type: [orderItemSchema], required: true },
  totalAmount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending', 'received'], default: 'pending' },
  receivedAt: { type: Date },
}, { timestamps: true });

module.exports = (conn) => conn.models.Order || conn.model('Order', orderSchema);
