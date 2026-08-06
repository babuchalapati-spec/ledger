import { useEffect, useState } from 'react';
import { getCustomers, createCustomer, deleteCustomer } from '../api/client';

const emptyForm = { name: '', address: '', gstNumber: '', phone: '', category: '', openingBalanceAmount: '', openingBalanceType: 'due' };

export default function CustomerList({ onOpenCustomer, autoOpenForm }) {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(!!autoOpenForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getCustomers()
      .then(setCustomers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Customer name is required');
      return;
    }
    try {
      const signedOpening = form.openingBalanceType === 'advance'
        ? -Math.abs(Number(form.openingBalanceAmount) || 0)
        : Math.abs(Number(form.openingBalanceAmount) || 0);
      await createCustomer({ ...form, openingBalance: signedOpening });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete customer "${name}" and ALL their ledger entries? This cannot be undone.`)) return;
    await deleteCustomer(id);
    load();
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtWhole = (n) => Math.round(n || 0).toLocaleString('en-IN');

  const totalBilled = customers.reduce((s, c) => s + (c.totalBills || 0), 0);
  const totalCollected = customers.reduce((s, c) => s + (c.totalPayments || 0), 0);
  const totalOutstanding = customers.reduce((s, c) => s + Math.max(c.balance || 0, 0), 0);

  const categoryGroups = Object.values(
    customers.reduce((groups, c) => {
      const key = c.category?.trim() || 'Uncategorized';
      if (!groups[key]) groups[key] = { category: key, count: 0, balance: 0 };
      groups[key].count += 1;
      groups[key].balance += c.balance || 0;
      return groups;
    }, {})
  ).sort((a, b) => a.category.localeCompare(b.category));

  return (
    <div className="customer-list">
      <div className="section-header">
        <h2>Customers</h2>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New Customer'}
        </button>
      </div>

      {!loading && customers.length > 0 && (
        <div className="stats-row">
          <div className="stat-tile">
            <span className="stat-icon">👥</span>
            <span className="stat-value">{customers.length}</span>
            <span className="stat-label">Total customers</span>
          </div>
          <div className="stat-tile">
            <span className="stat-icon">🧾</span>
            <span className="stat-value">₹{fmtWhole(totalBilled)}</span>
            <span className="stat-label">Total billed</span>
          </div>
          <div className="stat-tile">
            <span className="stat-icon">💰</span>
            <span className="stat-value stat-good">₹{fmtWhole(totalCollected)}</span>
            <span className="stat-label">Total collected</span>
          </div>
          <div className="stat-tile">
            <span className="stat-icon">⏳</span>
            <span className="stat-value stat-due">₹{fmtWhole(totalOutstanding)}</span>
            <span className="stat-label">Outstanding balance</span>
          </div>
        </div>
      )}

      {!loading && categoryGroups.length > 1 && (
        <div className="card">
          <h3 style={{ margin: '0 0 10px' }}>By Category</h3>
          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr><th>Category</th><th className="num">Customers</th><th className="num">Total Balance</th></tr>
              </thead>
              <tbody>
                {categoryGroups.map((g) => (
                  <tr key={g.category}>
                    <td>{g.category}</td>
                    <td className="num">{g.count}</td>
                    <td className={`num ${g.balance > 0 ? 'due' : g.balance < 0 ? 'advance' : ''}`}>{fmt(g.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <form className="card form-grid" onSubmit={handleSubmit}>
          {error && <div className="error-banner">{error}</div>}
          <label>
            Customer Name *
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Address
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
          <label>
            GST Number
            <input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label>
            Category
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Wholesale, Retail" />
          </label>
          <label>
            Opening Balance Type
            <select value={form.openingBalanceType} onChange={(e) => setForm({ ...form, openingBalanceType: e.target.value })}>
              <option value="due">Cr - Customer Owes Me</option>
              <option value="advance">Dr - Advance Paid by Customer</option>
            </select>
          </label>
          <label>
            Opening Balance Amount (Rs.)
            <input
              type="number" min="0" step="0.01"
              value={form.openingBalanceAmount}
              onChange={(e) => setForm({ ...form, openingBalanceAmount: e.target.value })}
              placeholder="Leave blank if starting fresh"
            />
          </label>
          <button className="btn-primary" type="submit">Save Customer</button>
        </form>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : customers.length === 0 ? (
        <p className="muted">No customers yet. Click "+ New Customer" to add one.</p>
      ) : (
        <div className="table-wrap">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>GST Number</th>
                <th>Category</th>
                <th className="num">Total Bills</th>
                <th className="num">Total Paid</th>
                <th className="num">Balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id}>
                  <td>
                    <button className="btn-link" onClick={() => onOpenCustomer(c._id)}>{c.name}</button>
                  </td>
                  <td>{c.address || '-'}</td>
                  <td>{c.gstNumber || '-'}</td>
                  <td>{c.category || '-'}</td>
                  <td className="num">{fmt(c.totalBills)}</td>
                  <td className="num">{fmt(c.totalPayments)}</td>
                  <td className={`num ${c.balance > 0 ? 'due' : c.balance < 0 ? 'advance' : ''}`}>{fmt(c.balance)}</td>
                  <td>
                    <button className="btn-danger-sm" onClick={() => handleDelete(c._id, c.name)}>Delete</button>
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
