export enum RankTier {
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold',
  DIAMOND = 'Diamond',
  KING = 'King',
}

export interface BattleStats {
  level: number;
  exp: number;
  atk: number;
  def: number;
  crit: number;
  hp: number;
  maxHp: number;
  rankPoints: number;
  rank: RankTier;
  winStreak: number;
}

export interface UserProfile {
  id: string;
  email: string;
  isAdmin: boolean;
  banned: boolean;
  stats: BattleStats;
}

export interface LessonProgress {
  masteredWords: string[];
  lastUpdated: string;
}

export interface WritingScore {
  score: number;
  feedback: string;
  corrections?: string[];
}

export interface QuizPayload {
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BattleResultRequest {
  userId: string;
  opponentRank: RankTier;
  result: 'win' | 'loss';
  mode: 'vocab' | 'grammar' | 'chant';
}

export interface VocabTrainingRequest {
  userId: string;
  mastered: number;
}

export interface WritingRequest {
  userId: string;
  topic: string;
  content: string;
}

export interface ReadingRequest {
  userId: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  difficulty: number;
}
