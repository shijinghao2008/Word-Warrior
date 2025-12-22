-- ============================================
-- FIX: PvP HP Initialization Bug
-- ============================================
-- The previous version of join_pvp_word_blitz_queue relied on the default value (100)
-- for player HP. This update fetches the actual max_hp from user_stats.

CREATE OR REPLACE FUNCTION join_pvp_word_blitz_queue(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_opponent_id UUID;
    v_room_id UUID;
    v_questions JSONB;
    v_p1_hp INTEGER;
    v_p2_hp INTEGER;
BEGIN
    -- CRITICAL: Prevent race conditions
    PERFORM pg_advisory_xact_lock(hashtext('pvp_word_blitz_queue_lock'));

    -- Clean up: Remove user from queue if they were already there (restart search)
    DELETE FROM pvp_word_blitz_queue WHERE user_id = p_user_id;

    -- Look for a waiting opponent
    SELECT user_id INTO v_opponent_id
    FROM pvp_word_blitz_queue
    WHERE user_id != p_user_id
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_opponent_id IS NOT NULL THEN
        -- Match Found!
        
        -- 1. Generate Questions
        v_questions := generate_pvp_word_blitz_questions(10);

        -- 2. Fetch Player Stats (Max HP)
        -- Fetch for Opponent (Player 1)
        SELECT max_hp INTO v_p1_hp FROM user_stats WHERE user_id = v_opponent_id;
        IF v_p1_hp IS NULL THEN v_p1_hp := 100; END IF; -- Fallback

        -- Fetch for Current User (Player 2)
        SELECT max_hp INTO v_p2_hp FROM user_stats WHERE user_id = p_user_id;
        IF v_p2_hp IS NULL THEN v_p2_hp := 100; END IF; -- Fallback

        -- 3. Create Room with ACTUAL HP
        INSERT INTO pvp_word_blitz_rooms (
            player1_id, 
            player2_id, 
            player1_hp, 
            player2_hp, 
            questions
        )
        VALUES (
            v_opponent_id, 
            p_user_id, 
            v_p1_hp, 
            v_p2_hp, 
            v_questions
        )
        RETURNING id INTO v_room_id;

        -- 4. Remove opponent from queue
        DELETE FROM pvp_word_blitz_queue WHERE user_id = v_opponent_id;
        
        -- Return match info
        RETURN jsonb_build_object(
            'status', 'matched',
            'roomId', v_room_id,
            'role', 'player2'
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
