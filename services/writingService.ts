import { supabase } from './supabaseClient';
import { WritingMaterial, WritingResult } from '../types';
import { gradeWriting } from './geminiService';

export const writingService = {
    // Fetch writing materials
    async getWritingMaterials(): Promise<WritingMaterial[]> {
        const { data, error } = await supabase
            .from('writing_materials')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching writing materials:', error);
            throw error;
        }

        return data || [];
    },

    // Submit writing for grading
    async submitWriting(userId: string, material: WritingMaterial, content: string): Promise<{ success: boolean; result?: WritingResult; xpAwarded: number; goldAwarded: number; message: string }> {
        // 1. Check existing record to determine if this is a "first time > 80" event
        const { data: existing } = await supabase
            .from('user_writings')
            .select('score')
            .eq('user_id', userId)
            .eq('writing_id', material.id)
            .single();

        const previousScore = existing?.score as any;
        const previouslyPassed = previousScore && typeof previousScore.total === 'number' && previousScore.total >= 80;

        // 2. Grade with AI
        let result: WritingResult;
        try {
            result = await gradeWriting(material.title, content, material.difficulty);
        } catch (error) {
            console.error('AI Grading failed:', error);
            return { success: false, xpAwarded: 0, goldAwarded: 0, message: 'AI grading failed. Please try again.' };
        }

        // 3. Save to DB
        const { error: dbError } = await supabase
            .from('user_writings')
            .upsert({
                user_id: userId,
                writing_id: material.id,
                content: content,
                score: result.score,
                feedback: { comment: result.feedback, suggestions: result.corrections },
                created_at: new Date().toISOString()
            }, { onConflict: 'user_id,writing_id' });

        if (dbError) {
            console.error('Error saving writing:', dbError);
            return { success: false, xpAwarded: 0, goldAwarded: 0, message: 'Failed to save progress.' };
        }

        // 4. Award Rewards: 500 XP and 150 Gold on FIRST time scoring > 80
        let xpAwarded = 0;
        let goldAwarded = 0;
        const currentScore = result.score.total;

        if (currentScore >= 80 && !previouslyPassed) {
            xpAwarded = 500;
            goldAwarded = 150;

            // Increment XP
            await supabase.rpc('increment_user_exp', {
                x_user_id: userId,
                x_amount: xpAwarded
            });

            // Add Gold using RPC
            const { data: newGold, error: goldError } = await supabase.rpc('increment_user_gold', {
                x_user_id: userId,
                x_amount: goldAwarded
            });

            if (goldError) {
                console.error('Failed to increment Gold:', goldError);
            } else {
                console.log('Gold incremented successfully. New balance:', newGold);
            }
        }

        let message = 'Submitted successfully!';
        if (xpAwarded > 0) {
            message = `Amazing! First time > 80! +${xpAwarded} EXP, +${goldAwarded} Gold!`;
        }

        return {
            success: true,
            result,
            xpAwarded,
            goldAwarded,
            message
        };
    },

    async getUserCompletedWritings(userId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('user_writings')
            .select('writing_id, score')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching completed writings:', error);
            return [];
        }

        // Filter valid records: score >= 80 (matching XP award logic)
        const completed = data
            .filter(item => {
                const score = item.score as any;
                // Log for debugging
                // console.log(`Checking completion for ${item.writing_id}:`, score);
                return score && typeof score.total === 'number' && score.total >= 80;
            })
            .map(item => item.writing_id);

        console.log(`Found ${completed.length} completed writing topics for user ${userId}`);
        return completed;
    },

    async getHighScoringWritingRecords(userId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('user_writings')
            .select('writing_id, score')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching high scoring writings:', error);
            return [];
        }

        // Filter valid records client-side to ensure score check works safely
        // Check if score object exists and total >= 80
        return data
            .filter(item => {
                const score = item.score as any; // Cast to any to handle JSONB type
                return score && typeof score.total === 'number' && score.total >= 80;
            })
            .map(item => item.writing_id);
    }
};
