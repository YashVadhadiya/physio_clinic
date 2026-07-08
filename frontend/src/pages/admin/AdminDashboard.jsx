import { useState, useEffect } from 'react';
import { dashboardAPI } from '../../services/api';
import { Link } from 'react-router-dom';
import { Icons } from '../../components/common/Icons';
import { Loader } from '../../components/common/Loader';
import { toast } from '../../components/common/Toast';

function StatCard({ label, value, icon, color }) {
  return (
    <div className="stat-card fade-up">
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        <div className={`stat-icon ${color}`}>{icon}</div>
      </div>
      <span className="stat-val">{value}</span>
    </div>
  );
}

function MiniBar({ data, dataKey, labelKey, height = 160 }) {
  const max = Math.max(...data.map(d => d[dataKey]), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height, width: '100%' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: 28, background: 'var(--primary)', borderRadius: '3px 3px 0 0', height: `${(d[dataKey] / max) * 100}%`, minHeight: 4, transition: 'height .3s' }} />
          <span style={{ fontSize: 10, color: 'var(--mute)' }}>
            {new Date(d[labelKey]).getDate()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true); setError(null);
    dashboardAPI.getAdmin()
      .then(res => setData(res.data.data))
      .catch(err => { const m = err.message || 'Failed to load'; setError(m); toast(m, 'error'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <Loader text="Loading dashboard..." />;
  if (error) return (
    <div className="page-wrap">
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
        <p style={{ color: 'var(--negative)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>{error}</p>
        <button className="btn btn-primary" onClick={load}>Retry</button>
      </div>
    </div>
  );
  if (!data) return null;

  const { cards, monthlyStats, dailyGraph, workerPerformance, recentActivities } = data;

  return (
    <div className="page-wrap">
      <div className="page-head">
        <div className="page-head-left">
          <h1>Dashboard</h1>
          <p>Clinic overview</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}><Icons.Refresh /></button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 'var(--space-xl)' }}>
        <StatCard label="Workers" value={cards.totalWorkers} icon={<Icons.Users />} color="blue" />
        <StatCard label="Patients" value={cards.totalPatients} icon={<Icons.Patient />} color="teal" />
        <StatCard label="Today's Visits" value={cards.todayVisits} icon={<Icons.Visit />} color="green" />
        <StatCard label="Monthly Visits" value={cards.monthlyVisits} icon={<Icons.Activity />} color="yellow" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginBottom: 'var(--space-xl)' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Daily Visits - {new Date().toLocaleString('default', { month: 'long' })}</span>
          </div>
          {dailyGraph?.length > 0 ? <MiniBar data={dailyGraph} dataKey="count" labelKey="date" /> : <div className="empty-state"><p>No data</p></div>}
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Monthly Summary</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {[
              { label: 'Total Visits', value: monthlyStats.totalVisits },
              { label: 'Total Fees', value: `₹${(monthlyStats.totalFees || 0).toLocaleString()}` },
              { label: 'Collected', value: `₹${(monthlyStats.collectedFees || 0).toLocaleString()}`, cls: 'text-positive' },
              { label: 'Pending', value: `₹${(monthlyStats.pendingFees || 0).toLocaleString()}`, cls: 'text-negative' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line-light)' }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--body)' }}>{item.label}</span>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: item.cls ? 'var(--' + item.cls.replace('text-', '') + ')' : 'var(--ink)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginBottom: 'var(--space-xl)' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Worker Performance</span>
            <Link to="/admin/reports" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          {workerPerformance?.slice(0, 5).map((w, i) => (
            <div key={w.WorkerID} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: '8px 0', borderBottom: '1px solid var(--line-light)' }}>
              <span style={{ width: 26, height: 26, borderRadius: 'var(--rounded-pill)', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--primary-dark)', flexShrink: 0 }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 'var(--text-sm)' }}>{w.WorkerName}</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--body)' }}>{w.totalVisits} visits</span>
            </div>
          )) || <div className="empty-state"><p>No data</p></div>}
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Recent Activity</span></div>
          {recentActivities?.slice(0, 5).map((log, i) => (
            <div key={log.LogID || i} style={{ display: 'flex', gap: 'var(--space-sm)', padding: '6px 0', alignItems: 'flex-start' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', marginTop: 6, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--ink)' }}>{log.Action}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.Description}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--mute)' }}>{new Date(log.Timestamp).toLocaleString()}</div>
              </div>
            </div>
          )) || <div className="empty-state"><p>No activity</p></div>}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card" style={{ border: 0, background: 'var(--primary-bg)' }}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--body)', marginBottom: 'var(--space-xs)' }}>Collected Fees</div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--primary-dark)' }}>₹{(cards.collectedFees || 0).toLocaleString()}</div>
        </div>
        <div className="card" style={{ border: 0, background: 'var(--warning-bg)' }}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--body)', marginBottom: 'var(--space-xs)' }}>Pending Fees</div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: '#92400e' }}>₹{(cards.pendingFees || 0).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
