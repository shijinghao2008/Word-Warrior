-- ============================================
-- Word Warrior Database Schema
-- Supabase Migration Script
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- 1. Profiles Table (User accounts)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User Stats Table (Game attributes and progress)
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,
  exp INTEGER DEFAULT 0,
  atk INTEGER DEFAULT 10,
  def INTEGER DEFAULT 10,
  crit NUMERIC DEFAULT 0.05,
  hp INTEGER DEFAULT 100,
  max_hp INTEGER DEFAULT 100,
  rank TEXT DEFAULT 'Bronze',
  rank_points INTEGER DEFAULT 120,
  win_streak INTEGER DEFAULT 0,
  mastered_words_count INTEGER DEFAULT 0,
  login_days INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Mastered Words Table (Words the user has learned)
CREATE TABLE IF NOT EXISTS mastered_words (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  mastered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, word)
);

-- 4. Achievements Table (Unlocked achievements)
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Index for faster leaderboard queries
CREATE INDEX IF NOT EXISTS idx_user_stats_rank_points ON user_stats(rank_points DESC);

-- Index for mastered words lookup
CREATE INDEX IF NOT EXISTS idx_mastered_words_user_id ON mastered_words(user_id);

-- Index for achievements lookup
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment mastered words count
CREATE OR REPLACE FUNCTION increment_mastered_words_count(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_stats 
  SET mastered_words_count = mastered_words_count + 1
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for auto-updating updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for auto-updating updated_at on user_stats
CREATE TRIGGER update_user_stats_updated_at
BEFORE UPDATE ON user_stats
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastered_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (true);

-- Policies for user_stats
CREATE POLICY "User stats are viewable by everyone"
  ON user_stats FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own stats"
  ON user_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own stats"
  ON user_stats FOR UPDATE
  USING (true);

-- Policies for mastered_words
CREATE POLICY "Mastered words are viewable by everyone"
  ON mastered_words FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own mastered words"
  ON mastered_words FOR INSERT
  WITH CHECK (true);

-- Policies for achievements
CREATE POLICY "Achievements are viewable by everyone"
  ON achievements FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own achievements"
  ON achievements FOR INSERT
  WITH CHECK (true);


-- ============================================
-- NOTES
-- ============================================

-- To run this migration:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire script
-- 4. Click "Run" to execute
--
-- After running:
-- - All tables, indexes, and functions will be created
-- - Run auth_migration.sql next to add RLS policies and auto-create triggers
-- - User profiles and stats will be created automatically on signup
-- - The app will use real authenticated users only
