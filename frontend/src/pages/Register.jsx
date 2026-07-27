import { useState } from 'react';
import { createUser, login } from '../api/client';

export default function Register({ onRegistered }) {
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '', securityQuestion: '', securityAnswer: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username.trim() || !form.password) {
      setError('Username and password are required');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Password and confirmation must match');
      return;
    }
    if (!form.securityQuestion || !form.securityAnswer) {
      setError('A recovery question and answer are required so you can recover this account later');
      return;
    }
    setSaving(true);
    try {
      await createUser(form);
      const result = await login(form.username, form.password);
      onRegistered(result.username);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="server-connect">
      <div className="card server-connect-card">
        <h2>👋 Create Your Login</h2>
        <p className="muted">
          This is the first time this app has been opened. Create a username and password to
          protect it — you'll use these to log in every time from now on.
        </p>
        <form onSubmit={handleSubmit} className="server-connect-form">
          <label>
            Username
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoFocus />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label>
            Confirm Password
            <input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
          </label>
          <label>
            Recovery Question
            <input
              value={form.securityQuestion}
              onChange={(e) => setForm({ ...form, securityQuestion: e.target.value })}
              placeholder="e.g. What is my pet's name?"
            />
          </label>
          <label>
            Recovery Answer
            <input value={form.securityAnswer} onChange={(e) => setForm({ ...form, securityAnswer: e.target.value })} />
          </label>
          {error && <div className="error-banner">{error}</div>}
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Register & Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
