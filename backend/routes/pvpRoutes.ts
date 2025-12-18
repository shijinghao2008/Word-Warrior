import { Router } from 'express';
import { z } from 'zod';
import { applyBattleResult, calculateCombatPower } from '../utils/progression.js';
import { BattleResultRequest, RankTier } from '../types.js';
import { getUser, saveUser } from '../store/userStore.js';

const router = Router();

const battleSchema = z.object({
  userId: z.string().min(1),
  opponentRank: z.nativeEnum(RankTier),
  result: z.enum(['win', 'loss']),
  mode: z.enum(['vocab', 'grammar', 'chant']),
});

router.post('/result', async (req, res) => {
  const parsed = battleSchema.safeParse(req.body as BattleResultRequest);
  if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid payload' });
  const { userId, opponentRank, result } = parsed.data;
  const profile = await getUser(userId);
  const upsetWin = result === 'win' && rankValue(profile.stats.rank) < rankValue(opponentRank);
  const updatedStats = applyBattleResult(profile.stats, opponentRank, result, upsetWin);
  const updated = await saveUser({ ...profile, stats: updatedStats });
  return res.json({
    success: true,
    data: {
      stats: updated.stats,
      upsetWin,
      combatPower: calculateCombatPower(updated.stats),
    },
  });
});

const rankValue = (rank: RankTier) => {
  switch (rank) {
    case RankTier.BRONZE:
      return 1;
    case RankTier.SILVER:
      return 2;
    case RankTier.GOLD:
      return 3;
    case RankTier.DIAMOND:
      return 4;
    case RankTier.KING:
      return 5;
    default:
      return 0;
  }
};

export default router;
