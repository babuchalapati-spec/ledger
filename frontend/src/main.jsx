import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import SuperAdminApp from './SuperAdminApp.jsx'

const isSuperAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isSuperAdmin ? <SuperAdminApp /> : <App />}
  </StrictMode>,
)
