-- Create writing_materials table
create table if not exists public.writing_materials (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  difficulty text check (difficulty in ('小学', '初中', '高中')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for writing_materials
alter table public.writing_materials enable row level security;

-- Policy: Allow public read access for writing_materials
create policy "Allow public read access"
  on public.writing_materials
  for select
  using (true);

-- Create user_writings table (to track progress and submissions)
create table if not exists public.user_writings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  writing_id uuid references public.writing_materials not null,
  content text not null,
  score jsonb not null, -- Stores { total: number, vocab: number, grammar: number, content: number }
  feedback jsonb, -- Stores { comment: string, suggestions: string[] }
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, writing_id) -- Ensure one submission per topic per user (or remove if multiple attempts allowed, but requirement says "each user each question only gain exp once", usually implies tracking completion)
);

-- Enable RLS for user_writings
alter table public.user_writings enable row level security;

-- Policy: Users can insert their own writings
create policy "Allow users to insert own writings"
  on public.user_writings
  for insert
  with check (auth.uid() = user_id);

-- Policy: Users can view their own writings
create policy "Allow users to view own writings"
  on public.user_writings
  for select
  using (auth.uid() = user_id);

-- Initial Seed Data
insert into public.writing_materials (title, difficulty) values
  -- Elementary (小学)
  ('My Best Friend', '小学'),
  ('A Happy Day', '小学'),
  ('My Favorite Animal', '小学'),
  ('Summer Holiday', '小学'),
  ('My Family', '小学'),
  
  -- Junior High (初中)
  ('The Importance of Sports', '初中'),
  ('How to Protect the Environment', '初中'),
  ('A Memorable Trip', '初中'),
  ('My Dream Job', '初中'),
  ('Life in the Future', '初中'),

  -- High School (高中)
  ('The Pros and Cons of Social Media', '高中'),
  ('Should Students Use Mobile Phones at School?', '高中'),
  ('The Value of Traditional Culture', '高中'),
  ('Artificial Intelligence in Our Daily Life', '高中'),
  ('Globalization and Its Impact', '高中');
