import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/connection.js';
import { config } from '../config.js';
import type { UserRow, AuthUser, JwtPayload } from '../types.js';

export function signup(username: string, email: string, password: string): { user: AuthUser; token: string } {
  const db = getDb();

  // Validate
  if (!username || username.length < 3) throw new Error('Username must be at least 3 characters');
  if (!email || !email.includes('@')) throw new Error('Invalid email');
  if (!password || password.length < 4) throw new Error('Password must be at least 4 characters');

  // Check uniqueness
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUser) throw new Error('Username already taken');

  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingEmail) throw new Error('Email already registered');

  // Create user
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)'
  ).run(username, email, hash);

  const userId = result.lastInsertRowid as number;

  // Create empty data row
  db.prepare('INSERT INTO user_data (user_id) VALUES (?)').run(userId);

  const user: AuthUser = { id: userId, username, email, role: 'user' };
  const token = generateToken(user);

  return { user, token };
}

export function login(username: string, password: string): { user: AuthUser; token: string } {
  const db = getDb();

  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
  if (!row) throw new Error('Invalid username or password');

  if (!row.enabled) throw new Error('Account is disabled');

  const valid = bcrypt.compareSync(password, row.password);
  if (!valid) throw new Error('Invalid username or password');

  const user: AuthUser = { id: row.id, username: row.username, email: row.email, role: row.role };
  const token = generateToken(user);

  return { user, token };
}

export function validateToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch {
    throw new Error('Invalid token');
  }
}

export function getUserById(id: number): AuthUser | null {
  const db = getDb();
  const row = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(id) as AuthUser | undefined;
  return row ?? null;
}

function generateToken(user: AuthUser): string {
  const payload: JwtPayload = { id: user.id, username: user.username, role: user.role };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}
