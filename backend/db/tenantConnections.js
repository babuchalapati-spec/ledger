const mongoose = require('mongoose');

const cache = new Map();

// Swaps the database-name segment of a Mongo URI, keeping host/credentials/params.
// Works for both mongodb:// and mongodb+srv:// forms.
function withDbName(uri, dbName) {
  const [beforeQuery, query] = uri.split('?');
  const lastSlash = beforeQuery.lastIndexOf('/');
  const base = beforeQuery.slice(0, lastSlash);
  return `${base}/${dbName}${query ? `?${query}` : ''}`;
}

function getTenantConnection(dbName) {
  if (!dbName) throw new Error('dbName is required to open a tenant connection');
  if (cache.has(dbName)) return cache.get(dbName);

  const baseUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ledger_app';
  const uri = withDbName(baseUri, dbName);
  const conn = mongoose.createConnection(uri);
  cache.set(dbName, conn);
  return conn;
}

module.exports = { getTenantConnection, withDbName };
