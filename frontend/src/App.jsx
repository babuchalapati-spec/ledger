import { useEffect, useState } from 'react';
import Home from './pages/Home';
import CustomerList from './pages/CustomerList';
import CustomerLedger from './pages/CustomerLedger';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import ServerConnect from './pages/ServerConnect';
import Login from './pages/Login';
import Register from './pages/Register';
import { getSettings, getAuthStatus, isMobileApp, getServerUrl } from './api/client';
import './App.css';

const SESSION_USER_KEY = 'ledger_logged_in_user';

function App() {
  const [view, setView] = useState('home'); // 'home' | 'list' | 'ledger' | 'settings' | 'inventory'
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [autoOpenForm, setAutoOpenForm] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [mobileConnected, setMobileConnected] = useState(!isMobileApp() || !!getServerUrl());
  const [authChecked, setAuthChecked] = useState(false);
  const [locked, setLocked] = useState(false);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(localStorage.getItem(SESSION_USER_KEY) || '');

  const checkAuth = () => {
    getAuthStatus()
      .then((s) => {
        const loggedIn = !!localStorage.getItem(SESSION_USER_KEY);
        setNeedsRegistration(!s.hasUsers);
        setLocked(s.hasUsers && !loggedIn);
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  };

  useEffect(() => {
    if (!mobileConnected) return;
    getSettings()
      .then((s) => {
        setBusinessName(s.businessName || '');
        document.title = s.businessName ? `${s.businessName} — Ledger Records` : 'Ledger Records';
      })
      .catch(() => {});

    checkAuth();
  }, [mobileConnected]);

  const handleSettingsSaved = (s) => {
    setBusinessName(s.businessName || '');
    document.title = s.businessName ? `${s.businessName} — Ledger Records` : 'Ledger Records';
  };

  const handleLoggedIn = (username) => {
    localStorage.setItem(SESSION_USER_KEY, username);
    setLoggedInUser(username);
    setLocked(false);
    setNeedsRegistration(false);
  };

  const handleLogOff = () => {
    localStorage.removeItem(SESSION_USER_KEY);
    setLoggedInUser('');
    goHome();
    checkAuth();
  };

  const goHome = () => {
    setView('home');
    setSelectedCustomerId(null);
    setAutoOpenForm(false);
  };

  const goBack = () => {
    if (view === 'ledger') setView('list');
    else goHome();
  };

  const openCustomer = (id) => {
    setSelectedCustomerId(id);
    setView('ledger');
  };

  if (isMobileApp() && !mobileConnected) {
    return (
      <div className="app">
        <ServerConnect onConnected={() => setMobileConnected(true)} />
      </div>
    );
  }

  if (!authChecked) return null;

  if (needsRegistration) {
    return (
      <div className="app">
        <Register onRegistered={handleLoggedIn} />
      </div>
    );
  }

  if (locked) {
    return (
      <div className="app">
        <Login onLoggedIn={handleLoggedIn} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 onClick={goHome} style={{ cursor: 'pointer' }}>
          {businessName || 'Ledger Records'}
        </h1>
        <div className="header-actions">
          {view !== 'home' && (
            <button className="btn-link" onClick={goBack}>
              &larr; Back
            </button>
          )}
          {view !== 'settings' && (
            <button className="btn-secondary" onClick={() => setView('settings')}>
              ⚙ Settings
            </button>
          )}
          {loggedInUser && (
            <button className="btn-secondary" onClick={handleLogOff}>
              🚪 Log Off ({loggedInUser})
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {view === 'settings' && (
          <Settings onSaved={handleSettingsSaved} onChangeServer={() => setMobileConnected(false)} onUsersChanged={checkAuth} />
        )}
        {view === 'home' && (
          <Home
            onViewLedgers={() => { setAutoOpenForm(false); setView('list'); }}
            onCreateCustomer={() => { setAutoOpenForm(true); setView('list'); }}
            onOpenInventory={() => setView('inventory')}
          />
        )}
        {view === 'list' && <CustomerList onOpenCustomer={openCustomer} autoOpenForm={autoOpenForm} />}
        {view === 'ledger' && selectedCustomerId && <CustomerLedger customerId={selectedCustomerId} />}
        {view === 'inventory' && <Inventory />}
      </main>
    </div>
  );
}

export default App;
