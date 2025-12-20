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
