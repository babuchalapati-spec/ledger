import { useState } from 'react';
import { parseStatement, bulkCreateEntries } from '../api/client';

export default function StatementImport({ customerId, onImported }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('statement', file);
      const { transactions } = await parseStatement(fd);
      setRows(transactions.map((t) => ({ ...t, include: true })));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not read the statement');
    } finally {
      setParsing(false);
    }
  };

  const updateRow = (i, field, value) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const removeRow = (i) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleImport = async () => {
    const toImport = rows.filter((r) => r.include).map(({ include, ...r }) => r);
    if (toImport.length === 0) return;
    setImporting(true);
    setError('');
    try {
      await bulkCreateEntries(customerId, toImport);
      setOpen(false);
      setFile(null);
      setRows(null);
      onImported();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not import the statement');
    } finally {
      setImporting(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
        📥 Import Statement (AI)
      </button>
    );
  }

  const includedCount = rows ? rows.filter((r) => r.include).length : 0;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="section-header">
        <h3 style={{ margin: 0 }}>Import Statement</h3>
        <button type="button" className="btn-secondary" onClick={() => { setOpen(false); setRows(null); setFile(null); }}>
          Cancel
        </button>
      </div>

      {error && <div className="error-banner" style={{ marginTop: 10 }}>{error}</div>}

      {!rows && (
        <div style={{ marginTop: 14 }}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setFile(e.target.files[0] || null)}
          />
          <button type="button" className="btn-primary" style={{ marginLeft: 10 }} onClick={handleParse} disabled={!file || parsing}>
            {parsing ? 'Reading statement...' : 'Read Statement'}
          </button>
        </div>
      )}

      {rows && (
        <>
          <p className="muted" style={{ marginTop: 10 }}>
            Found {rows.length} transaction{rows.length === 1 ? '' : 's'}. Review and edit before importing.
          </p>
          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Bill No</th>
                  <th>Description</th>
                  <th className="num">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td><input type="checkbox" checked={r.include} onChange={(e) => updateRow(i, 'include', e.target.checked)} /></td>
                    <td><input type="date" value={r.date} onChange={(e) => updateRow(i, 'date', e.target.value)} style={{ width: 130 }} /></td>
                    <td>
                      <select value={r.type} onChange={(e) => updateRow(i, 'type', e.target.value)}>
                        <option value="bill">Bill</option>
                        <option value="payment">Payment</option>
                      </select>
                    </td>
                    <td><input value={r.billNumber} onChange={(e) => updateRow(i, 'billNumber', e.target.value)} style={{ width: 90 }} /></td>
                    <td><input value={r.description} onChange={(e) => updateRow(i, 'description', e.target.value)} style={{ width: 180 }} /></td>
                    <td className="num"><input type="number" min="0" step="0.01" value={r.amount} onChange={(e) => updateRow(i, 'amount', e.target.value)} style={{ width: 90 }} /></td>
                    <td><button type="button" className="btn-danger-sm" onClick={() => removeRow(i)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn-primary" style={{ marginTop: 14 }} onClick={handleImport} disabled={importing || includedCount === 0}>
            {importing ? 'Importing...' : `Import ${includedCount} Entr${includedCount === 1 ? 'y' : 'ies'}`}
          </button>
        </>
      )}
    </div>
  );
}
