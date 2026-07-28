const { verifyToken } = require('../utils/jwt');
const { getTenantConnection } = require('../db/tenantConnections');
const Account = require('../models/Account');
const { isTrialExpired } = require('../utils/trial');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  // PDF/download links are plain <a href> tags, which can't carry an
  // Authorization header, so those routes also accept ?token= in the URL.
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.query.token || null);
  if (!token) return res.status(401).json({ error: 'Not logged in' });

  try {
    const payload = verifyToken(token);
    if (payload.type !== 'user') return res.status(401).json({ error: 'Invalid session' });

    // Re-checked on every request (not just at login) so a trial expiring or an
    // account being suspended mid-session cuts access off immediately, not
    // just on the next login.
    const account = await Account.findById(payload.accountId);
    if (!account) return res.status(401).json({ error: 'Account no longer exists' });

    if (isTrialExpired(account)) {
      account.status = 'expired';
      await account.save();
    }
    if (account.status === 'expired') {
      return res.status(402).json({ error: 'Your free trial has ended. Please complete payment to keep using this app.', trialExpired: true });
    }
    if (account.status === 'suspended' || account.status === 'cancelled') {
      return res.status(403).json({ error: 'This account is not active. Please contact support.' });
    }

    req.user = payload;
    req.account = account;
    req.tenantConn = getTenantConnection(payload.dbName);
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

function requireSuperAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not logged in' });

  try {
    const payload = verifyToken(token);
    if (payload.type !== 'superadmin') return res.status(403).json({ error: 'Super admin access required' });
    req.superAdmin = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

module.exports = { requireAuth, requireSuperAdmin };
