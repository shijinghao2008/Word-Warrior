import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { BattleStats, RankTier, UserProfile } from '../types.js';

const supabase: SupabaseClient | null = config.supabaseUrl && config.supabaseServiceKey
  ? createClient(config.supabaseUrl, config.supabaseServiceKey)
  : null;

const defaultStats: BattleStats = {
  level: 1,
  exp: 0,
  atk: 10,
  def: 10,
  crit: 0.05,
  hp: 100,
  maxHp: 100,
  rankPoints: 0,
  rank: RankTier.BRONZE,
  winStreak: 0,
};

const localStore = new Map<string, UserProfile>();

export const getUser = async (userId: string): Promise<UserProfile> => {
  const cached = localStore.get(userId);
  if (cached) return cached;

  if (supabase) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    const profile: UserProfile = {
      id: data.id,
      email: data.email,
      isAdmin: data.is_admin,
      banned: data.banned ?? false,
      stats: data.stats ?? defaultStats,
    };
    localStore.set(userId, profile);
    return profile;
  }

  const mockProfile: UserProfile = {
    id: userId,
    email: `${userId}@demo.cn`,
    isAdmin: userId === 'admin',
    banned: false,
    stats: { ...defaultStats },
  };
  localStore.set(userId, mockProfile);
  return mockProfile;
};

export const saveUser = async (profile: UserProfile) => {
  localStore.set(profile.id, profile);
  if (supabase) {
    await supabase.from('profiles').upsert({
      id: profile.id,
      email: profile.email,
      is_admin: profile.isAdmin,
      banned: profile.banned,
      stats: profile.stats,
    });
  }
  return profile;
};

export const listUsers = async () => {
  if (supabase) {
    const { data, error } = await supabase.from('profiles').select('id,email,is_admin,banned,stats');
    if (error) throw error;
    return data.map((row) => ({
      id: row.id,
      email: row.email,
      isAdmin: row.is_admin,
      banned: row.banned ?? false,
      stats: row.stats ?? defaultStats,
    })) as UserProfile[];
  }
  return Array.from(localStore.values());
};

export const banUser = async (userId: string, banned: boolean) => {
  const profile = await getUser(userId);
  profile.banned = banned;
  return saveUser(profile);
};

export const updateUserStats = async (userId: string, update: Partial<BattleStats>) => {
  const profile = await getUser(userId);
  profile.stats = { ...profile.stats, ...update };
  return saveUser(profile);
};
