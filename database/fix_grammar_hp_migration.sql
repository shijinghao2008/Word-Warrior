-- ============================================
-- FIX: Grammar PvP HP Initialization Bug
-- ============================================
-- The previous version of join_pvp_grammar_queue relied on the default value (100)
-- for player HP. This update fetches the actual max_hp from user_stats.

CREATE OR REPLACE FUNCTION join_pvp_grammar_queue(p_user_id UUID)
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
    -- Advisory lock to prevent race conditions
    PERFORM pg_advisory_xact_lock(hashtext('pvp_grammar_queue_lock'));

    -- Cleanup existing
    DELETE FROM pvp_grammar_queue WHERE user_id = p_user_id;

    -- Look for opponent
    SELECT user_id INTO v_opponent_id
    FROM pvp_grammar_queue
    WHERE user_id != p_user_id
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_opponent_id IS NOT NULL THEN
        -- Match Found!
        v_questions := generate_pvp_grammar_questions(10);

        -- FIX: Fetch Actual HP
        SELECT max_hp INTO v_p1_hp FROM user_stats WHERE user_id = v_opponent_id;
        IF v_p1_hp IS NULL THEN v_p1_hp := 100; END IF;

        SELECT max_hp INTO v_p2_hp FROM user_stats WHERE user_id = p_user_id;
        IF v_p2_hp IS NULL THEN v_p2_hp := 100; END IF;

        INSERT INTO pvp_grammar_rooms (
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

        DELETE FROM pvp_grammar_queue WHERE user_id = v_opponent_id;
        
        RETURN jsonb_build_object(
            'status', 'matched',
            'roomId', v_room_id,
            'role', 'player2'
        );
    ELSE
        -- Add to queue
        INSERT INTO pvp_grammar_queue (user_id) VALUES (p_user_id);
        RETURN jsonb_build_object(
            'status', 'waiting'
        );
    END IF;
END;
$$;
