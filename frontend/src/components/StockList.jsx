import { Fragment, useEffect, useState } from 'react';
import { getItems, createItem, updateItem, deleteItem, restockItem, seedDefaultItems } from '../api/client';
import { unitOptionsFor, standardUnitFor } from '../utils/units';

const emptyForm = {
  name: '', nameTelugu: '', category: 'General', unitType: 'weight',
  pricePerUnit: '', stockQty: '', lowStockThreshold: '',
};

export default function StockList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [restockFor, setRestockFor] = useState(null);
  const [restockForm, setRestockForm] = useState({ quantity: '', unitLabel: '' });
  const [seeding, setSeeding] = useState(false);

  const load = () => {
    setLoading(true);
    getItems().then(setItems).catch((err) => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Item name is required');
    try {
      const payload = {
        name: form.name,
        nameTelugu: form.nameTelugu,
        category: form.category || 'General',
        unitType: form.unitType,
        pricePerUnit: Number(form.pricePerUnit) || 0,
        stockQty: Number(form.stockQty) || 0,
        lowStockThreshold: Number(form.lowStockThreshold) || 0,
      };
      if (editingId) await updateItem(editingId, payload);
      else await createItem(payload);
      resetForm();
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const startEdit = (item) => {
    setForm({
      name: item.name,
      nameTelugu: item.nameTelugu || '',
      category: item.category,
      unitType: item.unitType,
      pricePerUnit: item.pricePerUnit,
      stockQty: item.stockQty,
      lowStockThreshold: item.lowStockThreshold,
    });
    setEditingId(item._id);
    setShowForm(true);
    setRestockFor(null);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}" from your inventory?`)) return;
    await deleteItem(id);
    load();
  };

  const startRestock = (item) => {
    setRestockFor(item._id);
    setRestockForm({ quantity: '', unitLabel: unitOptionsFor(item.unitType)[0].label });
    setShowForm(false);
  };

  const submitRestock = async (item) => {
    if (!(Number(restockForm.quantity) > 0)) {
      setError('Enter a valid quantity to add');
      return;
    }
    setError('');
    try {
      await restockItem(item._id, { quantity: Number(restockForm.quantity), unitLabel: restockForm.unitLabel });
      setRestockFor(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setError('');
    try {
      const res = await seedDefaultItems();
      load();
      if (res.inserted === 0) alert('All default items are already in your inventory.');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSeeding(false);
    }
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  const grouped = items.reduce((acc, item) => {
    const cat = item.category || 'General';
    acc[cat] = acc[cat] || [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div>
      <div className="section-header">
        <h3 style={{ margin: 0 }}>Grocery Items</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={handleSeed} disabled={seeding}>
            {seeding ? 'Loading...' : '📥 Load Default Grocery Items'}
          </button>
          <button className="btn-primary" onClick={() => (showForm ? resetForm() : (setShowForm(true), setRestockFor(null)))}>
            {showForm ? 'Cancel' : '+ New Item'}
          </button>
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      {showForm && (
        <form className="card form-grid" onSubmit={handleSubmit}>
          <label>
            Item Name (English) *
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Item Name (Telugu)
            <input value={form.nameTelugu} onChange={(e) => setForm({ ...form, nameTelugu: e.target.value })} placeholder="e.g. బియ్యం" />
          </label>
          <label>
            Category
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Grains & Rice" />
          </label>
          <label>
            Unit Type
            <select value={form.unitType} onChange={(e) => setForm({ ...form, unitType: e.target.value })}>
              <option value="weight">Weight (kg / g)</option>
              <option value="volume">Volume (litres / ml)</option>
              <option value="count">Count (pieces)</option>
            </select>
          </label>
          <label>
            Price per {standardUnitFor(form.unitType)} (Rs.)
            <input type="number" min="0" step="0.01" value={form.pricePerUnit} onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })} />
          </label>
          <label>
            Current Stock ({standardUnitFor(form.unitType)})
            <input type="number" min="0" step="0.01" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} />
          </label>
          <label>
            Low Stock Alert Below ({standardUnitFor(form.unitType)})
            <input type="number" min="0" step="0.01" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />
          </label>
          <button className="btn-primary" type="submit">{editingId ? 'Save Changes' : 'Add Item'}</button>
        </form>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p className="muted">No items yet. Click "📥 Load Default Grocery Items" to start, or add your own with "+ New Item".</p>
      ) : (
        Object.keys(grouped).sort().map((cat) => (
          <div key={cat}>
            <h3>{cat}</h3>
            <div className="table-wrap">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="num">Stock</th>
                    <th className="num">Price</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[cat].map((item) => {
                    const low = item.lowStockThreshold > 0 && item.stockQty <= item.lowStockThreshold;
                    return (
                      <Fragment key={item._id}>
                        <tr>
                          <td>
                            {item.name}{item.nameTelugu ? ` / ${item.nameTelugu}` : ''}
                            {low && <span className="low-stock-badge">⚠ Low</span>}
                          </td>
                          <td className="num">{fmt(item.stockQty)} {standardUnitFor(item.unitType)}</td>
                          <td className="num">Rs. {fmt(item.pricePerUnit)}/{standardUnitFor(item.unitType)}</td>
                          <td className="edit-actions">
                            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => startRestock(item)}>+ Restock</button>
                            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => startEdit(item)}>Edit</button>
                            <button className="btn-danger-sm" onClick={() => handleDelete(item._id, item.name)}>Delete</button>
                          </td>
                        </tr>
                        {restockFor === item._id && (
                          <tr className="editing-row">
                            <td colSpan={4}>
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                <span>Add stock:</span>
                                <input
                                  type="number" min="0" step="0.5" style={{ width: 90 }}
                                  value={restockForm.quantity}
                                  onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })}
                                />
                                <select
                                  value={restockForm.unitLabel}
                                  onChange={(e) => setRestockForm({ ...restockForm, unitLabel: e.target.value })}
                                >
                                  {unitOptionsFor(item.unitType).map((o) => (
                                    <option key={o.label} value={o.label}>{o.label}</option>
                                  ))}
                                </select>
                                <button className="btn-primary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => submitRestock(item)}>Add</button>
                                <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setRestockFor(null)}>Cancel</button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
