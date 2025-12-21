
-- Create listening_materials table
CREATE TABLE IF NOT EXISTS listening_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- The transcript
    questions JSONB NOT NULL, -- Array of questions
    level TEXT,
    audio_url TEXT, -- NULL by default, populated by admin later
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_listening_progress table
CREATE TABLE IF NOT EXISTS user_listening_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES listening_materials(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, material_id)
);

-- Enable RLS
ALTER TABLE listening_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_listening_progress ENABLE ROW LEVEL SECURITY;

-- Policies for listening_materials
CREATE POLICY "Public can view listening materials" 
ON listening_materials FOR SELECT 
USING (true);

-- Policies for user_listening_progress
CREATE POLICY "Users can view own progress" 
ON user_listening_progress FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" 
ON user_listening_progress FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" 
ON user_listening_progress FOR UPDATE 
USING (auth.uid() = user_id);
