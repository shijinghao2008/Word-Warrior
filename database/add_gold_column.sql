-- Add gold column to user_stats table
ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS gold INTEGER DEFAULT 0;
