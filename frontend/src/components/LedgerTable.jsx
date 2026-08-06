import { useState } from 'react';
import { deleteEntry, updateEntry, fileUrl } from '../api/client';

const fmt = (n) => (n ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN');

export default function LedgerTable({ data, onChanged }) {
  const { entries = [], openingBalance = 0, totalBills = 0, totalPayments = 0, balance = 0 } = data || {};
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async (id) => {
    if (!confirm('Delete this ledger entry? This cannot be undone.')) return;
    await deleteEntry(id);
    onChanged();
  };

  const startEdit = (e) => {
    setEditingId(e._id);
    setError('');
    setEditForm({
      type: e.type,
      date: new Date(e.date).toISOString().slice(0, 10),
      description: e.description || '',
      billNumber: e.billNumber || '',
      category: e.category || '',
      amount: e.amount,
      paymentMode: e.paymentMode || 'cash',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = async (id) => {
    if (!editForm.date || !editForm.amount || Number(editForm.amount) <= 0) {
      setError('Please enter a valid date and amount');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('date', editForm.date);
      fd.append('type', editForm.type);
      fd.append('description', editForm.description);
      if (editForm.type === 'bill') fd.append('billNumber', editForm.billNumber);
      fd.append('category', editForm.category);
      fd.append('amount', editForm.amount);
      if (editForm.type === 'payment') fd.append('paymentMode', editForm.paymentMode);
      await updateEntry(id, fd);
      setEditingId(null);
      setEditForm(null);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="table-wrap">
      {error && <div className="error-banner" style={{ margin: '0 0 10px' }}>{error}</div>}
      <table className="ledger-table ruled">
        <thead>
          <tr>
            <th>Date</th>
            <th>Particulars</th>
            <th>Bill No.</th>
            <th>Category</th>
            <th className="num">Bill (Cr)</th>
            <th className="num">Payment (Dr)</th>
            <th className="num">Balance</th>
            <th>Proof</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <td colSpan={9} className="muted center">No entries yet. Add a bill or payment above.</td>
            </tr>
          )}
          {entries.map((e) =>
            editingId === e._id ? (
              <tr key={e._id} className="editing-row">
                <td>
                  <input type="date" value={editForm.date} onChange={(ev) => setEditForm({ ...editForm, date: ev.target.value })} />
                </td>
                <td>
                  <div className="edit-type-row">
                    <select value={editForm.type} onChange={(ev) => setEditForm({ ...editForm, type: ev.target.value })}>
                      <option value="bill">Bill / Purchase</option>
                      <option value="payment">Payment</option>
                    </select>
                    <input
                      value={editForm.description}
                      placeholder="Description"
                      onChange={(ev) => setEditForm({ ...editForm, description: ev.target.value })}
                    />
                  </div>
                  {editForm.type === 'payment' && (
                    <select
                      value={editForm.paymentMode}
                      onChange={(ev) => setEditForm({ ...editForm, paymentMode: ev.target.value })}
                      style={{ marginTop: 6 }}
                    >
                      <option value="cash">Cash</option>
                      <option value="phonepay">PhonePay / UPI</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="other">Other</option>
                    </select>
                  )}
                </td>
                <td>
                  {editForm.type === 'bill' ? (
                    <input value={editForm.billNumber} onChange={(ev) => setEditForm({ ...editForm, billNumber: ev.target.value })} />
                  ) : '-'}
                </td>
                <td>
                  <input value={editForm.category} placeholder="Category" onChange={(ev) => setEditForm({ ...editForm, category: ev.target.value })} />
                </td>
                <td className="num" colSpan={2}>
                  <input
                    type="number" min="0" step="0.01"
                    value={editForm.amount}
                    onChange={(ev) => setEditForm({ ...editForm, amount: ev.target.value })}
                    style={{ textAlign: 'right' }}
                  />
                </td>
                <td className="num">{fmt(e.runningBalance)}</td>
                <td><span className="muted">-</span></td>
                <td className="edit-actions">
                  <button className="btn-primary" style={{ padding: '5px 10px', fontSize: 12 }} disabled={saving} onClick={() => saveEdit(e._id)}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={cancelEdit}>Cancel</button>
                </td>
              </tr>
            ) : (
              <tr key={e._id}>
                <td>{fmtDate(e.date)}</td>
                <td>{e.description || (e.type === 'bill' ? 'Purchase / Bill' : `Payment${e.paymentMode ? ' - ' + e.paymentMode : ''}`)}</td>
                <td>{e.billNumber || '-'}</td>
                <td>{e.category || '-'}</td>
                <td className="num">{e.type === 'bill' ? fmt(e.amount) : ''}</td>
                <td className="num">{e.type === 'payment' ? fmt(e.amount) : ''}</td>
                <td className="num">{fmt(e.runningBalance)}</td>
                <td>
                  {e.documents && e.documents.length > 0
                    ? e.documents.map((d, i) => (
                        <a key={i} href={fileUrl(d.path)} target="_blank" rel="noreferrer" className="doc-link">
                          {d.mimeType === 'application/pdf' ? 'PDF' : 'Photo'} {i + 1}
                        </a>
                      ))
                    : <span className="muted">-</span>}
                </td>
                <td className="edit-actions">
                  <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => startEdit(e)}>Edit</button>
                  <button className="btn-danger-sm" onClick={() => handleDelete(e._id)}>Delete</button>
                </td>
              </tr>
            )
          )}
        </tbody>
        <tfoot>
          <tr className="totals-row">
            <td colSpan={4}>TOTAL</td>
            <td className="num">{fmt(totalBills)}</td>
            <td className="num">{fmt(totalPayments)}</td>
            <td className={`num ${balance > 0 ? 'due' : balance < 0 ? 'advance' : ''}`}>{fmt(balance)}</td>
            <td colSpan={2}></td>
          </tr>
        </tfoot>
      </table>
      <p className="balance-summary">
        {balance > 0
          ? <>Balance Due from Customer: <strong>Rs. {fmt(balance)}</strong></>
          : balance < 0
          ? <>Advance / Excess Paid by Customer: <strong>Rs. {fmt(Math.abs(balance))}</strong></>
          : <>Account settled. Balance: <strong>Rs. 0.00</strong></>}
      </p>
    </div>
  );
}
