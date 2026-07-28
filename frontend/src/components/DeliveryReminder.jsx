import { useEffect, useState } from 'react';
import { getOrders, receiveOrder, updateOrder } from '../api/client';

const todayStr = () => new Date().toISOString().slice(0, 10);
const dateOnly = (d) => new Date(d).toISOString().slice(0, 10);

export default function DeliveryReminder() {
  const [dueOrders, setDueOrders] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const [rescheduleFor, setRescheduleFor] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');

  const load = () => {
    getOrders()
      .then((orders) => {
        const today = todayStr();
        const due = orders.filter((o) => o.status === 'pending' && o.deliveryDate && dateOnly(o.deliveryDate) <= today);
        setDueOrders(due);
      })
      .catch(() => {});
  };

  useEffect(load, []);

  if (dismissed || dueOrders.length === 0) return null;

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN');
  const isOverdue = (d) => dateOnly(d) < todayStr();

  const handleReceive = async (id) => {
    await receiveOrder(id);
    load();
  };

  const startReschedule = (o) => {
    setRescheduleFor(o._id);
    setRescheduleDate(todayStr());
  };

  const submitReschedule = async (id) => {
    await updateOrder(id, { deliveryDate: rescheduleDate });
    setRescheduleFor(null);
    load();
  };

  return (
    <div className="reminder-overlay">
      <div className="reminder-modal">
        <div className="reminder-header">
          <h3>📦 Today's Deliveries</h3>
          <button className="btn-link" onClick={() => setDismissed(true)}>✕</button>
        </div>
        <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>
          Orders due for delivery today or earlier. Mark them received, or reschedule if delayed.
        </p>
        <div className="reminder-list">
          {dueOrders.map((o) => (
            <div key={o._id} className="reminder-item">
              <div className="reminder-item-info">
                <div className={`reminder-date ${isOverdue(o.deliveryDate) ? 'overdue' : ''}`}>
                  {isOverdue(o.deliveryDate) ? '⚠ Overdue: ' : 'Due: '}{fmtDate(o.deliveryDate)}
                </div>
                <div className="reminder-items-summary">
                  {o.items.map((it) => `${it.name} (${it.quantity} x ${it.unitLabel})`).join(', ')}
                </div>
                {o.orderedFor && <div className="muted">For: {o.orderedFor}</div>}
              </div>
              {rescheduleFor === o._id ? (
                <div className="reminder-actions">
                  <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
                  <button className="btn-primary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => submitReschedule(o._id)}>Save</button>
                  <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setRescheduleFor(null)}>Cancel</button>
                </div>
              ) : (
                <div className="reminder-actions">
                  <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleReceive(o._id)}>✓ Mark Received</button>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => startReschedule(o)}>📅 Reschedule</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
