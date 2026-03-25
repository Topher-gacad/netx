import { getDb } from '../db/connection.js';
import type { UserRow } from '../types.js';

export function listUsers() {
  const db = getDb();
  const rows = db.prepare(
    'SELECT id, username, email, role, enabled, created_at, updated_at FROM users ORDER BY id'
  ).all() as Omit<UserRow, 'password'>[];
  return rows;
}

export function updateUser(id: number, updates: { enabled?: boolean; role?: string }) {
  const db = getDb();
  const user = db.prepare('SELECT id, username, email, role, enabled FROM users WHERE id = ?').get(id) as UserRow | undefined;
  if (!user) throw new Error('User not found');

  if (updates.enabled !== undefined) {
    db.prepare("UPDATE users SET enabled = ?, updated_at = datetime('now') WHERE id = ?")
      .run(updates.enabled ? 1 : 0, id);
  }

  if (updates.role && (updates.role === 'user' || updates.role === 'admin')) {
    db.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?")
      .run(updates.role, id);
  }

  return db.prepare('SELECT id, username, email, role, enabled FROM users WHERE id = ?').get(id);
}

export function deleteUser(id: number, requesterId: number) {
  if (id === requesterId) throw new Error('Cannot delete your own account');

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) throw new Error('User not found');

  db.prepare('DELETE FROM user_data WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}
