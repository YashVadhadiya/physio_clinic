import { useState, useEffect } from 'react';
import { dashboardAPI } from '../../services/api';
import { Link } from 'react-router-dom';
import { Icons } from '../../components/common/Icons';
import { Loader } from '../../components/common/Loader';
import { toast } from '../../components/common/Toast';

function StatCard({ label, value, icon, color }) {
  return (
    <div className="stat-card fade-in">
      <div className="card-header" style={{ marginBottom: 0 }}>
        <span className="stat-label">{label}</span>
        <div className={`stat-icon ${color}`}>{icon}</div>
      </div>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function SimpleBarChart({ data, dataKey, labelKey, height = 200 }) {
  const maxVal = Math.max(...data.map(d => d[dataKey]), 1);
  return (
    <div className="bar-chart" style={{ height }}>
      <div className="bar-chart-bars">
        {data.map((d, i) => (
          <div key={i} className="bar-item" title={`${d[labelKey]}: ${d[dataKey]}`}>
            <div
              className="bar-fill"
              style={{ height: `${(d[dataKey] / maxVal) * 100}%` }}
            />
            <span className="bar-label">
              {new Date(d[labelKey]).getDate()}
            </span>
          </div>
        ))}
      </div>
      <style>{`
        .bar-chart { width: 100%; padding-top: var(--spacing-sm); }
        .bar-chart-bars { display: flex; align-items: flex-end; gap: 2px; height: 100%; }
        .bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: var(--spacing-xs); }
        .bar-fill { width: 100%; max-width: 32px; background: var(--primary); border-radius: var(--rounded-sm) var(--rounded-sm) 0 0; transition: height 0.3s; min-height: 4px; }
        .bar-label { font-size: var(--caption); color: var(--mute); }
        @media (max-width: 480px) {
          .bar-chart { height: 140px !important; }
          .bar-fill { max-width: 24px; }
        }
      `}</style>
    </div>
  );
}

export function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = () => {
    setLoading(true);
    setError(null);
    dashboardAPI.getAdmin()
      .then(res => setData(res.data.data))
      .catch(err => {
        const msg = err.message || 'Failed to load dashboard';
        setError(msg);
        toast(msg, 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDashboard(); }, []);

  if (loading) return <Loader text="Loading dashboard..." />;
  if (error) {
    return (
      <div className="page-container">
        <div className="card" style={{ border: '1px solid var(--negative)' }}>
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
      </div>
    );
  }
  if (!data) return null;

  const { cards, monthlyStats, previousMonthlyStats, dailyGraph, workerPerformance, recentActivities } = data;

  const visitChange = previousMonthlyStats?.totalVisits
    ? Math.round(((monthlyStats.totalVisits - previousMonthlyStats.totalVisits) / previousMonthlyStats.totalVisits) * 100)
    : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Overview of clinic operations</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadDashboard}>
          <Icons.Refresh />
        </button>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <StatCard label="Total Workers" value={cards.totalWorkers} icon={<Icons.Users />} color="blue" />
        <StatCard label="Total Patients" value={cards.totalPatients} icon={<Icons.Patient />} color="green" />
        <StatCard label="Today's Visits" value={cards.todayVisits} icon={<Icons.Visit />} color="purple" />
        <StatCard label="Monthly Visits" value={cards.monthlyVisits} icon={<Icons.Activity />} color="yellow" />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Daily Visits - {new Date().toLocaleString('default', { month: 'long' })}</h3>
          </div>
          {dailyGraph?.length > 0 ? (
            <SimpleBarChart data={dailyGraph} dataKey="count" labelKey="date" height={200} />
          ) : (
            <div className="empty-state"><p>No data for this month</p></div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Monthly Summary</h3>
          </div>
          <div className="monthly-summary">
            <div className="summary-item">
              <span className="summary-label">Total Visits</span>
              <span className="summary-value">{monthlyStats.totalVisits}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Fees</span>
              <span className="summary-value"><Icons.Rupee />{monthlyStats.totalFees?.toLocaleString()}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Collected</span>
              <span className="summary-value success"><Icons.Check />{monthlyStats.collectedFees?.toLocaleString()}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Pending</span>
              <span className="summary-value danger"><Icons.Rupee />{monthlyStats.pendingFees?.toLocaleString()}</span>
            </div>
            {visitChange !== 0 && (
              <div className="summary-item">
                <span className="summary-label">Visit Change</span>
                <span className={`summary-value ${visitChange >= 0 ? 'success' : 'danger'}`}>
                  {visitChange >= 0 ? <Icons.TrendingUp /> : <Icons.ArrowDown />}
                  {Math.abs(visitChange)}%
                </span>
              </div>
            )}
          </div>
          <style>{`
            .monthly-summary { display: flex; flex-direction: column; gap: var(--spacing-md); }
            .summary-item { display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-sm) 0; border-bottom: 1px solid var(--canvas-soft); }
            .summary-item:last-child { border-bottom: none; }
            .summary-label { font-size: var(--body-sm); color: var(--body); }
            .summary-value { font-size: var(--body-md); font-weight: 600; display: flex; align-items: center; gap: var(--spacing-xs); }
            .summary-value.success { color: var(--positive); }
            .summary-value.danger { color: var(--negative); }
          `}</style>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Worker Performance</h3>
            <Link to="/admin/reports" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          <div className="worker-list">
            {workerPerformance?.slice(0, 5).map((w, i) => (
              <div key={w.WorkerID} className="worker-row">
                <span className="worker-rank">{i + 1}</span>
                <span className="worker-name">{w.WorkerName}</span>
                <span className="worker-stat">{w.totalVisits} visits</span>
              </div>
            ))}
            {(!workerPerformance || workerPerformance.length === 0) && (
              <div className="empty-state"><p>No data available</p></div>
            )}
          </div>
          <style>{`
            .worker-list { display: flex; flex-direction: column; }
            .worker-row { display: flex; align-items: center; gap: var(--spacing-md); padding: var(--spacing-sm) 0; border-bottom: 1px solid var(--canvas-soft); }
            .worker-row:last-child { border-bottom: none; }
            .worker-rank { width: 28px; height: 28px; border-radius: var(--rounded-full); background: var(--primary-pale); display: flex; align-items: center; justify-content: center; font-size: var(--caption); font-weight: 700; color: var(--ink-deep); }
            .worker-name { flex: 1; font-size: var(--body-sm); font-weight: 500; }
            .worker-stat { font-size: var(--body-sm); color: var(--body); }
          `}</style>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Activities</h3>
          </div>
          <div className="activity-list">
            {recentActivities?.map((log, i) => (
              <div key={log.LogID || i} className="activity-item">
                <Icons.Dot />
                <div className="activity-content">
                  <span className="activity-action">{log.Action}</span>
                  <span className="activity-desc">{log.Description}</span>
                  <span className="activity-time">{new Date(log.Timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {(!recentActivities || recentActivities.length === 0) && (
              <div className="empty-state"><p>No recent activities</p></div>
            )}
          </div>
          <style>{`
            .activity-list { display: flex; flex-direction: column; gap: var(--spacing-md); }
            .activity-item { display: flex; gap: var(--spacing-sm); align-items: flex-start; }
            .activity-item svg { margin-top: 6px; flex-shrink: 0; color: var(--primary); }
            .activity-content { display: flex; flex-direction: column; gap: 2px; }
            .activity-action { font-size: var(--body-sm); font-weight: 600; color: var(--ink); }
            .activity-desc { font-size: var(--body-sm); color: var(--body); }
            .activity-time { font-size: var(--caption); color: var(--mute); }
          `}</style>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div className="card card-dark">
          <div className="card-header">
            <h3 style={{ fontSize: 'var(--body-md)', fontWeight: 600, color: 'var(--primary)' }}>Collected Fees</h3>
          </div>
          <span style={{ fontSize: 'var(--display-xs)', fontWeight: 900, color: 'var(--primary)' }}>
            <Icons.Rupee />{cards.collectedFees?.toLocaleString() || '0'}
          </span>
        </div>

        <div className="card card-dark">
          <div className="card-header">
            <h3 style={{ fontSize: 'var(--body-md)', fontWeight: 600, color: 'var(--primary)' }}>Pending Fees</h3>
          </div>
          <span style={{ fontSize: 'var(--display-xs)', fontWeight: 900, color: 'var(--negative)' }}>
            <Icons.Rupee />{cards.pendingFees?.toLocaleString() || '0'}
          </span>
        </div>
      </div>
    </div>
  );
}
