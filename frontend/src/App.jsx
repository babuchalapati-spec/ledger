import { useEffect, useState } from 'react';
import Home from './pages/Home';
import CustomerList from './pages/CustomerList';
import CustomerLedger from './pages/CustomerLedger';
import Inventory from './pages/Inventory';
import Deliveries from './pages/Deliveries';
import Projects from './pages/Projects';
import DeliveryReminder from './components/DeliveryReminder';
import AttendanceNudge from './components/AttendanceNudge';
import Settings from './pages/Settings';
import StaffActivity from './pages/StaffActivity';
import Attendance from './pages/Attendance';
import ServerConnect from './pages/ServerConnect';
import Login from './pages/Login';
import Register from './pages/Register';
import UpgradeScreen from './pages/UpgradeScreen';
import { getSettings, getAccountMe, isMobileApp, getServerUrl, getToken, clearToken, logout } from './api/client';
import './App.css';

function App() {
  const [view, setView] = useState('home'); // 'home' | 'list' | 'ledger' | 'settings' | 'inventory' | 'deliveries' | 'projects' | 'activity' | 'attendance'
  const [authView, setAuthView] = useState('login'); // 'login' | 'register', shown when logged out
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [autoOpenForm, setAutoOpenForm] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [modules, setModules] = useState({ groceryInventory: false, deliveries: false, projects: false });
  const [role, setRole] = useState('');
  const [mobileConnected, setMobileConnected] = useState(!isMobileApp() || !!getServerUrl());
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);

  const checkAuth = () => {
    if (!getToken()) {
      setLoggedIn(false);
      setAuthChecked(true);
      return;
    }
    getAccountMe()
      .then((account) => {
        setModules(account.modules || {});
        setRole(account.role || '');
        setLoggedIn(true);
        setTrialExpired(false);
      })
      .catch((err) => {
        clearToken();
        setLoggedIn(false);
        setTrialExpired(!!err.response?.data?.trialExpired);
      })
      .finally(() => setAuthChecked(true));
  };

  useEffect(() => {
    if (!mobileConnected) return;
    checkAuth();
  }, [mobileConnected]);

  useEffect(() => {
    if (!mobileConnected || !loggedIn) return;
    getSettings()
      .then((s) => {
        setBusinessName(s.businessName || '');
        document.title = s.businessName ? `${s.businessName} — Ledger Records` : 'Ledger Records';
      })
      .catch(() => {});
  }, [mobileConnected, loggedIn]);

  const handleSettingsSaved = (s) => {
    setBusinessName(s.businessName || '');
    document.title = s.businessName ? `${s.businessName} — Ledger Records` : 'Ledger Records';
  };

  const handleLoggedIn = () => {
    setLoggedIn(true);
    setTrialExpired(false);
    checkAuth();
  };

  const handleLogOff = () => {
    logout().catch(() => {});
    clearToken();
    setLoggedIn(false);
    setAuthView('login');
    goHome();
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

  if (trialExpired) {
    return (
      <div className="app">
        <UpgradeScreen />
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="app">
        {authView === 'register' ? (
          <Register onRegistered={handleLoggedIn} onSwitchToLogin={() => setAuthView('login')} />
        ) : (
          <Login onLoggedIn={handleLoggedIn} onSwitchToRegister={() => setAuthView('register')} onTrialExpired={() => setTrialExpired(true)} />
        )}
      </div>
    );
  }

  return (
    <div className="app">
      {modules.deliveries && <DeliveryReminder />}
      <AttendanceNudge onOpenAttendance={() => setView('attendance')} />
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
          {view !== 'attendance' && (
            <button className="btn-secondary" onClick={() => setView('attendance')}>
              🕐 Attendance
            </button>
          )}
          {role === 'owner' && view !== 'activity' && (
            <button className="btn-secondary" onClick={() => setView('activity')}>
              📋 Staff Activity
            </button>
          )}
          {view !== 'settings' && (
            <button className="btn-secondary" onClick={() => setView('settings')}>
              ⚙ Settings
            </button>
          )}
          <button className="btn-secondary" onClick={handleLogOff}>
            🚪 Log Off
          </button>
        </div>
      </header>

      <main className="app-main">
        {view === 'settings' && (
          <Settings onSaved={handleSettingsSaved} onChangeServer={() => setMobileConnected(false)} role={role} />
        )}
        {view === 'activity' && role === 'owner' && <StaffActivity />}
        {view === 'attendance' && <Attendance role={role} />}
        {view === 'home' && (
          <Home
            onViewLedgers={() => { setAutoOpenForm(false); setView('list'); }}
            onCreateCustomer={() => { setAutoOpenForm(true); setView('list'); }}
            onOpenInventory={() => setView('inventory')}
            onOpenDeliveries={() => setView('deliveries')}
            onOpenProjects={() => setView('projects')}
            modules={modules}
          />
        )}
        {view === 'list' && <CustomerList onOpenCustomer={openCustomer} autoOpenForm={autoOpenForm} />}
        {view === 'ledger' && selectedCustomerId && <CustomerLedger customerId={selectedCustomerId} />}
        {view === 'inventory' && modules.groceryInventory && <Inventory />}
        {view === 'deliveries' && modules.deliveries && <Deliveries />}
        {view === 'projects' && modules.projects && <Projects />}
      </main>
    </div>
  );
}

export default App;
