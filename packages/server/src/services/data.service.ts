import { getDb } from '../db/connection.js';
import type { UserDataRow } from '../types.js';

export function saveUserData(userId: number, topology: unknown, pluginData: unknown, preferences: unknown) {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM user_data WHERE user_id = ?').get(userId);
  if (existing) {
    db.prepare(`
      UPDATE user_data
      SET topology = ?, plugin_data = ?, preferences = ?, saved_at = datetime('now')
      WHERE user_id = ?
    `).run(
      JSON.stringify(topology ?? {}),
      JSON.stringify(pluginData ?? {}),
      JSON.stringify(preferences ?? {}),
      userId,
    );
  } else {
    db.prepare(`
      INSERT INTO user_data (user_id, topology, plugin_data, preferences)
      VALUES (?, ?, ?, ?)
    `).run(
      userId,
      JSON.stringify(topology ?? {}),
      JSON.stringify(pluginData ?? {}),
      JSON.stringify(preferences ?? {}),
    );
  }
}

export function loadUserData(userId: number): { topology: unknown; pluginData: unknown; preferences: unknown; savedAt: string } {
  const db = getDb();
  const row = db.prepare('SELECT * FROM user_data WHERE user_id = ?').get(userId) as UserDataRow | undefined;

  if (!row) {
    return { topology: {}, pluginData: {}, preferences: {}, savedAt: '' };
  }

  return {
    topology: JSON.parse(row.topology || '{}'),
    pluginData: JSON.parse(row.plugin_data || '{}'),
    preferences: JSON.parse(row.preferences || '{}'),
    savedAt: row.saved_at,
  };
}
