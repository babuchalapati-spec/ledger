import { useState } from 'react';
import { setServerUrl, testServerUrl } from '../api/client';

// Pre-filled with the computer's WiFi address at the time this app was built, so
// connecting is usually just tapping "Connect" — editable if the network has changed.
const DEFAULT_HOST = '10.23.22.101';

export default function ServerConnect({ onConnected, initialUrl }) {
  const [host, setHost] = useState(initialUrl ? initialUrl.replace(/^https?:\/\//, '').replace(/:\d+$/, '') : DEFAULT_HOST);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async (e) => {
    e.preventDefault();
    const trimmed = host.trim();
    if (!trimmed) {
      setError('Enter your computer\'s IP address');
      return;
    }
    const url = `http://${trimmed}:8811`;
    setTesting(true);
    setError('');
    try {
      await testServerUrl(url);
      setServerUrl(url);
      onConnected(url);
    } catch (err) {
      setError('Could not reach that address. Make sure your phone and computer are on the same WiFi, the Ledger Records app is running on the computer, and the IP address is correct.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="server-connect">
      <div className="card server-connect-card">
        <h2>📒 Connect to Your Computer</h2>
        <p className="muted">
          Open the Ledger Records app on your computer, check its Settings page for the
          "Network Address" shown there, and enter it below.
        </p>
        <form onSubmit={handleConnect} className="server-connect-form">
          <label>
            Computer's IP Address
            <input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="e.g. 192.168.1.42"
              autoCapitalize="off"
              autoCorrect="off"
            />
          </label>
          {error && <div className="error-banner">{error}</div>}
          <button className="btn-primary" type="submit" disabled={testing}>
            {testing ? 'Connecting...' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  );
}
