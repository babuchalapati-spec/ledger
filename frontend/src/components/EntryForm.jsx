import { useEffect, useState } from 'react';
import { createEntry, extractBill, getEntryCategories } from '../api/client';

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  type: 'bill',
  date: todayStr(),
  description: '',
  billNumber: '',
  category: '',
  quantity: '',
  unit: '',
  amount: '',
  paymentMode: 'cash',
};

export default function EntryForm({ customerId, onAdded }) {
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => { getEntryCategories().then(setCategories).catch(() => {}); }, []);

  const handleScanBill = async () => {
    if (files.length !== 1) return;
    setScanning(true);
    setScanNote('');
    setError('');
    try {
      const fd = new FormData();
      fd.append('bill', files[0]);
      const extracted = await extractBill(fd);
      setForm((f) => ({
        ...f,
        billNumber: extracted.billNumber || f.billNumber,
        description: extracted.description || f.description,
        amount: extracted.amount || f.amount,
      }));
      setScanNote('Auto-filled from the bill — please check before saving.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not read the bill');
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.date) {
      setError('Please select the date for this entry');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('customer', customerId);
      fd.append('date', form.date);
      fd.append('type', form.type);
      fd.append('description', form.description);
      if (form.type === 'bill') {
        fd.append('billNumber', form.billNumber);
        fd.append('quantity', form.quantity);
        fd.append('unit', form.unit);
      }
      fd.append('category', form.category);
      fd.append('amount', form.amount);
      if (form.type === 'payment') fd.append('paymentMode', form.paymentMode);
      files.forEach((f) => fd.append('documents', f));

      await createEntry(fd);
      setForm({ ...emptyForm, date: form.date });
      setFiles([]);
      e.target.reset?.();
      onAdded();
      getEntryCategories().then(setCategories).catch(() => {});
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card entry-form" onSubmit={handleSubmit}>
      {error && <div className="error-banner" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="type-toggle">
        <button
          type="button"
          className={`type-btn type-btn-bill ${form.type === 'bill' ? 'active' : ''}`}
          onClick={() => setForm({ ...form, type: 'bill' })}
        >
          🧾 Bill / Purchase <span>(Cr)</span>
        </button>
        <button
          type="button"
          className={`type-btn type-btn-payment ${form.type === 'payment' ? 'active' : ''}`}
          onClick={() => setForm({ ...form, type: 'payment' })}
        >
          💵 Payment Received <span>(Dr)</span>
        </button>
      </div>

      <div className="form-grid">
      <label>
        Date *
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
      </label>

      {form.type === 'bill' && (
        <label>
          Bill Number
          <input value={form.billNumber} onChange={(e) => setForm({ ...form, billNumber: e.target.value })} />
        </label>
      )}

      {form.type === 'bill' && (
        <label>
          Quantity
          <input type="number" min="0" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="e.g. 10" />
        </label>
      )}

      {form.type === 'bill' && (
        <label>
          Unit
          <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. bags, tons, kg" />
        </label>
      )}

      {form.type === 'payment' && (
        <label>
          Payment Mode
          <select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
            <option value="cash">Cash</option>
            <option value="phonepay">PhonePay / UPI</option>
            <option value="bank">Bank Transfer</option>
            <option value="other">Other</option>
          </select>
        </label>
      )}

      <label>
        Description
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder={form.type === 'bill' ? 'e.g. Purchase of goods' : 'e.g. Part payment'}
        />
      </label>

      <label>
        Category
        <input
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          placeholder="e.g. Grocery, Hardware"
          list="entry-categories"
        />
        <datalist id="entry-categories">
          {categories.map((c) => <option key={c} value={c} />)}
        </datalist>
      </label>

      <label>
        Amount (Rs.) *
        <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
      </label>

      <label>
        Attach Bill / Proof (photo or PDF)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          onChange={(e) => { setFiles(Array.from(e.target.files)); setScanNote(''); }}
        />
      </label>

      {form.type === 'bill' && files.length === 1 && (
        <div style={{ gridColumn: '1 / -1' }}>
          <button type="button" className="btn-secondary" onClick={handleScanBill} disabled={scanning}>
            {scanning ? 'Reading bill...' : '🔍 Auto-fill from Bill (AI)'}
          </button>
          {scanNote && <span className="muted" style={{ marginLeft: 10, fontSize: 12 }}>{scanNote}</span>}
        </div>
      )}

      <button className="btn-primary" type="submit" disabled={saving}>
        {saving ? 'Saving...' : form.type === 'bill' ? 'Add Bill' : 'Add Payment'}
      </button>
      </div>
    </form>
  );
}
