
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { WarriorState, ShopItem, UserStats } from '../types';
import { INITIAL_STATS } from '../constants.tsx';
import { supabase } from '../services/supabaseClient';
import { purchaseItem, getShopItems, getUserEquipment, purchaseEquipment, getUserStats, updateUserStats, getUserInventory, equipItem as dbEquipItem } from '../services/databaseService';

// Default State
const DEFAULT_STATE: WarriorState = {
    gold: 100,
    inventory: ['wpn_wood_sword', 'arm_leather'],
    equipped: {
        armor: 'arm_leather',
        weapon: 'wpn_wood_sword',
        shield: null
    },
    appearance: {
        skinColor: '#f5d0b0',
        hairColor: '#4a3b2a',
        hairStyle: 'default',
        eyeColor: '#000000',
        modelColor: 'blue' // Added for full body tint
    },
    unlockedColors: ['blue'], // Default unlocked color
    stats: INITIAL_STATS
};

interface WarriorContextType {
    state: WarriorState;
    addGold: (amount: number) => void;
    buyItem: (itemId: string) => Promise<boolean>; // returns success
    equipItem: (type: 'armor' | 'weapon' | 'shield', itemId: string) => void;
    updateAppearance: (updates: Partial<WarriorState['appearance']>) => void;
    getItemDetails: (itemId: string) => ShopItem | undefined;
    unlockColor: (colorId: string) => Promise<boolean>;
    shopItems: ShopItem[];
    updateStats: (updates: Partial<UserStats>) => void;
    isLoaded: boolean;
}

const WarriorContext = createContext<WarriorContextType | undefined>(undefined);

export const WarriorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const userId = user?.id;

    // We keep shopItems in a separate state reference to avoid cluttering WarriorState if not needed, 
    // but WarriorState is the main exposed object. Let's add shopItems to a separate context value? 
    // Or just fetch them and keep them in a Ref or separate State. Use separate state for clarity.
    const [shopItems, setShopItems] = useState<ShopItem[]>([]);

    // Update DEFAULT_STATE to match new types
    const [state, setState] = useState<WarriorState>(DEFAULT_STATE);
    const [loaded, setLoaded] = useState(false);

    // DB Sync Debounce for Stats
    useEffect(() => {
        if (!userId || !loaded) return;

        const timer = setTimeout(() => {
            // ONLY sync stats that are NOT managed by authoritative DB functions (RPCs)
            // managed by RPC: gold, mastered_words_count, exp, atk, def, crit
            // managed by frontend: max_hp (level up logic is currently split)
            
            // To be safe and avoid race conditions with Realtime updates, 
            // we only sync things that aren't updated rapidly via training.
            const { gold, masteredWordsCount, exp, atk, def, crit, ...rest } = state.stats;
            
            if (Object.keys(rest).length > 0) {
                updateUserStats(userId, rest);
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [state.stats, userId, loaded]);

    // Initial Data Load
    useEffect(() => {
        if (!userId) return;

        const initData = async () => {
            // 1. Load Shop Items
            const items = await getShopItems();
            setShopItems(items);

            // 2. Load User Stats (Full)
            const dbStats = await getUserStats(userId);

            // 3. Load Equipment
            const equipment = await getUserEquipment(userId);

            // 5. Load Inventory
            const inventory = await getUserInventory(userId);

            // 6. Load Settings (Avatar)
            const { data: settingsData } = await supabase
                .from('user_settings')
                .select('avatar_color')
                .eq('user_id', userId)
                .single();

            // Construct new state
            setState(prev => {
                const newEquipped = {
                    weapon: equipment?.weapon || null,
                    shield: equipment?.shield || null,
                    armor: equipment?.armor || null
                };

                return {
                    ...prev,
                    gold: dbStats?.gold ?? prev.gold,
                    stats: dbStats ? { ...INITIAL_STATS, ...dbStats } : prev.stats,
                    equipped: newEquipped,
                    inventory: inventory, // Inventory from DB
                    appearance: {
                        ...prev.appearance,
                        modelColor: settingsData?.avatar_color || prev.appearance.modelColor
                    }
                };
            });

            setLoaded(true);
        };

        initData();

        // Realtime Subscription
        const channel = supabase
            .channel(`public:user_stats:user_id=eq.${userId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'user_stats',
                filter: `user_id=eq.${userId}`
            }, (payload) => {
                if (payload.new) {
                    const db = payload.new;
                    setState(prev => ({
                        ...prev,
                        gold: db.gold,
                        stats: {
                            ...prev.stats,
                            level: db.level,
                            exp: db.exp,
                            atk: db.atk,
                            def: db.def,
                            crit: db.crit,
                            hp: db.hp,
                            maxHp: db.max_hp,
                            rank: db.rank,
                            rankPoints: db.rank_points,
                            winStreak: db.win_streak,
                            masteredWordsCount: db.mastered_words_count,
                            loginDays: db.login_days,
                            gold: db.gold
                        }
                    }));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const updateStats = (updates: Partial<UserStats>) => {
        setState(prev => ({
            ...prev,
            stats: { ...prev.stats, ...updates },
            gold: updates.gold !== undefined ? updates.gold : prev.gold // Sync root gold
        }));
    };

    const addGold = async (amount: number) => {
        // Optimistic
        updateStats({ gold: state.stats.gold + amount });
        if (userId) {
            await supabase.rpc('increment_user_gold', { x_user_id: userId, x_amount: amount });
        }
    };

    const buyItem = async (itemId: string): Promise<boolean> => {
        const item = shopItems.find(i => i.id === itemId);
        if (!item) return false;

        // Check Gold
        if (state.gold < item.price) return false;

        if (userId) {
            const result = await purchaseEquipment(userId, itemId);
            if (result.success && result.newGold !== undefined) {
                // Update local gold and inventory
                setState(prev => ({
                    ...prev,
                    gold: result.newGold!,
                    inventory: [...prev.inventory, itemId],
                    stats: { ...prev.stats, gold: result.newGold! }
                }));
                return true;
            } else {
                return false;
            }
        }
        return false;
    };

    const equipItem = async (type: 'armor' | 'weapon' | 'shield', itemId: string) => {
        if (!userId) return;

        // Call DB
        const result = await dbEquipItem(userId, itemId);
        if (result.success) {
            // Refresh Stats (including new Atk/Def/HP from DB)
            const updatedStats = await getUserStats(userId);

            // Optimistic update locally
            setState(prev => {
                const newEquipped = { ...prev.equipped, [type]: itemId };
                return {
                    ...prev,
                    equipped: newEquipped,
                    stats: updatedStats ? { ...INITIAL_STATS, ...updatedStats } : prev.stats
                };
            });
        }
    };

    const updateAppearance = (updates: Partial<WarriorState['appearance']>) => {
        setState(prev => ({
            ...prev,
            appearance: { ...prev.appearance, ...updates }
        }));
        if (updates.modelColor && userId) {
            supabase.from('user_settings').upsert({ user_id: userId, avatar_color: updates.modelColor }, { onConflict: 'user_id' });
        }
    };

    const unlockColor = async (colorId: string): Promise<boolean> => {
        if (state.unlockedColors.includes(colorId)) return true;
        const PRICE = 100;
        if (state.gold < PRICE) return false;

        if (userId) {
            const { success, newGold } = await purchaseItem(userId, PRICE); // Use generic purchase for colors
            if (success) {
                setState(prev => ({
                    ...prev,
                    gold: newGold!,
                    unlockedColors: [...prev.unlockedColors, colorId],
                    stats: { ...prev.stats, gold: newGold! }
                }));
                return true;
            }
        }
        return false;
    };

    const getItemDetails = (itemId: string) => shopItems.find(i => i.id === itemId);

    return (
        <WarriorContext.Provider value={{ state, addGold, buyItem, equipItem, updateAppearance, getItemDetails, unlockColor, shopItems, updateStats, isLoaded: loaded }}>
            {children}
        </WarriorContext.Provider>
    );
};

export const useWarrior = () => {
    const context = useContext(WarriorContext);
    if (context === undefined) {
        throw new Error('useWarrior must be used within a WarriorProvider');
    }
    return context;
};
