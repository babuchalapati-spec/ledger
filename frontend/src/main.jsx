import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import SuperAdminApp from './SuperAdminApp.jsx'
import ResetWithLink from './pages/ResetWithLink.jsx'

const path = typeof window !== 'undefined' ? window.location.pathname : '';
const isSuperAdmin = path.startsWith('/admin');
const isResetLink = path.startsWith('/reset-password');

function Root() {
  if (isResetLink) return <ResetWithLink />;
  if (isSuperAdmin) return <SuperAdminApp />;
  return <App />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
