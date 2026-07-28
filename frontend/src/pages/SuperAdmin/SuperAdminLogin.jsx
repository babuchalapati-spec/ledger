import { useEffect, useState } from 'react';
import { superAdminExists, superAdminRegister, superAdminLogin, setAdminToken } from '../../api/client';

export default function SuperAdminLogin({ onLoggedIn }) {
  const [bootstrapping, setBootstrapping] = useState(null); // null = checking, true/false once known
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    superAdminExists().then((r) => setBootstrapping(!r.exists)).catch(() => setBootstrapping(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (bootstrapping && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setChecking(true);
    try {
      const result = bootstrapping
        ? await superAdminRegister({ email, password })
        : await superAdminLogin(email, password);
      setAdminToken(result.token);
      onLoggedIn();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not log in');
    } finally {
      setChecking(false);
    }
  };

  if (bootstrapping === null) return null;

  return (
    <div className="server-connect">
      <div className="card server-connect-card">
        <h2>🛠 Super Admin</h2>
        <p className="muted">
          {bootstrapping
            ? 'No super admin exists yet — create the first one.'
            : 'Log in to manage business accounts and modules.'}
        </p>
        <form onSubmit={handleSubmit} className="server-connect-form">
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {bootstrapping && (
            <label>
              Confirm Password
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </label>
          )}
          {error && <div className="error-banner">{error}</div>}
          <button className="btn-primary" type="submit" disabled={checking}>
            {checking ? 'Please wait...' : bootstrapping ? 'Create Super Admin' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
