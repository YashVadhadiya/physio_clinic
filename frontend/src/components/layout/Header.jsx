import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Icons } from '../common/Icons';

export function Header({ onToggleSidebar }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-btn" onClick={onToggleSidebar}>
          <Icons.Menu />
        </button>
        <div className="header-search">
          <Icons.Search />
          <input
            type="text"
            placeholder="Search patients, workers, visits..."
            onFocus={() => navigate(isAdmin ? '/admin/patients' : '/worker/patients')}
          />
        </div>
      </div>

      <div className="header-right">
        <div className="header-profile" onClick={() => setShowMenu(!showMenu)}>
          <div className="header-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <span className="header-name">{user?.name}</span>
        </div>

        {showMenu && (
          <>
            <div className="header-menu-backdrop" onClick={() => setShowMenu(false)} />
            <div className="header-menu">
              <div className="header-menu-item" onClick={() => { setShowMenu(false); }}>
                Profile Settings
              </div>
              <div className="header-menu-divider" />
              <div className="header-menu-item danger" onClick={handleLogout}>
                <Icons.Logout />
                Sign Out
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        .header {
          position: fixed;
          top: 0;
          left: var(--sidebar-width);
          right: 0;
          height: var(--header-height);
          background: var(--canvas);
          border-bottom: 1px solid var(--canvas-soft);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--spacing-xl);
          z-index: 50;
          transition: left 0.3s ease;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
          flex: 1;
        }

        .menu-btn {
          display: none;
          background: none;
          border: none;
          color: var(--body);
          padding: var(--spacing-xs);
          border-radius: var(--rounded-sm);
        }

        .menu-btn:hover {
          background: var(--canvas-soft);
        }

        .header-search {
          position: relative;
          max-width: 400px;
          width: 100%;
        }

        .header-search svg {
          position: absolute;
          left: var(--spacing-md);
          top: 50%;
          transform: translateY(-50%);
          color: var(--mute);
        }

        .header-search input {
          width: 100%;
          padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-sm) 40px;
          border: 1px solid var(--canvas-soft);
          border-radius: var(--rounded-xl);
          background: var(--canvas-soft);
          color: var(--ink);
          font-size: var(--body-sm);
          transition: all 0.2s;
        }

        .header-search input:focus {
          outline: none;
          border-color: var(--primary);
          background: var(--canvas);
          box-shadow: 0 0 0 3px var(--primary-pale);
        }

        .header-search input::placeholder {
          color: var(--mute);
        }

        .header-right {
          position: relative;
        }

        .header-profile {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          cursor: pointer;
          padding: var(--spacing-xs) var(--spacing-md);
          border-radius: var(--rounded-xl);
          transition: background 0.2s;
        }

        .header-profile:hover {
          background: var(--canvas-soft);
        }

        .header-avatar {
          width: 34px;
          height: 34px;
          border-radius: var(--rounded-full);
          background: var(--primary);
          color: var(--on-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: var(--body-sm);
        }

        .header-name {
          font-size: var(--body-sm);
          font-weight: 500;
          color: var(--ink);
        }

        .header-menu-backdrop {
          position: fixed;
          inset: 0;
          z-index: 49;
        }

        .header-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: var(--spacing-sm);
          background: var(--canvas);
          border: 1px solid var(--canvas-soft);
          border-radius: var(--rounded-xl);
          box-shadow: var(--shadow-lg);
          min-width: 200px;
          z-index: 50;
          overflow: hidden;
        }

        .header-menu-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md) var(--spacing-lg);
          font-size: var(--body-sm);
          color: var(--ink);
          cursor: pointer;
          transition: background 0.2s;
        }

        .header-menu-item:hover {
          background: var(--canvas-soft);
        }

        .header-menu-item.danger {
          color: var(--negative);
        }

        .header-menu-divider {
          height: 1px;
          background: var(--canvas-soft);
          margin: var(--spacing-xs) 0;
        }

        @media (max-width: 768px) {
          .header {
            left: 0;
          }
          .menu-btn {
            display: flex;
          }
          .header-name {
            display: none;
          }
          .header-search {
            max-width: 100%;
          }
        }

        @media (max-width: 360px) {
          .header-menu {
            min-width: 160px;
            right: -8px;
          }
          .header-search input {
            font-size: var(--body-sm);
          }
        }
      `}</style>
    </header>
  );
}
