const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD'
  checkedInAt: { type: Date, required: true, default: Date.now },
  photo: {
    filename: String,
    originalName: String,
    path: String,
    mimeType: String,
  },
  lat: { type: Number },
  lng: { type: Number },
}, { timestamps: true });

attendanceSchema.index({ userEmail: 1, date: 1 }, { unique: true });

module.exports = (conn) => conn.models.Attendance || conn.model('Attendance', attendanceSchema);
