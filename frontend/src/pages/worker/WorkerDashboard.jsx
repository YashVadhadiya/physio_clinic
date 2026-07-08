import { useState, useEffect, useRef } from 'react';
import { dashboardAPI, patientAPI, visitAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../components/common/Toast';
import { Icons } from '../../components/common/Icons';
import { Loader } from '../../components/common/Loader';

export function WorkerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [visitForm, setVisitForm] = useState({
    PatientID: '',
    VisitType: 'Home',
    FeesCollected: 'No',
    Amount: '0',
    TreatmentNotes: '',
    Remarks: '',
    NextVisit: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ Name: '', Mobile: '', Address: '', Gender: '', Age: '', Notes: '' });
  const navigate = useNavigate();
  const searchTimer = useRef(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardAPI.getWorker();
      setData(res.data.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load dashboard';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await patientAPI.search(query.trim());
        setSearchResults(res.data.data || []);
      } catch { setSearchResults([]); }
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
    if (!visitForm.PatientID) { toast('Please select a patient', 'error'); return; }
    setSubmitting(true);
    try {
      await visitAPI.create(visitForm);
      toast('Visit recorded successfully', 'success');
      setShowVisitModal(false);
      setSelectedPatient(null);
      setSearchQuery('');
      setVisitForm({ PatientID: '', VisitType: 'Home', FeesCollected: 'No', Amount: '0', TreatmentNotes: '', Remarks: '', NextVisit: '' });
      loadDashboard();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to record visit', 'error');
    } finally { setSubmitting(false); }
  };

  const handleCreatePatient = async () => {
    if (!newPatient.Name || !newPatient.Mobile) { toast('Name and Mobile are required', 'error'); return; }
    setSubmitting(true);
    try {
      const res = await patientAPI.create(newPatient);
      toast('Patient created successfully', 'success');
      setShowNewPatient(false);
      setNewPatient({ Name: '', Mobile: '', Address: '', Gender: '', Age: '', Notes: '' });
      handleSelectPatient(res.data.data);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create patient', 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Worker Dashboard</h1>
          <p className="page-subtitle">Quick access to your daily tasks</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadDashboard} disabled={loading}>
          <Icons.Refresh />
        </button>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 'var(--spacing-xl)', border: '1px solid var(--negative)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div>
              <strong style={{ color: 'var(--negative)' }}>Failed to load dashboard</strong>
              <p style={{ fontSize: 'var(--body-sm)', color: 'var(--body)', marginTop: 'var(--spacing-xs)' }}>{error}</p>
            </div>
            <button className="btn btn-primary" onClick={loadDashboard}>
              <Icons.Refresh /> Retry
            </button>
          </div>
        </div>
      )}

      {loading && !data ? (
        <Loader text="Loading dashboard..." />
      ) : data?.stats && (
        <div className="grid grid-3" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div className="stat-card fade-in">
            <div className="card-header" style={{ marginBottom: 0 }}>
              <span className="stat-label">Today's Visits</span>
              <div className="stat-icon blue"><Icons.Visit /></div>
            </div>
            <span className="stat-value">{data.stats.todayVisits}</span>
          </div>
          <div className="stat-card fade-in">
            <div className="card-header" style={{ marginBottom: 0 }}>
              <span className="stat-label">Total Visits</span>
              <div className="stat-icon purple"><Icons.Activity /></div>
            </div>
            <span className="stat-value">{data.stats.totalVisits}</span>
          </div>
          <div className="stat-card fade-in">
            <div className="card-header" style={{ marginBottom: 0 }}>
              <span className="stat-label">Patients Treated</span>
              <div className="stat-icon green"><Icons.Patient /></div>
            </div>
            <span className="stat-value">{data.stats.patientsTreated}</span>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h3 style={{ marginBottom: 'var(--spacing-lg)', fontSize: 'var(--body-md)', fontWeight: 600 }}>Quick Add Visit</h3>
        <div className="quick-visit-search">
          <div className="search-input-wrapper" style={{ maxWidth: '100%' }}>
            <Icons.Search />
            <input
              type="text"
              placeholder="Search patient by name or mobile..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="search-results-dropdown">
              {searchResults.map((p) => (
                <div key={p.PatientID} className="search-result-item" onClick={() => handleSelectPatient(p)}>
                  <div className="search-result-name">{p.Name}</div>
                  <div className="search-result-mobile">{p.Mobile}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="quick-visit-actions" style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setShowVisitModal(true)} disabled={!selectedPatient}>
            <Icons.Plus /> Record Visit
          </button>
          <button className="btn btn-secondary" onClick={() => setShowNewPatient(true)}>
            <Icons.Plus /> New Patient
          </button>
        </div>
        <style>{`
          .quick-visit-search { position: relative; }
          .search-results-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: var(--canvas); border: 1px solid var(--canvas-soft); border-radius: var(--rounded-xl); box-shadow: var(--shadow-lg); z-index: 50; max-height: 240px; overflow-y: auto; margin-top: var(--spacing-xs); }
          .search-result-item { display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-sm) var(--spacing-lg); cursor: pointer; transition: background 0.2s; }
          .search-result-item:hover { background: var(--canvas-soft); }
          .search-result-item:not(:last-child) { border-bottom: 1px solid var(--canvas-soft); }
          .search-result-name { font-weight: 500; font-size: var(--body-sm); }
          .search-result-mobile { font-size: var(--body-sm); color: var(--mute); }
          @media (max-width: 480px) {
            .search-results-dropdown { max-height: 160px; }
          }
        `}</style>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Today's Visits</h3>
          </div>
          {data?.todayVisits?.length > 0 ? (
            <div className="visit-list">
              {data.todayVisits.map((v, i) => (
                <div key={v.VisitID || i} className="visit-item">
                  <div className="visit-item-header">
                    <span className="visit-patient">{v.PatientName}</span>
                    <span className={`badge ${v.FeesCollected === 'Yes' ? 'badge-success' : 'badge-warning'}`}>
                      {v.FeesCollected === 'Yes' ? <><Icons.Rupee />{v.Amount}</> : 'Pending'}
                    </span>
                  </div>
                  <div className="visit-item-details">
                    <span><Icons.Home />{v.VisitType}</span>
                    <span><Icons.Clock />{v.VisitTime}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : !loading && (
            <div className="empty-state"><p>No visits recorded today</p></div>
          )}
          <style>{`
            .visit-list { display: flex; flex-direction: column; }
            .visit-item { padding: var(--spacing-md) 0; border-bottom: 1px solid var(--canvas-soft); }
            .visit-item:last-child { border-bottom: none; }
            .visit-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xs); }
            .visit-patient { font-weight: 600; font-size: var(--body-sm); }
            .visit-item-details { display: flex; gap: var(--spacing-lg); font-size: var(--body-sm); color: var(--body); flex-wrap: wrap; }
            .visit-item-details svg { width: 14px; height: 14px; margin-right: 4px; vertical-align: middle; }
          `}</style>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Patients</h3>
          </div>
          {data?.recentPatients?.length > 0 ? (
            <div className="patient-list">
              {data.recentPatients.map((p, i) => (
                <div key={p.PatientID || i} className="patient-item" onClick={() => navigate(`/worker/patients?id=${p.PatientID}`)}>
                  <div className="patient-avatar">{p.Name?.charAt(0)?.toUpperCase()}</div>
                  <div className="patient-info">
                    <span className="patient-name">{p.Name}</span>
                    <span className="patient-mobile">{p.Mobile}</span>
                  </div>
                  <Icons.ChevronRight />
                </div>
              ))}
            </div>
          ) : !loading && (
            <div className="empty-state"><p>No recent patients</p></div>
          )}
          <style>{`
            .patient-list { display: flex; flex-direction: column; }
            .patient-item { display: flex; align-items: center; gap: var(--spacing-md); padding: var(--spacing-sm) 0; border-bottom: 1px solid var(--canvas-soft); cursor: pointer; }
            .patient-item:last-child { border-bottom: none; }
            .patient-item:hover .patient-name { color: var(--ink); }
            .patient-item svg { color: var(--mute); margin-left: auto; }
            .patient-avatar { width: 38px; height: 38px; border-radius: var(--rounded-full); background: var(--primary-pale); color: var(--ink-deep); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: var(--body-sm); }
            .patient-info { display: flex; flex-direction: column; }
            .patient-name { font-size: var(--body-sm); font-weight: 500; }
            .patient-mobile { font-size: var(--caption); color: var(--mute); }
          `}</style>
        </div>
      </div>

      {showVisitModal && (
        <div className="modal-overlay" onClick={() => setShowVisitModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Visit</h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowVisitModal(false)}>
                <Icons.X />
              </button>
            </div>
            <div className="modal-body">
              {selectedPatient && (
                <div className="card-green" style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--rounded-full)', background: 'var(--primary-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                    {selectedPatient.Name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--body-sm)' }}>{selectedPatient.Name}</div>
                    <div style={{ fontSize: 'var(--body-sm)', color: 'var(--body)' }}>{selectedPatient.Mobile}</div>
                  </div>
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
                <textarea className="form-textarea" value={visitForm.TreatmentNotes} onChange={e => setVisitForm({...visitForm, TreatmentNotes: e.target.value})} placeholder="Describe the treatment provided..." />
              </div>
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <input type="text" className="form-input" value={visitForm.Remarks} onChange={e => setVisitForm({...visitForm, Remarks: e.target.value})} placeholder="Optional remarks" />
              </div>
              <div className="form-group">
                <label className="form-label">Next Visit Date</label>
                <input type="date" className="form-input" value={visitForm.NextVisit} onChange={e => setVisitForm({...visitForm, NextVisit: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowVisitModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmitVisit} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Visit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewPatient && (
        <div className="modal-overlay" onClick={() => setShowNewPatient(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">New Patient</h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowNewPatient(false)}>
                <Icons.X />
              </button>
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
              <button className="btn btn-primary" onClick={handleCreatePatient} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create & Select'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
