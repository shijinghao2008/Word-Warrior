import { supabase } from './supabaseClient';
import { DatabaseUserProfile } from '../types';

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
        // Look for active rooms created in the last 30 seconds involving this user
        const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

        const { data, error } = await supabase
            .from('pvp_word_blitz_rooms')
            .select('id, player1_id, player2_id')
            .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
            .eq('status', 'active')
            .gt('created_at', thirtySecondsAgo)
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
}

/**
 * Fetch unified match history for a user
 */
export const getMatchHistory = async (userId: string): Promise<MatchHistoryItem[]> => {
    try {
        const history: MatchHistoryItem[] = [];

        // 1. Fetch Blitz History
        const { data: blitzData } = await supabase
            .from('pvp_word_blitz_rooms')
            .select('*')
            .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
            .eq('status', 'finished')
            .order('created_at', { ascending: false })
            .limit(20);

        if (blitzData) {
            for (const room of blitzData) {
                const isP1 = room.player1_id === userId;
                const opponentId = isP1 ? room.player2_id : room.player1_id;
                let result: 'win' | 'loss' | 'draw' = 'draw';
                const myFinalHp = isP1 ? room.player1_hp : room.player2_hp;
                const oppFinalHp = isP1 ? room.player2_hp : room.player1_hp;
                let isResignation = false;

                if (room.winner_id === userId) {
                    result = 'win';
                    if (oppFinalHp > 0) isResignation = true; // Won but opponent alive = they resigned
                } else if (room.winner_id === opponentId) {
                    result = 'loss';
                    if (myFinalHp > 0) isResignation = true; // Lost but I'm alive = I resigned
                }

                // Fetch opponent name
                const oppProfile = await getOpponentProfile(opponentId);

                history.push({
                    id: room.id,
                    mode: 'blitz',
                    opponentId: opponentId,
                    opponentName: oppProfile?.username || 'Unknown Warrior',
                    result: result,
                    score: isP1 ? `${room.player1_hp} - ${room.player2_hp}` : `${room.player2_hp} - ${room.player1_hp}`,
                    createdAt: room.created_at,
                    isResignation: isResignation
                });
            }
        }

        // 2. Fetch Grammar History
        const { data: grammarData } = await supabase
            .from('pvp_grammar_rooms')
            .select('*')
            .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
            .eq('status', 'finished')
            .order('created_at', { ascending: false })
            .limit(20);

        if (grammarData) {
            for (const room of grammarData) {
                const isP1 = room.player1_id === userId;
                const opponentId = isP1 ? room.player2_id : room.player1_id;
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

                const oppProfile = await getOpponentProfile(opponentId);

                history.push({
                    id: room.id,
                    mode: 'grammar',
                    opponentId: opponentId,
                    opponentName: oppProfile?.username || 'Unknown Tactician',
                    result: result,
                    score: isP1 ? `${room.player1_hp} - ${room.player2_hp}` : `${room.player2_hp} - ${room.player1_hp}`,
                    createdAt: room.created_at,
                    isResignation: isResignation
                });
            }
        }

        // Sort combined history
        return history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);

    } catch (err) {
        console.error('Error fetching history:', err);
        return [];
    }
};
