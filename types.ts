
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
  gold: number;
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
  gold: number;
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

export interface ReadingQuestion {
  id: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface ReadingMaterial {
  id: string;
  title: string;
  content: string;
  category: string;
  difficulty: '小学' | '初中' | '高中';
  questions: ReadingQuestion[];
}

// Listening Types
export interface ListeningQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

export interface ListeningMaterial {
  id: string;
  title: string;
  content: string; // The script
  questions: ListeningQuestion[];
  level: string;
  audio_url: string | null;
}

// Warrior System Types
export interface WarriorAppearance {
  skinColor: string; // hex
  hairColor: string; // hex
  hairStyle: 'default' | 'messy' | 'topknot' | 'bald';
  eyeColor: string; // Not used in sprites but kept for compat
  modelColor?: string; // e.g. 'blue', 'red', 'yellow', 'purple', 'black'
}

export type ItemType = 'armor' | 'weapon';

export interface ShopItem {
  id: string;
  name: string;
  type: ItemType;
  price: number;
  statBonus: { atk?: number; def?: number; hp?: number; crit?: number };
  description: string;
  assetKey: string; // for Phaser
}

export interface WarriorState {
  gold: number;
  inventory: string[]; // item IDs
  equipped: {
    armor: string | null;
    weapon: string | null;
  };
  appearance: WarriorAppearance;
  unlockedColors: string[]; // ['blue', 'red', etc.]
}

export interface WritingMaterial {
  id: string;
  title: string;
  description: string;
  difficulty: '小学' | '初中' | '高中';
  category: string;
}

export interface WritingResult {
  score: {
    total: number;
    vocab: number;
    grammar: number;
    content: number;
  };
  feedback: string;
  corrections: string[];
}

// Speaking Assessment Types
export interface SpeakingQuestion {
  id: string;
  question_text: string;
  difficulty: '初级' | '中级' | '高级';
  category: 'Daily Chat' | 'Travel' | 'Business' | 'Academic' | 'Tech';
  expected_duration: number; // in seconds
  created_at: string;
}

export interface AssessmentScore {
  total_score: number;
  pronunciation_score: number;
  fluency_score: number;
  vocabulary_score: number;
  content_score: number;
  on_topic_score: number;
  feedback_text: string;
  sentence_count?: number;
}

export interface SpeakingAssessment {
  id: string;
  user_id: string;
  question_id: string;
  question?: SpeakingQuestion;
  audio_url?: string;
  total_score: number;
  pronunciation_score: number;
  fluency_score: number;
  vocabulary_score: number;
  content_score: number;
  on_topic_score: number;
  feedback_text: string;
  exp_awarded: number;
  created_at: string;
}

