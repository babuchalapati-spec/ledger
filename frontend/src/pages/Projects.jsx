import { useEffect, useState } from 'react';
import {
  getProjects, createProject, getProject, deleteProject,
  addProjectExpense, deleteProjectExpense, fileUrl,
} from '../api/client';

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN');

function ProjectList({ onOpen }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [peopleText, setPeopleText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getProjects().then(setProjects).catch((err) => setError(err.response?.data?.error || err.message)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    const people = peopleText.split(',').map((p) => p.trim()).filter(Boolean);
    if (!name.trim()) return setError('Project name is required');
    if (people.length < 2) return setError('Add at least 2 people, separated by commas');
    setSaving(true);
    try {
      const project = await createProject({ name, people });
      setName('');
      setPeopleText('');
      load();
      onOpen(project._id);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project and all its expenses? This cannot be undone.')) return;
    await deleteProject(id);
    load();
  };

  return (
    <div>
      <h2>🧾 Projects — Split Expenses</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Track shared spending across a group. Total spend is split equally, and each person's balance shows who owes whom.
      </p>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      <form className="card form-grid" onSubmit={handleCreate}>
        <label>
          Project Name *
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Goa Trip" />
        </label>
        <label>
          People (comma-separated) *
          <input value={peopleText} onChange={(e) => setPeopleText(e.target.value)} placeholder="e.g. Ramesh, Suresh, Venkat" />
        </label>
        <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Creating...' : '+ Create Project'}</button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : projects.length === 0 ? (
        <p className="muted">No projects yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>People</th>
                <th className="num">Total Spent</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p._id}>
                  <td><a href="#" onClick={(e) => { e.preventDefault(); onOpen(p._id); }}>{p.name}</a></td>
                  <td>{p.people.join(', ')}</td>
                  <td className="num">Rs. {fmt(p.totalSpent)}</td>
                  <td className="edit-actions">
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => onOpen(p._id)}>Open</button>
                    <button className="btn-danger-sm" onClick={() => handleDelete(p._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProjectDetail({ projectId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ person: '', date: todayStr(), description: '', amount: '' });
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getProject(projectId).then((d) => {
      setData(d);
      setForm((f) => ({ ...f, person: f.person || d.project.people[0] || '' }));
    }).catch((err) => setError(err.response?.data?.error || err.message)).finally(() => setLoading(false));
  };

  useEffect(load, [projectId]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.person) return setError('Select who spent this');
    if (!(Number(form.amount) > 0)) return setError('Enter a valid amount');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('person', form.person);
      fd.append('date', form.date);
      fd.append('description', form.description);
      fd.append('amount', form.amount);
      files.forEach((f) => fd.append('receipts', f));
      await addProjectExpense(projectId, fd);
      setForm({ ...form, description: '', amount: '' });
      setFiles([]);
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('Delete this expense?')) return;
    await deleteProjectExpense(projectId, expenseId);
    load();
  };

  if (loading) return <p>Loading...</p>;
  if (error && !data) return <div className="error-banner">{error}</div>;
  if (!data) return null;

  const { project, expenses, settlement } = data;

  return (
    <div>
      <div className="section-header">
        <h2>🧾 {project.name}</h2>
        <button className="btn-secondary" onClick={onBack}>&larr; Back to Projects</button>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Settlement</h3>
        <p className="muted">
          Total spent: Rs. {fmt(settlement.total)} across {project.people.length} people &mdash; fair share Rs. {fmt(settlement.fairShare)} each.
        </p>
        <div className="table-wrap" style={{ marginBottom: settlement.payments.length ? 14 : 0 }}>
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Person</th>
                <th className="num">Spent</th>
                <th className="num">Balance</th>
              </tr>
            </thead>
            <tbody>
              {settlement.balances.map((b) => (
                <tr key={b.person}>
                  <td>{b.person}</td>
                  <td className="num">Rs. {fmt(b.spent)}</td>
                  <td className="num" style={{ color: b.balance > 0 ? '#1a8a4a' : b.balance < 0 ? '#c0392b' : undefined }}>
                    {b.balance > 0 ? `is owed Rs. ${fmt(b.balance)}` : b.balance < 0 ? `owes Rs. ${fmt(-b.balance)}` : 'settled'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {settlement.payments.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {settlement.payments.map((p, i) => (
              <li key={i}><b>{p.from}</b> pays <b>{p.to}</b> Rs. {fmt(p.amount)}</li>
            ))}
          </ul>
        ) : (
          <p className="muted" style={{ margin: 0 }}>Everyone is settled up.</p>
        )}
      </div>

      <h3>Add Expense</h3>
      <form className="card form-grid" onSubmit={handleAddExpense}>
        <label>
          Spent By *
          <select value={form.person} onChange={(e) => setForm({ ...form, person: e.target.value })}>
            {project.people.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label>
          Date *
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </label>
        <label>
          Description
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Fuel, hotel, groceries" />
        </label>
        <label>
          Amount (Rs.) *
          <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </label>
        <label>
          Attach Receipt (optional)
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />
        </label>
        <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Adding...' : '+ Add Expense'}</button>
      </form>

      <h3>Expenses</h3>
      {expenses.length === 0 ? (
        <p className="muted">No expenses logged yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Person</th>
                <th>Description</th>
                <th className="num">Amount</th>
                <th>Receipt</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e._id}>
                  <td>{fmtDate(e.date)}</td>
                  <td>{e.person}</td>
                  <td>{e.description || '-'}</td>
                  <td className="num">Rs. {fmt(e.amount)}</td>
                  <td>
                    {e.receipts?.length
                      ? e.receipts.map((r, i) => (
                        <a key={i} href={fileUrl(r.path)} target="_blank" rel="noreferrer" className="doc-link">
                          {r.mimeType === 'application/pdf' ? 'PDF' : 'Photo'} {i + 1}
                        </a>
                      ))
                      : '-'}
                  </td>
                  <td className="edit-actions">
                    <button className="btn-danger-sm" onClick={() => handleDeleteExpense(e._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Projects() {
  const [openId, setOpenId] = useState(null);

  return openId
    ? <ProjectDetail projectId={openId} onBack={() => setOpenId(null)} />
    : <ProjectList onOpen={setOpenId} />;
}
