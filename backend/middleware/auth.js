const { verifyToken } = require('../utils/jwt');
const { getTenantConnection } = require('../db/tenantConnections');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  // PDF/download links are plain <a href> tags, which can't carry an
  // Authorization header, so those routes also accept ?token= in the URL.
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.query.token || null);
  if (!token) return res.status(401).json({ error: 'Not logged in' });

  try {
    const payload = verifyToken(token);
    if (payload.type !== 'user') return res.status(401).json({ error: 'Invalid session' });
    req.user = payload;
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
