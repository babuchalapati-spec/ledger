import axios from 'axios';

const STORAGE_KEY = 'ledger_server_url';
const TOKEN_KEY = 'ledger_auth_token';
const ADMIN_TOKEN_KEY = 'ledger_admin_token';

export const isMobileApp = () => typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

function resolveInitialOrigin() {
  if (isMobileApp()) {
    return localStorage.getItem(STORAGE_KEY) || '';
  }
  return import.meta.env.DEV ? 'http://localhost:8811' : window.location.origin;
}

let API_ORIGIN = resolveInitialOrigin();

const api = axios.create({ baseURL: `${API_ORIGIN}/api` });

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);
export const setAdminToken = (t) => localStorage.setItem(ADMIN_TOKEN_KEY, t);
export const clearAdminToken = () => localStorage.removeItem(ADMIN_TOKEN_KEY);

api.interceptors.request.use((config) => {
  const isAdminCall = config.url?.startsWith('/superadmin');
  const token = isAdminCall ? getAdminToken() : getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    // 401 = bad/expired session; 402 = trial ended; 403 = suspended/cancelled account
    if (status === 401 || status === 402 || status === 403) {
      if (err.config?.url?.startsWith('/superadmin')) clearAdminToken();
      else clearToken();
    }
    return Promise.reject(err);
  }
);

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

export const extractBill = (formData) =>
  api.post('/entries/extract-bill', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
export const parseStatement = (formData) =>
  api.post('/entries/parse-statement', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
export const bulkCreateEntries = (customer, entries) =>
  api.post('/entries/bulk', { customer, entries }).then((r) => r.data);

export const getSettings = () => api.get('/settings').then((r) => r.data);
export const updateSettings = (data) => api.put('/settings', data).then((r) => r.data);

// Platform (business) auth — email + password
export const register = (data) => api.post('/auth/register', data).then((r) => r.data);
export const login = (email, password) => api.post('/auth/login', { email, password }).then((r) => r.data);
export const getSecurityQuestion = (email) => api.get('/auth/security-question', { params: { email } }).then((r) => r.data);
export const resetPassword = (data) => api.post('/auth/reset-password', data).then((r) => r.data);
export const resetPasswordWithLink = (data) => api.post('/auth/reset-with-link', data).then((r) => r.data);

// Public: shown on the trial-expired / upgrade screen
export const getPublicPlans = () => api.get('/auth/plans').then((r) => r.data);
export const getPublicPlatformSettings = () => api.get('/auth/platform-settings').then((r) => r.data);

// Current account profile/modules + its logins
export const getAccountMe = () => api.get('/account/me').then((r) => r.data);
export const getAccountUsers = () => api.get('/account/users').then((r) => r.data);
export const addAccountUser = (data) => api.post('/account/users', data).then((r) => r.data);
export const deleteAccountUser = (email) => api.delete(`/account/users/${encodeURIComponent(email)}`).then((r) => r.data);

// Super Admin
export const superAdminExists = () => api.get('/superadmin/exists').then((r) => r.data);
export const superAdminRegister = (data) => api.post('/superadmin/register', data).then((r) => r.data);
export const superAdminLogin = (email, password) => api.post('/superadmin/login', { email, password }).then((r) => r.data);
export const getAccounts = () => api.get('/superadmin/accounts').then((r) => r.data);
export const updateAccount = (id, data) => api.put(`/superadmin/accounts/${id}`, data).then((r) => r.data);
export const generateResetLink = (id) => api.post(`/superadmin/accounts/${id}/reset-link`).then((r) => r.data);
export const getPlans = () => api.get('/superadmin/plans').then((r) => r.data);
export const createPlan = (data) => api.post('/superadmin/plans', data).then((r) => r.data);
export const updatePlan = (id, data) => api.put(`/superadmin/plans/${id}`, data).then((r) => r.data);
export const deletePlan = (id) => api.delete(`/superadmin/plans/${id}`).then((r) => r.data);
export const getPlatformSettings = () => api.get('/superadmin/platform-settings').then((r) => r.data);
export const updatePlatformSettings = (data) => api.put('/superadmin/platform-settings', data).then((r) => r.data);

export const getItems = () => api.get('/items').then((r) => r.data);
export const createItem = (data) => api.post('/items', data).then((r) => r.data);
export const updateItem = (id, data) => api.put(`/items/${id}`, data).then((r) => r.data);
export const deleteItem = (id) => api.delete(`/items/${id}`).then((r) => r.data);
export const restockItem = (id, data) => api.post(`/items/${id}/restock`, data).then((r) => r.data);
export const seedDefaultItems = () => api.post('/items/seed-defaults').then((r) => r.data);

export const getOrders = () => api.get('/orders').then((r) => r.data);
export const createOrder = (data) => api.post('/orders', data).then((r) => r.data);
export const receiveOrder = (id) => api.post(`/orders/${id}/receive`).then((r) => r.data);
export const deleteOrder = (id) => api.delete(`/orders/${id}`).then((r) => r.data);
// view = open inline in the browser/webview; without it, the file downloads immediately.
// These are plain <a href> links, so the auth token travels as a query param.
export const orderViewUrl = (id) => `${API_ORIGIN}/api/orders/${id}/pdf?token=${encodeURIComponent(getToken() || '')}`;
export const orderDownloadUrl = (id) => `${API_ORIGIN}/api/orders/${id}/pdf?download=1&token=${encodeURIComponent(getToken() || '')}`;
export const shoppingListViewUrl = (id) => `${API_ORIGIN}/api/orders/${id}/pdf?plain=1&token=${encodeURIComponent(getToken() || '')}`;
export const shoppingListDownloadUrl = (id) => `${API_ORIGIN}/api/orders/${id}/pdf?plain=1&download=1&token=${encodeURIComponent(getToken() || '')}`;

export const getProjects = () => api.get('/projects').then((r) => r.data);
export const createProject = (data) => api.post('/projects', data).then((r) => r.data);
export const getProject = (id) => api.get(`/projects/${id}`).then((r) => r.data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data).then((r) => r.data);
export const deleteProject = (id) => api.delete(`/projects/${id}`).then((r) => r.data);
export const addProjectExpense = (id, formData) =>
  api.post(`/projects/${id}/expenses`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
export const deleteProjectExpense = (id, expenseId) => api.delete(`/projects/${id}/expenses/${expenseId}`).then((r) => r.data);

export const getDeliveries = () => api.get('/deliveries').then((r) => r.data);
export const createDelivery = (data) => api.post('/deliveries', data).then((r) => r.data);
export const updateDelivery = (id, data) => api.put(`/deliveries/${id}`, data).then((r) => r.data);
export const markDelivered = (id) => api.post(`/deliveries/${id}/deliver`).then((r) => r.data);
export const deleteDelivery = (id) => api.delete(`/deliveries/${id}`).then((r) => r.data);
export const uploadDeliveryInvoice = (id, formData) =>
  api.post(`/deliveries/${id}/invoice`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);

export const ledgerPdfUrl = (customerId) => {
  const token = getToken();
  return `${API_ORIGIN}/api/ledger/${customerId}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
};
export const fileUrl = (path) => `${API_ORIGIN}${path}`;

export default api;
