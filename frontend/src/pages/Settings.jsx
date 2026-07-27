import { useEffect, useState } from 'react';
import api, { getSettings, updateSettings, isMobileApp, getServerUrl, getUsers, createUser, deleteUser } from '../api/client';

const emptyUserForm = { username: '', password: '', confirmPassword: '', securityQuestion: '', securityAnswer: '' };

export default function Settings({ onSaved, onChangeServer, onUsersChanged }) {
  const [form, setForm] = useState({ businessName: '', address: '', gstNumber: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [networkInfo, setNetworkInfo] = useState(null);

  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [userSaving, setUserSaving] = useState(false);
  const [userSaved, setUserSaved] = useState('');
  const [userError, setUserError] = useState('');

  const loadUsers = () => {
    getUsers()
      .then((u) => {
        setUsers(u);
        onUsersChanged?.(u.length > 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    getSettings()
      .then(setForm)
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
    if (!userForm.username.trim() || !userForm.password) {
      setUserError('Username and password are required');
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
      await createUser(userForm);
      setUserForm(emptyUserForm);
      setUserSaved(`User "${userForm.username}" created.`);
      loadUsers();
    } catch (err) {
      setUserError(err.response?.data?.error || err.message);
    } finally {
      setUserSaving(false);
    }
  };

  const handleDeleteUser = async (username) => {
    if (!confirm(`Remove user "${username}"? They will no longer be able to log in.`)) return;
    setUserError('');
    setUserSaved('');
    try {
      await deleteUser(username);
      setUserSaved(`User "${username}" removed.`);
      loadUsers();
    } catch (err) {
      setUserError(err.response?.data?.error || err.message);
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

      <div className="card">
        <h3 style={{ margin: '0 0 10px' }}>🔒 User Accounts</h3>
        <p className="muted" style={{ marginBottom: 14 }}>
          {users.length > 0
            ? 'A username and password are required to open this app. Anyone below can log in.'
            : 'No user accounts yet — the app is open to anyone. Add an account below to require login.'}
        </p>

        {users.length > 0 && (
          <div className="table-wrap" style={{ marginBottom: 16 }}>
            <table className="ledger-table">
              <thead>
                <tr><th>Username</th><th></th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.username}>
                    <td>{u.username}</td>
                    <td><button className="btn-danger-sm" onClick={() => handleDeleteUser(u.username)}>Remove</button></td>
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
            Username
            <input value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} />
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
            {userSaving ? 'Adding...' : '+ Add User'}
          </button>
        </form>
      </div>

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
