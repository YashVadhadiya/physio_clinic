import { useState, useEffect } from 'react';
import { workerAPI, authAPI } from '../../services/api';
import { toast } from '../../components/common/Toast';
import { Icons } from '../../components/common/Icons';
import { Loader } from '../../components/common/Loader';
import { confirmDialog } from '../../components/common/ConfirmDialog';

export function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ Name: '', Mobile: '', Email: '', Address: '', Password: '', EmergencyContact: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { const res = await workerAPI.getAll({ limit: 50 }); setWorkers(res.data.data || []); }
    catch { toast('Failed to load workers', 'error'); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.Name || !form.Mobile || !form.Email || !form.Password) { toast('Name, Mobile, Email and Password are required', 'error'); return; }
    setSubmitting(true);
    try {
      await authAPI.register(form);
      toast('Worker created', 'success');
      setShowModal(false);
      setForm({ Name: '', Mobile: '', Email: '', Address: '', Password: '', EmergencyContact: '' });
      setLoading(true); load();
    } catch (err) { toast(err.message || 'Failed to create', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleToggle = async (id, current) => {
    const action = current === 'active' ? 'disable' : 'enable';
    const confirmed = await confirmDialog({ title: `${action} Worker`, message: `Are you sure?`, confirmText: action, type: action === 'disable' ? 'warning' : 'info' });
    if (!confirmed) return;
    try { await workerAPI.toggleStatus(id); toast(`Worker ${action}d`, 'success'); setLoading(true); load(); }
    catch { toast('Failed', 'error'); }
  };

  const handleReset = async (id) => {
    const confirmed = await confirmDialog({ title: 'Reset Password', message: 'Reset to default password?', confirmText: 'Reset', type: 'warning' });
    if (!confirmed) return;
    try { const res = await authAPI.resetPassword(id); toast(`Password: ${res.data.data.defaultPassword}`, 'info'); }
    catch { toast('Failed', 'error'); }
  };

  if (loading) return <Loader text="Loading workers..." />;

  return (
    <div className="page-wrap">
      <div className="page-head">
        <div className="page-head-left">
          <h1>Workers</h1>
          <p>Manage therapists and staff</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Icons.Plus /> Add Worker</button>
      </div>

      {workers.length === 0 ? (
        <div className="card"><div className="empty-state"><Icons.Users /><h3>No workers found</h3><p>Add your first worker</p></div></div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="table-scroll" style={{ display: 'none' }}>
            <table className="table" style={{ display: 'none' }}>
              <thead><tr><th>ID</th><th>Name</th><th>Mobile</th><th>Email</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w.WorkerID}>
                    <td data-label="ID" style={{ fontFamily: 'monospace', fontSize: 'var(--text-xs)' }}>{w.WorkerID}</td>
                    <td data-label="Name" style={{ fontWeight: 500 }}>{w.Name}</td>
                    <td data-label="Mobile">{w.Mobile}</td>
                    <td data-label="Email" style={{ fontSize: 'var(--text-sm)' }}>{w.Email}</td>
                    <td data-label="Status"><span className={`badge ${w.Status === 'active' ? 'badge-success' : 'badge-danger'}`}>{w.Status === 'active' ? 'Active' : 'Inactive'}</span></td>
                    <td data-label="Joined">{w.JoiningDate}</td>
                    <td data-label="Actions">
                      <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                        <button className={`btn btn-sm ${w.Status === 'active' ? 'btn-secondary' : 'btn-primary'}`} onClick={() => handleToggle(w.WorkerID, w.Status)}>{w.Status === 'active' ? 'Disable' : 'Enable'}</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleReset(w.WorkerID)}>Reset</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/desktop card view */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {workers.map((w) => (
              <div key={w.WorkerID} className="card">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 'var(--rounded-pill)', background: 'var(--primary-bg)', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--text-lg)', flexShrink: 0 }}>
                    {w.Name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>{w.Name}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--mute)', marginTop: 2 }}>{w.Mobile} · {w.Email}</div>
                    <div style={{ marginTop: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                      <span className={`badge ${w.Status === 'active' ? 'badge-success' : 'badge-danger'}`}>{w.Status === 'active' ? 'Active' : 'Inactive'}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--body)' }}>Joined: {w.JoiningDate}</span>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)' }}>
                  <button className={`btn btn-sm ${w.Status === 'active' ? 'btn-secondary' : 'btn-primary'}`} onClick={() => handleToggle(w.WorkerID, w.Status)} style={{ flex: 1 }}>
                    {w.Status === 'active' ? 'Disable' : 'Enable'}
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => handleReset(w.WorkerID)} style={{ flex: 1 }}>Reset</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <h3 className="modal-title">Add Worker</h3>
              <button className="btn btn-icon btn-sm btn-secondary" onClick={() => setShowModal(false)}><Icons.X /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input type="text" className="form-input" value={form.Name} onChange={e => setForm({...form, Name: e.target.value})} placeholder="Worker name" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mobile *</label>
                  <input type="text" className="form-input" value={form.Mobile} onChange={e => setForm({...form, Mobile: e.target.value})} placeholder="10-digit" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-input" value={form.Email} onChange={e => setForm({...form, Email: e.target.value})} placeholder="email@example.com" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input type="password" className="form-input" value={form.Password} onChange={e => setForm({...form, Password: e.target.value})} placeholder="Min 6 chars" />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input type="text" className="form-input" value={form.Address} onChange={e => setForm({...form, Address: e.target.value})} placeholder="Optional" />
              </div>
              <div className="form-group">
                <label className="form-label">Emergency Contact</label>
                <input type="text" className="form-input" value={form.EmergencyContact} onChange={e => setForm({...form, EmergencyContact: e.target.value})} placeholder="Optional" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>{submitting ? 'Creating...' : 'Create Worker'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
