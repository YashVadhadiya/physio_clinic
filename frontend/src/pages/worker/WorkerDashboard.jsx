import { useState, useEffect, useRef } from 'react';
import { dashboardAPI, patientAPI, visitAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../components/common/Toast';
import { Icons } from '../../components/common/Icons';
import { Loader } from '../../components/common/Loader';

export function WorkerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [visitForm, setVisitForm] = useState({ PatientID: '', VisitType: 'Home', FeesCollected: 'No', Amount: '0', TreatmentNotes: '', Remarks: '', NextVisit: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ Name: '', Mobile: '', Address: '', Gender: '', Age: '', Notes: '' });
  const navigate = useNavigate();
  const searchTimer = useRef(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { const res = await dashboardAPI.getWorker(); setData(res.data.data); }
    catch (err) { const m = err.message || 'Failed'; setError(m); toast(m, 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try { const res = await patientAPI.search(q.trim()); setSearchResults(res.data.data || []); }
      catch { setSearchResults([]); }
    }, 300);
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setVisitForm(prev => ({ ...prev, PatientID: patient.PatientID }));
    setSearchQuery(patient.Name);
    setSearchResults([]);
    setShowVisitModal(true);
  };

  const handleSubmitVisit = async () => {
    if (!visitForm.PatientID) { toast('Select a patient', 'error'); return; }
    setSubmitting(true);
    try {
      await visitAPI.create(visitForm);
      toast('Visit recorded', 'success');
      setShowVisitModal(false); setSelectedPatient(null); setSearchQuery('');
      setVisitForm({ PatientID: '', VisitType: 'Home', FeesCollected: 'No', Amount: '0', TreatmentNotes: '', Remarks: '', NextVisit: '' });
      load();
    } catch (err) { toast(err.message || 'Failed', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleCreatePatient = async () => {
    if (!newPatient.Name || !newPatient.Mobile) { toast('Name & Mobile required', 'error'); return; }
    setSubmitting(true);
    try {
      const res = await patientAPI.create(newPatient);
      toast('Patient created', 'success');
      setShowNewPatient(false);
      setNewPatient({ Name: '', Mobile: '', Address: '', Gender: '', Age: '', Notes: '' });
      handleSelectPatient(res.data.data);
    } catch (err) { toast(err.message || 'Failed', 'error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="page-wrap">
      <div className="page-head">
        <div className="page-head-left">
          <h1>Dashboard</h1>
          <p>Your daily tasks</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}><Icons.Refresh /></button>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 'var(--space-xl)', textAlign: 'center', padding: 'var(--space-xl)' }}>
          <p style={{ color: 'var(--negative)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>{error}</p>
          <button className="btn btn-primary btn-sm" onClick={load}>Retry</button>
        </div>
      )}

      {loading && !data ? <Loader text="Loading..." /> : data?.stats && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: 'var(--space-xl)' }}>
          <div className="stat-card fade-up">
            <div className="stat-card-top"><span className="stat-label">Today's Visits</span><div className="stat-icon blue"><Icons.Visit /></div></div>
            <span className="stat-val">{data.stats.todayVisits}</span>
          </div>
          <div className="stat-card fade-up">
            <div className="stat-card-top"><span className="stat-label">Total Visits</span><div className="stat-icon teal"><Icons.Activity /></div></div>
            <span className="stat-val">{data.stats.totalVisits}</span>
          </div>
          <div className="stat-card fade-up">
            <div className="stat-card-top"><span className="stat-label">Patients Treated</span><div className="stat-icon green"><Icons.Patient /></div></div>
            <span className="stat-val">{data.stats.patientsTreated}</span>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 'var(--space-xl)', borderColor: 'var(--primary)', background: 'var(--primary-bg)' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 'var(--space-md)' }}>Quick Add Visit</h3>
        <div style={{ position: 'relative' }}>
          <div className="search-wrap" style={{ maxWidth: '100%' }}>
            <Icons.Search />
            <input type="text" placeholder="Search patient by name or mobile..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} />
          </div>
          {searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--rounded)', boxShadow: 'var(--shadow-md)', zIndex: 50, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
              {searchResults.map((p) => (
                <div key={p.PatientID} onClick={() => handleSelectPatient(p)} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-sm) var(--space-md)', cursor: 'pointer', transition: 'background .15s', borderBottom: '1px solid var(--line-light)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ fontWeight: 500, fontSize: 'var(--text-sm)' }}>{p.Name}</span>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--mute)' }}>{p.Mobile}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setShowVisitModal(true)} disabled={!selectedPatient}><Icons.Plus /> Record Visit</button>
          <button className="btn btn-secondary" onClick={() => setShowNewPatient(true)}><Icons.Plus /> New Patient</button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Today's Visits</span></div>
          {data?.todayVisits?.length > 0 ? data.todayVisits.map((v, i) => (
            <div key={v.VisitID || i} style={{ padding: 'var(--space-sm) 0', borderBottom: '1px solid var(--line-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{v.PatientName}</span>
                <span className={`badge ${v.FeesCollected === 'Yes' ? 'badge-success' : 'badge-warning'}`}>
                  {v.FeesCollected === 'Yes' ? <>₹{v.Amount}</> : 'Pending'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-lg)', fontSize: 'var(--text-sm)', color: 'var(--body)' }}>
                <span>{v.VisitType}</span>
                <span>{v.VisitTime}</span>
              </div>
            </div>
          )) : !loading && <div className="empty-state"><p>No visits today</p></div>}
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Recent Patients</span></div>
          {data?.recentPatients?.length > 0 ? data.recentPatients.map((p, i) => (
            <div key={p.PatientID || i} onClick={() => navigate(`/worker/patients?id=${p.PatientID}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: '6px 0', borderBottom: '1px solid var(--line-light)', cursor: 'pointer', transition: 'background .15s' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--rounded-pill)', background: 'var(--primary-bg)', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--text-sm)', flexShrink: 0 }}>
                {p.Name?.charAt(0)?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{p.Name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--mute)' }}>{p.Mobile}</div>
              </div>
              <Icons.ChevronRight style={{ color: 'var(--mute)', width: 16 }} />
            </div>
          )) : !loading && <div className="empty-state"><p>No recent patients</p></div>}
        </div>
      </div>

      {showVisitModal && (
        <div className="modal-overlay" onClick={() => setShowVisitModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <h3 className="modal-title">Record Visit</h3>
              <button className="btn btn-icon btn-sm btn-secondary" onClick={() => setShowVisitModal(false)}><Icons.X /></button>
            </div>
            <div className="modal-body">
              {selectedPatient && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-sm) var(--space-md)', background: 'var(--primary-bg)', borderRadius: 'var(--rounded-sm)', marginBottom: 'var(--space-lg)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--rounded-pill)', background: 'var(--primary-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>{selectedPatient.Name?.charAt(0)?.toUpperCase()}</div>
                  <div><div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{selectedPatient.Name}</div><div style={{ fontSize: 'var(--text-sm)', color: 'var(--body)' }}>{selectedPatient.Mobile}</div></div>
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Visit Type</label>
                  <select className="form-select" value={visitForm.VisitType} onChange={e => setVisitForm({...visitForm, VisitType: e.target.value})}>
                    <option value="Home">Home</option>
                    <option value="Hospital">Hospital</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input type="number" className="form-input" value={visitForm.Amount} onChange={e => setVisitForm({...visitForm, Amount: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Fees Collected</label>
                <select className="form-select" value={visitForm.FeesCollected} onChange={e => setVisitForm({...visitForm, FeesCollected: e.target.value})}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Treatment Notes</label>
                <textarea className="form-textarea" value={visitForm.TreatmentNotes} onChange={e => setVisitForm({...visitForm, TreatmentNotes: e.target.value})} placeholder="Describe treatment..." />
              </div>
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <input type="text" className="form-input" value={visitForm.Remarks} onChange={e => setVisitForm({...visitForm, Remarks: e.target.value})} placeholder="Optional" />
              </div>
              <div className="form-group">
                <label className="form-label">Next Visit Date</label>
                <input type="date" className="form-input" value={visitForm.NextVisit} onChange={e => setVisitForm({...visitForm, NextVisit: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowVisitModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmitVisit} disabled={submitting}>{submitting ? 'Saving...' : 'Save Visit'}</button>
            </div>
          </div>
        </div>
      )}

      {showNewPatient && (
        <div className="modal-overlay" onClick={() => setShowNewPatient(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <h3 className="modal-title">New Patient</h3>
              <button className="btn btn-icon btn-sm btn-secondary" onClick={() => setShowNewPatient(false)}><Icons.X /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input type="text" className="form-input" value={newPatient.Name} onChange={e => setNewPatient({...newPatient, Name: e.target.value})} placeholder="Patient name" />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile *</label>
                <input type="text" className="form-input" value={newPatient.Mobile} onChange={e => setNewPatient({...newPatient, Mobile: e.target.value})} placeholder="10-digit number" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" value={newPatient.Gender} onChange={e => setNewPatient({...newPatient, Gender: e.target.value})}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input type="number" className="form-input" value={newPatient.Age} onChange={e => setNewPatient({...newPatient, Age: e.target.value})} placeholder="Years" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input type="text" className="form-input" value={newPatient.Address} onChange={e => setNewPatient({...newPatient, Address: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={newPatient.Notes} onChange={e => setNewPatient({...newPatient, Notes: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNewPatient(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreatePatient} disabled={submitting}>{submitting ? 'Creating...' : 'Create & Select'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
