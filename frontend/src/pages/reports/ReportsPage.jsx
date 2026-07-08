import { useEffect, useState } from 'react';
import { reportAPI, workerAPI } from '../../services/api';
import { toast } from '../../components/common/Toast';
import { Icons } from '../../components/common/Icons';
import { InlineLoader } from '../../components/common/Loader';

function ReportCard({ title, desc, onGenerate, children }) {
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const handle = async () => {
    if (onGenerate) {
      setLoading(true);
      try { const r = await onGenerate(); setData(r); setShowResult(true); }
      catch (err) { toast(err.message || 'Failed', 'error'); }
      finally { setLoading(false); }
      return;
    }
    setShowResult(!showResult);
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-md)', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
        <div>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>{title}</h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--body)', marginTop: 2 }}>{desc}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handle} disabled={loading} style={{ flexShrink: 0 }}>
          {loading ? <InlineLoader /> : 'Generate'}
        </button>
      </div>
      {children && showResult && data && (
        <div>{typeof children === 'function' ? children(data) : children}</div>
      )}
    </div>
  );
}

export function ReportsPage() {
  const [todayReport, setTodayReport] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [workerReport, setWorkerReport] = useState(null);
  const [feeReport, setFeeReport] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState('');

  useEffect(() => {
    workerAPI.getActive().then(res => setWorkers(res.data.data || [])).catch(() => {});
  }, []);

  const genDaily = async () => { const r = await reportAPI.daily(); setTodayReport(r.data.data); return r.data.data; };
  const genWeekly = async () => { const r = await reportAPI.weekly(); setWeeklyReport(r.data.data); return r.data.data; };
  const genMonthly = async () => { const r = await reportAPI.monthly(); setMonthlyReport(r.data.data); return r.data.data; };
  const genWorker = async () => {
    if (!selectedWorker) { toast('Select a worker', 'error'); throw new Error('No worker'); }
    const r = await reportAPI.worker({ workerId: selectedWorker }); setWorkerReport(r.data.data); return r.data.data;
  };
  const genFees = async () => { const r = await reportAPI.fees(); setFeeReport(r.data.data); return r.data.data; };
  const handlePrint = () => window.print();

  const SummaryStats = ({ data: d }) => d ? (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
      <div className="stat-card" style={{ padding: 'var(--space-md)' }}>
        <span className="stat-label">Visits</span>
        <span className="stat-val" style={{ fontSize: 'var(--text-lg)' }}>{d.totalVisits}</span>
      </div>
      <div className="stat-card" style={{ padding: 'var(--space-md)' }}>
        <span className="stat-label">Collected</span>
        <span className="stat-val" style={{ fontSize: 'var(--text-lg)', color: 'var(--positive)' }}>₹{d.collectedFees}</span>
      </div>
      <div className="stat-card" style={{ padding: 'var(--space-md)' }}>
        <span className="stat-label">Pending</span>
        <span className="stat-val" style={{ fontSize: 'var(--text-lg)', color: 'var(--negative)' }}>₹{d.pendingFees}</span>
      </div>
    </div>
  ) : null;

  return (
    <div className="page-wrap">
      <div className="page-head">
        <div className="page-head-left">
          <h1>Reports</h1>
          <p>Generate clinic reports</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handlePrint}><Icons.Printer /> Print</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
        <ReportCard title="Daily Report" desc="Today's visit summary" onGenerate={genDaily}>
          {(data) => data && <>
            <SummaryStats data={data} />
            {data.visits?.length > 0 && (
              <div className="table-scroll">
                <table className="table">
                  <thead><tr><th>Time</th><th>Patient</th><th>Worker</th><th>Type</th><th>Amount</th></tr></thead>
                  <tbody>{data.visits.map((v, i) => (
                    <tr key={i}><td data-label="Time">{v.VisitTime}</td><td data-label="Patient">{v.PatientName}</td><td data-label="Worker">{v.WorkerName}</td><td data-label="Type">{v.VisitType}</td><td data-label="Amount">₹{v.Amount}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </>}
        </ReportCard>

        <ReportCard title="Weekly Report" desc="Last 7 days" onGenerate={genWeekly}>
          {(data) => data && <SummaryStats data={data} />}
        </ReportCard>

        <ReportCard title="Monthly Report" desc="Current month" onGenerate={genMonthly}>
          {(data) => data && <SummaryStats data={data} />}
        </ReportCard>

        <div className="card">
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>Worker Report</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--body)', marginTop: 2 }}>Performance by worker</p>
          </div>
          <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
            <select className="form-select" value={selectedWorker} onChange={e => setSelectedWorker(e.target.value)}>
              <option value="">Select Worker</option>
              {workers.map(w => <option key={w.WorkerID} value={w.WorkerID}>{w.Name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-sm" onClick={genWorker}><Icons.Report /> Generate</button>
          {workerReport && (
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-sm)' }}>
                <div className="stat-card" style={{ padding: 'var(--space-md)' }}>
                  <span className="stat-label">Visits</span>
                  <span className="stat-val" style={{ fontSize: 'var(--text-lg)' }}>{workerReport.summary?.totalVisits}</span>
                </div>
                <div className="stat-card" style={{ padding: 'var(--space-md)' }}>
                  <span className="stat-label">Collected</span>
                  <span className="stat-val" style={{ fontSize: 'var(--text-lg)', color: 'var(--positive)' }}>₹{workerReport.summary?.collectedFees}</span>
                </div>
                <div className="stat-card" style={{ padding: 'var(--space-md)' }}>
                  <span className="stat-label">Pending</span>
                  <span className="stat-val" style={{ fontSize: 'var(--text-lg)', color: 'var(--negative)' }}>₹{workerReport.summary?.pendingFees}</span>
                </div>
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--body)', marginTop: 'var(--space-sm)' }}>
                Report for: <strong>{workerReport.worker?.Name}</strong>
              </div>
            </div>
          )}
        </div>

        <ReportCard title="Fee Collection Report" desc="Overview of all fees" onGenerate={genFees}>
          {(data) => data && <>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              <div className="stat-card" style={{ padding: 'var(--space-md)' }}>
                <span className="stat-label">Total Visits</span>
                <span className="stat-val" style={{ fontSize: 'var(--text-lg)' }}>{data.summary?.totalVisits}</span>
              </div>
              <div className="stat-card" style={{ padding: 'var(--space-md)' }}>
                <span className="stat-label">Total Fees</span>
                <span className="stat-val" style={{ fontSize: 'var(--text-lg)' }}>₹{data.summary?.totalFees}</span>
              </div>
              <div className="stat-card" style={{ padding: 'var(--space-md)' }}>
                <span className="stat-label">Collected</span>
                <span className="stat-val" style={{ fontSize: 'var(--text-lg)', color: 'var(--positive)' }}>₹{data.summary?.collectedFees}</span>
              </div>
              <div className="stat-card" style={{ padding: 'var(--space-md)' }}>
                <span className="stat-label">Rate</span>
                <span className="stat-val" style={{ fontSize: 'var(--text-lg)' }}>{data.summary?.collectionRate}%</span>
              </div>
            </div>
            {data.pendingVisits?.length > 0 && (
              <>
                <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Pending Collections</h4>
                <div className="table-scroll">
                  <table className="table">
                    <thead><tr><th>Date</th><th>Patient</th><th>Worker</th><th>Amount</th></tr></thead>
                    <tbody>{data.pendingVisits.map((v, i) => (
                      <tr key={i}><td data-label="Date">{v.VisitDate}</td><td data-label="Patient">{v.PatientName}</td><td data-label="Worker">{v.WorkerName}</td><td data-label="Amount">₹{v.Amount}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              </>
            )}
          </>}
        </ReportCard>
      </div>

      <style>{`
        @media print {
          .header, .sidebar, .bottom-nav, .btn, .filters-bar { display: none !important; }
          .main-content { margin-left: 0 !important; padding-top: 0 !important; }
          .card { break-inside: avoid; border: 1px solid #ddd; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
