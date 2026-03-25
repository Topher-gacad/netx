import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { initializeSchema } from './schema.js';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(config.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
    seedAdmin();
  }
  return db;
}

function seedAdmin() {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(config.adminUsername);
  if (!existing) {
    const hash = bcrypt.hashSync(config.adminPassword, 10);
    const result = db.prepare(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)'
    ).run(config.adminUsername, config.adminEmail, hash, 'admin');

    // Create empty data row
    db.prepare('INSERT INTO user_data (user_id) VALUES (?)').run(result.lastInsertRowid);
    console.log(`[DB] Admin user "${config.adminUsername}" created`);
  }
}
