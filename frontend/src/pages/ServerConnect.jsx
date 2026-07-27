import { useState } from 'react';
import { setServerUrl, testServerUrl } from '../api/client';

// Pre-filled with the computer's WiFi address at the time this app was built, so
// connecting is usually just tapping "Connect" — editable if the network has changed.
const DEFAULT_HOST = '10.23.22.101';

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

// Accepts a bare LAN IP ("192.168.1.5"), "localhost", a full URL (paste from
// anywhere), or a plain domain (e.g. a Render/cloud hostname) and builds the
// right address: LAN addresses use plain http on the local backend port;
// anything else is treated as a real hosted domain over https.
function buildServerUrl(input) {
  if (/^https?:\/\//.test(input)) return input.replace(/\/+$/, '');
  if (IPV4_RE.test(input) || input === 'localhost') return `http://${input}:8811`;
  return `https://${input}`;
}

export default function ServerConnect({ onConnected, initialUrl }) {
  const [host, setHost] = useState(initialUrl ? initialUrl.replace(/^https?:\/\//, '').replace(/:\d+$/, '') : DEFAULT_HOST);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async (e) => {
    e.preventDefault();
    const trimmed = host.trim();
    if (!trimmed) {
      setError('Enter your computer\'s IP address or the app\'s web address');
      return;
    }
    const url = buildServerUrl(trimmed);
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
          Enter your computer's WiFi IP address (from the app's Settings page) if you're on the
          same WiFi, or the app's web address (e.g. yourapp.onrender.com) if it's hosted online.
        </p>
        <form onSubmit={handleConnect} className="server-connect-form">
          <label>
            IP Address or Web Address
            <input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="e.g. 192.168.1.42 or yourapp.onrender.com"
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
