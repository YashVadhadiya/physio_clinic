import { useState, useEffect } from 'react';
import { visitAPI, workerAPI } from '../../services/api';
import { toast } from '../../components/common/Toast';
import { Icons } from '../../components/common/Icons';
import { Loader } from '../../components/common/Loader';

export function VisitPage() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterDate, setFilterDate] = useState('');
  const [filterWorker, setFilterWorker] = useState('');
  const [filterType, setFilterType] = useState('');
  const [workers, setWorkers] = useState([]);

  useEffect(() => {
    workerAPI.getActive().then(res => setWorkers(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [page, filterDate, filterWorker, filterType]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filterDate) params.VisitDate = filterDate;
      if (filterWorker) params.WorkerID = filterWorker;
      if (filterType) params.VisitType = filterType;
      const res = await visitAPI.getAll(params);
      setVisits(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch { toast('Failed to load visits', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="page-wrap">
      <div className="page-head">
        <div className="page-head-left">
          <h1>Visits</h1>
          <p>View all patient visits</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}><Icons.Refresh /></button>
      </div>

      <div className="filters-bar">
        <input type="date" value={filterDate} onChange={e => { setFilterDate(e.target.value); setPage(1); }} style={{ minWidth: 140 }} />
        <select value={filterWorker} onChange={e => { setFilterWorker(e.target.value); setPage(1); }} style={{ minWidth: 140 }}>
          <option value="">All Workers</option>
          {workers.map(w => <option key={w.WorkerID} value={w.WorkerID}>{w.Name}</option>)}
        </select>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          <option value="Home">Home</option>
          <option value="Hospital">Hospital</option>
        </select>
      </div>

      {loading ? <Loader text="Loading visits..." /> : visits.length === 0 ? (
        <div className="card"><div className="empty-state"><Icons.Visit /><h3>No visits found</h3><p>Try adjusting filters</p></div></div>
      ) : (
        <>
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>Date</th><th>Time</th><th>Patient</th><th>Worker</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {visits.map((v) => (
                  <tr key={v.VisitID}>
                    <td data-label="Date">{v.VisitDate}</td>
                    <td data-label="Time">{v.VisitTime}</td>
                    <td data-label="Patient" style={{ fontWeight: 500 }}>{v.PatientName || 'N/A'}</td>
                    <td data-label="Worker">{v.WorkerName || 'N/A'}</td>
                    <td data-label="Type"><span className={`badge ${v.VisitType === 'Home' ? 'badge-success' : 'badge-info'}`}>{v.VisitType === 'Home' ? <Icons.Home /> : <Icons.Building />}{v.VisitType}</span></td>
                    <td data-label="Amount">₹{v.Amount || '0'}</td>
                    <td data-label="Status"><span className={`badge ${v.FeesCollected === 'Yes' ? 'badge-success' : 'badge-warning'}`}>{v.FeesCollected === 'Yes' ? <>Paid</> : 'Pending'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                <button key={i} className={page === i + 1 ? 'active' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>
              ))}
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
