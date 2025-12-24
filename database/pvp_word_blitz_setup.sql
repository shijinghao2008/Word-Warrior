-- PVP Tables Setup (Word Blitz Mode)
-- "Word Blitz" - Localized as 单词反击战

-- 1. Queue Table for Matchmaking
CREATE TABLE IF NOT EXISTS pvp_word_blitz_queue (
    user_id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'waiting'
);

-- 2. Game Rooms Table
CREATE TABLE IF NOT EXISTS pvp_word_blitz_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player1_id UUID NOT NULL,
    player2_id UUID NOT NULL,
    player1_hp INTEGER DEFAULT 100,
    player2_hp INTEGER DEFAULT 100,
    current_question_index INTEGER DEFAULT 0,
    -- Store questions as JSONB array of objects
    -- [{ "word": "apple", "correct": "苹果", "options": ["香蕉", "苹果", "梨", "橙子"] }]
    questions JSONB DEFAULT '[]'::JSONB,
    status TEXT DEFAULT 'active', -- 'active', 'finished'
    winner_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Helper: Generate Functions
CREATE OR REPLACE FUNCTION generate_pvp_word_blitz_questions(p_limit INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_questions JSONB;
BEGIN
    WITH candidate_words AS (
        SELECT * FROM words 
        WHERE translation IS NOT NULL AND translation != ''
        AND collins IN (4, 5) -- Only include Collins 4 and 5 stars
        ORDER BY random() 
        LIMIT p_limit
    ),
    questions_with_distractors AS (
        SELECT 
            cw.word,
            cw.translation as correct_answer,
            (
                SELECT jsonb_agg(d.translation)
                FROM (
                    SELECT translation 
                    FROM words 
                    WHERE translation IS NOT NULL AND translation != '' AND id != cw.id
                    ORDER BY random() 
                    LIMIT 3
                ) d
            ) as distractors
        FROM candidate_words cw
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'word', q.word,
            'correctAnswer', q.correct_answer,
            'options', q.distractors || jsonb_build_array(q.correct_answer) -- Client should shuffle, but we can relies on client shuffle or do it here? JSON arrays are ordered. Client shuffles.
        )
    ) INTO v_questions
    FROM questions_with_distractors q;

    RETURN v_questions;
END;
$$;

-- 4. Matchmaking Function
-- Attempts to find a match in the queue. If found, creates a room. If not, adds user to queue.
CREATE OR REPLACE FUNCTION join_pvp_word_blitz_queue(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_opponent_id UUID;
    v_room_id UUID;
    v_questions JSONB;
BEGIN
    -- CRITICAL: Prevent race conditions where two players match simultaneously but miss each other.
    -- This transaction-level lock ensures only one matchmaking attempt runs at a time.
    PERFORM pg_advisory_xact_lock(hashtext('pvp_word_blitz_queue_lock'));

    -- Check if user is already in queue (optional, but good for cleanup)
    DELETE FROM pvp_word_blitz_queue WHERE user_id = p_user_id;

    -- Look for a waiting opponent
    SELECT user_id INTO v_opponent_id
    FROM pvp_word_blitz_queue
    WHERE user_id != p_user_id -- AND status = 'waiting' (implied)
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_opponent_id IS NOT NULL THEN
        -- Match Found!
        
        -- Generate 10 Questions using helper
        v_questions := generate_pvp_word_blitz_questions(10);

        -- Create Room
        INSERT INTO pvp_word_blitz_rooms (player1_id, player2_id, questions)
        VALUES (v_opponent_id, p_user_id, v_questions) -- Oldest in queue becomes player1
        RETURNING id INTO v_room_id;

        -- Remove opponent from queue
        DELETE FROM pvp_word_blitz_queue WHERE user_id = v_opponent_id;
        
        -- Return match info
        RETURN jsonb_build_object(
            'status', 'matched',
            'roomId', v_room_id,
            'role', 'player2' -- Current user is player 2
        );
    ELSE
        -- No match, add to queue
        INSERT INTO pvp_word_blitz_queue (user_id) VALUES (p_user_id);
        RETURN jsonb_build_object(
            'status', 'waiting'
        );
    END IF;
END;
$$;

-- 5. Submit Answer Function
-- atomic game state update
CREATE OR REPLACE FUNCTION submit_pvp_word_blitz_answer(
    p_room_id UUID,
    p_user_id UUID,
    p_question_index INTEGER,
    p_is_correct BOOLEAN,
    p_time_left INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_room RECORD;
    v_damage INTEGER;
    v_p1_hp INTEGER;
    v_p2_hp INTEGER;
    v_new_status TEXT := 'active';
    v_winner_id UUID := NULL;
    v_new_questions JSONB;
    v_total_questions INTEGER;
BEGIN
    -- Lock room for update
    SELECT * INTO v_room FROM pvp_word_blitz_rooms WHERE id = p_room_id FOR UPDATE;
    
    -- Sync check: if question already moved on, ignore
    IF v_room.current_question_index != p_question_index THEN
        RETURN;
    END IF;

    v_damage := p_time_left;
    v_p1_hp := v_room.player1_hp;
    v_p2_hp := v_room.player2_hp;

    -- Apply Damage/Logic
    IF p_user_id = v_room.player1_id THEN
        IF p_is_correct THEN
            v_p2_hp := GREATEST(0, v_p2_hp - v_damage);
        ELSE
            v_p1_hp := GREATEST(0, v_p1_hp - v_damage);
        END IF;
    ELSIF p_user_id = v_room.player2_id THEN
        IF p_is_correct THEN
            v_p1_hp := GREATEST(0, v_p1_hp - v_damage);
        ELSE
            v_p2_hp := GREATEST(0, v_p2_hp - v_damage);
        END IF;
    END IF;

    -- Check Game Over (Only HP based now)
    IF v_p1_hp <= 0 THEN
        v_new_status := 'finished';
        v_winner_id := v_room.player2_id;
    ELSIF v_p2_hp <= 0 THEN
        v_new_status := 'finished';
        v_winner_id := v_room.player1_id;
    END IF;
    
    -- Check if we need more questions (Endless Mode)
    -- If we just answered the last question in the array
    v_total_questions := jsonb_array_length(v_room.questions);
    
    IF v_new_status = 'active' AND p_question_index >= (v_total_questions - 1) THEN
        -- Generate 10 more!
        v_new_questions := generate_pvp_word_blitz_questions(10);
        
        -- Update Room with appended questions
        UPDATE pvp_word_blitz_rooms 
        SET 
            player1_hp = v_p1_hp,
            player2_hp = v_p2_hp,
            current_question_index = current_question_index + 1,
            questions = questions || v_new_questions, -- Append
            updated_at = NOW()
        WHERE id = p_room_id;
    ELSE
        -- Normal update
        UPDATE pvp_word_blitz_rooms 
        SET 
            player1_hp = v_p1_hp,
            player2_hp = v_p2_hp,
            current_question_index = CASE WHEN v_new_status = 'active' THEN current_question_index + 1 ELSE current_question_index END,
            status = v_new_status,
            winner_id = v_winner_id,
            updated_at = NOW()
        WHERE id = p_room_id;
    END IF;

END;
$$;

-- 6. Helper to cancel matchmaking
CREATE OR REPLACE FUNCTION leave_pvp_word_blitz_queue(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM pvp_word_blitz_queue WHERE user_id = p_user_id;
END;
$$;

-- 7. Setup Realtime & Security
-- Ensure Realtime is enabled for these tables
-- Force Replica Identity to ensure we get proper Update events
ALTER TABLE pvp_word_blitz_queue REPLICA IDENTITY FULL;
ALTER TABLE pvp_word_blitz_rooms REPLICA IDENTITY FULL;

BEGIN;
  -- Remove and re-add to ensure clean state
  DO $$
  BEGIN
    -- Check if publication exists
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Safely add pvp_word_blitz_queue if not present
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pvp_word_blitz_queue') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE pvp_word_blitz_queue;
        END IF;

        -- Safely add pvp_word_blitz_rooms if not present
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pvp_word_blitz_rooms') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE pvp_word_blitz_rooms;
        END IF;
    END IF;
  END
  $$;
COMMIT;

-- Enable RLS but allow public access for MVP simplicity (or restrict to auth users)
ALTER TABLE pvp_word_blitz_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE pvp_word_blitz_rooms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflict
DROP POLICY IF EXISTS "Enable all for pvp_word_blitz_queue" ON pvp_word_blitz_queue;
DROP POLICY IF EXISTS "Enable all for pvp_word_blitz_rooms" ON pvp_word_blitz_rooms;

CREATE POLICY "Enable all for pvp_word_blitz_queue" ON pvp_word_blitz_queue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for pvp_word_blitz_rooms" ON pvp_word_blitz_rooms FOR ALL USING (true) WITH CHECK (true);

