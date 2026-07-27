import axios from 'axios';

const STORAGE_KEY = 'ledger_server_url';

export const isMobileApp = () => typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

function resolveInitialOrigin() {
  if (isMobileApp()) {
    return localStorage.getItem(STORAGE_KEY) || '';
  }
  return import.meta.env.DEV ? 'http://localhost:8811' : window.location.origin;
}

let API_ORIGIN = resolveInitialOrigin();

const api = axios.create({ baseURL: `${API_ORIGIN}/api` });

export const getServerUrl = () => API_ORIGIN;

export const setServerUrl = (url) => {
  API_ORIGIN = url.replace(/\/+$/, '');
  api.defaults.baseURL = `${API_ORIGIN}/api`;
  if (isMobileApp()) localStorage.setItem(STORAGE_KEY, API_ORIGIN);
};

export const testServerUrl = (url) =>
  axios.get(`${url.replace(/\/+$/, '')}/api/health`, { timeout: 5000 }).then((r) => r.data);

export const getCustomers = () => api.get('/customers').then((r) => r.data);
export const getCustomer = (id) => api.get(`/customers/${id}`).then((r) => r.data);
export const createCustomer = (data) => api.post('/customers', data).then((r) => r.data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data).then((r) => r.data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`).then((r) => r.data);

export const getEntries = (customerId) =>
  api.get(`/entries/customer/${customerId}`).then((r) => r.data);

export const createEntry = (formData) =>
  api.post('/entries', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);

export const updateEntry = (id, formData) =>
  api.put(`/entries/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);

export const deleteEntry = (id) => api.delete(`/entries/${id}`).then((r) => r.data);

export const getSettings = () => api.get('/settings').then((r) => r.data);
export const updateSettings = (data) => api.put('/settings', data).then((r) => r.data);

export const getAuthStatus = () => api.get('/auth/status').then((r) => r.data);
export const getUsers = () => api.get('/auth/users').then((r) => r.data);
export const login = (username, password) => api.post('/auth/login', { username, password }).then((r) => r.data);
export const createUser = (data) => api.post('/auth/users', data).then((r) => r.data);
export const deleteUser = (username) => api.delete(`/auth/users/${encodeURIComponent(username)}`).then((r) => r.data);
export const getSecurityQuestion = (username) => api.get('/auth/security-question', { params: { username } }).then((r) => r.data);
export const resetPassword = (data) => api.post('/auth/reset-password', data).then((r) => r.data);

export const ledgerPdfUrl = (customerId) => `${API_ORIGIN}/api/ledger/${customerId}/pdf`;
export const fileUrl = (path) => `${API_ORIGIN}${path}`;

export default api;
