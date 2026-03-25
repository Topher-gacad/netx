import { useAuth } from './auth/AuthContext.js';
import { LoginPage } from './auth/LoginPage.js';
import { Shell } from './layout/Shell.js';

export function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)', color: 'var(--accent)', fontSize: '18px',
      }}>
        Loading NetX...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <Shell />;
}
