import { useEffect, useState } from 'react';
import { getCustomer, updateCustomer, getEntries, ledgerPdfUrl } from '../api/client';
import EntryForm from '../components/EntryForm';
import LedgerTable from '../components/LedgerTable';
import StatementImport from '../components/StatementImport';

export default function CustomerLedger({ customerId }) {
  const [customer, setCustomer] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAll = () => {
    setLoading(true);
    Promise.all([getCustomer(customerId), getEntries(customerId)])
      .then(([c, entriesData]) => {
        setCustomer(c);
        setEditForm({
          ...c,
          openingBalanceType: (c.openingBalance || 0) < 0 ? 'advance' : 'due',
          openingBalanceAmount: Math.abs(c.openingBalance || 0) || '',
        });
        setLedgerData(entriesData);
      })
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadAll, [customerId]);

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      const signedOpening = editForm.openingBalanceType === 'advance'
        ? -Math.abs(Number(editForm.openingBalanceAmount) || 0)
        : Math.abs(Number(editForm.openingBalanceAmount) || 0);
      const updated = await updateCustomer(customerId, { ...editForm, openingBalance: signedOpening });
      setCustomer(updated);
      setEditing(false);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  if (loading) return <p>Loading ledger...</p>;
  if (error) return <div className="error-banner">{error}</div>;
  if (!customer) return null;

  return (
    <div className="customer-ledger">
      <div className="section-header">
        <h2>{customer.name}</h2>
        <div className="header-actions">
          <a className="btn-secondary" href={ledgerPdfUrl(customerId)} target="_blank" rel="noreferrer">
            📄 Download Ledger PDF
          </a>
          <button className="btn-secondary" onClick={() => setEditing((s) => !s)}>
            {editing ? 'Cancel' : '✏️ Edit Details'}
          </button>
        </div>
      </div>

      {editing ? (
        <form className="card form-grid" onSubmit={handleSaveCustomer}>
          <label>
            Customer Name *
            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
          </label>
          <label>
            Address
            <input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
          </label>
          <label>
            GST Number
            <input value={editForm.gstNumber} onChange={(e) => setEditForm({ ...editForm, gstNumber: e.target.value })} />
          </label>
          <label>
            Phone
            <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          </label>
          <label>
            Opening Balance Type
            <select value={editForm.openingBalanceType} onChange={(e) => setEditForm({ ...editForm, openingBalanceType: e.target.value })}>
              <option value="due">Cr - Customer Owes Me</option>
              <option value="advance">Dr - Advance Paid by Customer</option>
            </select>
          </label>
          <label>
            Opening Balance Amount (Rs.)
            <input
              type="number" min="0" step="0.01"
              value={editForm.openingBalanceAmount}
              onChange={(e) => setEditForm({ ...editForm, openingBalanceAmount: e.target.value })}
            />
          </label>
          <button className="btn-primary" type="submit">Save Changes</button>
        </form>
      ) : (
        <div className="card customer-info">
          <div><span className="label">Address:</span> {customer.address || '-'}</div>
          <div><span className="label">GST Number:</span> {customer.gstNumber || '-'}</div>
          <div><span className="label">Phone:</span> {customer.phone || '-'}</div>
          {!!customer.openingBalance && (
            <div>
              <span className="label">Opening Balance:</span> Rs. {Number(Math.abs(customer.openingBalance)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {' '}({customer.openingBalance < 0 ? 'Dr' : 'Cr'})
            </div>
          )}
        </div>
      )}

      <h3>Add Ledger Entry</h3>
      <EntryForm customerId={customerId} onAdded={loadAll} />

      <StatementImport customerId={customerId} onImported={loadAll} />

      <h3>Ledger Statement</h3>
      <LedgerTable data={ledgerData} onChanged={loadAll} />
    </div>
  );
}
