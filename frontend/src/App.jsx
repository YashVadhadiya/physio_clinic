import { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { ToastContainer } from './components/common/Toast';
import { Loader } from './components/common/Loader';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginPage } from './pages/auth/LoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { WorkersPage } from './pages/admin/WorkersPage';
import { WorkerDashboard } from './pages/worker/WorkerDashboard';
import { PatientPage } from './pages/dashboard/PatientPage';
import { VisitPage } from './pages/dashboard/VisitPage';
import { ReportsPage } from './pages/reports/ReportsPage';

function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader fullPage text="Loading..." />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/worker'} replace /> : <LoginPage />}
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AppLayout><AdminDashboard /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workers"
        element={
          <ProtectedRoute role="admin">
            <AppLayout><WorkersPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/patients"
        element={
          <ProtectedRoute role="admin">
            <AppLayout><PatientPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/visits"
        element={
          <ProtectedRoute role="admin">
            <AppLayout><VisitPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute role="admin">
            <AppLayout><ReportsPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/worker"
        element={
          <ProtectedRoute role="worker">
            <AppLayout><WorkerDashboard /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/worker/patients"
        element={
          <ProtectedRoute role="worker">
            <AppLayout><PatientPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/worker/visits"
        element={
          <ProtectedRoute role="worker">
            <AppLayout><VisitPage /></AppLayout>
          </ProtectedRoute>
        }
      />
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
