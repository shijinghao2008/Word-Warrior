import { supabase } from './supabaseClient';
import { DatabaseUserProfile } from '../types';

export interface MatchDetails {
    base: number;
    hp_bonus: number;
    streak_bonus: number;
    protection?: number;
}

export interface PvPRoom {
    id: string;
    player1_id: string;
    player2_id: string;
    player1_hp: number;
    player2_hp: number;
    current_question_index: number;
    questions: {
        word: string;
        correctAnswer: string;
        options: string[];
    }[];
    status: 'active' | 'finished';
    winner_id: string | null;
    player1_score_change?: number;
    player2_score_change?: number;
    player1_start_points?: number;
    player2_start_points?: number;
    player1_start_tier?: string;
    player2_start_tier?: string;
    match_details?: {
        player1: MatchDetails;
        player2: MatchDetails;
    };
}

export type JoinStatus = 'matched' | 'waiting' | 'error';

/**
 * Attempts to join a PvP match.
 * Returns match status and room data if matched.
 */
export const findWordBlitzMatch = async (userId: string): Promise<{ status: JoinStatus; roomId?: string; role?: 'player1' | 'player2' }> => {
    try {
        const { data, error } = await supabase.rpc('join_pvp_word_blitz_queue', { p_user_id: userId });

        if (error) {
            console.error('Error joining PvP queue:', error);
            return { status: 'error' };
        }

        return data as { status: JoinStatus; roomId?: string; role?: 'player1' | 'player2' };
    } catch (err) {
        console.error('Exception in findMatch:', err);
        return { status: 'error' };
    }
};

/**
 * Cancels matchmaking
 */
export const cancelWordBlitzMatchmaking = async (userId: string) => {
    const { error } = await supabase.rpc('leave_pvp_word_blitz_queue', { p_user_id: userId });
    if (error) console.error('Error leaving queue:', error);
};

/**
 * Submit an answer to the current question
 */
export const submitWordBlitzAnswer = async (
    roomId: string,
    userId: string,
    questionIndex: number,
    isCorrect: boolean,
    timeLeft: number
) => {
    const { error } = await supabase.rpc('submit_pvp_word_blitz_answer', {
        p_room_id: roomId,
        p_user_id: userId,
        p_question_index: questionIndex,
        p_is_correct: isCorrect,
        p_time_left: timeLeft
    });

    if (error) console.error('Error submitting answer:', error);
};

/**
 * Get opponent profile details
 */
export const getOpponentProfile = async (opponentId: string): Promise<{ username: string } | null> => {
    // If it's a test ID or "Wraith", return mocked
    if (opponentId === '00000000-0000-0000-0000-000000000001') return { username: 'Trainer Bot' };

    const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', opponentId)
        .single();

    return data;
};

/**
 * Polling Fallback: Check if a match was created recently for this user
 * This helps if the WebSocket 'INSERT' event was missed.
 */
export const checkWordBlitzMatchStatus = async (userId: string): Promise<{ roomId: string; role: 'player1' | 'player2' } | null> => {
    try {
        // Look for active rooms created in the last 1 hour involving this user
        // We increased this from 30s to 1h to handle client-server time drift issues.
        // Even if the client time is ahead/behind, we should still find the match if it exists.
        const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

        const { data, error } = await supabase
            .from('pvp_word_blitz_rooms')
            .select('id, player1_id, player2_id')
            .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
            .eq('status', 'active')
            .gt('created_at', oneHourAgo)
            .single();

        if (error || !data) return null;

        return {
            roomId: data.id,
            role: data.player1_id === userId ? 'player1' : 'player2'
        };

    } catch (err) {
        console.error('Error polling match status:', err);
        return null;
    }
};

/**
 * Abandon/Resign a match
 * Marks the room as finished and the opponent as the winner.
 */
export const abandonWordBlitzMatch = async (roomId: string, userId: string) => {
    try {
        // First get the room to identify the opponent
        const { data: room, error: fetchError } = await supabase
            .from('pvp_word_blitz_rooms')
            .select('player1_id, player2_id')
            .eq('id', roomId)
            .single();

        if (fetchError || !room) return;

        // winner_id logic: if I (userId) am abandoning, the OTHER player wins.
        // This function can be called by the leaver OR by the opponent detecting the leaver.
        const winnerId = room.player1_id === userId ? room.player2_id : room.player1_id;

        const { error } = await supabase
            .from('pvp_word_blitz_rooms')
            .update({
                status: 'finished',
                winner_id: winnerId
            })
            .eq('id', roomId);

        if (error) console.error('Error abandoning match:', error);

    } catch (err) {
        console.error('Error in abandonMatch:', err);
    }
};

export interface MatchHistoryItem {
    id: string;
    mode: 'blitz' | 'grammar';
    opponentId: string;
    opponentName: string;
    result: 'win' | 'loss' | 'draw';
    score: string; // e.g. "100 - 0"
    createdAt: string;
    isResignation?: boolean;
    scoreChange?: number;
    startRankTier?: string;
    startRankPoints?: number;
}

/**
 * Fetch unified match history for a user
 */
/**
 * Fetch unified match history for a user with Pagination & Optimized Performance
 */
export const getMatchHistory = async (userId: string, page: number = 0, limit: number = 10): Promise<{ items: MatchHistoryItem[], hasMore: boolean }> => {
    try {
        const historyData: any[] = [];
        const startRange = page * limit;
        const endRange = startRange + limit - 1;

        // 1. Parallel Fetch match data from both tables (limit + buffer to sort later)
        // Note: For true global pagination we would need a SQL View.
        // Simplified Strategy: Fetch 'limit' items from BOTH tables, combine, sort, and slice.
        // This ensures we always have enough items for the page even if one table is empty.

        const [blitzRes, grammarRes] = await Promise.all([
            supabase
                .from('pvp_word_blitz_rooms')
                .select('*')
                .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
                .eq('status', 'finished')
                .order('created_at', { ascending: false })
                .range(startRange, endRange), // Native Supabase range pagination

            supabase
                .from('pvp_grammar_rooms')
                .select('*')
                .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
                .eq('status', 'finished')
                .order('created_at', { ascending: false })
                .range(startRange, endRange)
        ]);

        const rawMatches: { room: any, mode: 'blitz' | 'grammar' }[] = [];

        if (blitzRes.data) blitzRes.data.forEach(r => rawMatches.push({ room: r, mode: 'blitz' }));
        if (grammarRes.data) grammarRes.data.forEach(r => rawMatches.push({ room: r, mode: 'grammar' }));

        // 2. Sort combined results in memory by creation date DESC
        rawMatches.sort((a, b) => new Date(b.room.created_at).getTime() - new Date(a.room.created_at).getTime());

        // 3. Slice the page we actually want from the combined result
        // (Since we grabbed 'limit' from EACH, we might have up to 2*limit items. We only return 'limit'.)
        const slicedMatches = rawMatches.slice(0, limit);
        const hasMore = rawMatches.length > limit || (blitzRes.data?.length === limit && grammarRes.data?.length === limit); // Approximated hasMore

        // 4. Collect ALL unique opponent IDs for BATCH fetching (Solves N+1 Problem)
        const opponentIds = new Set<string>();
        for (const match of slicedMatches) {
            const isP1 = match.room.player1_id === userId;
            const opponentId = isP1 ? match.room.player2_id : match.room.player1_id;
            opponentIds.add(opponentId);
        }

        // 5. Batch Fetch Profiles
        const profileMap = new Map<string, string>();
        if (opponentIds.size > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username')
                .in('id', Array.from(opponentIds));

            if (profiles) {
                profiles.forEach(p => profileMap.set(p.id, p.username));
            }
        }

        // 6. Map to Final Output Format
        const history: MatchHistoryItem[] = slicedMatches.map(({ room, mode }) => {
            const isP1 = room.player1_id === userId;
            const opponentId = isP1 ? room.player2_id : room.player1_id;
            const opponentName = profileMap.get(opponentId) || (opponentId === '00000000-0000-0000-0000-000000000001' ? 'Trainer Bot' : 'Unknown Warrior');

            let result: 'win' | 'loss' | 'draw' = 'draw';
            const myFinalHp = isP1 ? room.player1_hp : room.player2_hp;
            const oppFinalHp = isP1 ? room.player2_hp : room.player1_hp;
            let isResignation = false;

            if (room.winner_id === userId) {
                result = 'win';
                if (oppFinalHp > 0) isResignation = true;
            } else if (room.winner_id === opponentId) {
                result = 'loss';
                if (myFinalHp > 0) isResignation = true;
            }

            // Rank Logic
            const myScoreChange = isP1 ? room.player1_score_change : room.player2_score_change;
            const myStartTier = isP1 ? room.player1_start_tier : room.player2_start_tier;
            const myStartPoints = isP1 ? room.player1_start_points : room.player2_start_points;

            return {
                id: room.id,
                mode: mode,
                opponentId: opponentId,
                opponentName: opponentName,
                result: result,
                score: isP1 ? `${room.player1_hp} - ${room.player2_hp}` : `${room.player2_hp} - ${room.player1_hp}`,
                createdAt: room.created_at,
                isResignation: isResignation,
                scoreChange: myScoreChange || 0,
                startRankTier: myStartTier || 'Bronze',
                startRankPoints: myStartPoints || 500
            };
        });

        return { items: history, hasMore };

    } catch (err) {
        console.error('Error fetching history:', err);
        return { items: [], hasMore: false };
    }
};
