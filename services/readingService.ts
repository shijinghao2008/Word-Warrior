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
    async completeReading(userId: string, articleId: string, score: number): Promise<{ success: boolean; xpAwarded: number; goldAwarded: number; message: string }> {
        // 1. Get total questions for this article to determine perfect score
        const { data: material, error: materialError } = await supabase
            .from('reading_materials')
            .select('questions')
            .eq('id', articleId)
            .single();

        if (materialError || !material) {
            console.error('Error fetching reading material details:', materialError);
            return { success: false, xpAwarded: 0, goldAwarded: 0, message: 'Failed to verify reading material.' };
        }

        const totalQuestions = material.questions?.length || 0;
        const isPerfectScore = score === totalQuestions && totalQuestions > 0;

        // 2. Check existing record to avoid duplicate rewards
        const { data: existing } = await supabase
            .from('user_readings')
            .select('score')
            .eq('user_id', userId)
            .eq('article_id', articleId)
            .single();

        // Check if user previously achieved a perfect score
        // existing.score is a number in user_readings
        const previouslyPerfect = existing && existing.score >= totalQuestions;

        // 3. Upsert record
        const { error: upsertError } = await supabase
            .from('user_readings')
            .upsert({
                user_id: userId,
                article_id: articleId,
                score: score,
                completed_at: new Date().toISOString()
            }, { onConflict: 'user_id,article_id' });

        if (upsertError) {
            console.error('Error recording reading progress details:', {
                error: upsertError,
                code: upsertError.code,
                message: upsertError.message,
                details: upsertError.details
            });
            return { success: false, xpAwarded: 0, goldAwarded: 0, message: `Failed to save progress: ${upsertError.message}` };
        }

        // 4. Award Rewards
        // Logic: First time getting perfect score
        let xpAwarded = 0;
        let goldAwarded = 0;

        if (isPerfectScore && !previouslyPerfect) {
            xpAwarded = 350;
            goldAwarded = 100;

            // Increment XP
            const { error: xpError } = await supabase.rpc('increment_user_exp', {
                x_user_id: userId,
                x_amount: xpAwarded
            });

            if (xpError) {
                console.error('Error awarding XP:', xpError);
            }

            // Increment Gold
            // Using the same RPC as writing function
            const { data: newGold, error: goldError } = await supabase.rpc('increment_user_gold', {
                x_user_id: userId,
                x_amount: goldAwarded
            });

            if (goldError) {
                console.error('Error awarding Gold:', goldError);
            } else {
                console.log('Gold incremented successfully. New balance:', newGold);
            }
        }

        let message = 'Reading completed!';
        if (xpAwarded > 0) {
            message = `Perfect Score! First time! +${xpAwarded} EXP, +${goldAwarded} Gold!`;
        }

        return {
            success: true,
            xpAwarded,
            goldAwarded,
            message
        };
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
