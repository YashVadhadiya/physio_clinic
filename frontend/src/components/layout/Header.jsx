import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { Icons } from '../common/Icons';

export function Header({ onToggleSidebar }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handle = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="header">
      <div className="h-left">
        <button className="h-menu-btn" onClick={onToggleSidebar} aria-label="Menu">
          <Icons.Menu />
        </button>
        <div className="h-search" onClick={() => navigate(isAdmin ? '/admin/patients' : '/worker/patients')}>
          <Icons.Search />
          <input type="text" placeholder="Search patients..." readOnly />
        </div>
      </div>

      <div className="h-right" ref={menuRef}>
        <button className="h-profile" onClick={() => setShowMenu(!showMenu)}>
          <div className="h-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
          <span className="h-name">{user?.name}</span>
        </button>

        {showMenu && (
          <div className="h-dropdown">
            <div className="h-dropdown-header">
              <div className="h-dd-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
              <div>
                <div className="h-dd-name">{user?.name}</div>
                <div className="h-dd-role">{isAdmin ? 'Administrator' : 'Worker'}</div>
              </div>
            </div>
            <div className="h-dd-divider" />
            <button className="h-dd-item danger" onClick={handleLogout}>
              <Icons.Logout /> Sign Out
            </button>
          </div>
        )}
      </div>

      <style>{`
        .header{position:fixed;top:0;left:0;right:0;height:var(--header-h);background:rgba(255,255,255,.96);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 var(--space-lg);z-index:50;gap:var(--space-md)}
        @media(min-width:900px){.header{left:var(--sidebar-w)}}
        .h-left{display:flex;align-items:center;gap:var(--space-md);flex:1;min-width:0}
        .h-menu-btn{display:flex;width:38px;height:38px;align-items:center;justify-content:center;color:var(--ink);border:1px solid var(--line);border-radius:var(--rounded-sm);background:var(--surface);flex-shrink:0;transition:background .15s}
        .h-menu-btn:hover{background:var(--surface-hover)}
        @media(min-width:900px){.h-menu-btn{display:none}}
        .h-search{position:relative;max-width:480px;width:100%}
        .h-search svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--mute);pointer-events:none}
        .h-search input{width:100%;padding:8px 10px 8px 34px;border:1px solid var(--line);border-radius:var(--rounded-sm);background:var(--surface-hover);color:var(--ink);font-size:var(--text-sm);min-height:36px;transition:all .2s;cursor:pointer}
        .h-search input:focus{outline:none;border-color:var(--primary);background:var(--surface);box-shadow:0 0 0 3px var(--primary-pale)}
        .h-search input::placeholder{color:var(--mute)}
        .h-right{position:relative}
        .h-profile{display:flex;align-items:center;gap:var(--space-sm);padding:4px 8px 4px 4px;border-radius:var(--rounded-pill);transition:background .15s;border:1px solid transparent}
        .h-profile:hover{border-color:var(--line);background:var(--surface-hover)}
        .h-avatar{width:32px;height:32px;border-radius:var(--rounded-pill);background:var(--primary);color:var(--on-primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:var(--text-xs)}
        .h-name{font-size:var(--text-sm);font-weight:600;color:var(--ink)}
        @media(max-width:599px){.h-name{display:none}}
        .h-dropdown{position:absolute;top:calc(100% + 6px);right:0;background:var(--surface);border:1px solid var(--line);border-radius:var(--rounded);box-shadow:var(--shadow-lg);min-width:220px;z-index:60;overflow:hidden;animation:fadeUp .2s ease}
        .h-dropdown-header{display:flex;align-items:center;gap:var(--space-md);padding:var(--space-md) var(--space-lg)}
        .h-dd-avatar{width:38px;height:38px;border-radius:var(--rounded-pill);background:var(--primary-bg);color:var(--primary-dark);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:var(--text-sm)}
        .h-dd-name{font-size:var(--text-sm);font-weight:600;color:var(--ink)}
        .h-dd-role{font-size:var(--text-xs);color:var(--mute)}
        .h-dd-divider{height:1px;background:var(--line);margin:0}
        .h-dd-item{display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-md) var(--space-lg);font-size:var(--text-sm);color:var(--ink);width:100%;transition:background .15s}
        .h-dd-item:hover{background:var(--surface-hover)}
        .h-dd-item.danger{color:var(--negative)}
      `}</style>
    </header>
  );
}
