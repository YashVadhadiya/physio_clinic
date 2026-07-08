import { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { ToastContainer } from './components/common/Toast';
import { Loader } from './components/common/Loader';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Icons } from './components/common/Icons';
import { LoginPage } from './pages/auth/LoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { WorkersPage } from './pages/admin/WorkersPage';
import { WorkerDashboard } from './pages/worker/WorkerDashboard';
import { PatientPage } from './pages/dashboard/PatientPage';
import { VisitPage } from './pages/dashboard/VisitPage';
import { ReportsPage } from './pages/reports/ReportsPage';

const adminNav = [
  { to: '/admin', label: 'Home', icon: 'Dashboard' },
  { to: '/admin/workers', label: 'Staff', icon: 'Users' },
  { to: '/admin/patients', label: 'Patients', icon: 'Patient' },
  { to: '/admin/visits', label: 'Visits', icon: 'Visit' },
  { to: '/admin/reports', label: 'Reports', icon: 'Report' },
];

const workerNav = [
  { to: '/worker', label: 'Home', icon: 'Dashboard' },
  { to: '/worker/patients', label: 'Patients', icon: 'Patient' },
  { to: '/worker/visits', label: 'Visits', icon: 'Visit' },
];

function BottomNav() {
  const { isAdmin } = useAuth();
  const links = isAdmin ? adminNav : workerNav;
  return (
    <nav className="bottom-nav">
      {links.map((l) => {
        const Icon = Icons[l.icon];
        return (
          <NavLink key={l.to} to={l.to} end={l.to === '/admin' || l.to === '/worker'} className={({ isActive }) => `bnav-link ${isActive ? 'active' : ''}`}>
            <Icon />
            <span>{l.label}</span>
          </NavLink>
        );
      })}
      <style>{`
        .bottom-nav{position:fixed;bottom:0;left:0;right:0;height:var(--bottomnav-h);background:var(--surface);border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-around;z-index:100;padding:0 var(--space-sm);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
        @media(min-width:900px){.bottom-nav{display:none}}
        .bnav-link{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 12px;border-radius:var(--rounded-sm);color:var(--mute);font-size:10px;font-weight:600;transition:color .15s;min-width:0}
        .bnav-link svg{width:22px;height:22px;transition:color .15s}
        .bnav-link.active{color:var(--primary)}
        .bnav-link.active svg{color:var(--primary)}
        .bnav-link:active{transform:scale(.92)}
      `}</style>
    </nav>
  );
}

function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header onToggleSidebar={() => setSidebarOpen(true)} />
      <main className="main-content">{children}</main>
      <BottomNav />
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <Loader fullPage text="Loading..." />;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/worker'} replace /> : <LoginPage />} />
      <Route path="/admin" element={<ProtectedRoute role="admin"><AppLayout><AdminDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/workers" element={<ProtectedRoute role="admin"><AppLayout><WorkersPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/patients" element={<ProtectedRoute role="admin"><AppLayout><PatientPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/visits" element={<ProtectedRoute role="admin"><AppLayout><VisitPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute role="admin"><AppLayout><ReportsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/worker" element={<ProtectedRoute role="worker"><AppLayout><WorkerDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/worker/patients" element={<ProtectedRoute role="worker"><AppLayout><PatientPage /></AppLayout></ProtectedRoute>} />
      <Route path="/worker/visits" element={<ProtectedRoute role="worker"><AppLayout><VisitPage /></AppLayout></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer />
      </AuthProvider>
    </HashRouter>
  );
}
