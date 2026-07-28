import { useState } from 'react';
import { getAdminToken } from './api/client';
import SuperAdminLogin from './pages/SuperAdmin/SuperAdminLogin';
import SuperAdminDashboard from './pages/SuperAdmin/SuperAdminDashboard';
import './App.css';

export default function SuperAdminApp() {
  const [loggedIn, setLoggedIn] = useState(!!getAdminToken());

  if (!loggedIn) {
    return (
      <div className="app">
        <SuperAdminLogin onLoggedIn={() => setLoggedIn(true)} />
      </div>
    );
  }

  return <SuperAdminDashboard onLoggedOut={() => setLoggedIn(false)} />;
}
