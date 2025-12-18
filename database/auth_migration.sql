-- ============================================
-- Word Warrior Auth Migration
-- Run this AFTER the initial migration.sql
-- This updates RLS policies for proper user isolation
-- ============================================

-- ============================================
-- DROP OLD POLICIES
-- ============================================

-- Drop all existing permissive policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

DROP POLICY IF EXISTS "User stats are viewable by everyone" ON user_stats;
DROP POLICY IF EXISTS "Users can insert their own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON user_stats;

DROP POLICY IF EXISTS "Mastered words are viewable by everyone" ON mastered_words;
DROP POLICY IF EXISTS "Users can insert their own mastered words" ON mastered_words;

DROP POLICY IF EXISTS "Achievements are viewable by everyone" ON achievements;
DROP POLICY IF EXISTS "Users can insert their own achievements" ON achievements;

-- ============================================
-- NEW RLS POLICIES (User Isolation)
-- ============================================

-- Profiles: Users can only view and edit their own profile
-- But public profiles are viewable for leaderboards
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- User Stats: Users can only access their own stats
-- But stats are viewable by all for leaderboards
CREATE POLICY "Anyone can view user stats"
  ON user_stats FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own stats"
  ON user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Mastered Words: Users can only manage their own words
CREATE POLICY "Users can view own words"
  ON mastered_words FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own words"
  ON mastered_words FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Achievements: Users can only view their own achievements
CREATE POLICY "Users can view own achievements"
  ON achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- AUTO-CREATE USER PROFILE TRIGGER
-- ============================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.profiles (id, email, username, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    false
  );
  
  -- Create initial user stats
  INSERT INTO public.user_stats (
    user_id, 
    level, 
    exp, 
    atk, 
    def, 
    crit, 
    hp, 
    max_hp, 
    rank, 
    rank_points, 
    win_streak, 
    mastered_words_count, 
    login_days
  )
  VALUES (
    NEW.id,
    1,      -- level
    0,      -- exp
    10,     -- atk
    10,     -- def
    0.05,   -- crit
    100,    -- hp
    100,    -- max_hp
    'Bronze', -- rank
    120,    -- rank_points
    0,      -- win_streak
    0,      -- mastered_words_count
    1       -- login_days
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- NOTES
-- ============================================

-- This migration:
-- 1. Updates RLS policies to use auth.uid() for proper user isolation
-- 2. Keeps leaderboard data publicly readable
-- 3. Adds automatic profile and stats creation on user signup
-- 
-- After running this:
-- - Each user can only modify their own data
-- - All users can view leaderboards
-- - New users get profiles and stats automatically
