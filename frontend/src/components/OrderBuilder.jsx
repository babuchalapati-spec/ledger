import { useEffect, useMemo, useState } from 'react';
import { getItems, createOrder, getOrders, receiveOrder, deleteOrder } from '../api/client';
import { unitOptionsFor, factorFor } from '../utils/units';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function OrderBuilder() {
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]); // { itemId, unitLabel, quantity }
  const [date, setDate] = useState(todayStr());
  const [orderedFor, setOrderedFor] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    getItems().then(setItems).catch(() => {});
    getOrders().then(setOrders).catch(() => {});
  };

  useEffect(load, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return items.filter(
      (i) => i.name.toLowerCase().includes(q) || (i.nameTelugu || '').includes(search.trim())
    );
  }, [items, search]);

  const addRow = (item) => {
    if (rows.some((r) => r.itemId === item._id)) return;
    setRows([...rows, { itemId: item._id, unitLabel: unitOptionsFor(item.unitType)[0].label, quantity: 1 }]);
  };

  const removeRow = (itemId) => setRows(rows.filter((r) => r.itemId !== itemId));
  const updateRow = (itemId, patch) => setRows(rows.map((r) => (r.itemId === itemId ? { ...r, ...patch } : r)));
  const itemById = (id) => items.find((i) => i._id === id);

  const lineTotal = (row) => {
    const item = itemById(row.itemId);
    if (!item) return 0;
    return (Number(row.quantity) || 0) * factorFor(item.unitType, row.unitLabel) * item.pricePerUnit;
  };

  const total = rows.reduce((s, r) => s + lineTotal(r), 0);

  const handleSubmit = async () => {
    setError('');
    if (rows.length === 0) return setError('Add at least one item to the order');
    for (const r of rows) {
      if (!(Number(r.quantity) > 0)) return setError('Enter a valid quantity for every item');
    }
    setSaving(true);
    try {
      await createOrder({
        date,
        orderedFor,
        notes,
        items: rows.map((r) => ({ itemId: r.itemId, unitLabel: r.unitLabel, quantity: Number(r.quantity) })),
      });
      setRows([]);
      setOrderedFor('');
      setNotes('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReceive = async (id) => {
    await receiveOrder(id);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this order?')) return;
    await deleteOrder(id);
    load();
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN');

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>New Order</h3>
      <div className="card">
        {error && <div className="error-banner" style={{ marginBottom: 14 }}>{error}</div>}

        <div className="form-grid" style={{ marginBottom: 16 }}>
          <label>
            Order Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Ordered For (optional)
            <input value={orderedFor} onChange={(e) => setOrderedFor(e.target.value)} placeholder="e.g. Monthly groceries" />
          </label>
          <label>
            Notes
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. From Sri Ganesh Kirana Store" />
          </label>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, fontSize: 13, fontWeight: 600 }}>
          Search Items (English or Telugu)
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="rice / బియ్యం"
            style={{ padding: '9px 11px', border: '1px solid var(--border-strong)', borderRadius: 6, fontFamily: 'inherit', fontSize: 14 }}
          />
        </label>

        {search && (
          <div className="item-picker">
            {filteredItems.slice(0, 8).map((item) => (
              <button
                type="button"
                key={item._id}
                className="item-pick-btn"
                onClick={() => { addRow(item); setSearch(''); }}
              >
                {item.name}{item.nameTelugu ? ` / ${item.nameTelugu}` : ''}
              </button>
            ))}
            {filteredItems.length === 0 && <p className="muted">No matching items in your inventory.</p>}
          </div>
        )}

        {rows.length > 0 && (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th className="num">Line Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const item = itemById(r.itemId);
                  if (!item) return null;
                  return (
                    <tr key={r.itemId}>
                      <td>{item.name}{item.nameTelugu ? ` / ${item.nameTelugu}` : ''}</td>
                      <td>
                        <input
                          type="number" min="0" step="0.5" style={{ width: 80 }}
                          value={r.quantity}
                          onChange={(e) => updateRow(r.itemId, { quantity: e.target.value })}
                        />
                      </td>
                      <td>
                        <select value={r.unitLabel} onChange={(e) => updateRow(r.itemId, { unitLabel: e.target.value })}>
                          {unitOptionsFor(item.unitType).map((o) => (
                            <option key={o.label} value={o.label}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="num">Rs. {fmt(lineTotal(r))}</td>
                      <td><button className="btn-danger-sm" onClick={() => removeRow(r.itemId)}>Remove</button></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="totals-row">
                  <td colSpan={3}>TOTAL</td>
                  <td className="num">Rs. {fmt(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <button className="btn-primary" style={{ marginTop: 16 }} onClick={handleSubmit} disabled={saving || rows.length === 0}>
          {saving ? 'Placing Order...' : 'Place Order'}
        </button>
      </div>

      <h3>Order History</h3>
      {orders.length === 0 ? (
        <p className="muted">No orders yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Items</th>
                <th>Ordered For</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id}>
                  <td>{fmtDate(o.date)}</td>
                  <td>{o.items.map((it) => `${it.name} (${it.quantity} x ${it.unitLabel})`).join(', ')}</td>
                  <td>{o.orderedFor || '-'}</td>
                  <td className="num">Rs. {fmt(o.totalAmount)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{o.status}</td>
                  <td className="edit-actions">
                    {o.status === 'pending' && (
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleReceive(o._id)}>Mark Received</button>
                    )}
                    <button className="btn-danger-sm" onClick={() => handleDelete(o._id)}>Delete</button>
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
