const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  people: { type: [String], required: true, validate: (v) => v.length >= 2 },
}, { timestamps: true });

module.exports = (conn) => conn.models.Project || conn.model('Project', projectSchema);
