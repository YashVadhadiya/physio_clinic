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

  useEffect(() => { loadWorkers(); }, []);

  const loadWorkers = async () => {
    try {
      const res = await workerAPI.getAll({ limit: 50 });
      setWorkers(res.data.data || []);
    } catch {
      toast('Failed to load workers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.Name || !form.Mobile || !form.Email || !form.Password) {
      toast('Name, Mobile, Email and Password are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await authAPI.register(form);
      toast('Worker created successfully', 'success');
      setShowModal(false);
      setForm({ Name: '', Mobile: '', Email: '', Address: '', Password: '', EmergencyContact: '' });
      loadWorkers();
    } catch (err) {
      toast(err.message || 'Failed to create worker', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const action = currentStatus === 'active' ? 'disable' : 'enable';
    const confirmed = await confirmDialog({
      title: `${action === 'disable' ? 'Disable' : 'Enable'} Worker`,
      message: `Are you sure you want to ${action} this worker?`,
      confirmText: action === 'disable' ? 'Disable' : 'Enable',
      type: action === 'disable' ? 'warning' : 'info',
    });
    if (!confirmed) return;
    try {
      await workerAPI.toggleStatus(id);
      toast(`Worker ${action}d successfully`, 'success');
      loadWorkers();
    } catch {
      toast('Failed to update status', 'error');
    }
  };

  const handleResetPassword = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Reset Password',
      message: 'This will reset the worker password to a default value. Continue?',
      confirmText: 'Reset',
      type: 'warning',
    });
    if (!confirmed) return;
    try {
      const res = await authAPI.resetPassword(id);
      toast(`Password reset to: ${res.data.data.defaultPassword}`, 'info');
    } catch {
      toast('Failed to reset password', 'error');
    }
  };

  if (loading) return <Loader text="Loading workers..." />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Workers</h1>
          <p className="page-subtitle">Manage therapists and staff</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Icons.Plus /> Add Worker
        </button>
      </div>

      {workers.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Icons.Users />
            <h3>No workers found</h3>
            <p>Add your first worker to get started</p>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Worker ID</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>Status</th>
                <th>Joining Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => (
                <tr key={w.WorkerID}>
                  <td data-label="Worker ID" style={{ fontFamily: 'monospace', fontSize: 'var(--caption)' }}>{w.WorkerID}</td>
                  <td data-label="Name" style={{ fontWeight: 500 }}>{w.Name}</td>
                  <td data-label="Mobile">{w.Mobile}</td>
                  <td data-label="Email" style={{ fontSize: 'var(--body-sm)' }}>{w.Email}</td>
                  <td data-label="Status">
                    <span className={`badge ${w.Status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                      {w.Status === 'active' ? <><Icons.Check />Active</> : <><Icons.X />Inactive</>}
                    </span>
                  </td>
                  <td data-label="Joined">{w.JoiningDate}</td>
                  <td data-label="Actions">
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                      <button
                        className={`btn btn-sm ${w.Status === 'active' ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => handleToggleStatus(w.WorkerID, w.Status)}
                      >
                        {w.Status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        className="btn btn-sm btn-tertiary"
                        onClick={() => handleResetPassword(w.WorkerID)}
                      >
                        Reset Pwd
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Worker</h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>
                <Icons.X />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input type="text" className="form-input" value={form.Name} onChange={e => setForm({...form, Name: e.target.value})} placeholder="Enter worker name" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mobile *</label>
                  <input type="text" className="form-input" value={form.Mobile} onChange={e => setForm({...form, Mobile: e.target.value})} placeholder="10-digit number" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-input" value={form.Email} onChange={e => setForm({...form, Email: e.target.value})} placeholder="email@example.com" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input type="password" className="form-input" value={form.Password} onChange={e => setForm({...form, Password: e.target.value})} placeholder="Min 6 characters" />
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
              <button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Worker'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
