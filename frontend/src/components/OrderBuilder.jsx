import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  getItems, createOrder, updateOrder, getOrders, receiveOrder, deleteOrder,
  uploadOrderInvoice, orderViewUrl, shoppingListDownloadUrl, fileUrl,
} from '../api/client';
import { unitOptionsFor, factorFor } from '../utils/units';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function OrderBuilder() {
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [rows, setRows] = useState([]); // { itemId, unitLabel, quantity, rate }
  const [date, setDate] = useState(todayStr());
  const [deliveryDate, setDeliveryDate] = useState('');
  const [orderedFor, setOrderedFor] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [rescheduleFor, setRescheduleFor] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [invoiceFor, setInvoiceFor] = useState(null);
  const [invoiceFiles, setInvoiceFiles] = useState([]);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  const load = () => {
    getItems().then(setItems).catch(() => {});
    getOrders().then(setOrders).catch(() => {});
  };

  useEffect(load, []);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category || 'General'));
    return ['All', ...Array.from(set).sort()];
  }, [items]);

  const catalogItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      return items.filter(
        (i) => i.name.toLowerCase().includes(q) || (i.nameTelugu || '').includes(search.trim())
      );
    }
    if (category === 'All') return items;
    return items.filter((i) => (i.category || 'General') === category);
  }, [items, search, category]);

  const inCart = (itemId) => rows.some((r) => r.itemId === itemId);

  const addRow = (item) => {
    if (inCart(item._id)) return;
    setRows([...rows, {
      itemId: item._id,
      unitLabel: unitOptionsFor(item.unitType)[0].label,
      quantity: 1,
      rate: item.pricePerUnit,
    }]);
  };

  const removeRow = (itemId) => setRows(rows.filter((r) => r.itemId !== itemId));
  const updateRow = (itemId, patch) => setRows(rows.map((r) => (r.itemId === itemId ? { ...r, ...patch } : r)));
  const itemById = (id) => items.find((i) => i._id === id);

  const lineTotal = (row) => {
    const item = itemById(row.itemId);
    if (!item) return 0;
    return (Number(row.quantity) || 0) * factorFor(item.unitType, row.unitLabel) * (Number(row.rate) || 0);
  };

  const total = rows.reduce((s, r) => s + lineTotal(r), 0);

  const handleSubmit = async () => {
    setError('');
    if (rows.length === 0) return setError('Add at least one item to the order');
    for (const r of rows) {
      if (!(Number(r.quantity) > 0)) return setError('Enter a valid quantity for every item');
      if (!(Number(r.rate) >= 0)) return setError('Enter a valid rate for every item');
    }
    setSaving(true);
    try {
      await createOrder({
        date,
        deliveryDate: deliveryDate || undefined,
        orderedFor,
        notes,
        items: rows.map((r) => ({ itemId: r.itemId, unitLabel: r.unitLabel, quantity: Number(r.quantity), rate: Number(r.rate) })),
      });
      setRows([]);
      setDeliveryDate('');
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

  const startReschedule = (order) => {
    setRescheduleFor(order._id);
    setRescheduleDate(order.deliveryDate ? new Date(order.deliveryDate).toISOString().slice(0, 10) : todayStr());
    setInvoiceFor(null);
  };

  const submitReschedule = async (id) => {
    await updateOrder(id, { deliveryDate: rescheduleDate });
    setRescheduleFor(null);
    load();
  };

  const startInvoice = (order) => {
    setInvoiceFor(order._id);
    setInvoiceFiles([]);
    setRescheduleFor(null);
  };

  const submitInvoice = async (id) => {
    if (invoiceFiles.length === 0) return;
    setUploadingInvoice(true);
    try {
      const fd = new FormData();
      invoiceFiles.forEach((f) => fd.append('invoiceDocuments', f));
      await uploadOrderInvoice(id, fd);
      setInvoiceFiles([]);
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUploadingInvoice(false);
    }
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
            Delivery Date (optional)
            <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
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

        {!search && (
          <div className="category-pills">
            {categories.map((c) => (
              <button
                type="button"
                key={c}
                className={`category-pill ${category === c ? 'active' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="item-catalog">
          {catalogItems.length === 0 && <p className="muted">No matching items in your inventory.</p>}
          {catalogItems.map((item) => (
            <div key={item._id} className="catalog-card">
              <div className="catalog-card-name">
                {item.name}{item.nameTelugu ? <span className="muted"> / {item.nameTelugu}</span> : ''}
              </div>
              <div className="catalog-card-price">Rs. {fmt(item.pricePerUnit)}</div>
              {inCart(item._id) ? (
                <button type="button" className="btn-secondary catalog-added" disabled>✓ In Cart</button>
              ) : (
                <button type="button" className="btn-primary catalog-add-btn" onClick={() => addRow(item)}>+ Add</button>
              )}
            </div>
          ))}
        </div>

        {rows.length > 0 && (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th className="num">MRP</th>
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
                          type="number" min="0" step="0.5" style={{ width: 70 }}
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
                      <td className="num">
                        <input
                          type="number" min="0" step="0.01" style={{ width: 80, textAlign: 'right' }}
                          value={r.rate}
                          onChange={(e) => updateRow(r.itemId, { rate: e.target.value })}
                        />
                      </td>
                      <td className="num">Rs. {fmt(lineTotal(r))}</td>
                      <td><button className="btn-danger-sm" onClick={() => removeRow(r.itemId)}>Remove</button></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="totals-row">
                  <td colSpan={4}>TOTAL</td>
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
                <th>Delivery</th>
                <th>Items</th>
                <th>Ordered For</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <Fragment key={o._id}>
                  <tr>
                    <td>{fmtDate(o.date)}</td>
                    <td>{o.deliveryDate ? fmtDate(o.deliveryDate) : '-'}</td>
                    <td>{o.items.map((it) => `${it.name} (${it.quantity} x ${it.unitLabel})`).join(', ')}</td>
                    <td>{o.orderedFor || '-'}</td>
                    <td className="num">Rs. {fmt(o.totalAmount)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{o.status}</td>
                    <td className="edit-actions">
                      <a className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} href={orderViewUrl(o._id)} target="_blank" rel="noreferrer">👁 View</a>
                      <a className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} href={shoppingListDownloadUrl(o._id)} target="_blank" rel="noreferrer">📋 Item List</a>
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => startReschedule(o)}>📅 Reschedule</button>
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => startInvoice(o)}>📎 Invoice{o.invoiceDocuments?.length ? ` (${o.invoiceDocuments.length})` : ''}</button>
                      {o.status === 'pending' && (
                        <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleReceive(o._id)}>Mark Received</button>
                      )}
                      <button className="btn-danger-sm" onClick={() => handleDelete(o._id)}>Delete</button>
                    </td>
                  </tr>
                  {rescheduleFor === o._id && (
                    <tr className="editing-row">
                      <td colSpan={7}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span>Delivery date:</span>
                          <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
                          <button className="btn-primary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => submitReschedule(o._id)}>Save</button>
                          <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setRescheduleFor(null)}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {invoiceFor === o._id && (
                    <tr className="editing-row">
                      <td colSpan={7}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span>Attach invoice:</span>
                          <input
                            type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={(e) => setInvoiceFiles(Array.from(e.target.files))}
                          />
                          <button className="btn-primary" style={{ padding: '5px 12px', fontSize: 12 }} disabled={uploadingInvoice || invoiceFiles.length === 0} onClick={() => submitInvoice(o._id)}>
                            {uploadingInvoice ? 'Uploading...' : 'Upload'}
                          </button>
                          <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setInvoiceFor(null)}>Close</button>
                          {o.invoiceDocuments?.map((d, i) => (
                            <a key={i} href={fileUrl(d.path)} target="_blank" rel="noreferrer" className="doc-link">
                              {d.mimeType === 'application/pdf' ? 'PDF' : 'Photo'} {i + 1}
                            </a>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
