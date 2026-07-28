import { useEffect, useState } from 'react';
import { getDeliveries, markDelivered, updateDelivery } from '../api/client';

const todayStr = () => new Date().toISOString().slice(0, 10);
const dateOnly = (d) => new Date(d).toISOString().slice(0, 10);

const toDatetimeLocal = (d) => {
  const dt = new Date(d);
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().slice(0, 16);
};

export default function DeliveryReminder() {
  const [dueDeliveries, setDueDeliveries] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const [rescheduleFor, setRescheduleFor] = useState(null);
  const [rescheduleTime, setRescheduleTime] = useState('');

  const load = () => {
    getDeliveries()
      .then((deliveries) => {
        const today = todayStr();
        const due = deliveries.filter((d) => d.status === 'pending' && dateOnly(d.deliveryTime) <= today);
        setDueDeliveries(due);
      })
      .catch(() => {});
  };

  useEffect(load, []);

  if (dismissed || dueDeliveries.length === 0) return null;

  const fmtDateTime = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const isOverdue = (d) => dateOnly(d) < todayStr();

  const handleDeliver = async (id) => {
    await markDelivered(id);
    load();
  };

  const startReschedule = (d) => {
    setRescheduleFor(d._id);
    setRescheduleTime(toDatetimeLocal(new Date()));
  };

  const submitReschedule = async (id) => {
    await updateDelivery(id, { deliveryTime: rescheduleTime });
    setRescheduleFor(null);
    load();
  };

  return (
    <div className="reminder-overlay">
      <div className="reminder-modal">
        <div className="reminder-header">
          <h3>🚚 Today's Deliveries</h3>
          <button className="btn-link" onClick={() => setDismissed(true)}>✕</button>
        </div>
        <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>
          Deliveries due today or earlier. Mark them delivered, or reschedule if delayed.
        </p>
        <div className="reminder-list">
          {dueDeliveries.map((d) => (
            <div key={d._id} className="reminder-item">
              <div className="reminder-item-info">
                <div className={`reminder-date ${isOverdue(d.deliveryTime) ? 'overdue' : ''}`}>
                  {isOverdue(d.deliveryTime) ? '⚠ Overdue: ' : 'Due: '}{fmtDateTime(d.deliveryTime)}
                </div>
                <div className="reminder-items-summary">{d.items}</div>
                {d.notes && <div className="muted">{d.notes}</div>}
              </div>
              {rescheduleFor === d._id ? (
                <div className="reminder-actions">
                  <input type="datetime-local" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} />
                  <button className="btn-primary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => submitReschedule(d._id)}>Save</button>
                  <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setRescheduleFor(null)}>Cancel</button>
                </div>
              ) : (
                <div className="reminder-actions">
                  <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleDeliver(d._id)}>✓ Mark Delivered</button>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => startReschedule(d)}>📅 Reschedule</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
