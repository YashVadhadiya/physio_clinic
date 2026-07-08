import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../components/common/Toast';
import { Icons } from '../../components/common/Icons';
import { Loader } from '../../components/common/Loader';

export function LoginPage() {
  const [mobileOrEmail, setMobileOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mobileOrEmail || !password) {
      toast('Please fill in all fields', 'error');
      return;
    }
    setLoading(true);
    try {
      const worker = await login(mobileOrEmail, password);
      toast('Login successful', 'success');
      navigate(worker.Role === 'admin' ? '/admin' : '/worker');
    } catch (err) {
      toast(err.message || 'Invalid credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-brand">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="#9fe870"/>
            <path d="M15 33V15l9 12 9-12v18" stroke="#0e0f0c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">Planet Health Care</h1>
            <p className="login-subtitle">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">Mobile or Email</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter mobile number or email"
                value={mobileOrEmail}
                onChange={(e) => setMobileOrEmail(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg login-btn"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="login-footer">
          Physiotherapy Clinic Management System
        </p>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--canvas-soft);
          padding: var(--spacing-xl);
        }

        .login-container {
          width: 100%;
          max-width: 420px;
        }

        .login-brand {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }

        .login-card {
          background: var(--canvas);
          border-radius: var(--rounded-xl);
          padding: var(--spacing-2xl) var(--spacing-xl);
          box-shadow: var(--shadow-lg);
        }

        .login-header {
          text-align: center;
          margin-bottom: var(--spacing-2xl);
        }

        .login-title {
          font-size: var(--display-xs);
          font-weight: 900;
          color: var(--ink);
          letter-spacing: -0.48px;
          margin-bottom: var(--spacing-sm);
        }

        .login-subtitle {
          font-size: var(--body-sm);
          color: var(--body);
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .login-btn {
          margin-top: var(--spacing-sm);
          width: 100%;
          height: 48px;
        }

        .login-footer {
          text-align: center;
          margin-top: var(--spacing-xl);
          font-size: var(--caption);
          color: var(--mute);
        }

        @media (max-width: 480px) {
          .login-card {
            padding: var(--spacing-xl) var(--spacing-lg);
          }
          .login-title {
            font-size: var(--body-lg);
          }
          .login-btn {
            height: 44px;
          }
        }
      `}</style>
    </div>
  );
}
