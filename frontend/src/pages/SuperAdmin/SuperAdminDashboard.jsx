import { useEffect, useState } from 'react';
import { getAccounts, updateAccount, clearAdminToken } from '../../api/client';

export default function SuperAdminDashboard({ onLoggedOut }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    getAccounts().then(setAccounts).catch((err) => setError(err.response?.data?.error || err.message)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleModuleToggle = async (account, key) => {
    try {
      await updateAccount(account._id, { modules: { [key]: !account.modules[key] } });
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleStatusChange = async (account, status) => {
    try {
      await updateAccount(account._id, { status });
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN');

  return (
    <div className="app" style={{ maxWidth: 1140 }}>
      <div className="section-header">
        <h2>🛠 Super Admin — Business Accounts</h2>
        <button className="btn-secondary" onClick={() => { clearAdminToken(); onLoggedOut(); }}>🚪 Log Off</button>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <p>Loading...</p>
      ) : accounts.length === 0 ? (
        <p className="muted">No business accounts have registered yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Created</th>
                <th>Status</th>
                <th>Grocery Inventory</th>
                <th>Deliveries</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a._id}>
                  <td>{a.businessName}<div className="muted" style={{ fontSize: 12 }}>{a.dbName}</div></td>
                  <td>{fmtDate(a.createdAt)}</td>
                  <td>
                    <select value={a.status} onChange={(e) => handleStatusChange(a, e.target.value)}>
                      <option value="trial">Trial</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td>
                    <input type="checkbox" checked={!!a.modules.groceryInventory} onChange={() => handleModuleToggle(a, 'groceryInventory')} />
                  </td>
                  <td>
                    <input type="checkbox" checked={!!a.modules.deliveries} onChange={() => handleModuleToggle(a, 'deliveries')} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
