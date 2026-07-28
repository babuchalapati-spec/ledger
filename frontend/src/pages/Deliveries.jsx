import { Fragment, useEffect, useState } from 'react';
import {
  getDeliveries, createDelivery, updateDelivery, markDelivered, deleteDelivery,
  uploadDeliveryInvoice, fileUrl,
} from '../api/client';

const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const emptyForm = { deliveryTime: nowLocal(), items: '', notes: '' };

export default function Deliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [rescheduleFor, setRescheduleFor] = useState(null);
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [invoiceFor, setInvoiceFor] = useState(null);
  const [invoiceFiles, setInvoiceFiles] = useState([]);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  const load = () => {
    setLoading(true);
    getDeliveries().then(setDeliveries).catch((err) => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.deliveryTime) return setError('Delivery date & time is required');
    if (!form.items.trim()) return setError('Please describe what needs to be delivered');
    setSaving(true);
    try {
      await createDelivery(form);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeliver = async (id) => {
    await markDelivered(id);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this delivery record?')) return;
    await deleteDelivery(id);
    load();
  };

  const startReschedule = (d) => {
    setRescheduleFor(d._id);
    setRescheduleTime(new Date(d.deliveryTime).toISOString().slice(0, 16));
    setInvoiceFor(null);
  };

  const submitReschedule = async (id) => {
    await updateDelivery(id, { deliveryTime: rescheduleTime });
    setRescheduleFor(null);
    load();
  };

  const startInvoice = (d) => {
    setInvoiceFor(d._id);
    setInvoiceFiles([]);
    setRescheduleFor(null);
  };

  const submitInvoice = async (id) => {
    if (invoiceFiles.length === 0) return;
    setUploadingInvoice(true);
    try {
      const fd = new FormData();
      invoiceFiles.forEach((f) => fd.append('invoiceDocuments', f));
      await uploadDeliveryInvoice(id, fd);
      setInvoiceFiles([]);
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUploadingInvoice(false);
    }
  };

  const fmtDateTime = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <h2>🚚 Deliveries</h2>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      <form className="card form-grid" onSubmit={handleSubmit}>
        <label>
          Delivery Date & Time *
          <input type="datetime-local" value={form.deliveryTime} onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })} required />
        </label>
        <label>
          Items to Deliver *
          <input value={form.items} onChange={(e) => setForm({ ...form, items: e.target.value })} placeholder="e.g. 2 bags cement, 5 pipes" required />
        </label>
        <label>
          Notes
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Deliver to back gate" />
        </label>
        <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Scheduling...' : 'Schedule Delivery'}</button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : deliveries.length === 0 ? (
        <p className="muted">No deliveries scheduled yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Delivery Time</th>
                <th>Items</th>
                <th>Notes</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <Fragment key={d._id}>
                  <tr>
                    <td>{fmtDateTime(d.deliveryTime)}</td>
                    <td>{d.items}</td>
                    <td>{d.notes || '-'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{d.status}</td>
                    <td className="edit-actions">
                      {d.status === 'pending' && (
                        <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDeliver(d._id)}>✓ Mark Delivered</button>
                      )}
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => startReschedule(d)}>📅 Reschedule</button>
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => startInvoice(d)}>📎 Invoice{d.invoiceDocuments?.length ? ` (${d.invoiceDocuments.length})` : ''}</button>
                      <button className="btn-danger-sm" onClick={() => handleDelete(d._id)}>Delete</button>
                    </td>
                  </tr>
                  {rescheduleFor === d._id && (
                    <tr className="editing-row">
                      <td colSpan={5}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span>New date &amp; time:</span>
                          <input type="datetime-local" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} />
                          <button className="btn-primary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => submitReschedule(d._id)}>Save</button>
                          <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setRescheduleFor(null)}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {invoiceFor === d._id && (
                    <tr className="editing-row">
                      <td colSpan={5}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span>Attach invoice:</span>
                          <input
                            type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={(e) => setInvoiceFiles(Array.from(e.target.files))}
                          />
                          <button className="btn-primary" style={{ padding: '5px 12px', fontSize: 12 }} disabled={uploadingInvoice || invoiceFiles.length === 0} onClick={() => submitInvoice(d._id)}>
                            {uploadingInvoice ? 'Uploading...' : 'Upload'}
                          </button>
                          <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setInvoiceFor(null)}>Close</button>
                          {d.invoiceDocuments?.map((doc, i) => (
                            <a key={i} href={fileUrl(doc.path)} target="_blank" rel="noreferrer" className="doc-link">
                              {doc.mimeType === 'application/pdf' ? 'PDF' : 'Photo'} {i + 1}
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
