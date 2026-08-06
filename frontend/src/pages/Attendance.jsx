import { useEffect, useState } from 'react';
import { checkInAttendance, getTodayAttendance, getAttendanceRegister, getAccountUsers, getSalaryReport, payslipViewUrl, payslipDownloadUrl, fileUrl } from '../api/client';

const currentMonth = () => new Date().toISOString().slice(0, 7);

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

function CheckInCard({ onCheckedIn }) {
  const [status, setStatus] = useState(null); // null = loading
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    getTodayAttendance().then(setStatus).catch(() => setStatus({ checkedIn: false }));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photo) {
      setError('A photo is required to mark attendance');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const loc = await getLocation();
      const formData = new FormData();
      formData.append('photo', photo);
      if (loc) {
        formData.append('lat', loc.lat);
        formData.append('lng', loc.lng);
      }
      await checkInAttendance(formData);
      setPhoto(null);
      load();
      onCheckedIn?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === null) return <p>Loading...</p>;

  return (
    <div className="card">
      <h3 style={{ margin: '0 0 10px' }}>🕐 Mark My Attendance</h3>
      {status.checkedIn ? (
        <p className="success-banner">
          You marked attendance today at {formatDateTime(status.record?.checkedInAt)}.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="form-grid">
          {error && <div className="error-banner">{error}</div>}
          <label>
            Photo
            <input type="file" accept="image/*" capture="user" onChange={(e) => setPhoto(e.target.files[0])} />
          </label>
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Marking...' : '✓ Mark Attendance'}
          </button>
        </form>
      )}
    </div>
  );
}

function RegisterTable() {
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ userEmail: '', from: '', to: '' });

  const load = (params) => {
    setLoading(true);
    getAttendanceRegister(params)
      .then(setRecords)
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
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    load(params);
  };

  return (
    <div className="card">
      <h3 style={{ margin: '0 0 10px' }}>📋 Attendance Register</h3>
      <form className="form-grid" onSubmit={applyFilters} style={{ marginBottom: 16, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <label>
          Staff
          <select value={filters.userEmail} onChange={(e) => setFilters({ ...filters, userEmail: e.target.value })}>
            <option value="">All</option>
            {users.map((u) => <option key={u.email} value={u.email}>{u.email}</option>)}
          </select>
        </label>
        <label>
          From
          <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        </label>
        <label>
          To
          <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </label>
        <button className="btn-secondary" type="submit" style={{ alignSelf: 'end' }}>Filter</button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : records.length === 0 ? (
        <p className="muted">No attendance marked yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="ledger-table">
            <thead>
              <tr><th>Date</th><th>Staff</th><th>Checked In</th><th>Photo</th><th>Location</th></tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id}>
                  <td>{r.date}</td>
                  <td>{r.userEmail}</td>
                  <td>{formatDateTime(r.checkedInAt)}</td>
                  <td>{r.photo?.path ? <a href={fileUrl(r.photo.path)} target="_blank" rel="noreferrer" className="doc-link">View</a> : '—'}</td>
                  <td>{r.lat && r.lng ? `${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SalaryReport() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getSalaryReport(month)
      .then(setData)
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [month]);

  return (
    <div className="card">
      <h3 style={{ margin: '0 0 10px' }}>💰 Salary</h3>
      <p className="muted" style={{ marginBottom: 14 }}>
        Calculated as (days present ÷ days in month) × monthly salary. Set each person's monthly salary in Settings.
      </p>
      <label style={{ display: 'inline-block', marginBottom: 14 }}>
        Month
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </label>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : !data.report.length ? (
        <p className="muted">No logins to show.</p>
      ) : (
        <div className="table-wrap">
          <table className="ledger-table">
            <thead>
              <tr><th>Staff</th><th>Monthly Salary</th><th>Working Days</th><th>Days Present</th><th>Calculated Salary</th><th>Payslip</th></tr>
            </thead>
            <tbody>
              {data.report.map((r) => (
                <tr key={r.email}>
                  <td>{r.email} <span className="muted" style={{ textTransform: 'capitalize' }}>({r.role})</span></td>
                  <td>₹{r.monthlySalary}</td>
                  <td>{r.workingDays}</td>
                  <td>{r.daysPresent}</td>
                  <td><strong>₹{r.calculatedSalary}</strong></td>
                  <td>
                    <a href={payslipViewUrl(r.email, month)} target="_blank" rel="noreferrer" className="doc-link">View</a>
                    {' · '}
                    <a href={payslipDownloadUrl(r.email, month)} target="_blank" rel="noreferrer" className="doc-link">Download</a>
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

export default function Attendance({ role }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="attendance-page">
      <div className="section-header">
        <h2>🕐 Attendance</h2>
      </div>
      <CheckInCard onCheckedIn={() => setRefreshKey((k) => k + 1)} />
      {role === 'owner' && <RegisterTable key={refreshKey} />}
      {role === 'owner' && <SalaryReport />}
    </div>
  );
}
