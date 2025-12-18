
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
