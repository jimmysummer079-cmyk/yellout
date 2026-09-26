import { Router } from 'express';
import {
  createSession,
  refreshCodename,
} from '../services/vents.js';
import { requireAuth } from '../middleware/auth.js';

export const sessionRouter = Router();

sessionRouter.post('/', (_req, res) => {
  const session = createSession();
  res.status(201).json(session);
});

sessionRouter.get('/me', requireAuth, (req, res) => {
  res.json({
    id: req.session!.id,
    codename: req.session!.codename,
  });
});

sessionRouter.post('/codename', requireAuth, (req, res) => {
  const codename = refreshCodename(req.session!.id);
  req.session!.codename = codename;
  res.json({ codename });
});
