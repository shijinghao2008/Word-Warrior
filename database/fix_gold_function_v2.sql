-- Fix increment_user_gold function to ensure strict adherence to input amount
-- The user reported that gold increments by 100 instead of 150. 
-- This script redefines the function to ensure logic is correct.

-- Transaction START
BEGIN;

-- 1. Ensure gold column exists (just in case)
ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS gold INTEGER DEFAULT 0;

-- 2. Drop the function to remove any ambiguity about return types or parameters
DROP FUNCTION IF EXISTS increment_user_gold(uuid, int);

-- 3. Recreate the function with correct logic
CREATE OR REPLACE FUNCTION increment_user_gold(x_user_id uuid, x_amount int)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_gold integer;
BEGIN
  -- Update user_stats safely and return the new value
  UPDATE user_stats
  set gold = coalesce(gold, 0) + x_amount
  where user_id = x_user_id
  RETURNING gold INTO new_gold;
  
  -- If no row was updated (user_id not found in user_stats), returns null
  RETURN new_gold;
END;
$$;

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_user_gold(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_user_gold(uuid, int) TO service_role;

COMMIT;
