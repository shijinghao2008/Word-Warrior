import { Router } from 'express';
import { z } from 'zod';
import { listUsers, banUser, updateUserStats, getUser, saveUser } from '../store/userStore.js';

const router = Router();

const updateSchema = z.object({
  atk: z.number().optional(),
  def: z.number().optional(),
  hp: z.number().optional(),
  maxHp: z.number().optional(),
});

router.get('/users', async (_req, res) => {
  const users = await listUsers();
  res.json({ success: true, data: users });
});

router.post('/users/:id/ban', async (req, res) => {
  const banned = Boolean(req.body?.banned ?? true);
  const user = await banUser(req.params.id, banned);
  res.json({ success: true, data: user });
});

router.post('/users/:id/god-mode', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid payload' });
  const user = await updateUserStats(req.params.id, parsed.data);
  res.json({ success: true, data: user });
});

router.post('/seed', async (_req, res) => {
  const demoUsers = [
    { id: '1', email: 'player@example.com' },
    { id: '2', email: 'warrior@duel.net' },
    { id: '3', email: 'newbie@school.cn' },
  ];
  for (const u of demoUsers) {
    await saveUser({
      id: u.id,
      email: u.email,
      isAdmin: false,
      banned: false,
      stats: (await getUser(u.id)).stats,
    });
  }
  res.json({ success: true, data: demoUsers.length });
});

export default router;
