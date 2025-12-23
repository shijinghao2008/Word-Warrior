-- Transaction to ensure everything runs together
BEGIN;

-- 1. Ensure gold column exists in user_stats
ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS gold INTEGER DEFAULT 0;

-- 2. Create or Update the increment_user_gold function
-- Changed to return INTEGER to avoid 406 Not Acceptable errors with some client configurations
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
  SET gold = COALESCE(gold, 0) + x_amount
  WHERE user_id = x_user_id
  RETURNING gold INTO new_gold;
  
  RETURN new_gold;
END;
$$;

-- 3. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_user_gold(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_user_gold(uuid, int) TO service_role;

COMMIT;
