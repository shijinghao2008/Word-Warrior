-- Function to increment user gold safely
-- Using SECURITY DEFINER to bypass RLS policies if necessary, similar to increment_user_exp

create or replace function increment_user_gold(x_user_id uuid, x_amount int)
returns integer
language plpgsql
security definer
as $$
declare
  new_gold integer;
begin
  update user_stats
  set gold = coalesce(gold, 0) + x_amount
  where user_id = x_user_id
  returning gold into new_gold;
  
  return new_gold;
end;
$$;
