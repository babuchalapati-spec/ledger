const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['bill', 'payment'], required: true },
  description: { type: String, trim: true, default: '' },
  billNumber: { type: String, trim: true, default: '' },
  amount: { type: Number, required: true, min: 0 },
  paymentMode: { type: String, enum: ['cash', 'phonepay', 'bank', 'other', ''], default: '' },
  documents: [{
    filename: String,
    originalName: String,
    path: String,
    mimeType: String,
  }],
}, { timestamps: true });

entrySchema.index({ customer: 1, date: 1 });

module.exports = (conn) => conn.models.Entry || conn.model('Entry', entrySchema);
