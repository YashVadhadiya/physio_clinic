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

  useEffect(() => { load(); }, [page]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (searchQuery) params.q = searchQuery;
      const res = await patientAPI.getAll(params);
      setPatients(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch { toast('Failed to load patients', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (searchQuery.length >= 2 || searchQuery.length === 0) load();
  }, [searchQuery]);

  const handleSearch = (q) => { setSearchQuery(q); setPage(1); };

  const openCreate = () => { setEditingPatient(null); setForm({ Name: '', Mobile: '', Address: '', Gender: '', Age: '', Notes: '' }); setShowModal(true); };
  const openEdit = (p, e) => { e?.stopPropagation(); setEditingPatient(p); setForm({ Name: p.Name, Mobile: p.Mobile, Address: p.Address || '', Gender: p.Gender || '', Age: p.Age || '', Notes: p.Notes || '' }); setShowModal(true); };

  const handleSubmit = async () => {
    if (!form.Name || !form.Mobile) { toast('Name & Mobile required', 'error'); return; }
    setSubmitting(true);
    try {
      if (editingPatient) { await patientAPI.update(editingPatient.PatientID, form); toast('Updated', 'success'); }
      else { await patientAPI.create(form); toast('Created', 'success'); }
      setShowModal(false); load();
    } catch (err) { toast(err.message || 'Failed', 'error'); }
    finally { setSubmitting(false); }
  };

  const viewHistory = async (patient) => {
    try { const res = await patientAPI.getVisitHistory(patient.PatientID); setVisitHistory(res.data.data || []); setViewPatient(patient); }
    catch { toast('Failed to load history', 'error'); }
  };

  const handleDelete = async (patient, e) => {
    e?.stopPropagation();
    const confirmed = await confirmDialog({ title: 'Delete Patient', message: `Delete ${patient.Name}?`, confirmText: 'Delete', type: 'error' });
    if (!confirmed) return;
    try { await patientAPI.delete(patient.PatientID); toast('Deleted', 'success'); load(); }
    catch { toast('Failed', 'error'); }
  };

  return (
    <div className="page-wrap">
      <div className="page-head">
        <div className="page-head-left">
          <h1>Patients</h1>
          <p>Manage patient records</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Icons.Plus /> Add Patient</button>
      </div>

      <div className="filters-bar">
        <div className="search-wrap" style={{ maxWidth: '100%' }}>
          <Icons.Search />
          <input type="text" placeholder="Search by name or mobile..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} />
        </div>
      </div>

      {loading ? <Loader text="Loading patients..." /> : patients.length === 0 ? (
        <div className="card"><div className="empty-state"><Icons.Patient /><h3>No patients found</h3><p>Add a new patient to get started</p></div></div>
      ) : (
        <>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
            {patients.map((p) => (
              <div key={p.PatientID} className="card" style={{ cursor: 'pointer', transition: 'transform .15s, box-shadow .15s' }} onClick={() => viewHistory(p)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 'var(--rounded-pill)', background: 'var(--primary-bg)', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--text-lg)', flexShrink: 0 }}>
                    {p.Name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>{p.Name}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--mute)' }}>{p.Mobile}</div>
                    <div style={{ marginTop: 'var(--space-xs)', display: 'flex', gap: 'var(--space-md)', fontSize: 'var(--text-sm)', color: 'var(--body)', flexWrap: 'wrap' }}>
                      {p.Gender && <span>{p.Gender}</span>}
                      {p.Age && <span>{p.Age} yrs</span>}
                      {p.Address && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{p.Address}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button className="btn btn-icon btn-sm btn-ghost" onClick={(e) => openEdit(p, e)}><Icons.Edit /></button>
                    <button className="btn btn-icon btn-sm btn-ghost" style={{ color: 'var(--negative)' }} onClick={(e) => handleDelete(p, e)}><Icons.X /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} className={page === i + 1 ? 'active' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>
              ))}
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <h3 className="modal-title">{editingPatient ? 'Edit Patient' : 'New Patient'}</h3>
              <button className="btn btn-icon btn-sm btn-secondary" onClick={() => setShowModal(false)}><Icons.X /></button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Full Name *</label><input type="text" className="form-input" value={form.Name} onChange={e => setForm({...form, Name: e.target.value})} placeholder="Patient name" /></div>
              <div className="form-group"><label className="form-label">Mobile *</label><input type="text" className="form-input" value={form.Mobile} onChange={e => setForm({...form, Mobile: e.target.value})} placeholder="10-digit" /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Gender</label><select className="form-select" value={form.Gender} onChange={e => setForm({...form, Gender: e.target.value})}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                <div className="form-group"><label className="form-label">Age</label><input type="number" className="form-input" value={form.Age} onChange={e => setForm({...form, Age: e.target.value})} placeholder="Years" /></div>
              </div>
              <div className="form-group"><label className="form-label">Address</label><input type="text" className="form-input" value={form.Address} onChange={e => setForm({...form, Address: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.Notes} onChange={e => setForm({...form, Notes: e.target.value})} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : editingPatient ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {viewPatient && (
        <div className="modal-overlay" onClick={() => { setViewPatient(null); setVisitHistory([]); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <h3 className="modal-title">{viewPatient.Name} &mdash; History</h3>
              <button className="btn btn-icon btn-sm btn-secondary" onClick={() => { setViewPatient(null); setVisitHistory([]); }}><Icons.X /></button>
            </div>
            <div className="modal-body">
              {visitHistory.length === 0 ? <div className="empty-state"><p>No visit history</p></div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {visitHistory.map((v, i) => (
                    <div key={v.VisitID || i} style={{ padding: 'var(--space-sm) var(--space-md)', background: 'var(--canvas-soft)', borderRadius: 'var(--rounded-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{v.VisitDate}</span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--mute)' }}>{v.VisitTime}</span>
                        <span className={`badge ${v.FeesCollected === 'Yes' ? 'badge-success' : 'badge-warning'}`}>₹{v.Amount}</span>
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--body)', marginTop: 2 }}>{v.VisitType}</div>
                      {v.TreatmentNotes && <div style={{ fontSize: 'var(--text-sm)', marginTop: 4 }}>{v.TreatmentNotes}</div>}
                      {v.NextVisit && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--primary-dark)', marginTop: 4 }}>Next: {v.NextVisit}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
