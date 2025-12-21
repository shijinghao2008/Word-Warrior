import { supabase } from './supabaseClient';
import { ListeningMaterial } from '../types';

export const listeningService = {
    // Fetch all listening materials
    // includeNoAudio: if true, returns all items (for Admin). If false (default), returns only items with audio (for Training).
    async getListeningMaterials(includeNoAudio: boolean = false): Promise<ListeningMaterial[]> {
        let query = supabase
            .from('listening_materials')
            .select('*')
            .order('created_at', { ascending: false });

        if (!includeNoAudio) {
            query = query.not('audio_url', 'is', null);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching listening materials:', error);
            throw error;
        }

        return data || [];
    },

    // Fetch a single listening material by ID
    async getListeningMaterialById(id: string): Promise<ListeningMaterial | null> {
        const { data, error } = await supabase
            .from('listening_materials')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error(`Error fetching listening material with id ${id}:`, error);
            throw error;
        }

        return data;
    },

    // Record listening completion and award XP
    async completeListening(userId: string, materialId: string, score: number): Promise<{ success: boolean; xpAwarded: number; message: string }> {
        // 1. Check if already completed
        const { data: existing } = await supabase
            .from('user_listening_progress')
            .select('id')
            .eq('user_id', userId)
            .eq('material_id', materialId)
            .single();

        if (existing) {
            return { success: false, xpAwarded: 0, message: 'You have already completed this listening exercise.' };
        }

        // 2. Insert record
        const { error: insertError } = await supabase
            .from('user_listening_progress')
            .insert({
                user_id: userId,
                material_id: materialId,
                score: score,
                completed_at: new Date().toISOString()
            });

        if (insertError) {
            // Check for duplicate key error just in case race condition
            if (insertError.code === '23505') {
                return { success: false, xpAwarded: 0, message: 'You have already completed this listening exercise.' };
            }
            console.error('Error recording listening progress:', insertError);
            throw insertError;
        }

        // 3. Award XP if score is perfect (assuming 4 questions like reading) or high enough
        // Awarding 20 XP as per "ListeningTraining" original logic (or similar)
        // Adjusting to Reading logic: 10 XP for full score? User didn't specify XP amount, but original Reading gives 10.
        // Let's go with 20 XP for Listening as it is harder.
        if (score >= 4) {
            const xpAmount = 20;
            const { error: xpError } = await supabase.rpc('increment_user_exp', {
                x_user_id: userId,
                x_amount: xpAmount
            });

            if (xpError) {
                console.error('Error awarding XP:', xpError);
                return { success: true, xpAwarded: 0, message: 'Exercise completed, but failed to update XP.' };
            }

            return { success: true, xpAwarded: xpAmount, message: `Excellent! +${xpAmount} EXP` };
        }

        return { success: true, xpAwarded: 0, message: 'Exercise completed!' };
    },

    // Get list of completed material IDs for a user
    async getUserCompletedListening(userId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('user_listening_progress')
            .select('material_id')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching completed listening:', error);
            return [];
        }

        return data.map(item => item.material_id);
    },

    // ==========================================
    // ADMIN FUNCTIONS
    // ==========================================

    // Create or Update Listening Material
    async upsertListeningMaterial(material: Partial<ListeningMaterial>): Promise<ListeningMaterial | null> {
        // Prepare data for insertion/update
        const dataToSave = {
            title: material.title,
            content: material.content,
            questions: material.questions,
            level: material.level || 'Beginner', // Default if missing
            audio_url: material.audio_url
        };

        let query = supabase.from('listening_materials');

        if (material.id) {
            // Update
            const { data, error } = await query
                .update(dataToSave)
                .eq('id', material.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // Insert
            const { data, error } = await query
                .insert([dataToSave])
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    },

    // Delete Listening Material
    async deleteListeningMaterial(id: string, audioUrl?: string | null): Promise<void> {
        // 1. Delete from database
        const { error } = await supabase
            .from('listening_materials')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting listening material:', error);
            throw error;
        }

        // 2. Delete audio file if exists
        if (audioUrl) {
            try {
                // Extract path from URL. URL format: .../storage/v1/object/public/Listening%20Audio/filename.mp3
                // We need 'filename.mp3' (or path/to/file).
                const urlParts = audioUrl.split('Listening%20Audio/');
                if (urlParts.length === 2) {
                    const filePath = decodeURIComponent(urlParts[1]);
                    const { error: storageError } = await supabase
                        .storage
                        .from('Listening Audio') // Use the correct bucket name "Listening Audio"
                        .remove([filePath]);

                    if (storageError) {
                        console.error('Error deleting audio file from storage:', storageError);
                        // We don't throw here to avoid blocking the UI update since DB delete succeeded
                    }
                }
            } catch (e) {
                console.error('Error parsing audio URL for deletion:', e);
            }
        }
    },

    // Upload Audio File
    async uploadListeningAudio(file: File): Promise<string> {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase
            .storage
            .from('Listening Audio') // Use the correct bucket name "Listening Audio"
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error uploading audio:', uploadError);
            throw uploadError;
        }

        const { data } = supabase
            .storage
            .from('Listening Audio')
            .getPublicUrl(filePath);

        return data.publicUrl;
    }
};
