// One-time script: registers the current single-tenant database as the
// first Account in the new master/tenant architecture, and copies its
// existing login(s) into PlatformUser so passwords keep working unchanged.
//
// Usage: node scripts/migrateExistingTenant.js [tenantDbName] [ownerEmail]
require('dotenv').config();
const mongoose = require('mongoose');
const { withDbName } = require('../db/tenantConnections');
const Account = require('../models/Account');
const PlatformUser = require('../models/PlatformUser');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ledger_app';
const MASTER_URI = withDbName(MONGO_URI, 'ledger_master');
const TENANT_DB_NAME = process.argv[2] || 'ledger_app';
const OWNER_EMAIL = (process.argv[3] || 'babuchalapati@gmail.com').toLowerCase();

async function run() {
  await mongoose.connect(MASTER_URI);
  console.log('Connected to master DB:', MASTER_URI);

  const tenantConn = mongoose.createConnection(withDbName(MONGO_URI, TENANT_DB_NAME));
  await tenantConn.asPromise();
  console.log('Connected to tenant DB:', TENANT_DB_NAME);

  const settingsDoc = await tenantConn.db.collection('settings').findOne({});
  const businessName = settingsDoc?.businessName || 'My Business';

  let account = await Account.findOne({ dbName: TENANT_DB_NAME });
  if (account) {
    console.log('Account already exists for', TENANT_DB_NAME, '- reusing it');
  } else {
    account = await Account.create({
      businessName,
      dbName: TENANT_DB_NAME,
      status: 'active',
      modules: { groceryInventory: true, deliveries: true },
    });
    console.log('Created account:', account._id.toString(), businessName);
  }

  const oldUsers = await tenantConn.db.collection('users').find({}).toArray();
  if (oldUsers.length === 0) {
    console.log('No old users found in', TENANT_DB_NAME, '- nothing to migrate for login.');
  }

  for (const oldUser of oldUsers) {
    const email = oldUsers.length === 1 ? OWNER_EMAIL : `${oldUser.username}@migrated.local`;
    const already = await PlatformUser.findOne({ email });
    if (already) {
      console.log('PlatformUser already exists for', email, '- skipping');
      continue;
    }
    await PlatformUser.create({
      email,
      passwordHash: oldUser.passwordHash,
      passwordSalt: oldUser.passwordSalt,
      account: account._id,
      role: 'owner',
      securityQuestion: oldUser.securityQuestion || '',
      securityAnswerHash: oldUser.securityAnswerHash || '',
      securityAnswerSalt: oldUser.securityAnswerSalt || '',
    });
    console.log(`Migrated login: "${oldUser.username}" -> ${email} (same password still works)`);
  }

  await tenantConn.close();
  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
