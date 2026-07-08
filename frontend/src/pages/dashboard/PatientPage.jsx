import { useState, useEffect } from 'react';
import { patientAPI } from '../../services/api';
import { toast } from '../../components/common/Toast';
import { Icons } from '../../components/common/Icons';
import { Loader } from '../../components/common/Loader';
import { confirmDialog } from '../../components/common/ConfirmDialog';

export function PatientPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [viewPatient, setViewPatient] = useState(null);
  const [visitHistory, setVisitHistory] = useState([]);
  const [form, setForm] = useState({ Name: '', Mobile: '', Address: '', Gender: '', Age: '', Notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPatients();
  }, [page]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (searchQuery) params.q = searchQuery;
      const res = await patientAPI.getAll(params);
      setPatients(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      toast('Failed to load patients', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (q) => {
    setSearchQuery(q);
    setPage(1);
  };

  useEffect(() => {
    if (searchQuery.length >= 2 || searchQuery.length === 0) {
      loadPatients();
    }
  }, [searchQuery]);

  const openCreate = () => {
    setEditingPatient(null);
    setForm({ Name: '', Mobile: '', Address: '', Gender: '', Age: '', Notes: '' });
    setShowModal(true);
  };

  const openEdit = (patient, e) => {
    e?.stopPropagation();
    setEditingPatient(patient);
    setForm({
      Name: patient.Name,
      Mobile: patient.Mobile,
      Address: patient.Address || '',
      Gender: patient.Gender || '',
      Age: patient.Age || '',
      Notes: patient.Notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.Name || !form.Mobile) {
      toast('Name and Mobile are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (editingPatient) {
        await patientAPI.update(editingPatient.PatientID, form);
        toast('Patient updated successfully', 'success');
      } else {
        await patientAPI.create(form);
        toast('Patient created successfully', 'success');
      }
      setShowModal(false);
      loadPatients();
    } catch (err) {
      toast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const viewHistory = async (patient) => {
    try {
      const res = await patientAPI.getVisitHistory(patient.PatientID);
      setVisitHistory(res.data.data || []);
      setViewPatient(patient);
    } catch {
      toast('Failed to load visit history', 'error');
    }
  };

  const handleDelete = async (patient, e) => {
    e?.stopPropagation();
    const confirmed = await confirmDialog({
      title: 'Delete Patient',
      message: `Are you sure you want to delete ${patient.Name}? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'error',
    });
    if (!confirmed) return;
    try {
      await patientAPI.delete(patient.PatientID);
      toast('Patient deleted', 'success');
      loadPatients();
    } catch {
      toast('Failed to delete patient', 'error');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">Manage patient records</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Icons.Plus /> Add Patient
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-input-wrapper">
          <Icons.Search />
          <input
            type="text"
            placeholder="Search by name or mobile..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Loader text="Loading patients..." />
      ) : patients.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Icons.Patient />
            <h3>No patients found</h3>
            <p>Add a new patient to get started</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-2" style={{ gap: 'var(--spacing-md)' }}>
            {patients.map((p) => (
              <div key={p.PatientID} className="card" style={{ cursor: 'pointer' }} onClick={() => viewHistory(p)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>
                  <div className="pat-avatar" style={{ flexShrink: 0 }}>
                    {p.Name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--body-sm)', wordBreak: 'break-word' }}>{p.Name}</div>
                    <div style={{ fontSize: 'var(--body-sm)', color: 'var(--mute)' }}>{p.Mobile}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap', flexShrink: 0 }}>
                    <button className="btn btn-sm btn-tertiary" onClick={(e) => openEdit(p, e)}>
                      <Icons.Edit />
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={(e) => handleDelete(p, e)}>
                      <Icons.X />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-lg)', fontSize: 'var(--body-sm)', color: 'var(--body)', flexWrap: 'wrap' }}>
                  {p.Gender && <span><Icons.Users />{p.Gender}</span>}
                  {p.Age && <span><Icons.Clock />{p.Age} yrs</span>}
                  {p.Address && <span><Icons.Home />{p.Address}</span>}
                </div>
                <style>{`
                  .pat-avatar { width: 42px; height: 42px; border-radius: var(--rounded-full); background: var(--primary-pale); color: var(--ink-deep); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: var(--body-md); }
                  .pat-avatar svg { width: 14px; height: 14px; margin-right: 4px; vertical-align: middle; }
                `}</style>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <Icons.ChevronLeft /> Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} className={page === i + 1 ? 'active' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>
              ))}
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                Next <Icons.ChevronRight />
              </button>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingPatient ? 'Edit Patient' : 'New Patient'}</h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>
                <Icons.X />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input type="text" className="form-input" value={form.Name} onChange={e => setForm({...form, Name: e.target.value})} placeholder="Patient name" />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile *</label>
                <input type="text" className="form-input" value={form.Mobile} onChange={e => setForm({...form, Mobile: e.target.value})} placeholder="10-digit number" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" value={form.Gender} onChange={e => setForm({...form, Gender: e.target.value})}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input type="number" className="form-input" value={form.Age} onChange={e => setForm({...form, Age: e.target.value})} placeholder="Years" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input type="text" className="form-input" value={form.Address} onChange={e => setForm({...form, Address: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={form.Notes} onChange={e => setForm({...form, Notes: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : editingPatient ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewPatient && (
        <div className="modal-overlay" onClick={() => { setViewPatient(null); setVisitHistory([]); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{viewPatient.Name} - Visit History</h3>
              <button className="btn btn-icon btn-secondary" onClick={() => { setViewPatient(null); setVisitHistory([]); }}>
                <Icons.X />
              </button>
            </div>
            <div className="modal-body">
              {visitHistory.length === 0 ? (
                <div className="empty-state"><p>No visit history</p></div>
              ) : (
                <div className="timeline">
                  {visitHistory.map((v, i) => (
                    <div key={v.VisitID || i} className="timeline-item">
                      <div className="timeline-dot" />
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className="timeline-date">{v.VisitDate}</span>
                          <span className="timeline-time">{v.VisitTime}</span>
                          <span className={`badge ${v.FeesCollected === 'Yes' ? 'badge-success' : 'badge-warning'}`}>
                            <Icons.Rupee />{v.Amount}
                          </span>
                        </div>
                        <div className="timeline-type"><Icons.Home />{v.VisitType}</div>
                        {v.TreatmentNotes && <div className="timeline-notes">{v.TreatmentNotes}</div>}
                        {v.NextVisit && <div className="timeline-next">Next: {v.NextVisit}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <style>{`
              .timeline { position: relative; padding-left: var(--spacing-xl); }
              .timeline::before { content: ''; position: absolute; left: 8px; top: 0; bottom: 0; width: 2px; background: var(--canvas-soft); }
              .timeline-item { position: relative; padding-bottom: var(--spacing-lg); }
              .timeline-dot { position: absolute; left: calc(-1 * var(--spacing-xl) + 4px); top: 4px; width: 12px; height: 12px; border-radius: 50%; background: var(--primary); border: 2px solid var(--canvas); }
              .timeline-content { padding: var(--spacing-sm) var(--spacing-md); background: var(--canvas-soft); border-radius: var(--rounded-xl); }
              .timeline-header { display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-xs); flex-wrap: wrap; }
              .timeline-date { font-weight: 600; font-size: var(--body-sm); }
              .timeline-time { font-size: var(--caption); color: var(--mute); }
              .timeline-type { font-size: var(--body-sm); color: var(--body); display: flex; align-items: center; gap: 4px; }
              .timeline-notes { font-size: var(--body-sm); margin-top: var(--spacing-xs); color: var(--ink); }
            .timeline-next { font-size: var(--caption); margin-top: var(--spacing-xs); color: var(--ink-deep); font-weight: 500; }
            .timeline-type svg { width: 14px; height: 14px; }
            @media (max-width: 480px) {
              .timeline { padding-left: var(--spacing-lg); }
              .timeline-content { padding: var(--spacing-xs) var(--spacing-sm); }
              .timeline-header { flex-direction: column; align-items: flex-start; gap: var(--spacing-xs); }
            }
          `}</style>
          </div>
        </div>
      )}
    </div>
  );
}
