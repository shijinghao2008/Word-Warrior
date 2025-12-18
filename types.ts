
export enum Rank {
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold',
  DIAMOND = 'Diamond',
  KING = 'King'
}

export interface UserStats {
  level: number;
  exp: number;
  atk: number; // Vocab
  def: number; // Grammar/Listening
  crit: number; // Speaking
  hp: number; // Reading/Writing
  maxHp: number;
  rank: Rank;
  rankPoints: number;
  winStreak: number;
  // Achievement specific stats
  masteredWordsCount: number;
  loginDays: number;
}

export interface UserProfile {
  id: string;
  email: string;
  stats: UserStats;
  isAdmin: boolean;
  masteredWords: string[];
}

export interface Question {
  id: string;
  type: 'vocab' | 'grammar' | 'reading' | 'writing' | 'speaking';
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  difficulty: number;
}

export interface BattleState {
  playerHp: number;
  enemyHp: number;
  turn: 'player' | 'enemy';
  log: string[];
  isActive: boolean;
}

// Database types for Supabase
export interface DatabaseUserProfile {
  id: string;
  email: string;
  username: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseUserStats {
  user_id: string;
  level: number;
  exp: number;
  atk: number;
  def: number;
  crit: number;
  hp: number;
  max_hp: number;
  rank: Rank;
  rank_points: number;
  win_streak: number;
  mastered_words_count: number;
  login_days: number;
  updated_at: string;
}

export interface MasteredWord {
  id: string;
  user_id: string;
  word: string;
  mastered_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}
