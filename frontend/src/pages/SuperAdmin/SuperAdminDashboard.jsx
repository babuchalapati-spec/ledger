import { useEffect, useState } from 'react';
import {
  getAccounts, updateAccount, clearAdminToken, generateResetLink,
  getPlans, createPlan, updatePlan, deletePlan,
  getPlatformSettings, updatePlatformSettings,
} from '../../api/client';

const emptyPlanForm = { name: '', price: '', billingPeriod: 'monthly', description: '', groceryInventory: false, deliveries: false, projects: false };

export default function SuperAdminDashboard({ onLoggedOut }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resetLinks, setResetLinks] = useState({}); // accountId -> { link, expiresAt }
  const [resetBusyId, setResetBusyId] = useState(null);

  const [plans, setPlans] = useState([]);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [planError, setPlanError] = useState('');

  const [settingsForm, setSettingsForm] = useState({ upgradeMessage: '', contactPhone: '', contactWhatsApp: '', contactEmail: '' });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  const load = () => {
    setLoading(true);
    getAccounts().then(setAccounts).catch((err) => setError(err.response?.data?.error || err.message)).finally(() => setLoading(false));
  };

  const loadPlans = () => {
    getPlans().then(setPlans).catch((err) => setPlanError(err.response?.data?.error || err.message));
  };

  const loadSettings = () => {
    getPlatformSettings().then(setSettingsForm).catch((err) => setSettingsError(err.response?.data?.error || err.message));
  };

  useEffect(() => {
    load();
    loadPlans();
    loadSettings();
  }, []);

  const handleModuleToggle = async (account, key) => {
    try {
      await updateAccount(account._id, { modules: { [key]: !account.modules[key] } });
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleStatusChange = async (account, status) => {
    try {
      await updateAccount(account._id, { status });
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleGenerateResetLink = async (account) => {
    setResetBusyId(account._id);
    setError('');
    try {
      const { token, expiresAt } = await generateResetLink(account._id);
      const link = `${window.location.origin}/reset-password?token=${token}`;
      setResetLinks((prev) => ({ ...prev, [account._id]: { link, expiresAt } }));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setResetBusyId(null);
    }
  };

  const handleCopyResetLink = (accountId) => {
    const entry = resetLinks[accountId];
    if (entry) navigator.clipboard?.writeText(entry.link);
  };

  const resetPlanForm = () => {
    setPlanForm(emptyPlanForm);
    setEditingPlanId(null);
  };

  const startEditPlan = (plan) => {
    setPlanForm({
      name: plan.name,
      price: plan.price,
      billingPeriod: plan.billingPeriod,
      description: plan.description || '',
      groceryInventory: !!plan.modules.groceryInventory,
      deliveries: !!plan.modules.deliveries,
      projects: !!plan.modules.projects,
    });
    setEditingPlanId(plan._id);
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    setPlanError('');
    if (!planForm.name.trim()) return setPlanError('Plan name is required');
    if (!(Number(planForm.price) >= 0)) return setPlanError('Enter a valid price');

    const payload = {
      name: planForm.name,
      price: Number(planForm.price),
      billingPeriod: planForm.billingPeriod,
      description: planForm.description,
      modules: { groceryInventory: planForm.groceryInventory, deliveries: planForm.deliveries, projects: planForm.projects },
    };
    try {
      if (editingPlanId) await updatePlan(editingPlanId, payload);
      else await createPlan(payload);
      resetPlanForm();
      loadPlans();
    } catch (err) {
      setPlanError(err.response?.data?.error || err.message);
    }
  };

  const handlePlanActiveToggle = async (plan) => {
    await updatePlan(plan._id, { isActive: !plan.isActive });
    loadPlans();
  };

  const handlePlanDelete = async (plan) => {
    if (!confirm(`Delete plan "${plan.name}"?`)) return;
    await deletePlan(plan._id);
    loadPlans();
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSaved(false);
    try {
      const updated = await updatePlatformSettings(settingsForm);
      setSettingsForm(updated);
      setSettingsSaved(true);
    } catch (err) {
      setSettingsError(err.response?.data?.error || err.message);
    }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN');
  const fmtDateTime = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="app" style={{ maxWidth: 1140 }}>
      <div className="section-header">
        <h2>🛠 Super Admin — Business Accounts</h2>
        <button className="btn-secondary" onClick={() => { clearAdminToken(); onLoggedOut(); }}>🚪 Log Off</button>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <p>Loading...</p>
      ) : accounts.length === 0 ? (
        <p className="muted">No business accounts have registered yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Owner Email</th>
                <th>Created</th>
                <th>Trial Ends</th>
                <th>Status</th>
                <th>Grocery Inventory</th>
                <th>Deliveries</th>
                <th>Projects</th>
                <th>Business Data</th>
                <th>Password Reset</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a._id}>
                  <td>{a.businessName}<div className="muted" style={{ fontSize: 12 }}>{a.dbName}</div></td>
                  <td>{a.ownerEmail || <span className="muted">-</span>}</td>
                  <td>{fmtDate(a.createdAt)}</td>
                  <td>{a.trialEndsAt ? fmtDateTime(a.trialEndsAt) : '-'}</td>
                  <td>
                    <select value={a.status} onChange={(e) => handleStatusChange(a, e.target.value)}>
                      <option value="trial">Trial</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="expired">Expired</option>
                    </select>
                  </td>
                  <td>
                    <input type="checkbox" checked={!!a.modules.groceryInventory} onChange={() => handleModuleToggle(a, 'groceryInventory')} />
                  </td>
                  <td>
                    <input type="checkbox" checked={!!a.modules.deliveries} onChange={() => handleModuleToggle(a, 'deliveries')} />
                  </td>
                  <td>
                    <input type="checkbox" checked={!!a.modules.projects} onChange={() => handleModuleToggle(a, 'projects')} />
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {a.stats ? (
                      <>
                        <div>{a.stats.customers} customers · {a.stats.entries} entries</div>
                        <div>{a.stats.orders} orders · {a.stats.deliveries} deliveries</div>
                        <div className="muted">Last activity: {a.stats.lastActivityAt ? fmtDateTime(a.stats.lastActivityAt) : 'none'}</div>
                      </>
                    ) : '-'}
                  </td>
                  <td style={{ fontSize: 12, minWidth: 180 }}>
                    {resetLinks[a._id] ? (
                      <>
                        <div style={{ wordBreak: 'break-all' }}>{resetLinks[a._id].link}</div>
                        <div className="muted">Expires {fmtDateTime(resetLinks[a._id].expiresAt)}</div>
                        <button type="button" className="btn-secondary" style={{ padding: '2px 8px', fontSize: 12, marginTop: 4 }} onClick={() => handleCopyResetLink(a._id)}>
                          Copy Link
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        disabled={resetBusyId === a._id}
                        onClick={() => handleGenerateResetLink(a)}
                      >
                        {resetBusyId === a._id ? 'Generating...' : 'Generate Reset Link'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ marginTop: 32 }}>💰 Plans & Pricing</h3>
      <p className="muted" style={{ marginBottom: 16 }}>Shown to customers on the trial-expired upgrade screen.</p>

      <form className="card form-grid" onSubmit={handlePlanSubmit}>
        {planError && <div className="error-banner">{planError}</div>}
        <label>
          Plan Name
          <input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="e.g. Pro" />
        </label>
        <label>
          Price (Rs.)
          <input type="number" min="0" step="1" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} />
        </label>
        <label>
          Billing Period
          <select value={planForm.billingPeriod} onChange={(e) => setPlanForm({ ...planForm, billingPeriod: e.target.value })}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="one-time">One-time</option>
          </select>
        </label>
        <label>
          Description
          <input value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} placeholder="What's included" />
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={planForm.groceryInventory} onChange={(e) => setPlanForm({ ...planForm, groceryInventory: e.target.checked })} />
          Includes Grocery Inventory
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={planForm.deliveries} onChange={(e) => setPlanForm({ ...planForm, deliveries: e.target.checked })} />
          Includes Deliveries
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={planForm.projects} onChange={(e) => setPlanForm({ ...planForm, projects: e.target.checked })} />
          Includes Projects
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" type="submit">{editingPlanId ? 'Save Changes' : '+ Add Plan'}</button>
          {editingPlanId && <button type="button" className="btn-secondary" onClick={resetPlanForm}>Cancel</button>}
        </div>
      </form>

      {plans.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: 24 }}>
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="num">Price</th>
                <th>Period</th>
                <th>Description</th>
                <th>Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p._id}>
                  <td>{p.name}</td>
                  <td className="num">₹{p.price}</td>
                  <td style={{ textTransform: 'capitalize' }}>{p.billingPeriod}</td>
                  <td>{p.description || '-'}</td>
                  <td><input type="checkbox" checked={p.isActive} onChange={() => handlePlanActiveToggle(p)} /></td>
                  <td className="edit-actions">
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => startEditPlan(p)}>Edit</button>
                    <button className="btn-danger-sm" onClick={() => handlePlanDelete(p)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3>📣 Upgrade Screen</h3>
      <p className="muted" style={{ marginBottom: 16 }}>The message and contact details shown when a customer's trial ends.</p>
      <form className="card form-grid" onSubmit={handleSettingsSubmit}>
        {settingsError && <div className="error-banner">{settingsError}</div>}
        {settingsSaved && <div className="success-banner">Saved.</div>}
        <label style={{ gridColumn: '1 / -1' }}>
          Upgrade Message
          <input value={settingsForm.upgradeMessage} onChange={(e) => setSettingsForm({ ...settingsForm, upgradeMessage: e.target.value })} />
        </label>
        <label>
          Contact Phone
          <input value={settingsForm.contactPhone} onChange={(e) => setSettingsForm({ ...settingsForm, contactPhone: e.target.value })} placeholder="+91XXXXXXXXXX" />
        </label>
        <label>
          WhatsApp Number
          <input value={settingsForm.contactWhatsApp} onChange={(e) => setSettingsForm({ ...settingsForm, contactWhatsApp: e.target.value })} placeholder="91XXXXXXXXXX" />
        </label>
        <label>
          Contact Email
          <input type="email" value={settingsForm.contactEmail} onChange={(e) => setSettingsForm({ ...settingsForm, contactEmail: e.target.value })} />
        </label>
        <button className="btn-primary" type="submit">Save</button>
      </form>
    </div>
  );
}
