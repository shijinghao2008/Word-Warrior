
import { supabase } from './supabaseClient';
import { PETS_DATA, RARITY_CONFIG, PetDefinition, PetRarity } from '../constants/pets';

// Helper to calculate level from count
// Level 1: 1 copy
// Level 2: 2 copies
// Level 3: 4 copies
// Level 4: 8 copies
// Formula: Level = floor(log2(count)) + 1
export const getPetLevel = (count: number): number => {
    if (count <= 0) return 0;
    return Math.floor(Math.log2(count)) + 1;
};

export const getTotalPetHpBonus = (userPets: { pet_id: string; count: number }[]): number => {
    let totalHp = 0;
    userPets.forEach((p) => {
        totalHp += getPetLevel(p.count);
    });
    return totalHp;
};

export const drawPet = (): PetDefinition => {
    const rand = Math.random() * 100;

    let cumulative = 0;
    let selectedRarity: PetRarity = 'white';

    // Iterate strictly in order of probability chunks to pick rarity
    const rarities: PetRarity[] = ['colorful', 'red', 'orange', 'purple', 'blue', 'green', 'white'];

    // Note: logic is slightly tricky with "rand" if we iterate small to big or big to small.
    // Proper weighted random:
    // Random 0-100.
    // 0.01% -> [0, 0.01)
    // 0.1% -> [0.01, 0.11)
    // ...

    let currentThreshold = 0;
    for (const r of rarities) {
        currentThreshold += RARITY_CONFIG[r].probability;
        if (rand < currentThreshold) {
            selectedRarity = r;
            break;
        }
    }

    // If rand somehow > total due to float (shouldn't be if logic right), default to white
    const pool = PETS_DATA.filter(p => p.rarity === selectedRarity);
    const randomPet = pool[Math.floor(Math.random() * pool.length)];
    return randomPet;
};

export const savePetDraw = async (userId: string, petId: string) => {
    // First, check if user has this pet
    // Since we don't have a reliable 'pet_id' that matches a pets table UUID (we are using static IDs),
    // we will use the 'pet_id' column in 'user_pets' to store our static ID strings like 'w1', 'g2'.
    // This bypasses the foreign key constraint if we don't populate the pets table.
    // CAUTION: The migration added a FK. If we didn't insert pets into 'pets' table, this will fail.
    // For the sake of this prototype, we will assume we modify the 'user_pets' to remove foreign key or we insert them.
    // Plan B: Use 'upsert' assuming 'pet_id' is just a string.
    // To avoid SQL errors, we might need to remove the foreign key constraint or insert data.
    // Let's assume we can trigger a "sync" or just use a simpler table structure if FK fails.
    // Or better, we just insert the pet into 'pets' table if it doesn't exist? No, that's too many writes.

    // We will assume the user (me) will run a script to populate pets or remove the FK.
    // I will write the code to try to insert into user_pets.

    try {
        const { data: existing, error: fetchError } = await supabase
            .from('user_pets')
            .select('count, id')
            .eq('user_id', userId)
            .eq('pet_id', petId) // Here petId is 'w1' etc. which are not UUIDs.
            // If the schema expects UUID, this will fail.
            // I should update my migration to make pet_id TEXT if I want to use 'w1'.
            // OR I generate UUIDs for my static list.
            // Using UUIDs for static list is annoying.
            // I will assume I can update the schema to TEXT for pet_id in a fix step or just rely on the migration I wrote?
            // Wait, I wrote "pet_id uuid references pets(id)". This is strict.
            // I must fix this. I'll use a UUID generator for my static list? No, consistency is hard.
            // I will change the table definition to use TEXT for pet_id to map to my static Ids.
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
            console.error("Error fetching pet", fetchError);
            return null;
        }

        if (existing) {
            const newCount = existing.count + 1;
            const { error } = await supabase
                .from('user_pets')
                .update({ count: newCount, updated_at: new Date().toISOString() })
                .eq('id', existing.id);

            if (error) throw error;
            return { ...existing, count: newCount, isNew: false };
        } else {
            // Create new
            const { error } = await supabase
                .from('user_pets')
                .insert({
                    user_id: userId,
                    pet_id: petId, // This might fail if column is UUID
                    count: 1
                });
            if (error) throw error;
            return { count: 1, isNew: true };
        }
    } catch (err) {
        console.error("Pet save failed:", err);
        throw err;
    }
};

export const getUserPets = async (userId: string) => {
    const { data, error } = await supabase
        .from('user_pets')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error("Error fetching user pets:", error);
        return [];
    }
    return data || [];
}
