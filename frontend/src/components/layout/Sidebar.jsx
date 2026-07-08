import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../common/Icons';

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: 'Dashboard' },
  { to: '/admin/workers', label: 'Workers', icon: 'Users' },
  { to: '/admin/patients', label: 'Patients', icon: 'Patient' },
  { to: '/admin/visits', label: 'Visits', icon: 'Visit' },
  { to: '/admin/reports', label: 'Reports', icon: 'Report' },
];

const workerLinks = [
  { to: '/worker', label: 'Dashboard', icon: 'Dashboard' },
  { to: '/worker/patients', label: 'Patients', icon: 'Patient' },
  { to: '/worker/visits', label: 'Visits', icon: 'Visit' },
];

export function Sidebar({ isOpen, onClose }) {
  const { user, isAdmin, logout } = useAuth();
  const links = isAdmin ? adminLinks : workerLinks;

  return (
    <>
      {isOpen && <div className="sb-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sb-brand">
          <div className="sb-logo">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#0d9488"/>
              <path d="M10 22V10l6 8 6-8v12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>PhysioClinic</span>
          </div>
        </div>

        <nav className="sb-nav">
          {links.map((link) => {
            const IconComp = Icons[link.icon];
            return (
              <NavLink key={link.to} to={link.to} end={link.to === '/admin' || link.to === '/worker'} className={({ isActive }) => `sb-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <span className="sb-icon">{IconComp && <IconComp />}</span>
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sb-footer">
          <div className="sb-user">
            <div className="sb-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
            <div className="sb-user-info">
              <span className="sb-user-name">{user?.name}</span>
              <span className="sb-user-role">{isAdmin ? 'Admin' : 'Worker'}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm sb-logout" onClick={logout}>
            <Icons.Logout /> Sign Out
          </button>
        </div>
      </aside>

      <style>{`
        .sb-overlay{display:none;position:fixed;inset:0;background:rgba(12,26,23,.4);z-index:99}
        .sidebar{position:fixed;top:0;left:0;bottom:0;width:var(--sidebar-w);background:var(--surface);border-right:1px solid var(--line);display:flex;flex-direction:column;z-index:100;transition:transform .3s;overflow:hidden}
        @media(max-width:899px){.sidebar{transform:translateX(-100%)}.sidebar.open{transform:translateX(0)}.sb-overlay{display:block}}
        .sb-brand{padding:var(--space-lg) var(--space-xl);border-bottom:1px solid var(--line)}
        .sb-logo{display:flex;align-items:center;gap:var(--space-md);font-size:var(--text-base);font-weight:800;color:var(--ink);letter-spacing:-.02em}
        .sb-nav{flex:1;padding:var(--space-md);overflow-y:auto}
        .sb-link{display:flex;align-items:center;gap:var(--space-md);padding:10px var(--space-md);border-radius:var(--rounded-sm);color:var(--body);font-size:var(--text-sm);font-weight:600;transition:all .15s;margin-bottom:2px}
        .sb-link:hover{background:var(--surface-hover);color:var(--ink)}
        .sb-link.active{background:var(--primary-bg);color:var(--primary-dark);font-weight:700}
        .sb-icon{width:20px;height:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .sb-footer{border-top:1px solid var(--line);padding:var(--space-lg) var(--space-xl);display:flex;flex-direction:column;gap:var(--space-md)}
        .sb-user{display:flex;align-items:center;gap:var(--space-md)}
        .sb-avatar{width:36px;height:36px;border-radius:var(--rounded-pill);background:var(--primary);color:var(--on-primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:var(--text-sm);flex-shrink:0}
        .sb-user-info{display:flex;flex-direction:column;min-width:0}
        .sb-user-name{font-size:var(--text-sm);font-weight:600;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .sb-user-role{font-size:var(--text-xs);color:var(--mute);text-transform:capitalize}
        .sb-logout{width:100%;justify-content:center}
      `}</style>
    </>
  );
}
