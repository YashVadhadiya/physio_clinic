import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../components/common/Toast';

export function LoginPage() {
  const [mobileOrEmail, setMobileOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mobileOrEmail || !password) { toast('Please fill in all fields', 'error'); return; }
    setLoading(true);
    try {
      const worker = await login(mobileOrEmail, password);
      toast('Welcome back!', 'success');
      navigate(worker.Role === 'admin' ? '/admin' : '/worker');
    } catch (err) {
      toast(err.message || 'Invalid credentials', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#0d9488"/>
            <path d="M10 22V10l6 8 6-8v12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <h1>PhysioClinic</h1>
            <p>Planet Health Care</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Mobile or Email</label>
            <input type="text" className="form-input" placeholder="Enter mobile or email" value={mobileOrEmail} onChange={(e) => setMobileOrEmail(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="login-foot">Physiotherapy Clinic Management System</p>
      </div>

      <style>{`
        .login-page{min-height:100dvh;display:flex;align-items:center;justify-content:center;background:var(--canvas-soft);padding:var(--space-lg);background:linear-gradient(135deg,var(--primary-bg) 0%,var(--canvas-soft) 50%)}
        .login-card{width:100%;max-width:400px;background:var(--surface);border-radius:var(--rounded-lg);padding:var(--space-2xl);box-shadow:var(--shadow-md);border:1px solid var(--line);animation:fadeUp .4s ease}
        .login-brand{display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-2xl)}
        .login-brand h1{font-size:var(--text-xl);font-weight:800;color:var(--ink);letter-spacing:-.02em;line-height:1.2}
        .login-brand p{font-size:var(--text-sm);color:var(--mute)}
        .login-btn{width:100%;height:46px;margin-top:var(--space-sm)}
        .login-foot{text-align:center;margin-top:var(--space-xl);font-size:var(--text-xs);color:var(--mute)}
        @media(max-width:480px){.login-card{padding:var(--space-xl)}}
      `}</style>
    </div>
  );
}
