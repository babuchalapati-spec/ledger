import { useState } from 'react';
import { createEntry } from '../api/client';

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  type: 'bill',
  date: todayStr(),
  description: '',
  billNumber: '',
  amount: '',
  paymentMode: 'cash',
};

export default function EntryForm({ customerId, onAdded }) {
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
      if (form.type === 'bill') fd.append('billNumber', form.billNumber);
      fd.append('amount', form.amount);
      if (form.type === 'payment') fd.append('paymentMode', form.paymentMode);
      files.forEach((f) => fd.append('documents', f));

      await createEntry(fd);
      setForm({ ...emptyForm, date: form.date });
      setFiles([]);
      e.target.reset?.();
      onAdded();
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
          🧾 Bill / Purchase <span>(Credit)</span>
        </button>
        <button
          type="button"
          className={`type-btn type-btn-payment ${form.type === 'payment' ? 'active' : ''}`}
          onClick={() => setForm({ ...form, type: 'payment' })}
        >
          💵 Payment Received <span>(Debit)</span>
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
        Amount (Rs.) *
        <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
      </label>

      <label>
        Attach Bill / Proof (photo or PDF)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files))}
        />
      </label>

      <button className="btn-primary" type="submit" disabled={saving}>
        {saving ? 'Saving...' : form.type === 'bill' ? 'Add Bill' : 'Add Payment'}
      </button>
      </div>
    </form>
  );
}
