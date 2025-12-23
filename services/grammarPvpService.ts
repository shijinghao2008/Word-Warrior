import { supabase } from './supabaseClient';
import { JoinStatus, getOpponentProfile } from './pvpService';

// Re-export types if needed or define specific ones
export type { JoinStatus };

/**
 * Attempts to join a Grammar PvP match.
 * Returns match status and room data if matched.
 */
export const findGrammarMatch = async (userId: string): Promise<{ status: JoinStatus; roomId?: string; role?: 'player1' | 'player2' }> => {
    try {
        const { data, error } = await supabase.rpc('join_pvp_grammar_queue', { p_user_id: userId });

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
 * Cancels matchmaking for Grammar PvP
 */
export const cancelGrammarMatchmaking = async (userId: string) => {
    const { error } = await supabase.rpc('leave_pvp_grammar_queue', { p_user_id: userId });
    if (error) console.error('Error leaving queue:', error);
};

/**
 * Submit an answer to the current grammar question
 */
export const submitGrammarAnswer = async (
    roomId: string,
    userId: string,
    questionIndex: number,
    isCorrect: boolean,
    timeLeft: number
) => {
    const { error } = await supabase.rpc('submit_pvp_grammar_answer', {
        p_room_id: roomId,
        p_user_id: userId,
        p_question_index: questionIndex,
        p_is_correct: isCorrect,
        p_time_left: timeLeft
    });

    if (error) console.error('Error submitting answer:', error);
};


export { getOpponentProfile };

/**
 * Polling Fallback for Grammar Mode
 */
export const checkGrammarMatchStatus = async (userId: string): Promise<{ roomId: string; role: 'player1' | 'player2' } | null> => {
    try {
        // Look for active rooms created in the last 1 hour involving this user
        // We increased this from 30s to 1h to handle client-server time drift issues.
        const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

        const { data, error } = await supabase
            .from('pvp_grammar_rooms')
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
        console.error('Error polling grammar match status:', err);
        return null;
    }
};

/**
 * Abandon/Resign a grammar match
 */
export const abandonGrammarMatch = async (roomId: string, userId: string) => {
    try {
        const { data: room, error: fetchError } = await supabase
            .from('pvp_grammar_rooms')
            .select('player1_id, player2_id')
            .eq('id', roomId)
            .single();

        if (fetchError || !room) return;

        // winner_id logic: if I (userId) am abandoning, the OTHER player wins.
        // This function can be called by the leaver OR by the opponent detecting the leaver.
        const winnerId = room.player1_id === userId ? room.player2_id : room.player1_id;

        const { error } = await supabase
            .from('pvp_grammar_rooms')
            .update({
                status: 'finished',
                winner_id: winnerId
            })
            .eq('id', roomId);

        if (error) console.error('Error abandoning grammar match:', error);

    } catch (err) {
        console.error('Error in abandonGrammarMatch:', err);
    }
};

