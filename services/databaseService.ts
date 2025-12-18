
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
                login_days: initialStats.loginDays
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
        loginDays: dbStats.login_days
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
