-- ============================================
-- PVP Rewards Migration
-- ============================================
-- Adds EXP and Gold rewards for PvP battles
--
-- Vocab Blitz: Win = 30 EXP, 150 Gold | Lose = 10 EXP, 30 Gold
-- Grammar Siege: Win = 60 EXP, 300 Gold | Lose = 20 EXP, 50 Gold

-- ============================================
-- 1. UPDATE PROCESS_PVP_MATCH_RESULT (WORD BLITZ)
-- ============================================
-- Adds EXP and Gold rewards

CREATE OR REPLACE FUNCTION process_pvp_match_result(p_room_id UUID)
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
    v_p1_protection INTEGER := 0;
    v_p1_final_hp INTEGER;
    v_p1_exp_gain INTEGER := 0;
    v_p1_gold_gain INTEGER := 0;
    
    -- P2 specifics
    v_p2_is_winner BOOLEAN;
    v_p2_base INTEGER;
    v_p2_hp_bonus INTEGER := 0;
    v_p2_streak_bonus INTEGER := 0;
    v_p2_protection INTEGER := 0;
    v_p2_final_hp INTEGER;
    v_p2_exp_gain INTEGER := 0;
    v_p2_gold_gain INTEGER := 0;
    
    -- Constants
    v_match_duration_sec INTEGER;
    v_is_instant_kill BOOLEAN := FALSE;
    
    -- Details JSON
    v_details JSONB;
BEGIN
    -- Fetch Room
    SELECT * INTO v_room FROM pvp_word_blitz_rooms WHERE id = p_room_id;
    
    IF v_room.status != 'finished' OR v_room.winner_id IS NULL THEN
        RETURN;
    END IF;
    
    -- If already processed, skip
    IF v_room.player1_score_change IS NOT NULL THEN
        RETURN;
    END IF;

    v_winner_id := v_room.winner_id;
    
    -- Fetch Stats
    SELECT * INTO v_p1_stats FROM user_stats WHERE user_id = v_room.player1_id;
    SELECT * INTO v_p2_stats FROM user_stats WHERE user_id = v_room.player2_id;
    
    IF v_p1_stats IS NULL THEN
        INSERT INTO user_stats (user_id) VALUES (v_room.player1_id) RETURNING * INTO v_p1_stats;
    END IF;
    IF v_p2_stats IS NULL THEN
        INSERT INTO user_stats (user_id) VALUES (v_room.player2_id) RETURNING * INTO v_p2_stats;
    END IF;

    -- Store Snapshots
    UPDATE pvp_word_blitz_rooms
    SET 
        player1_start_points = v_p1_stats.rank_points,
        player2_start_points = v_p2_stats.rank_points,
        player1_start_tier = v_p1_stats.rank,
        player2_start_tier = v_p2_stats.rank
    WHERE id = p_room_id;

    -- Calculate Duration
    v_match_duration_sec := EXTRACT(EPOCH FROM (v_room.updated_at - v_room.created_at));
    
    IF v_match_duration_sec < 30 THEN
        v_is_instant_kill := TRUE;
    END IF;

    -- ==========================================
    -- LOGIC FOR PLAYER 1
    -- ==========================================
    v_p1_is_winner := (v_room.player1_id = v_winner_id);
    v_p1_final_hp := v_room.player1_hp;
    
    -- EXP and Gold Rewards (Vocab Blitz)
    IF v_p1_is_winner THEN
        v_p1_exp_gain := 30;
        v_p1_gold_gain := 150;
    ELSE
        v_p1_exp_gain := 10;
        v_p1_gold_gain := 30;
    END IF;
    
    -- Base Score (Win/Loss) - Unchanged logic
    IF v_p1_is_winner THEN
        IF v_p2_stats.rank_points > v_p1_stats.rank_points + 200 THEN v_p1_base := 35;
        ELSIF v_p2_stats.rank_points < v_p1_stats.rank_points - 200 THEN v_p1_base := 25;
        ELSE v_p1_base := 30; END IF;

        IF v_p1_stats.rank_points <= 1000 THEN v_p1_base := 40;
        ELSIF v_p1_stats.rank_points <= 2000 THEN v_p1_base := 40;
        ELSIF v_p1_stats.rank_points <= 3000 THEN v_p1_base := 30;
        ELSIF v_p1_stats.rank_points <= 4000 THEN v_p1_base := 25;
        ELSE v_p1_base := 20; END IF;
        
        IF v_p1_stats.rank_points > v_p2_stats.rank_points + 2000 THEN 
             v_p1_base := 1;
        ELSIF v_p1_stats.rank_points > v_p2_stats.rank_points + 1000 THEN
             v_p1_base := GREATEST(5, v_p1_base - 15);
        ELSIF v_p1_stats.rank_points > v_p2_stats.rank_points + 500 THEN
             v_p1_base := GREATEST(10, v_p1_base - 5);
        END IF;
    ELSE
        IF v_p1_stats.rank_points <= 1000 THEN v_p1_base := 0;
        ELSIF v_p1_stats.rank_points <= 2000 THEN v_p1_base := -10;
        ELSIF v_p1_stats.rank_points <= 3000 THEN v_p1_base := -25;
        ELSIF v_p1_stats.rank_points <= 4000 THEN v_p1_base := -30;
        ELSE v_p1_base := -35; END IF;

        IF v_p1_base < 0 THEN
            IF v_p2_stats.rank_points > v_p1_stats.rank_points + 500 THEN v_p1_base := v_p1_base + 5;
            ELSIF v_p2_stats.rank_points < v_p1_stats.rank_points - 500 THEN v_p1_base := v_p1_base - 5;
            END IF;
        END IF;
    END IF;
    v_p1_change := v_p1_base;

    -- HP Bonus
    IF v_p1_is_winner THEN
        IF v_p1_final_hp > 90 THEN v_p1_hp_bonus := 15;
        ELSIF v_p1_final_hp >= 50 THEN v_p1_hp_bonus := 8;
        ELSIF v_p1_final_hp < 20 THEN v_p1_hp_bonus := 2;
        END IF;
        
        IF v_p1_stats.rank_points > v_p2_stats.rank_points + 1000 THEN
            v_p1_hp_bonus := 2;
        END IF;
        
        IF v_p1_stats.rank_points > 3000 THEN
            v_p1_hp_bonus := v_p1_hp_bonus / 2;
        END IF;
    ELSE
        IF v_p1_stats.rank_points < 2000 THEN
            IF v_room.player2_hp < 10 THEN 
                v_p1_protection := v_p1_protection + 5;
            END IF;
            IF v_is_instant_kill THEN 
                v_p1_protection := v_p1_protection + ABS(v_p1_change / 2); 
            END IF; 
            IF v_p1_stats.total_battles < 10 THEN 
                v_p1_protection := v_p1_protection + ABS(v_p1_change / 2);
            END IF;
        END IF;
    END IF;
    
    IF NOT v_p1_is_winner THEN
         v_p1_protection := LEAST(v_p1_protection, ABS(v_p1_change));
         v_p1_change := v_p1_change + v_p1_protection;
    END IF;

    v_p1_change := v_p1_change + v_p1_hp_bonus;

    -- Streak Bonus
    IF v_p1_is_winner THEN
        IF v_p1_stats.win_streak >= 2 THEN v_p1_streak_bonus := 10; END IF;
        
        IF v_p1_stats.rank_points > v_p2_stats.rank_points + 1000 THEN
             v_p1_streak_bonus := 0; 
        END IF;

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
    
    -- EXP and Gold Rewards (Vocab Blitz)
    IF v_p2_is_winner THEN
        v_p2_exp_gain := 30;
        v_p2_gold_gain := 150;
    ELSE
        v_p2_exp_gain := 10;
        v_p2_gold_gain := 30;
    END IF;
    
    -- Base Score
    IF v_p2_is_winner THEN
         IF v_p1_stats.rank_points > v_p2_stats.rank_points + 200 THEN v_p2_base := 35;
        ELSIF v_p1_stats.rank_points < v_p2_stats.rank_points - 200 THEN v_p2_base := 25;
        ELSE v_p2_base := 30; END IF;

        IF v_p2_stats.rank_points <= 1000 THEN v_p2_base := 40;
        ELSIF v_p2_stats.rank_points <= 2000 THEN v_p2_base := 40;
        ELSIF v_p2_stats.rank_points <= 3000 THEN v_p2_base := 30;
        ELSIF v_p2_stats.rank_points <= 4000 THEN v_p2_base := 25;
        ELSE v_p2_base := 20; END IF;

        IF v_p2_stats.rank_points > v_p1_stats.rank_points + 2000 THEN 
             v_p2_base := 1; 
        ELSIF v_p2_stats.rank_points > v_p1_stats.rank_points + 1000 THEN
             v_p2_base := GREATEST(5, v_p2_base - 15);
        ELSIF v_p2_stats.rank_points > v_p1_stats.rank_points + 500 THEN
             v_p2_base := GREATEST(10, v_p2_base - 5);
        END IF;
    ELSE
        IF v_p2_stats.rank_points <= 1000 THEN v_p2_base := 0;
        ELSIF v_p2_stats.rank_points <= 2000 THEN v_p2_base := -10;
        ELSIF v_p2_stats.rank_points <= 3000 THEN v_p2_base := -25;
        ELSIF v_p2_stats.rank_points <= 4000 THEN v_p2_base := -30;
        ELSE v_p2_base := -35; END IF;

        IF v_p2_base < 0 THEN
            IF v_p1_stats.rank_points > v_p2_stats.rank_points + 500 THEN v_p2_base := v_p2_base + 5;
            ELSIF v_p1_stats.rank_points < v_p2_stats.rank_points - 500 THEN v_p2_base := v_p2_base - 5;
            END IF;
        END IF;
    END IF;
    v_p2_change := v_p2_base;

    -- HP Bonus P2
    IF v_p2_is_winner THEN
        IF v_p2_final_hp > 90 THEN v_p2_hp_bonus := 15;
        ELSIF v_p2_final_hp >= 50 THEN v_p2_hp_bonus := 8;
        ELSIF v_p2_final_hp < 20 THEN v_p2_hp_bonus := 2;
        END IF;
        
        IF v_p2_stats.rank_points > v_p1_stats.rank_points + 1000 THEN
            v_p2_hp_bonus := 2; 
        END IF;

        IF v_p2_stats.rank_points > 3000 THEN v_p2_hp_bonus := v_p2_hp_bonus / 2; END IF;
    ELSE
        IF v_p2_stats.rank_points < 2000 THEN
            IF v_room.player1_hp < 10 THEN v_p2_protection := v_p2_protection + 5; END IF;
            IF v_is_instant_kill THEN v_p2_protection := v_p2_protection + ABS(v_p2_change / 2); END IF;
            IF v_p2_stats.total_battles < 10 THEN v_p2_protection := v_p2_protection + ABS(v_p2_change / 2); END IF;
        END IF;
    END IF;
    
    IF NOT v_p2_is_winner THEN
         v_p2_protection := LEAST(v_p2_protection, ABS(v_p2_change));
         v_p2_change := v_p2_change + v_p2_protection;
    END IF;

    v_p2_change := v_p2_change + v_p2_hp_bonus;

    -- Streak/Daily P2
    IF v_p2_is_winner THEN
        IF v_p2_stats.win_streak >= 2 THEN v_p2_streak_bonus := 10; END IF;
        
        IF v_p2_stats.rank_points > v_p1_stats.rank_points + 1000 THEN
             v_p2_streak_bonus := 0; 
        END IF;

        v_p2_change := v_p2_change + v_p2_streak_bonus;
        
        IF v_p2_stats.last_daily_win IS NULL OR v_p2_stats.last_daily_win < CURRENT_DATE THEN 
            v_p2_change := v_p2_change * 2; 
        END IF;
    END IF;

    -- ==========================================
    -- FINAL UPDATES
    -- ==========================================
    
    -- Build Details JSON (with exp and gold)
    v_details := jsonb_build_object(
        'player1', jsonb_build_object(
            'base', v_p1_base,
            'hp_bonus', v_p1_hp_bonus,
            'streak_bonus', v_p1_streak_bonus,
            'protection', v_p1_protection,
            'exp_gain', v_p1_exp_gain,
            'gold_gain', v_p1_gold_gain
        ),
        'player2', jsonb_build_object(
            'base', v_p2_base,
            'hp_bonus', v_p2_hp_bonus,
            'streak_bonus', v_p2_streak_bonus,
            'protection', v_p2_protection,
            'exp_gain', v_p2_exp_gain,
            'gold_gain', v_p2_gold_gain
        )
    );

    -- Update Room with Score Changes
    UPDATE pvp_word_blitz_rooms
    SET 
        player1_score_change = v_p1_change,
        player2_score_change = v_p2_change,
        match_details = v_details
    WHERE id = p_room_id;

    -- Player 1 Update (with EXP and Gold)
    UPDATE user_stats
    SET 
        rank_points = GREATEST(0, rank_points + v_p1_change),
        exp = exp + v_p1_exp_gain,
        gold = gold + v_p1_gold_gain,
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

    -- Player 2 Update (with EXP and Gold)
    UPDATE user_stats
    SET 
        rank_points = GREATEST(0, rank_points + v_p2_change),
        exp = exp + v_p2_exp_gain,
        gold = gold + v_p2_gold_gain,
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


-- ============================================
-- 2. UPDATE PROCESS_PVP_GRAMMAR_MATCH_RESULT
-- ============================================
-- Grammar Siege: Win = 60 EXP, 300 Gold | Lose = 20 EXP, 50 Gold

CREATE OR REPLACE FUNCTION process_pvp_grammar_match_result(p_room_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_room RECORD;
    v_p1_stats RECORD;
    v_p2_stats RECORD;
    v_winner_id UUID;
    
    v_p1_change INTEGER := 0;
    v_p2_change INTEGER := 0;
    
    v_p1_is_winner BOOLEAN;
    v_p1_base INTEGER;
    v_p1_hp_bonus INTEGER := 0;
    v_p1_streak_bonus INTEGER := 0;
    v_p1_protection INTEGER := 0;
    v_p1_final_hp INTEGER;
    v_p1_exp_gain INTEGER := 0;
    v_p1_gold_gain INTEGER := 0;
    
    v_p2_is_winner BOOLEAN;
    v_p2_base INTEGER;
    v_p2_hp_bonus INTEGER := 0;
    v_p2_streak_bonus INTEGER := 0;
    v_p2_protection INTEGER := 0;
    v_p2_final_hp INTEGER;
    v_p2_exp_gain INTEGER := 0;
    v_p2_gold_gain INTEGER := 0;
    
    v_match_duration_sec INTEGER;
    v_is_instant_kill BOOLEAN := FALSE;
    v_details JSONB;
BEGIN
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

    UPDATE pvp_grammar_rooms
    SET 
        player1_start_points = v_p1_stats.rank_points,
        player2_start_points = v_p2_stats.rank_points,
        player1_start_tier = v_p1_stats.rank,
        player2_start_tier = v_p2_stats.rank
    WHERE id = p_room_id;

    v_match_duration_sec := EXTRACT(EPOCH FROM (v_room.updated_at - v_room.created_at));
    
    IF v_match_duration_sec < 30 THEN
        v_is_instant_kill := TRUE;
    END IF;

    -- ==========================================
    -- PLAYER 1 LOGIC
    -- ==========================================
    v_p1_is_winner := (v_room.player1_id = v_winner_id);
    v_p1_final_hp := v_room.player1_hp;
    
    -- Grammar Siege Rewards (2x of Vocab Blitz)
    IF v_p1_is_winner THEN
        v_p1_exp_gain := 60;
        v_p1_gold_gain := 300;
    ELSE
        v_p1_exp_gain := 20;
        v_p1_gold_gain := 50;
    END IF;
    
    -- Base Score (Same logic as Word Blitz)
    IF v_p1_is_winner THEN
        IF v_p2_stats.rank_points > v_p1_stats.rank_points + 200 THEN v_p1_base := 35;
        ELSIF v_p2_stats.rank_points < v_p1_stats.rank_points - 200 THEN v_p1_base := 25;
        ELSE v_p1_base := 30; END IF;

        IF v_p1_stats.rank_points <= 1000 THEN v_p1_base := 40;
        ELSIF v_p1_stats.rank_points <= 2000 THEN v_p1_base := 40;
        ELSIF v_p1_stats.rank_points <= 3000 THEN v_p1_base := 30;
        ELSIF v_p1_stats.rank_points <= 4000 THEN v_p1_base := 25;
        ELSE v_p1_base := 20; END IF;
        
        IF v_p1_stats.rank_points > v_p2_stats.rank_points + 2000 THEN 
             v_p1_base := 1;
        ELSIF v_p1_stats.rank_points > v_p2_stats.rank_points + 1000 THEN
             v_p1_base := GREATEST(5, v_p1_base - 15);
        ELSIF v_p1_stats.rank_points > v_p2_stats.rank_points + 500 THEN
             v_p1_base := GREATEST(10, v_p1_base - 5);
        END IF;
    ELSE
        IF v_p1_stats.rank_points <= 1000 THEN v_p1_base := 0;
        ELSIF v_p1_stats.rank_points <= 2000 THEN v_p1_base := -10;
        ELSIF v_p1_stats.rank_points <= 3000 THEN v_p1_base := -25;
        ELSIF v_p1_stats.rank_points <= 4000 THEN v_p1_base := -30;
        ELSE v_p1_base := -35; END IF;

        IF v_p1_base < 0 THEN
            IF v_p2_stats.rank_points > v_p1_stats.rank_points + 500 THEN v_p1_base := v_p1_base + 5;
            ELSIF v_p2_stats.rank_points < v_p1_stats.rank_points - 500 THEN v_p1_base := v_p1_base - 5;
            END IF;
        END IF;
    END IF;
    v_p1_change := v_p1_base;

    -- HP Bonus
    IF v_p1_is_winner THEN
        IF v_p1_final_hp > 90 THEN v_p1_hp_bonus := 15;
        ELSIF v_p1_final_hp >= 50 THEN v_p1_hp_bonus := 8;
        ELSIF v_p1_final_hp < 20 THEN v_p1_hp_bonus := 2;
        END IF;
        
        IF v_p1_stats.rank_points > v_p2_stats.rank_points + 1000 THEN
            v_p1_hp_bonus := 2;
        END IF;
        
        IF v_p1_stats.rank_points > 3000 THEN
            v_p1_hp_bonus := v_p1_hp_bonus / 2;
        END IF;
    ELSE
        IF v_p1_stats.rank_points < 2000 THEN
            IF v_room.player2_hp < 10 THEN v_p1_protection := v_p1_protection + 5; END IF;
            IF v_is_instant_kill THEN v_p1_protection := v_p1_protection + ABS(v_p1_change / 2); END IF; 
            IF v_p1_stats.total_battles < 10 THEN v_p1_protection := v_p1_protection + ABS(v_p1_change / 2); END IF;
        END IF;
    END IF;
    
    IF NOT v_p1_is_winner THEN
         v_p1_protection := LEAST(v_p1_protection, ABS(v_p1_change));
         v_p1_change := v_p1_change + v_p1_protection;
    END IF;

    v_p1_change := v_p1_change + v_p1_hp_bonus;

    IF v_p1_is_winner THEN
        IF v_p1_stats.win_streak >= 2 THEN v_p1_streak_bonus := 10; END IF;
        IF v_p1_stats.rank_points > v_p2_stats.rank_points + 1000 THEN v_p1_streak_bonus := 0; END IF;
        v_p1_change := v_p1_change + v_p1_streak_bonus;
        IF v_p1_stats.last_daily_win IS NULL OR v_p1_stats.last_daily_win < CURRENT_DATE THEN
             v_p1_change := v_p1_change * 2;
        END IF;
    END IF;
    
    -- ==========================================
    -- PLAYER 2 LOGIC
    -- ==========================================
    v_p2_is_winner := (v_room.player2_id = v_winner_id);
    v_p2_final_hp := v_room.player2_hp;
    
    -- Grammar Siege Rewards
    IF v_p2_is_winner THEN
        v_p2_exp_gain := 60;
        v_p2_gold_gain := 300;
    ELSE
        v_p2_exp_gain := 20;
        v_p2_gold_gain := 50;
    END IF;
    
    IF v_p2_is_winner THEN
        IF v_p1_stats.rank_points > v_p2_stats.rank_points + 200 THEN v_p2_base := 35;
        ELSIF v_p1_stats.rank_points < v_p2_stats.rank_points - 200 THEN v_p2_base := 25;
        ELSE v_p2_base := 30; END IF;

        IF v_p2_stats.rank_points <= 1000 THEN v_p2_base := 40;
        ELSIF v_p2_stats.rank_points <= 2000 THEN v_p2_base := 40;
        ELSIF v_p2_stats.rank_points <= 3000 THEN v_p2_base := 30;
        ELSIF v_p2_stats.rank_points <= 4000 THEN v_p2_base := 25;
        ELSE v_p2_base := 20; END IF;

        IF v_p2_stats.rank_points > v_p1_stats.rank_points + 2000 THEN v_p2_base := 1; 
        ELSIF v_p2_stats.rank_points > v_p1_stats.rank_points + 1000 THEN v_p2_base := GREATEST(5, v_p2_base - 15);
        ELSIF v_p2_stats.rank_points > v_p1_stats.rank_points + 500 THEN v_p2_base := GREATEST(10, v_p2_base - 5);
        END IF;
    ELSE
        IF v_p2_stats.rank_points <= 1000 THEN v_p2_base := 0;
        ELSIF v_p2_stats.rank_points <= 2000 THEN v_p2_base := -10;
        ELSIF v_p2_stats.rank_points <= 3000 THEN v_p2_base := -25;
        ELSIF v_p2_stats.rank_points <= 4000 THEN v_p2_base := -30;
        ELSE v_p2_base := -35; END IF;

        IF v_p2_base < 0 THEN
            IF v_p1_stats.rank_points > v_p2_stats.rank_points + 500 THEN v_p2_base := v_p2_base + 5;
            ELSIF v_p1_stats.rank_points < v_p2_stats.rank_points - 500 THEN v_p2_base := v_p2_base - 5;
            END IF;
        END IF;
    END IF;
    v_p2_change := v_p2_base;

    IF v_p2_is_winner THEN
        IF v_p2_final_hp > 90 THEN v_p2_hp_bonus := 15;
        ELSIF v_p2_final_hp >= 50 THEN v_p2_hp_bonus := 8;
        ELSIF v_p2_final_hp < 20 THEN v_p2_hp_bonus := 2;
        END IF;
        IF v_p2_stats.rank_points > v_p1_stats.rank_points + 1000 THEN v_p2_hp_bonus := 2; END IF;
        IF v_p2_stats.rank_points > 3000 THEN v_p2_hp_bonus := v_p2_hp_bonus / 2; END IF;
    ELSE
        IF v_p2_stats.rank_points < 2000 THEN
            IF v_room.player1_hp < 10 THEN v_p2_protection := v_p2_protection + 5; END IF;
            IF v_is_instant_kill THEN v_p2_protection := v_p2_protection + ABS(v_p2_change / 2); END IF;
            IF v_p2_stats.total_battles < 10 THEN v_p2_protection := v_p2_protection + ABS(v_p2_change / 2); END IF;
        END IF;
    END IF;
    
    IF NOT v_p2_is_winner THEN
         v_p2_protection := LEAST(v_p2_protection, ABS(v_p2_change));
         v_p2_change := v_p2_change + v_p2_protection;
    END IF;

    v_p2_change := v_p2_change + v_p2_hp_bonus;

    IF v_p2_is_winner THEN
        IF v_p2_stats.win_streak >= 2 THEN v_p2_streak_bonus := 10; END IF;
        IF v_p2_stats.rank_points > v_p1_stats.rank_points + 1000 THEN v_p2_streak_bonus := 0; END IF;
        v_p2_change := v_p2_change + v_p2_streak_bonus;
        IF v_p2_stats.last_daily_win IS NULL OR v_p2_stats.last_daily_win < CURRENT_DATE THEN 
            v_p2_change := v_p2_change * 2; 
        END IF;
    END IF;

    -- ==========================================
    -- FINAL UPDATES
    -- ==========================================
    
    v_details := jsonb_build_object(
        'player1', jsonb_build_object(
            'base', v_p1_base,
            'hp_bonus', v_p1_hp_bonus,
            'streak_bonus', v_p1_streak_bonus,
            'protection', v_p1_protection,
            'exp_gain', v_p1_exp_gain,
            'gold_gain', v_p1_gold_gain
        ),
        'player2', jsonb_build_object(
            'base', v_p2_base,
            'hp_bonus', v_p2_hp_bonus,
            'streak_bonus', v_p2_streak_bonus,
            'protection', v_p2_protection,
            'exp_gain', v_p2_exp_gain,
            'gold_gain', v_p2_gold_gain
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
        exp = exp + v_p1_exp_gain,
        gold = gold + v_p1_gold_gain,
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
        exp = exp + v_p2_exp_gain,
        gold = gold + v_p2_gold_gain,
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
