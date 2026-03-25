import { Router } from 'express';
import * as adminService from '../services/admin.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';

export const adminRouter = Router();

adminRouter.use(authMiddleware, adminMiddleware);

adminRouter.get('/users', (_req, res) => {
  try {
    const users = adminService.listUsers();
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.patch('/users/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { enabled, role } = req.body;
    const user = adminService.updateUser(id, { enabled, role });
    res.json({ user });
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

adminRouter.delete('/users/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    adminService.deleteUser(id, req.user!.id);
    res.json({ ok: true });
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 403;
    res.status(status).json({ error: err.message });
  }
});
