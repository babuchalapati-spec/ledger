import { useState } from 'react';
import { login, getSecurityQuestion, resetPassword } from '../api/client';

export default function Login({ onLoggedIn }) {
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const [forgotUsername, setForgotUsername] = useState('');
  const [question, setQuestion] = useState('');
  const [askedQuestion, setAskedQuestion] = useState(false);
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetDone, setResetDone] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setChecking(true);
    try {
      const result = await login(username, password);
      onLoggedIn(result.username);
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect username or password');
    } finally {
      setChecking(false);
    }
  };

  const openForgot = () => {
    setError('');
    setMode('forgot');
    setAskedQuestion(false);
    setForgotUsername(username);
  };

  const handleFindQuestion = async (e) => {
    e.preventDefault();
    setError('');
    setChecking(true);
    try {
      const { question } = await getSecurityQuestion(forgotUsername);
      setQuestion(question);
      setAskedQuestion(true);
      if (!question) setError('No account found with that username, or it has no recovery question set.');
    } catch {
      setError('Could not look up that account.');
    } finally {
      setChecking(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (!newPassword || newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setChecking(true);
    try {
      await resetPassword({ username: forgotUsername, securityAnswer: answer, newPassword });
      setResetDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset password');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="server-connect">
      <div className="card server-connect-card">
        {mode === 'login' && (
          <>
            <h2>🔒 Log In</h2>
            <p className="muted">Enter your username and password to open the app.</p>
            <form onSubmit={handleLogin} className="server-connect-form">
              <label>
                Username
                <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
              </label>
              <label>
                Password
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
              {error && <div className="error-banner">{error}</div>}
              <button className="btn-primary" type="submit" disabled={checking}>
                {checking ? 'Checking...' : 'Log In'}
              </button>
              <button type="button" className="btn-link" onClick={openForgot}>Forgot password?</button>
            </form>
          </>
        )}

        {mode === 'forgot' && !resetDone && (
          <>
            <h2>🔑 Reset Password</h2>
            {!askedQuestion ? (
              <form onSubmit={handleFindQuestion} className="server-connect-form">
                <label>
                  Username
                  <input value={forgotUsername} onChange={(e) => setForgotUsername(e.target.value)} autoFocus />
                </label>
                {error && <div className="error-banner">{error}</div>}
                <button className="btn-primary" type="submit" disabled={checking}>
                  {checking ? 'Looking up...' : 'Continue'}
                </button>
                <button type="button" className="btn-link" onClick={() => setMode('login')}>Back to login</button>
              </form>
            ) : question ? (
              <form onSubmit={handleReset} className="server-connect-form">
                <label>
                  {question}
                  <input value={answer} onChange={(e) => setAnswer(e.target.value)} autoFocus />
                </label>
                <label>
                  New Password
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </label>
                <label>
                  Confirm New Password
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </label>
                {error && <div className="error-banner">{error}</div>}
                <button className="btn-primary" type="submit" disabled={checking}>
                  {checking ? 'Resetting...' : 'Reset Password'}
                </button>
                <button type="button" className="btn-link" onClick={() => setMode('login')}>Back to login</button>
              </form>
            ) : (
              <>
                {error && <div className="error-banner" style={{ marginTop: 12 }}>{error}</div>}
                <button type="button" className="btn-link" onClick={() => setMode('login')} style={{ marginTop: 12 }}>Back to login</button>
              </>
            )}
          </>
        )}

        {mode === 'forgot' && resetDone && (
          <>
            <h2>✅ Password Reset</h2>
            <p className="muted">The password for "{forgotUsername}" has been changed. You can now log in with the new password.</p>
            <button
              className="btn-primary"
              style={{ marginTop: 12 }}
              onClick={() => { setMode('login'); setResetDone(false); setUsername(forgotUsername); setPassword(''); }}
            >
              Back to login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
