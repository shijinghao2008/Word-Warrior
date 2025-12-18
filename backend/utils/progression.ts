import { BattleStats, RankTier } from '../types.js';

const RANK_ORDER: RankTier[] = [
  RankTier.BRONZE,
  RankTier.SILVER,
  RankTier.GOLD,
  RankTier.DIAMOND,
  RankTier.KING,
];

export const calculateCombatPower = (stats: BattleStats) => {
  const cp = stats.level * 10 + stats.atk * 2 + stats.def * 1.5 + stats.hp * 0.1;
  return Number(cp.toFixed(2));
};

export const applyExpGain = (stats: BattleStats, exp: number) => {
  const updated = { ...stats };
  updated.exp += exp;
  while (updated.exp >= updated.level * 100) {
    updated.exp -= updated.level * 100;
    updated.level += 1;
    updated.maxHp += 10;
    updated.hp = updated.maxHp;
  }
  return updated;
};

export const applyVocabMastery = (stats: BattleStats, mastered: number) => {
  if (mastered <= 0) return stats;
  const expGain = mastered * 5;
  const updated = applyExpGain(stats, expGain);
  updated.atk += mastered;
  return updated;
};

export const applyWritingScore = (stats: BattleStats, score: number) => {
  if (score < 60) return stats;
  const expGain = Math.round(score / 10);
  const updated = applyExpGain(stats, expGain);
  const hpGain = Math.max(1, Math.floor(score / 12));
  updated.maxHp += hpGain;
  updated.hp = Math.min(updated.maxHp, updated.hp + hpGain * 2);
  return updated;
};

export const applyReadingWin = (stats: BattleStats, difficulty: number, correct: boolean) => {
  if (!correct) return stats;
  const expGain = 8 * difficulty;
  const updated = applyExpGain(stats, expGain);
  updated.hp = Math.min(updated.maxHp + 5, updated.hp + 5);
  return updated;
};

export const nextRank = (current: RankTier) => {
  const idx = RANK_ORDER.indexOf(current);
  return idx < RANK_ORDER.length - 1 ? RANK_ORDER[idx + 1] : current;
};

export const prevRank = (current: RankTier) => {
  const idx = RANK_ORDER.indexOf(current);
  return idx > 0 ? RANK_ORDER[idx - 1] : current;
};

export const applyBattleResult = (
  stats: BattleStats,
  opponentRank: RankTier,
  result: 'win' | 'loss',
  upsetWin: boolean,
) => {
  const updated = { ...stats };
  if (result === 'win') {
    updated.winStreak += 1;
    const basePoints = 1 + (upsetWin ? 1 : 0);
    updated.rankPoints += basePoints;
  } else {
    updated.winStreak = Math.floor(updated.winStreak * 0.7);
    const shouldLose = updated.rank === RankTier.DIAMOND || updated.rank === RankTier.KING;
    if (shouldLose) {
      updated.rankPoints = Math.max(0, updated.rankPoints - 1);
    }
  }

  updated.rank = recalcRank(updated.rank, updated.rankPoints);
  const bonusMultiplier = 1 + updated.winStreak * 0.01;
  const expGain = result === 'win' ? Math.round(50 * bonusMultiplier) : 10;
  const levelled = applyExpGain(updated, expGain);
  if (result === 'win') {
    levelled.hp = levelled.maxHp;
  }
  return levelled;
};

const recalcRank = (current: RankTier, points: number) => {
  const thresholds: Record<RankTier, number> = {
    [RankTier.BRONZE]: 3,
    [RankTier.SILVER]: 6,
    [RankTier.GOLD]: 9,
    [RankTier.DIAMOND]: 12,
    [RankTier.KING]: Infinity,
  };

  let rank = current;
  while (points >= thresholds[rank] && rank !== RankTier.KING) {
    points -= thresholds[rank];
    rank = nextRank(rank);
  }
  while (points < 0 && rank !== RankTier.BRONZE) {
    rank = prevRank(rank);
    points += thresholds[rank];
  }
  return rank;
};
