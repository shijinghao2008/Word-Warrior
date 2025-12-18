import express from 'express';
import cors from 'cors';
import pveRoutes from './routes/pveRoutes.js';
import pvpRoutes from './routes/pvpRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { config } from './config.js';
import { calculateCombatPower } from './utils/progression.js';
import { getUser } from './store/userStore.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/users/:id', async (req, res) => {
  const profile = await getUser(req.params.id);
  res.json({
    success: true,
    data: {
      profile,
      combatPower: calculateCombatPower(profile.stats),
    },
  });
});

app.use('/api/pve', pveRoutes);
app.use('/api/pvp', pvpRoutes);
app.use('/api/admin', adminRoutes);

app.listen(config.port, () => {
  console.log(`Word Warrior backend running on port ${config.port}`);
});
