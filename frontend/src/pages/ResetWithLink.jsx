import { useState } from 'react';
import { resetPasswordWithLink } from '../api/client';

export default function ResetWithLink() {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!newPassword || newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await resetPasswordWithLink({ token, newPassword });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="server-connect">
      <div className="card server-connect-card">
        {!token ? (
          <>
            <h2>🔑 Reset Password</h2>
            <p className="muted">This link is missing its token. Ask for a new reset link.</p>
          </>
        ) : done ? (
          <>
            <h2>✅ Password Reset</h2>
            <p className="muted">Your password has been changed. You can now close this page and log in with your new password.</p>
          </>
        ) : (
          <>
            <h2>🔑 Set a New Password</h2>
            <p className="muted">Choose a new password for your account.</p>
            <form onSubmit={handleSubmit} className="server-connect-form">
              <label>
                New Password
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoFocus />
              </label>
              <label>
                Confirm New Password
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </label>
              {error && <div className="error-banner">{error}</div>}
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
