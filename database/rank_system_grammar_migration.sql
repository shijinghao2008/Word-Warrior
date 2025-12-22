-- Rank System Migration for Grammar Stronghold
-- Extends the ranking system to the Grammar PvP table

-- 1. Update pvp_grammar_rooms with same columns as word blitz
ALTER TABLE pvp_grammar_rooms
ADD COLUMN IF NOT EXISTS player1_score_change INTEGER,
ADD COLUMN IF NOT EXISTS player2_score_change INTEGER,
ADD COLUMN IF NOT EXISTS player1_start_points INTEGER, -- Snapshot
ADD COLUMN IF NOT EXISTS player2_start_points INTEGER, -- Snapshot
ADD COLUMN IF NOT EXISTS player1_start_tier TEXT,      -- Snapshot
ADD COLUMN IF NOT EXISTS player2_start_tier TEXT,      -- Snapshot
ADD COLUMN IF NOT EXISTS match_details JSONB;          -- Detailed breakdown

-- 2. Core Function: Process Match Result (Grammar Version)
-- Exact duplicate of process_pvp_match_result but for pvp_grammar_rooms table
CREATE OR REPLACE FUNCTION process_grammar_match_result(p_room_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_room RECORD;
    v_p1_stats RECORD;
    v_p2_stats RECORD;
    v_winner_id UUID;
    
    -- Calculation Variables
    v_p1_change INTEGER := 0;
    v_p2_change INTEGER := 0;
    
    -- P1 specifics
    v_p1_is_winner BOOLEAN;
    v_p1_base INTEGER;
    v_p1_hp_bonus INTEGER := 0;
    v_p1_streak_bonus INTEGER := 0;
    v_p1_final_hp INTEGER;
    
    -- P2 specifics
    v_p2_is_winner BOOLEAN;
    v_p2_base INTEGER;
    v_p2_hp_bonus INTEGER := 0;
    v_p2_streak_bonus INTEGER := 0;
    v_p2_final_hp INTEGER;
    
    -- Constants / Config
    v_match_duration_sec INTEGER;
    v_is_instant_kill BOOLEAN := FALSE;
    
    v_details JSONB;
BEGIN
    -- Fetch Room (FROM pvp_grammar_rooms)
    SELECT * INTO v_room FROM pvp_grammar_rooms WHERE id = p_room_id;
    
    IF v_room.status != 'finished' OR v_room.winner_id IS NULL THEN
        RETURN;
    END IF;
    
    IF v_room.player1_score_change IS NOT NULL THEN
        RETURN;
    END IF;

    v_winner_id := v_room.winner_id;
    
    SELECT * INTO v_p1_stats FROM user_stats WHERE user_id = v_room.player1_id;
    SELECT * INTO v_p2_stats FROM user_stats WHERE user_id = v_room.player2_id;
    
    IF v_p1_stats IS NULL THEN
        INSERT INTO user_stats (user_id) VALUES (v_room.player1_id) RETURNING * INTO v_p1_stats;
    END IF;
    IF v_p2_stats IS NULL THEN
        INSERT INTO user_stats (user_id) VALUES (v_room.player2_id) RETURNING * INTO v_p2_stats;
    END IF;

    -- Store Snapshots
    UPDATE pvp_grammar_rooms
    SET 
        player1_start_points = v_p1_stats.rank_points,
        player2_start_points = v_p2_stats.rank_points,
        player1_start_tier = v_p1_stats.rank, -- Use existing rank column
        player2_start_tier = v_p2_stats.rank  -- Use existing rank column
    WHERE id = p_room_id;

    v_match_duration_sec := EXTRACT(EPOCH FROM (v_room.updated_at - v_room.created_at));
    
    IF v_match_duration_sec < 30 THEN
        v_is_instant_kill := TRUE;
    END IF;

    -- ==========================================
    -- LOGIC FOR PLAYER 1
    -- ==========================================
    v_p1_is_winner := (v_room.player1_id = v_winner_id);
    v_p1_final_hp := v_room.player1_hp;
    
    -- 1. Base Score (Win/Loss)
    IF v_p1_is_winner THEN
        IF v_p2_stats.rank_points > v_p1_stats.rank_points + 200 THEN v_p1_base := 35;
        ELSIF v_p2_stats.rank_points < v_p1_stats.rank_points - 200 THEN v_p1_base := 25;
        ELSE v_p1_base := 30; END IF;

        IF v_p1_stats.rank_points <= 1000 THEN v_p1_base := 40;
        ELSIF v_p1_stats.rank_points <= 2000 THEN v_p1_base := 40;
        ELSIF v_p1_stats.rank_points <= 3000 THEN v_p1_base := 30;
        ELSIF v_p1_stats.rank_points <= 4000 THEN v_p1_base := 25;
        ELSE v_p1_base := 20; END IF;
        
        IF v_p2_stats.rank_points > v_p1_stats.rank_points + 100 THEN v_p1_base := v_p1_base + 5;
        ELSIF v_p2_stats.rank_points < v_p1_stats.rank_points - 100 THEN v_p1_base := GREATEST(5, v_p1_base - 5);
        END IF;
    ELSE
        IF v_p1_stats.rank_points <= 1000 THEN v_p1_base := 0;
        ELSIF v_p1_stats.rank_points <= 2000 THEN v_p1_base := -10;
        ELSIF v_p1_stats.rank_points <= 3000 THEN v_p1_base := -20;
        ELSIF v_p1_stats.rank_points <= 4000 THEN v_p1_base := -25;
        ELSE v_p1_base := -30; END IF;

        IF v_p1_base < 0 THEN
            IF v_p2_stats.rank_points > v_p1_stats.rank_points + 100 THEN v_p1_base := v_p1_base + 5;
            ELSIF v_p2_stats.rank_points < v_p1_stats.rank_points - 100 THEN v_p1_base := v_p1_base - 5;
            END IF;
        END IF;
    END IF;
    v_p1_change := v_p1_base;

    -- 2. HP / Performance Bonus
    IF v_p1_is_winner THEN
        IF v_p1_final_hp > 90 THEN v_p1_hp_bonus := 15;
        ELSIF v_p1_final_hp >= 50 THEN v_p1_hp_bonus := 8;
        ELSIF v_p1_final_hp < 20 THEN v_p1_hp_bonus := 2;
        END IF;
        
        IF v_p1_stats.rank_points > 3000 AND v_p1_stats.rank_points <= 4000 THEN
            v_p1_hp_bonus := v_p1_hp_bonus / 2;
        END IF;
    ELSE
        IF v_room.player2_hp < 10 THEN v_p1_hp_bonus := 5; END IF;
        IF v_is_instant_kill THEN v_p1_change := v_p1_change / 2; END IF;
        IF v_p1_stats.total_battles < 10 THEN v_p1_change := v_p1_change / 2; END IF;
    END IF;
    v_p1_change := v_p1_change + v_p1_hp_bonus;

    -- 3. Streak / Special Bonuses
    IF v_p1_is_winner THEN
        IF v_p1_stats.win_streak >= 2 THEN v_p1_streak_bonus := 10; END IF;
        v_p1_change := v_p1_change + v_p1_streak_bonus;
        IF v_p1_stats.last_daily_win IS NULL OR v_p1_stats.last_daily_win < CURRENT_DATE THEN
             v_p1_change := v_p1_change * 2;
        END IF;
    END IF;
    
    
    -- ==========================================
    -- LOGIC FOR PLAYER 2
    -- ==========================================
    v_p2_is_winner := (v_room.player2_id = v_winner_id);
    v_p2_final_hp := v_room.player2_hp;
    
    IF v_p2_is_winner THEN
        IF v_p1_stats.rank_points > v_p2_stats.rank_points + 200 THEN v_p2_base := 35;
        ELSIF v_p1_stats.rank_points < v_p2_stats.rank_points - 200 THEN v_p2_base := 25;
        ELSE v_p2_base := 30; END IF;

        IF v_p2_stats.rank_points <= 1000 THEN v_p2_base := 40;
        ELSIF v_p2_stats.rank_points <= 2000 THEN v_p2_base := 40;
        ELSIF v_p2_stats.rank_points <= 3000 THEN v_p2_base := 30;
        ELSIF v_p2_stats.rank_points <= 4000 THEN v_p2_base := 25;
        ELSE v_p2_base := 20; END IF;

        IF v_p1_stats.rank_points > v_p2_stats.rank_points + 100 THEN v_p2_base := v_p2_base + 5;
        ELSIF v_p1_stats.rank_points < v_p2_stats.rank_points - 100 THEN v_p2_base := GREATEST(5, v_p2_base - 5);
        END IF;
    ELSE
        IF v_p2_stats.rank_points <= 1000 THEN v_p2_base := 0;
        ELSIF v_p2_stats.rank_points <= 2000 THEN v_p2_base := -10;
        ELSIF v_p2_stats.rank_points <= 3000 THEN v_p2_base := -20;
        ELSIF v_p2_stats.rank_points <= 4000 THEN v_p2_base := -25;
        ELSE v_p2_base := -30; END IF;

        IF v_p2_base < 0 THEN
            IF v_p1_stats.rank_points > v_p2_stats.rank_points + 100 THEN v_p2_base := v_p2_base + 5;
            ELSIF v_p1_stats.rank_points < v_p2_stats.rank_points - 100 THEN v_p2_base := v_p2_base - 5;
            END IF;
        END IF;
    END IF;
    v_p2_change := v_p2_base;

    IF v_p2_is_winner THEN
        IF v_p2_final_hp > 90 THEN v_p2_hp_bonus := 15;
        ELSIF v_p2_final_hp >= 50 THEN v_p2_hp_bonus := 8;
        ELSIF v_p2_final_hp < 20 THEN v_p2_hp_bonus := 2;
        END IF;
        IF v_p2_stats.rank_points > 3000 AND v_p2_stats.rank_points <= 4000 THEN v_p2_hp_bonus := v_p2_hp_bonus / 2; END IF;
    ELSE
        IF v_room.player1_hp < 10 THEN v_p2_hp_bonus := 5; END IF;
        IF v_is_instant_kill THEN v_p2_change := v_p2_change / 2; END IF;
        IF v_p2_stats.total_battles < 10 THEN v_p2_change := v_p2_change / 2; END IF;
    END IF;
    v_p2_change := v_p2_change + v_p2_hp_bonus;

    IF v_p2_is_winner THEN
        IF v_p2_stats.win_streak >= 2 THEN v_p2_streak_bonus := 10; END IF;
        v_p2_change := v_p2_change + v_p2_streak_bonus;
        IF v_p2_stats.last_daily_win IS NULL OR v_p2_stats.last_daily_win < CURRENT_DATE THEN v_p2_change := v_p2_change * 2; END IF;
    END IF;

    -- ==========================================
    -- FINAL UPDATES
    -- ==========================================
    
    v_details := jsonb_build_object(
        'player1', jsonb_build_object(
            'base', v_p1_base,
            'hp_bonus', v_p1_hp_bonus,
            'streak_bonus', v_p1_streak_bonus
        ),
        'player2', jsonb_build_object(
            'base', v_p2_base,
            'hp_bonus', v_p2_hp_bonus,
            'streak_bonus', v_p2_streak_bonus
        )
    );

    UPDATE pvp_grammar_rooms
    SET 
        player1_score_change = v_p1_change,
        player2_score_change = v_p2_change,
        match_details = v_details
    WHERE id = p_room_id;

    UPDATE user_stats
    SET 
        rank_points = GREATEST(0, rank_points + v_p1_change),
        win_streak = CASE WHEN v_p1_is_winner THEN win_streak + 1 ELSE 0 END,
        max_win_streak = GREATEST(max_win_streak, CASE WHEN v_p1_is_winner THEN win_streak + 1 ELSE 0 END),
        total_battles = total_battles + 1,
        last_battle_time = NOW(),
        last_daily_win = CASE WHEN v_p1_is_winner AND (last_daily_win IS NULL OR last_daily_win < CURRENT_DATE) THEN CURRENT_DATE ELSE last_daily_win END,
        rank = CASE 
            WHEN (GREATEST(0, rank_points + v_p1_change)) >= 4001 THEN 'King'
            WHEN (GREATEST(0, rank_points + v_p1_change)) >= 3001 THEN 'Diamond'
            WHEN (GREATEST(0, rank_points + v_p1_change)) >= 2001 THEN 'Gold'
            WHEN (GREATEST(0, rank_points + v_p1_change)) >= 1001 THEN 'Silver'
            ELSE 'Bronze'
        END
    WHERE user_id = v_room.player1_id;

    UPDATE user_stats
    SET 
        rank_points = GREATEST(0, rank_points + v_p2_change),
        win_streak = CASE WHEN v_p2_is_winner THEN win_streak + 1 ELSE 0 END,
        max_win_streak = GREATEST(max_win_streak, CASE WHEN v_p2_is_winner THEN win_streak + 1 ELSE 0 END),
        total_battles = total_battles + 1,
        last_battle_time = NOW(),
        last_daily_win = CASE WHEN v_p2_is_winner AND (last_daily_win IS NULL OR last_daily_win < CURRENT_DATE) THEN CURRENT_DATE ELSE last_daily_win END,
        rank = CASE 
            WHEN (GREATEST(0, rank_points + v_p2_change)) >= 4001 THEN 'King'
            WHEN (GREATEST(0, rank_points + v_p2_change)) >= 3001 THEN 'Diamond'
            WHEN (GREATEST(0, rank_points + v_p2_change)) >= 2001 THEN 'Gold'
            WHEN (GREATEST(0, rank_points + v_p2_change)) >= 1001 THEN 'Silver'
            ELSE 'Bronze'
        END
    WHERE user_id = v_room.player2_id;

END;
$$;

-- 3. Trigger Update
CREATE OR REPLACE FUNCTION trigger_grammar_score_calc()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'finished' AND NEW.winner_id IS NOT NULL AND OLD.status != 'finished' THEN
        PERFORM process_grammar_match_result(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_grammar_match_finish ON pvp_grammar_rooms;
CREATE TRIGGER on_grammar_match_finish
AFTER UPDATE ON pvp_grammar_rooms
FOR EACH ROW
EXECUTE FUNCTION trigger_grammar_score_calc();
