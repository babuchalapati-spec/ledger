import { useState } from 'react';
import { register, setToken } from '../api/client';

const emptyForm = { businessName: '', email: '', password: '', confirmPassword: '', securityQuestion: '', securityAnswer: '' };

export default function Register({ onRegistered, onSwitchToLogin }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.businessName.trim()) {
      setError('Business name is required');
      return;
    }
    if (!form.email.trim() || !form.password) {
      setError('Email and password are required');
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
      const result = await register(form);
      setToken(result.token);
      onRegistered(result.businessName, result.email);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="server-connect">
      <div className="card server-connect-card">
        <h2>👋 Create Your Business Account</h2>
        <p className="muted">
          Set up your business and its first login. You'll use this email and password
          to log in every time from now on.
        </p>
        <form onSubmit={handleSubmit} className="server-connect-form">
          <label>
            Business Name
            <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} autoFocus />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
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
          <button type="button" className="btn-link" onClick={onSwitchToLogin}>Already have an account? Log in</button>
        </form>
      </div>
    </div>
  );
}
