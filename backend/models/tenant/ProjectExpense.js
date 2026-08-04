const mongoose = require('mongoose');

const projectExpenseSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  person: { type: String, required: true, trim: true },
  date: { type: Date, required: true, default: Date.now },
  description: { type: String, trim: true, default: '' },
  amount: { type: Number, required: true, min: 0 },
  receipts: [{
    filename: String,
    originalName: String,
    path: String,
    mimeType: String,
  }],
}, { timestamps: true });

module.exports = (conn) => conn.models.ProjectExpense || conn.model('ProjectExpense', projectExpenseSchema);
