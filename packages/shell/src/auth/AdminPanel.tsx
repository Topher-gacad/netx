import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client.js';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  enabled: number;
  created_at: string;
  updated_at: string;
}

export function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiFetch<{ users: User[] }>('/admin/users');
      setUsers(data.users);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleEnabled = async (userId: number, currentlyEnabled: number) => {
    try {
      await apiFetch(`/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !currentlyEnabled }),
      });
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleRole = async (userId: number, currentRole: string) => {
    try {
      await apiFetch(`/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: currentRole === 'admin' ? 'user' : 'admin' }),
      });
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteUser = async (userId: number, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/admin/users/${userId}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>User Management</h2>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{users.length} users registered</div>
      </div>

      {error && (
        <div style={{ padding: '8px 16px', background: 'var(--error)15', color: 'var(--error)', fontSize: '13px' }}>
          {error}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>Loading users...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                {['ID', 'Username', 'Email', 'Role', 'Status', 'Created', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--accent)', fontWeight: 600, fontSize: '12px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{u.id}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{u.username}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                      background: u.role === 'admin' ? 'var(--warning)20' : 'var(--accent)20',
                      color: u.role === 'admin' ? 'var(--warning)' : 'var(--accent)',
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{
                      color: u.enabled ? 'var(--success)' : 'var(--error)',
                      fontWeight: 600, fontSize: '12px',
                    }}>
                      {u.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => toggleEnabled(u.id, u.enabled)}
                        style={{
                          padding: '3px 8px', fontSize: '11px', borderRadius: '3px', cursor: 'pointer',
                          background: u.enabled ? 'var(--error)15' : 'var(--success)15',
                          border: `1px solid ${u.enabled ? 'var(--error)30' : 'var(--success)30'}`,
                          color: u.enabled ? 'var(--error)' : 'var(--success)',
                        }}
                      >
                        {u.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => toggleRole(u.id, u.role)}
                        style={{
                          padding: '3px 8px', fontSize: '11px', borderRadius: '3px', cursor: 'pointer',
                          background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {u.role === 'admin' ? 'Demote' : 'Promote'}
                      </button>
                      <button
                        onClick={() => deleteUser(u.id, u.username)}
                        style={{
                          padding: '3px 8px', fontSize: '11px', borderRadius: '3px', cursor: 'pointer',
                          background: 'var(--error)10', border: '1px solid var(--error)20',
                          color: 'var(--error)',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
