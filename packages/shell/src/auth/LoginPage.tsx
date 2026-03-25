import { useState } from 'react';
import { useAuth } from './AuthContext.js';

export function LoginPage() {
  const { login, signup, error } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await signup(username, email, password);
      }
    } catch (err: any) {
      setLocalError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || error;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)', borderRadius: '6px',
    color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', color: 'var(--text-primary)',
    }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '20px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent)', marginBottom: '4px' }}>
            NetX
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Network Education Platform
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-secondary)', borderRadius: '12px',
          border: '1px solid var(--border-color)', padding: '28px',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 20px', textAlign: 'center' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>

          {/* Error message */}
          {displayError && (
            <div style={{
              padding: '10px 14px', background: 'var(--error)' + '15',
              border: '1px solid var(--error)' + '30', borderRadius: '6px',
              color: 'var(--error)', fontSize: '13px', marginBottom: '16px',
            }}>
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Username
              </label>
              <input
                style={inputStyle}
                type="text" value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required minLength={3}
                autoFocus
              />
            </div>

            {mode === 'signup' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Email
                </label>
                <input
                  style={inputStyle}
                  type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  required
                />
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Password
              </label>
              <input
                style={inputStyle}
                type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required minLength={4}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px',
                background: loading ? 'var(--bg-tertiary)' : 'var(--accent)',
                border: 'none', borderRadius: '6px',
                color: '#fff', fontSize: '15px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Please wait...' : (mode === 'login' ? 'Log In' : 'Sign Up')}
            </button>
          </form>

          {/* Toggle mode */}
          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {mode === 'login' ? (
              <>Don't have an account?{' '}
                <span onClick={() => { setMode('signup'); setLocalError(''); }}
                  style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                  Sign Up
                </span>
              </>
            ) : (
              <>Already have an account?{' '}
                <span onClick={() => { setMode('login'); setLocalError(''); }}
                  style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                  Log In
                </span>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: 'var(--text-secondary)' }}>
          NetX v0.1.0 — Learn Networking from Zero to Hero
        </div>
      </div>
    </div>
  );
}
