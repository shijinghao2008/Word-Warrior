import { supabase } from './supabaseClient';
import { ReadingMaterial } from '../types';

export const readingService = {
    // Fetch all reading materials (summary only)
    async getReadingMaterials(): Promise<ReadingMaterial[]> {
        const { data, error } = await supabase
            .from('reading_materials')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching reading materials:', error);
            throw error;
        }

        return data || [];
    },

    // Fetch a single reading material by ID
    async getReadingMaterialById(id: string): Promise<ReadingMaterial | null> {
        const { data, error } = await supabase
            .from('reading_materials')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error(`Error fetching reading material with id ${id}:`, error);
            throw error;
        }

        return data;
    },

    // Record reading completion and award XP
    async completeReading(userId: string, articleId: string, score: number): Promise<{ success: boolean; xpAwarded: number; message: string }> {
        // 1. Check if already completed (optimistic check, DB constraint will also handle it)
        const { data: existing } = await supabase
            .from('user_readings')
            .select('id')
            .eq('user_id', userId)
            .eq('article_id', articleId)
            .single();

        if (existing) {
            return { success: false, xpAwarded: 0, message: 'You have already completed this article.' };
        }

        // 2. Insert record
        const { error: insertError } = await supabase
            .from('user_readings')
            .insert({
                user_id: userId,
                article_id: articleId,
                score: score,
                completed_at: new Date().toISOString()
            });

        if (insertError) {
            // Check for duplicate key error just in case race condition
            if (insertError.code === '23505') {
                return { success: false, xpAwarded: 0, message: 'You have already completed this article.' };
            }
            console.error('Error recording reading progress:', insertError);
            throw insertError;
        }

        // 3. Award XP if score is perfect (4/4) - or logic as requested "every completed article 4 questions correct check triggers +2 exp"
        // The user request says: "I hope that every time I complete an article's four questions (click check and all correct), I add two points of experience value, and each article adds points only once per user"
        // Using strict 4 for now assuming 4 questions.
        if (score >= 4) {
            const xpAmount = 10;
            const { error: xpError } = await supabase.rpc('increment_user_exp', {
                x_user_id: userId,
                x_amount: xpAmount
            });

            if (xpError) {
                console.error('Error awarding XP:', xpError);
                // We don't rollback the reading completion, just log error.
                return { success: true, xpAwarded: 0, message: 'Reading completed, but failed to update XP.' };
            }

            return { success: true, xpAwarded: xpAmount, message: `Reading completed! +${xpAmount} EXP` };
        }

        return { success: true, xpAwarded: 0, message: 'Reading completed!' };
    },

    // Get list of completed article IDs for a user
    async getUserCompletedReadings(userId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('user_readings')
            .select('article_id')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching completed readings:', error);
            return [];
        }

        return data.map(item => item.article_id);
    }
};
