const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me';

function signUserToken({ userId, accountId, dbName, role, email, sessionId }) {
  return jwt.sign({ type: 'user', userId, accountId, dbName, role, email, sessionId }, SECRET, { expiresIn: '30d' });
}

function signSuperAdminToken({ superAdminId }) {
  return jwt.sign({ type: 'superadmin', superAdminId }, SECRET, { expiresIn: '30d' });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signUserToken, signSuperAdminToken, verifyToken };
