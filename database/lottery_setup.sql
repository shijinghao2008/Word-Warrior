-- Link to pets table
create table if not exists pets (
  id text primary key, -- Changed from uuid to text to support 'w1', 'g1' etc
  name text not null,
  rarity text not null,
  image_url text,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Link to user_pets table for tracking ownership and count
create table if not exists user_pets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  pet_id text references pets(id) not null, -- Changed to text
  count integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, pet_id)
);

-- RLS Policies
alter table pets enable row level security;
alter table user_pets enable row level security;

-- Pets are readable by everyone
create policy "Pets are viewable by everyone" on pets
  for select using (true);

-- User Pets are readable by the owner
create policy "Users can view own pets" on user_pets
  for select using (auth.uid() = user_id);

create policy "Users can insert own pets" on user_pets
  for insert with check (auth.uid() = user_id);

create policy "Users can update own pets" on user_pets
  for update using (auth.uid() = user_id);

-- Insert Pet Data (Optional, but needed for FK constraint if we keep it)
-- Since we are defining data in code, we might want to populate this or remove FK. 
-- For now, we will relax the FK or assume we run an insert script. 
-- BETTER: Drop the FK for now to prevent errors if we don't insert immediately.
alter table user_pets drop constraint if exists user_pets_pet_id_fkey;
