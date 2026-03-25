import { Router } from 'express';
import * as authService from '../services/auth.service.js';
import { authMiddleware } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/signup', (req, res) => {
  try {
    const { username, email, password } = req.body;
    const result = authService.signup(username, email, password);
    res.status(201).json(result);
  } catch (err: any) {
    const message = err.message ?? 'Signup failed';
    const status = message.includes('already') ? 409 : 400;
    res.status(status).json({ error: message });
  }
});

authRouter.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const result = authService.login(username, password);
    res.json(result);
  } catch (err: any) {
    const message = err.message ?? 'Login failed';
    const status = message.includes('disabled') ? 403 : 401;
    res.status(status).json({ error: message });
  }
});

authRouter.get('/me', authMiddleware, (req, res) => {
  const user = authService.getUserById(req.user!.id);
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }
  res.json({ user });
});

authRouter.post('/logout', (_req, res) => {
  res.json({ ok: true });
});
