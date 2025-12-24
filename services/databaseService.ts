
import { supabase, TEST_USER_ID } from './supabaseClient';
import { UserStats, Rank, DatabaseUserStats, DatabaseUserProfile } from '../types';

/**
 * Database Service for Word Warrior
 * Handles all Supabase database operations
 */

// Re-export TEST_USER_ID for convenience
export { TEST_USER_ID };

// ============================================
// USER PROFILE OPERATIONS
// ============================================

/**
 * Create a new user profile in the database
 */
export const createUserProfile = async (email: string, username: string, isAdmin: boolean = false) => {
    const { data, error } = await supabase
        .from('profiles')
        .insert([
            {
                id: TEST_USER_ID,
                email,
                username,
                is_admin: isAdmin
            }
        ])
        .select()
        .single();

    if (error) {
        console.error('Error creating user profile:', error);
        return null;
    }
    return data;
};

/**
 * Get user profile by ID
 */
export const getUserProfile = async (userId: string = TEST_USER_ID) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
    return data as DatabaseUserProfile;
};

// ============================================
// USER STATS OPERATIONS
// ============================================

/**
 * Initialize user stats with default values
 */
export const initializeUserStats = async (userId: string, initialStats: UserStats) => {
    const { data, error } = await supabase
        .from('user_stats')
        .insert([
            {
                user_id: userId,
                level: initialStats.level,
                exp: initialStats.exp,
                atk: initialStats.atk,
                def: initialStats.def,
                crit: initialStats.crit,
                hp: initialStats.hp,
                max_hp: initialStats.maxHp,
                rank: initialStats.rank,
                rank_points: initialStats.rankPoints,
                win_streak: initialStats.winStreak,
                mastered_words_count: initialStats.masteredWordsCount,
                login_days: initialStats.loginDays,
                gold: 0
            }
        ])
        .select()
        .single();

    if (error) {
        console.error('Error initializing user stats:', error);
        return null;
    }
    return data;
};

/**
 * Get user stats from database
 */
export const getUserStats = async (userId: string = TEST_USER_ID): Promise<UserStats | null> => {
    const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error('Error fetching user stats:', error);
        return null;
    }

    // Convert database format to app format
    const dbStats = data as DatabaseUserStats;
    return {
        level: dbStats.level,
        exp: dbStats.exp,
        atk: dbStats.atk,
        def: dbStats.def,
        crit: dbStats.crit,
        hp: dbStats.hp,
        maxHp: dbStats.max_hp,
        rank: dbStats.rank as Rank,
        rankPoints: dbStats.rank_points,
        winStreak: dbStats.win_streak,
        masteredWordsCount: dbStats.mastered_words_count,
        loginDays: dbStats.login_days,
        gold: dbStats.gold
    };
};

/**
 * Update user stats in database
 */
export const updateUserStats = async (userId: string = TEST_USER_ID, stats: Partial<UserStats>) => {
    const updateData: any = {};

    if (stats.level !== undefined) updateData.level = stats.level;
    if (stats.exp !== undefined) updateData.exp = stats.exp;
    if (stats.atk !== undefined) updateData.atk = stats.atk;
    if (stats.def !== undefined) updateData.def = stats.def;
    if (stats.crit !== undefined) updateData.crit = stats.crit;
    if (stats.hp !== undefined) updateData.hp = stats.hp;
    if (stats.maxHp !== undefined) updateData.max_hp = stats.maxHp;
    if (stats.rank !== undefined) updateData.rank = stats.rank;
    if (stats.rankPoints !== undefined) updateData.rank_points = stats.rankPoints;
    if (stats.winStreak !== undefined) updateData.win_streak = stats.winStreak;
    if (stats.masteredWordsCount !== undefined) updateData.mastered_words_count = stats.masteredWordsCount;
    if (stats.loginDays !== undefined) updateData.login_days = stats.loginDays;
    if (stats.gold !== undefined) updateData.gold = stats.gold;

    const { data, error } = await supabase
        .from('user_stats')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating user stats:', error);
        return null;
    }
    return data;
};

// ============================================
// MASTERED WORDS OPERATIONS
// ============================================

/**
 * Add a mastered word for a user
 */
export const addMasteredWord = async (userId: string = TEST_USER_ID, word: string) => {
    const { data, error } = await supabase
        .from('mastered_words')
        .insert([{ user_id: userId, word }])
        .select()
        .single();

    if (error) {
        // Ignore duplicate errors (word already mastered)
        if (error.code === '23505') {
            return null;
        }
        console.error('Error adding mastered word:', error);
        return null;
    }

    // Also update the count
    await supabase.rpc('increment_mastered_words_count', { user_uuid: userId });

    return data;
};

/**
 * Get all mastered words for a user
 */
export const getMasteredWords = async (userId: string = TEST_USER_ID): Promise<string[]> => {
    const { data, error } = await supabase
        .from('mastered_words')
        .select('word')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching mastered words:', error);
        return [];
    }

    return data.map(item => item.word);
};

// ============================================
// LEADERBOARD OPERATIONS
// ============================================

/**
 * Get global leaderboard sorted by rank points
 */
export const getLeaderboard = async (limit: number = 100) => {
    const { data, error } = await supabase
        .from('user_stats')
        .select(`
      *,
      profiles:user_id (
        username,
        email
      )
    `)
        .order('rank_points', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }

    return data;
};

/**
 * Get word leaderboard sorted by mastered words count
 */
export const getWordLeaderboard = async (limit: number = 100) => {
    const { data, error } = await supabase
        .from('user_stats')
        .select(`
      *,
      profiles:user_id (
        username,
        email
      )
    `)
        .order('mastered_words_count', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching word leaderboard:', error);
        return [];
    }

    return data;
};

/**
 * Update rank points for a user
 */
export const updateRankPoints = async (userId: string = TEST_USER_ID, points: number) => {
    const { data, error } = await supabase
        .from('user_stats')
        .update({ rank_points: points })
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating rank points:', error);
        return null;
    }
    return data;
};

// ============================================
// ACHIEVEMENTS OPERATIONS
// ============================================

/**
 * Unlock an achievement for a user
 */
export const unlockAchievement = async (userId: string = TEST_USER_ID, achievementId: string) => {
    const { data, error } = await supabase
        .from('achievements')
        .insert([{ user_id: userId, achievement_id: achievementId }])
        .select()
        .single();

    if (error) {
        // Ignore duplicate errors (achievement already unlocked)
        if (error.code === '23505') {
            return null;
        }
        console.error('Error unlocking achievement:', error);
        return null;
    }
    return data;
};

/**
 * Get all achievements for a user
 */
export const getUserAchievements = async (userId: string = TEST_USER_ID): Promise<string[]> => {
    const { data, error } = await supabase
        .from('achievements')
        .select('achievement_id')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching achievements:', error);
        return [];
    }

    return data.map(item => item.achievement_id);
};

// ============================================
// SYNC HELPER
// ============================================

/**
 * Sync local stats to database (debounced in practice)
 */
export const syncStatsToDatabase = async (stats: UserStats, userId: string = TEST_USER_ID) => {
    return await updateUserStats(userId, stats);
};

// ============================================
// WORD LEARNING OPERATIONS
// ============================================

/**
 * Word interface from database
 */
export interface Word {
    id: string;
    word: string;
    phonetic: string | null;
    definition: string | null;
    translation: string | null;
    pos: string | null;
    collins: number | null;
    oxford: boolean;
    tag: string | null;
    bnc: number | null;
    frq: number | null;
    exchange: string | null;
}

/**
 * User word progress interface
 */
export interface UserWordProgress {
    id: string;
    user_id: string;
    word_id: string;
    status: 'learning' | 'mastered' | 'reviewing';
    correct_count: number;
    incorrect_count: number;
    last_reviewed_at: string;
    mastered_at: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Learning stats interface
 */
export interface LearningStats {
    total_words_learned: number;
    words_learned_today: number;
    total_correct: number;
    total_incorrect: number;
    accuracy_percentage: number;
}

/**
 * Get next word for user to learn
 * Uses database function that respects frq order and excludes mastered words
 */
export const getNextWord = async (userId: string = TEST_USER_ID): Promise<Word | null> => {
    console.log('🔧 getNextWord called with userId:', userId);

    const { data, error } = await supabase
        .rpc('get_next_word_for_user', { p_user_id: userId });

    console.log('🔧 RPC response:', { data, error });

    if (error) {
        console.error('Error fetching next word:', error);
        return null;
    }

    if (!data || data.length === 0) {
        console.log('No more words to learn!');
        return null;
    }

    console.log('✅ Returning word:', data[0]);
    return data[0] as Word;
};

/**
 * Mark word as learned/practiced
 * Updates progress and marks as mastered after sufficient correct answers
 */
export const markWordProgress = async (
    userId: string = TEST_USER_ID,
    wordId: string,
    correct: boolean
): Promise<UserWordProgress | null> => {
    const { data, error } = await supabase
        .rpc('mark_word_progress', {
            p_user_id: userId,
            p_word_id: wordId,
            p_correct: correct
        });

    if (error) {
        console.error('Error marking word progress:', error);
        return null;
    }

    // Also add to mastered_words table if marked as mastered
    if (data && data.status === 'mastered') {
        const wordData = await supabase
            .from('words')
            .select('word')
            .eq('id', wordId)
            .single();

        if (wordData.data) {
            await addMasteredWord(userId, wordData.data.word);
        }
    }

    return data as UserWordProgress;
};

/**
 * Get user's learning statistics
 */
export const getUserLearningStats = async (userId: string = TEST_USER_ID): Promise<LearningStats | null> => {
    const { data, error } = await supabase
        .rpc('get_user_learning_stats', { p_user_id: userId });

    if (error) {
        console.error('Error fetching learning stats:', error);
        return null;
    }

    if (!data || data.length === 0) {
        return {
            total_words_learned: 0,
            words_learned_today: 0,
            total_correct: 0,
            total_incorrect: 0,
            accuracy_percentage: 0
        };
    }

    return data[0] as LearningStats;
};

/**
 * Get user's progress on a specific word
 */
export const getWordProgress = async (
    userId: string = TEST_USER_ID,
    wordId: string
): Promise<UserWordProgress | null> => {
    const { data, error } = await supabase
        .from('user_word_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('word_id', wordId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // No progress found - that's ok
            return null;
        }
        console.error('Error fetching word progress:', error);
        return null;
    }

    return data as UserWordProgress;
};

/**
 * Search words by prefix (for autocomplete/search features)
 */
export const searchWords = async (searchTerm: string, limit: number = 20): Promise<Word[]> => {
    const { data, error } = await supabase
        .rpc('search_words', {
            search_term: searchTerm,
            limit_count: limit
        });

    if (error) {
        console.error('Error searching words:', error);
        return [];
    }

    return (data || []) as Word[];
};


/**
 * Get batch of words for user to learn (default 10)
 */
export const getBatchWords = async (userId: string, limit: number = 10): Promise<Word[]> => {
    console.log(`🔧 getBatchWords called for user ${userId} with limit ${limit}`);

    const { data, error } = await supabase
        .rpc('get_next_words_batch', {
            p_user_id: userId,
            p_limit: limit
        });

    if (error) {
        console.error('Error fetching batch words:', error);
        return [];
    }

    console.log(`✅ Fetched ${data?.length || 0} words`);
    return (data || []) as Word[];
};

/**
 * Get random distractors for a quiz question
 */
export const getRandomDistractors = async (excludeWordId: string, limit: number = 3): Promise<Word[]> => {
    const { data, error } = await supabase
        .rpc('get_distractors', {
            p_exclude_word_id: excludeWordId,
            p_limit: limit
        });

    if (error) {
        console.error('Error fetching distractors:', error);
        return [];
    }

    return (data || []) as Word[];
};

/**
 * Generate Word Blitz questions for AI match
 * Uses database function that now filters for Collins 4-5 stars
 */
export const generateWordBlitzQuestions = async (limit: number = 10): Promise<any[]> => {
    const { data, error } = await supabase
        .rpc('generate_pvp_word_blitz_questions', {
            p_limit: limit
        });

    if (error) {
        console.error('Error generating Word Blitz questions:', error);
        return [];
    }

    return data || [];
};
