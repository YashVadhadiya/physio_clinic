import { useState } from 'react';
import { reportAPI, workerAPI } from '../../services/api';
import { toast } from '../../components/common/Toast';
import { Icons } from '../../components/common/Icons';
import { InlineLoader } from '../../components/common/Loader';

function ReportCard({ title, description, onGenerate, children }) {
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const handleGenerate = async () => {
    if (onGenerate) {
      setLoading(true);
      try {
        const result = await onGenerate();
        setData(result);
        setShowResult(true);
      } catch (err) {
        toast(err.message || 'Failed to generate report', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }
    setShowResult(!showResult);
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 className="card-title">{title}</h3>
          <p style={{ fontSize: 'var(--body-sm)', color: 'var(--body)', marginTop: 'var(--spacing-xs)' }}>{description}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleGenerate} disabled={loading} style={{ flexShrink: 0 }}>
          {loading ? <InlineLoader /> : 'Generate'}
        </button>
      </div>
      {children && showResult && data && (
        <div style={{ marginTop: 'var(--spacing-md)' }}>
          {typeof children === 'function' ? children(data) : children}
        </div>
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

  useState(() => {
    workerAPI.getActive().then(res => setWorkers(res.data.data || [])).catch(() => {});
  }, []);

  const generateDaily = async () => {
    const res = await reportAPI.daily();
    setTodayReport(res.data.data);
    return res.data.data;
  };

  const generateWeekly = async () => {
    const res = await reportAPI.weekly();
    setWeeklyReport(res.data.data);
    return res.data.data;
  };

  const generateMonthly = async () => {
    const res = await reportAPI.monthly();
    setMonthlyReport(res.data.data);
    return res.data.data;
  };

  const generateWorkerReport = async () => {
    if (!selectedWorker) { toast('Select a worker', 'error'); throw new Error('No worker'); }
    const res = await reportAPI.worker({ workerId: selectedWorker });
    setWorkerReport(res.data.data);
    return res.data.data;
  };

  const generateFeeReport = async () => {
    const res = await reportAPI.fees();
    setFeeReport(res.data.data);
    return res.data.data;
  };

  const handlePrint = () => window.print();

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate clinic reports</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
          <Icons.Printer /> Print / PDF
        </button>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <ReportCard title="Daily Report" description="View today's visit summary" onGenerate={generateDaily}>
          {(data) => data && (
            <div>
              <div className="grid grid-3" style={{ gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                <div className="stat-card" style={{ padding: 'var(--spacing-md)' }}>
                  <span className="stat-label"><Icons.Visit /> Visits</span>
                  <span className="stat-value" style={{ fontSize: 'var(--body-lg)' }}>{data.totalVisits}</span>
                </div>
                <div className="stat-card" style={{ padding: 'var(--spacing-md)' }}>
                  <span className="stat-label"><Icons.Check /> Collected</span>
                  <span className="stat-value" style={{ fontSize: 'var(--body-lg)', color: 'var(--positive)' }}>
                    <Icons.Rupee />{data.collectedFees}
                  </span>
                </div>
                <div className="stat-card" style={{ padding: 'var(--spacing-md)' }}>
                  <span className="stat-label"><Icons.AlertTriangle /> Pending</span>
                  <span className="stat-value" style={{ fontSize: 'var(--body-lg)', color: 'var(--negative)' }}>
                    <Icons.Rupee />{data.pendingFees}
                  </span>
                </div>
              </div>
              {data.visits?.length > 0 && (
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th>Time</th><th>Patient</th><th>Worker</th><th>Type</th><th>Amount</th></tr></thead>
                    <tbody>
                      {data.visits.map((v, i) => (
                        <tr key={i}>
                          <td>{v.VisitTime}</td>
                          <td>{v.PatientName}</td>
                          <td>{v.WorkerName}</td>
                          <td>{v.VisitType}</td>
                          <td><Icons.Rupee />{v.Amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </ReportCard>

        <ReportCard title="Weekly Report" description="Last 7 days summary" onGenerate={generateWeekly}>
          {(data) => data && (
            <div>
              <div className="grid grid-3" style={{ gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                <div className="stat-card" style={{ padding: 'var(--spacing-md)' }}>
                  <span className="stat-label"><Icons.Visit /> Visits</span>
                  <span className="stat-value" style={{ fontSize: 'var(--body-lg)' }}>{data.totalVisits}</span>
                </div>
                <div className="stat-card" style={{ padding: 'var(--spacing-md)' }}>
                  <span className="stat-label"><Icons.Check /> Collected</span>
                  <span className="stat-value" style={{ fontSize: 'var(--body-lg)', color: 'var(--positive)' }}>
                    <Icons.Rupee />{data.collectedFees}
                  </span>
                </div>
                <div className="stat-card" style={{ padding: 'var(--spacing-md)' }}>
                  <span className="stat-label"><Icons.AlertTriangle /> Pending</span>
                  <span className="stat-value" style={{ fontSize: 'var(--body-lg)', color: 'var(--negative)' }}>
                    <Icons.Rupee />{data.pendingFees}
                  </span>
                </div>
              </div>
            </div>
          )}
        </ReportCard>

        <ReportCard title="Monthly Report" description="Current month overview" onGenerate={generateMonthly}>
          {(data) => data && (
            <div>
              <div className="grid grid-3" style={{ gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                <div className="stat-card" style={{ padding: 'var(--spacing-md)' }}>
                  <span className="stat-label"><Icons.Visit /> Visits</span>
                  <span className="stat-value" style={{ fontSize: 'var(--body-lg)' }}>{data.totalVisits}</span>
                </div>
                <div className="stat-card" style={{ padding: 'var(--spacing-md)' }}>
                  <span className="stat-label"><Icons.Check /> Collected</span>
                  <span className="stat-value" style={{ fontSize: 'var(--body-lg)', color: 'var(--positive)' }}>
                    <Icons.Rupee />{data.collectedFees}
                  </span>
                </div>
                <div className="stat-card" style={{ padding: 'var(--spacing-md)' }}>
                  <span className="stat-label"><Icons.AlertTriangle /> Pending</span>
                  <span className="stat-value" style={{ fontSize: 'var(--body-lg)', color: 'var(--negative)' }}>
                    <Icons.Rupee />{data.pendingFees}
                  </span>
                </div>
              </div>
            </div>
          )}
        </ReportCard>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
            <div>
              <h3 className="card-title">Worker Report</h3>
              <p style={{ fontSize: 'var(--body-sm)', color: 'var(--body)', marginTop: 'var(--spacing-xs)' }}>Performance by worker</p>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
            <select className="form-select" value={selectedWorker} onChange={e => setSelectedWorker(e.target.value)}>
              <option value="">Select Worker</option>
              {workers.map(w => (
                <option key={w.WorkerID} value={w.WorkerID}>{w.Name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary btn-sm" onClick={generateWorkerReport}>
            <Icons.Report /> Generate Worker Report
          </button>
          {workerReport && (
            <div style={{ marginTop: 'var(--spacing-lg)' }}>
              <div className="grid grid-3" style={{ gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                <div className="stat-card" style={{ padding: 'var(--spacing-md)' }}>
                  <span className="stat-label">Visits</span>
                  <span className="stat-value" style={{ fontSize: 'var(--body-lg)' }}>{workerReport.summary?.totalVisits}</span>
                </div>
                <div className="stat-card" style={{ padding: 'var(--spacing-md)' }}>
                  <span className="stat-label">Collected</span>
                  <span className="stat-value" style={{ fontSize: 'var(--body-lg)', color: 'var(--positive)' }}>
                    <Icons.Rupee />{workerReport.summary?.collectedFees}
                  </span>
                </div>
                <div className="stat-card" style={{ padding: 'var(--spacing-md)' }}>
                  <span className="stat-label">Pending</span>
                  <span className="stat-value" style={{ fontSize: 'var(--body-lg)', color: 'var(--negative)' }}>
                    <Icons.Rupee />{workerReport.summary?.pendingFees}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 'var(--body-sm)', color: 'var(--body)', marginBottom: 'var(--spacing-sm)' }}>
                Report for: <strong>{workerReport.worker?.Name}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      <ReportCard title="Fee Collection Report" description="Overview of all fees" onGenerate={generateFeeReport}>
        {(data) => data && (
          <div>
            <div className="grid grid-4" style={{ gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
              <div className="stat-card" style={{ padding: 'var(--spacing-md)' }}>
                <span className="stat-label"><Icons.Visit /> Total Visits</span>
                <span className="stat-value" style={{ fontSize: 'var(--body-lg)' }}>{data.summary?.totalVisits}</span>
              </div>
              <div className="stat-card" style={{ padding: 'var(--spacing-md)' }}>
                <span className="stat-label"><Icons.Rupee /> Total Fees</span>
                <span className="stat-value" style={{ fontSize: 'var(--body-lg)' }}>{data.summary?.totalFees}</span>
              </div>
              <div className="stat-card" style={{ padding: 'var(--spacing-md)' }}>
                <span className="stat-label"><Icons.Check /> Collected</span>
                <span className="stat-value" style={{ fontSize: 'var(--body-lg)', color: 'var(--positive)' }}>
                  <Icons.Rupee />{data.summary?.collectedFees}
                </span>
              </div>
              <div className="stat-card" style={{ padding: 'var(--spacing-md)' }}>
                <span className="stat-label"><Icons.TrendingUp /> Rate</span>
                <span className="stat-value" style={{ fontSize: 'var(--body-lg)' }}>{data.summary?.collectionRate}%</span>
              </div>
            </div>
            {data.pendingVisits?.length > 0 && (
              <>
                <h4 style={{ fontSize: 'var(--body-sm)', fontWeight: 600, marginBottom: 8 }}>Pending Collections</h4>
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th>Date</th><th>Patient</th><th>Worker</th><th>Amount</th></tr></thead>
                    <tbody>
                      {data.pendingVisits.map((v, i) => (
                        <tr key={i}>
                          <td>{v.VisitDate}</td>
                          <td>{v.PatientName}</td>
                          <td>{v.WorkerName}</td>
                          <td><Icons.Rupee />{v.Amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </ReportCard>

      <style>{`
        @media print {
          .header, .sidebar, .btn, .filters-bar { display: none !important; }
          .main-content { margin-left: 0 !important; padding-top: 0 !important; }
          .card { break-inside: avoid; border: 1px solid #ddd; }
          body { background: white; }
        }
        @media (max-width: 480px) {
          .report-stat-grid { gap: var(--spacing-sm); }
        }
      `}</style>
    </div>
  );
}
