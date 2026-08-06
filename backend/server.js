require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const mongoose = require('mongoose');
const cron = require('node-cron');
const { withDbName } = require('./db/tenantConnections');
const { runAbsenceCheck } = require('./jobs/attendanceAbsence');

const customerRoutes = require('./routes/customers');
const entryRoutes = require('./routes/entries');
const ledgerRoutes = require('./routes/ledger');
const settingsRoutes = require('./routes/settings');
const platformAuthRoutes = require('./routes/platformAuth');
const superAdminRoutes = require('./routes/superadmin');
const accountRoutes = require('./routes/account');
const itemRoutes = require('./routes/items');
const orderRoutes = require('./routes/orders');
const deliveryRoutes = require('./routes/deliveries');
const projectRoutes = require('./routes/projects');
const activityRoutes = require('./routes/activity');
const attendanceRoutes = require('./routes/attendance');

const app = express();
const PORT = process.env.PORT || 8811;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ledger_app';
const MASTER_URI = withDbName(MONGO_URI, 'ledger_master');

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set. Using an insecure default — set it in production.');
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(process.env.UPLOAD_DIR || path.join(__dirname, 'uploads')));

app.use('/api/customers', customerRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/auth', platformAuthRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/attendance', attendanceRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Lets the desktop Settings page show the LAN address the phone app should connect to.
app.get('/api/network-info', (req, res) => {
  const addresses = [];
  const interfaces = os.networkInterfaces();
  Object.values(interfaces).forEach((ifaceList) => {
    (ifaceList || []).forEach((iface) => {
      if (iface.family === 'IPv4' && !iface.internal) addresses.push(iface.address);
    });
  });
  res.json({ addresses, port: PORT });
});

// Serve the built frontend (frontend/dist) when present, so the app can run
// from a single origin/port (used by the packaged Electron desktop app).
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Catches Multer upload errors (bad file type, file too large) and any other
// route errors, so the client always gets JSON instead of Express's default HTML page.
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File is too large (max 10MB per file)' });
  }
  res.status(400).json({ error: err.message || 'Unexpected error' });
});

// The default connection holds the master/control-plane data (Account,
// PlatformUser, SuperAdmin). Each tenant's business data lives in its own
// database, opened on demand via db/tenantConnections.js.
mongoose.connect(MASTER_URI)
  .then(() => {
    console.log('Connected to master DB');
    app.listen(PORT, () => console.log(`Ledger backend running on http://localhost:${PORT}`));
    // Checks every active tenant for unmarked attendance past their cutoff time;
    // each tenant is only ever actually processed once per day (see attendanceAbsence.js).
    cron.schedule('*/15 * * * *', () => {
      runAbsenceCheck().catch((err) => console.error('runAbsenceCheck failed:', err.message));
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    console.error('Make sure MongoDB is installed and running locally (mongod).');
    process.exit(1);
  });
