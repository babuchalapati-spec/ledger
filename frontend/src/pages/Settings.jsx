import { useEffect, useState } from 'react';
import api, { getSettings, updateSettings, isMobileApp, getServerUrl, getAccountUsers, addAccountUser, deleteAccountUser, updateAccountUserRole, updateAccountUserSalary } from '../api/client';

const emptyUserForm = { email: '', password: '', confirmPassword: '', securityQuestion: '', securityAnswer: '' };

const emptySettingsForm = {
  businessName: '', address: '', gstNumber: '', phone: '',
  premisesLat: '', premisesLng: '', premisesRadiusMeters: 200, attendanceCutoffTime: '',
};

export default function Settings({ onSaved, onChangeServer, role }) {
  const [form, setForm] = useState(emptySettingsForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [networkInfo, setNetworkInfo] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');

  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [userSaving, setUserSaving] = useState(false);
  const [userSaved, setUserSaved] = useState('');
  const [userError, setUserError] = useState('');

  const loadUsers = () => {
    if (role !== 'owner') return;
    getAccountUsers().then(setUsers).catch(() => {});
  };

  useEffect(() => {
    getSettings()
      .then((s) => setForm({
        ...emptySettingsForm,
        ...s,
        premisesLat: s.premisesLat ?? '',
        premisesLng: s.premisesLng ?? '',
        premisesRadiusMeters: s.premisesRadiusMeters ?? 200,
      }))
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));

    loadUsers();

    if (!isMobileApp()) {
      api.get('/network-info').then((r) => setNetworkInfo(r.data)).catch(() => {});
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await updateSettings(form);
      setForm(updated);
      setSaved(true);
      onSaved?.(updated);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setUserError('');
    setUserSaved('');
    if (!userForm.email.trim() || !userForm.password) {
      setUserError('Email and password are required');
      return;
    }
    if (userForm.password !== userForm.confirmPassword) {
      setUserError('Password and confirmation must match');
      return;
    }
    if (!userForm.securityQuestion || !userForm.securityAnswer) {
      setUserError('A recovery question and answer are required so this account can be recovered later');
      return;
    }
    setUserSaving(true);
    try {
      await addAccountUser(userForm);
      setUserForm(emptyUserForm);
      setUserSaved(`Login "${userForm.email}" created.`);
      loadUsers();
    } catch (err) {
      setUserError(err.response?.data?.error || err.message);
    } finally {
      setUserSaving(false);
    }
  };

  const handleDeleteUser = async (email) => {
    if (!confirm(`Remove login "${email}"? They will no longer be able to log in.`)) return;
    setUserError('');
    setUserSaved('');
    try {
      await deleteAccountUser(email);
      setUserSaved(`Login "${email}" removed.`);
      loadUsers();
    } catch (err) {
      setUserError(err.response?.data?.error || err.message);
    }
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setLocateError('Location is not available in this browser');
      return;
    }
    setLocating(true);
    setLocateError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, premisesLat: pos.coords.latitude, premisesLng: pos.coords.longitude }));
        setLocating(false);
      },
      (err) => {
        setLocateError(err.message || 'Could not get your location');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleRoleChange = async (email, newRole) => {
    setUserError('');
    setUserSaved('');
    try {
      await updateAccountUserRole(email, newRole);
      setUserSaved(`"${email}" is now ${newRole === 'owner' ? 'an owner' : 'staff'}.`);
      loadUsers();
    } catch (err) {
      setUserError(err.response?.data?.error || err.message);
    }
  };

  const handleSalaryInput = (email, value) => {
    setUsers((prev) => prev.map((u) => (u.email === email ? { ...u, monthlySalary: value } : u)));
  };

  const handleSalarySave = async (email, value) => {
    setUserError('');
    try {
      await updateAccountUserSalary(email, Number(value) || 0);
    } catch (err) {
      setUserError(err.response?.data?.error || err.message);
      loadUsers();
    }
  };

  if (loading) return <p>Loading settings...</p>;

  return (
    <div className="settings-page">
      <div className="section-header">
        <h2>Business Settings</h2>
      </div>
      <p className="muted" style={{ marginBottom: 16 }}>
        This name and details appear in the app header and on every ledger PDF you export.
      </p>
      <form className="card form-grid" onSubmit={handleSubmit}>
        {error && <div className="error-banner">{error}</div>}
        {saved && <div className="success-banner">Saved.</div>}
        <label>
          Business / Shop Name
          <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="e.g. Sharma Traders" />
        </label>
        <label>
          Address
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </label>
        <label>
          GST Number
          <input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <button className="btn-primary" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {role === 'owner' && (
      <>
      <div className="card">
        <h3 style={{ margin: '0 0 10px' }}>🔒 Logins & Roles</h3>
        <p className="muted" style={{ marginBottom: 14 }}>
          Anyone listed below can log into this business account with their email and password.
          Owners can manage staff, settings, and see the Staff Activity log; staff cannot.
        </p>

        {users.length > 0 && (
          <div className="table-wrap" style={{ marginBottom: 16 }}>
            <table className="ledger-table">
              <thead>
                <tr><th>Email</th><th>Role</th><th>Monthly Salary (₹)</th><th></th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.email}>
                    <td>{u.email}</td>
                    <td>
                      <select value={u.role} onChange={(e) => handleRoleChange(u.email, e.target.value)}>
                        <option value="owner">Owner</option>
                        <option value="staff">Staff</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        style={{ width: 100 }}
                        value={u.monthlySalary ?? 0}
                        onChange={(e) => handleSalaryInput(u.email, e.target.value)}
                        onBlur={(e) => handleSalarySave(u.email, e.target.value)}
                      />
                    </td>
                    <td><button className="btn-danger-sm" onClick={() => handleDeleteUser(u.email)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={handleAddUser} className="form-grid">
          {userError && <div className="error-banner">{userError}</div>}
          {userSaved && <div className="success-banner">{userSaved}</div>}
          <label>
            Email
            <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
          </label>
          <label>
            Password
            <input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
          </label>
          <label>
            Confirm Password
            <input type="password" value={userForm.confirmPassword} onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })} />
          </label>
          <label>
            Recovery Question
            <input
              value={userForm.securityQuestion}
              onChange={(e) => setUserForm({ ...userForm, securityQuestion: e.target.value })}
              placeholder="e.g. What is my pet's name?"
            />
          </label>
          <label>
            Recovery Answer
            <input value={userForm.securityAnswer} onChange={(e) => setUserForm({ ...userForm, securityAnswer: e.target.value })} />
          </label>
          <button className="btn-primary" type="submit" disabled={userSaving}>
            {userSaving ? 'Adding...' : '+ Add Login'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 10px' }}>📍 Attendance Settings</h3>
        <p className="muted" style={{ marginBottom: 14 }}>
          Set your shop's location so the app can nudge staff to mark attendance when they arrive,
          and a cutoff time after which unmarked staff get texted to you as absent.
        </p>
        <form className="form-grid" onSubmit={handleSubmit}>
          {locateError && <div className="error-banner">{locateError}</div>}
          <button type="button" className="btn-secondary" onClick={handleUseLocation} disabled={locating} style={{ justifySelf: 'start' }}>
            {locating ? 'Locating...' : '📍 Use My Current Location'}
          </button>
          <label>
            Premises Latitude
            <input type="number" step="any" value={form.premisesLat} onChange={(e) => setForm({ ...form, premisesLat: e.target.value })} />
          </label>
          <label>
            Premises Longitude
            <input type="number" step="any" value={form.premisesLng} onChange={(e) => setForm({ ...form, premisesLng: e.target.value })} />
          </label>
          <label>
            Radius (meters)
            <input type="number" min="10" step="10" value={form.premisesRadiusMeters} onChange={(e) => setForm({ ...form, premisesRadiusMeters: e.target.value })} />
          </label>
          <label>
            Mark Absent If Not Checked In By
            <input type="time" value={form.attendanceCutoffTime} onChange={(e) => setForm({ ...form, attendanceCutoffTime: e.target.value })} />
          </label>
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
      </>
      )}

      {isMobileApp() && (
        <div className="card">
          <h3 style={{ margin: '0 0 10px' }}>Computer Connection</h3>
          <p className="muted" style={{ marginBottom: 10 }}>
            Currently connected to: <strong>{getServerUrl()}</strong>
          </p>
          <button className="btn-secondary" onClick={() => onChangeServer?.()}>Change Computer</button>
        </div>
      )}

      {networkInfo && networkInfo.addresses.length > 0 && (
        <div className="card">
          <h3 style={{ margin: '0 0 10px' }}>Phone App Connection</h3>
          <p className="muted" style={{ marginBottom: 10 }}>
            To use the Ledger Records app on your phone (same WiFi network), enter this address when it asks you to connect:
          </p>
          {networkInfo.addresses.map((addr) => (
            <div key={addr} className="network-address">{addr}</div>
          ))}
        </div>
      )}
    </div>
  );
}
