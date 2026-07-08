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
  const { user, isAdmin } = useAuth();
  const links = isAdmin ? adminLinks : workerLinks;

  return (
    <>
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#9fe870"/>
              <path d="M10 22V10l6 8 6-8v12" stroke="#0e0f0c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="logo-text">Planet Health Care</span>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name}</span>
            <span className="sidebar-user-role">{isAdmin ? 'Admin' : 'Worker'}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {links.map((link) => {
            const IconComp = Icons[link.icon];
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/admin' || link.to === '/worker'}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <span className="sidebar-link-icon">{IconComp && <IconComp />}</span>
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-text">
            Planet Health Care
          </div>
          <div className="sidebar-footer-sub">Physiotherapy Clinic</div>
        </div>
      </aside>

      <style>{`
        .sidebar-overlay {
          display: none;
        }

        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: var(--sidebar-width);
          background: var(--canvas);
          border-right: 1px solid var(--canvas-soft);
          display: flex;
          flex-direction: column;
          z-index: 100;
          transition: transform 0.3s ease;
        }

        .sidebar-header {
          padding: var(--spacing-lg) var(--spacing-xl);
          border-bottom: 1px solid var(--canvas-soft);
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .logo-text {
          font-size: var(--body-md);
          font-weight: 900;
          color: var(--ink);
          letter-spacing: -0.3px;
        }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-lg) var(--spacing-xl);
          border-bottom: 1px solid var(--canvas-soft);
        }

        .sidebar-avatar {
          width: 40px;
          height: 40px;
          border-radius: var(--rounded-full);
          background: var(--primary);
          color: var(--on-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: var(--body-md);
        }

        .sidebar-user-info {
          display: flex;
          flex-direction: column;
        }

        .sidebar-user-name {
          font-size: var(--body-sm);
          font-weight: 600;
          color: var(--ink);
        }

        .sidebar-user-role {
          font-size: var(--caption);
          color: var(--mute);
          text-transform: capitalize;
        }

        .sidebar-nav {
          flex: 1;
          padding: var(--spacing-md) var(--spacing-sm);
          overflow-y: auto;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md) var(--spacing-lg);
          border-radius: var(--rounded-xl);
          color: var(--body);
          font-size: var(--body-sm);
          font-weight: 500;
          transition: all 0.2s;
          margin-bottom: 2px;
        }

        .sidebar-link:hover {
          background: var(--canvas-soft);
          color: var(--ink);
        }

        .sidebar-link.active {
          background: var(--primary-pale);
          color: var(--ink);
          font-weight: 600;
        }

        .sidebar-link-icon {
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sidebar-footer {
          padding: var(--spacing-lg) var(--spacing-xl);
          border-top: 1px solid var(--canvas-soft);
        }

        .sidebar-footer-text {
          font-size: var(--caption);
          font-weight: 600;
          color: var(--ink);
        }

        .sidebar-footer-sub {
          font-size: var(--caption);
          color: var(--mute);
        }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
          }
          .sidebar.open {
            transform: translateX(0);
          }
          .sidebar-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(14,15,12,0.5);
            z-index: 99;
          }
        }
      `}</style>
    </>
  );
}
