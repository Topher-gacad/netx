import { Router } from 'express';
import * as dataService from '../services/data.service.js';
import { authMiddleware } from '../middleware/auth.js';

export const dataRouter = Router();

dataRouter.use(authMiddleware);

dataRouter.post('/save', (req, res) => {
  try {
    const { topology, pluginData, preferences } = req.body;
    dataService.saveUserData(req.user!.id, topology, pluginData, preferences);
    res.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Save failed' });
  }
});

dataRouter.get('/load', (req, res) => {
  try {
    const data = dataService.loadUserData(req.user!.id);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Load failed' });
  }
});
