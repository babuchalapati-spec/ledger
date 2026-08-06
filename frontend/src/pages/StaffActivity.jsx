import { useEffect, useState } from 'react';
import { getLoginSessions, getActivityLog, getAccountUsers } from '../api/client';

const actionColors = {
  create: '#1a7f37',
  update: '#9a6700',
  delete: '#cf222e',
};

const actionLabels = {
  create: 'added',
  update: 'updated',
  delete: 'deleted',
};

const avatarColors = ['#5865f2', '#eb459e', '#faa61a', '#3ba55d', '#ed4245', '#00a8fc'];

function colorForEmail(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function dayLabel(value) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function groupByDay(logs) {
  const groups = [];
  let current = null;
  logs.forEach((log) => {
    const label = dayLabel(log.createdAt);
    if (!current || current.label !== label) {
      current = { label, items: [] };
      groups.push(current);
    }
    current.items.push(log);
  });
  return groups;
}

function SessionsTab() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getLoginSessions()
      .then(setSessions)
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading sessions...</p>;
  if (error) return <div className="error-banner">{error}</div>;
  if (sessions.length === 0) return <p className="muted">No login activity recorded yet.</p>;

  return (
    <div className="table-wrap">
      <table className="ledger-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Logged in</th>
            <th>Logged out</th>
            <th>IP Address</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s._id}>
              <td>{s.email}</td>
              <td style={{ textTransform: 'capitalize' }}>{s.role}</td>
              <td>{formatDateTime(s.loginAt)}</td>
              <td>{s.logoutAt ? formatDateTime(s.logoutAt) : <span style={{ color: '#1a7f37' }}>Still logged in</span>}</td>
              <td>{s.ip || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityTab() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ userEmail: '', action: '', entityType: '' });

  const load = (params) => {
    setLoading(true);
    getActivityLog(params)
      .then(setLogs)
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getAccountUsers().then(setUsers).catch(() => {});
    load({});
  }, []);

  const applyFilters = (e) => {
    e.preventDefault();
    const params = {};
    if (filters.userEmail) params.userEmail = filters.userEmail;
    if (filters.action) params.action = filters.action;
    if (filters.entityType) params.entityType = filters.entityType;
    load(params);
  };

  const entityTypes = ['Customer', 'Entry', 'Item', 'Order', 'Delivery', 'Project', 'ProjectExpense'];
  const groups = groupByDay(logs);

  return (
    <div>
      <form className="form-grid" onSubmit={applyFilters} style={{ marginBottom: 16, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <label>
          Staff
          <select value={filters.userEmail} onChange={(e) => setFilters({ ...filters, userEmail: e.target.value })}>
            <option value="">All</option>
            {users.map((u) => <option key={u.email} value={u.email}>{u.email}</option>)}
          </select>
        </label>
        <label>
          Action
          <select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
            <option value="">All</option>
            <option value="create">Added</option>
            <option value="update">Updated</option>
            <option value="delete">Deleted</option>
          </select>
        </label>
        <label>
          Type
          <select value={filters.entityType} onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}>
            <option value="">All</option>
            {entityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <button className="btn-secondary" type="submit" style={{ alignSelf: 'end' }}>Filter</button>
      </form>

      {loading ? (
        <p>Loading activity...</p>
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : logs.length === 0 ? (
        <p className="muted">No activity recorded yet.</p>
      ) : (
        <div className="card activity-feed">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="activity-feed-day">{group.label}</div>
              {group.items.map((l) => (
                <div key={l._id} className="activity-feed-item">
                  <div className="activity-feed-avatar" style={{ background: colorForEmail(l.userEmail) }}>
                    {l.userEmail[0].toUpperCase()}
                  </div>
                  <div className="activity-feed-body">
                    <div className="activity-feed-header">
                      <strong>{l.userEmail}</strong>
                      <span className="muted" style={{ textTransform: 'capitalize', fontSize: '0.85em' }}>{l.role}</span>
                      <span className="muted activity-feed-time">{formatTime(l.createdAt)}</span>
                    </div>
                    <div>
                      <span style={{ color: actionColors[l.action] || '#333', fontWeight: 600 }}>
                        {actionLabels[l.action] || l.action}
                      </span>{' '}
                      {l.summary}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StaffActivity() {
  const [tab, setTab] = useState('activity');

  return (
    <div className="staff-activity-page">
      <div className="section-header">
        <h2>📋 Staff Activity</h2>
        <div className="tab-switch">
          <button className={`tab-btn ${tab === 'activity' ? 'active' : ''}`} onClick={() => setTab('activity')}>Activity Log</button>
          <button className={`tab-btn ${tab === 'sessions' ? 'active' : ''}`} onClick={() => setTab('sessions')}>Login Sessions</button>
        </div>
      </div>
      <p className="muted" style={{ marginBottom: 16 }}>
        See who logged in and out, and every add, edit, or delete staff have made across the app.
      </p>
      {tab === 'activity' ? <ActivityTab /> : <SessionsTab />}
    </div>
  );
}
