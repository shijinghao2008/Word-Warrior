
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { WarriorState, ShopItem } from '../types';
import { SHOP_ITEMS } from '../constants.tsx';
import { supabase } from '../services/supabaseClient';

// Default State
const DEFAULT_STATE: WarriorState = {
    gold: 100, // Initial gold bonus
    inventory: ['wpn_wood_sword', 'arm_leather'], // Starter items
    equipped: {
        armor: 'arm_leather',
        weapon: 'wpn_wood_sword'
    },
    appearance: {
        skinColor: '#f5d0b0',
        hairColor: '#4a3b2a',
        hairStyle: 'default',
        eyeColor: '#000000',
        modelColor: 'blue' // Added for full body tint
    },
    unlockedColors: ['blue'], // Default unlocked color
};

interface WarriorContextType {
    state: WarriorState;
    addGold: (amount: number) => void;
    buyItem: (itemId: string) => boolean; // returns success
    equipItem: (type: 'armor' | 'weapon', itemId: string) => void;
    updateAppearance: (updates: Partial<WarriorState['appearance']>) => void;
    getItemDetails: (itemId: string) => ShopItem | undefined;
    unlockColor: (colorId: string) => boolean;
}

const WarriorContext = createContext<WarriorContextType | undefined>(undefined);

export const WarriorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const userId = user?.id;

    const [state, setState] = useState<WarriorState>(DEFAULT_STATE);
    const [loaded, setLoaded] = useState(false);

    // 1. Realtime Gold Sync
    useEffect(() => {
        if (!userId) return;

        // Fetch initial gold separately to ensure it's authoritative
        const fetchGold = async () => {
            const { data } = await supabase
                .from('user_stats')
                .select('gold')
                .eq('user_id', userId)
                .single();
            if (data && data.gold !== undefined) {
                setState(prev => ({ ...prev, gold: data.gold }));
            }
        };
        fetchGold();

        // Subscribe to changes in user_stats for this user
        const channel = supabase
            .channel(`public:user_stats:user_id=eq.${userId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'user_stats',
                filter: `user_id=eq.${userId}`
            }, (payload) => {
                if (payload.new && payload.new.gold !== undefined) {
                    console.log('💰 Gold updated via Realtime:', payload.new.gold);
                    setState(prev => ({ ...prev, gold: payload.new.gold }));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    // 2. Load other state on mount/user change (inventory, appearance etc)
    useEffect(() => {
        if (!userId) return;
        const saved = localStorage.getItem(`ww_warrior_${userId}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge with default to ensure new fields (if schema changes) exist. 
                // Deep merge appearance to avoid overwriting new sub-fields (like modelColor) with old object.
                setState({
                    ...DEFAULT_STATE,
                    ...parsed,
                    appearance: {
                        ...DEFAULT_STATE.appearance,
                        ...(parsed.appearance || {})
                    },
                    unlockedColors: parsed.unlockedColors || DEFAULT_STATE.unlockedColors
                });
            } catch (e) {
                console.error("Failed to parse warrior state", e);
            }
        } else {
            setState(DEFAULT_STATE);
        }

        // Fetch authoritative avatar color from DB
        const syncSettings = async () => {
            try {
                const { data } = await supabase
                    .from('user_settings')
                    .select('avatar_color')
                    .eq('user_id', userId)
                    .single();

                if (data?.avatar_color) {
                    setState(prev => ({
                        ...prev,
                        appearance: {
                            ...prev.appearance,
                            modelColor: data.avatar_color
                        }
                    }));
                }
            } catch (err) {
                console.error("Failed to sync user settings", err);
            }
        };

        syncSettings();
        setLoaded(true);
    }, [userId]);

    // Save state on change
    useEffect(() => {
        if (!userId || !loaded) return;
        localStorage.setItem(`ww_warrior_${userId}`, JSON.stringify(state));
    }, [state, userId, loaded]);

    const addGold = async (amount: number) => {
        setState(prev => ({ ...prev, gold: prev.gold + amount }));

        if (userId) {
            const { error } = await supabase.rpc('increment_user_gold', { 
                x_user_id: userId, 
                x_amount: amount 
            });
            if (error) console.error("Failed to sync gold to DB:", error);
        }
    };

    const buyItem = (itemId: string): boolean => {
        if (state.inventory.includes(itemId)) return false; // Already owned

        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return false;

        if (state.gold >= item.price) {
            setState(prev => ({
                ...prev,
                gold: prev.gold - item.price,
                inventory: [...prev.inventory, itemId]
            }));

            // Sync to DB
            if (userId) {
                supabase.rpc('increment_user_gold', { 
                    x_user_id: userId, 
                    x_amount: -item.price 
                }).catch(err => console.error("Failed to sync purchase to DB:", err));
            }
            return true;
        }
        return false;
    };

    const equipItem = (type: 'armor' | 'weapon', itemId: string) => {
        if (!state.inventory.includes(itemId)) return;
        setState(prev => ({
            ...prev,
            equipped: { ...prev.equipped, [type]: itemId }
        }));
    };

    const updateAppearance = (updates: Partial<WarriorState['appearance']>) => {
        setState(prev => ({
            ...prev,
            appearance: { ...prev.appearance, ...updates }
        }));

        // Sync modelColor to DB
        if (updates.modelColor && userId) {
            supabase.from('user_settings')
                .upsert({ user_id: userId, avatar_color: updates.modelColor }, { onConflict: 'user_id' })
                .then(({ error }) => {
                    if (error) console.error("Failed to save avatar color", error);
                });
        }
    };

    const unlockColor = (colorId: string): boolean => {
        if (state.unlockedColors.includes(colorId)) return true; // Already unlocked

        if (state.gold >= 100) {
            setState(prev => ({
                ...prev,
                gold: prev.gold - 100,
                unlockedColors: [...prev.unlockedColors, colorId]
            }));

            // Sync to DB
            if (userId) {
                supabase.rpc('increment_user_gold', { 
                    x_user_id: userId, 
                    x_amount: -100 
                }).catch(err => console.error("Failed to sync color unlock to DB:", err));
            }
            return true;
        }
        return false;
    };

    const getItemDetails = (itemId: string) => SHOP_ITEMS.find(i => i.id === itemId);

    return (
        <WarriorContext.Provider value={{ state, addGold, buyItem, equipItem, updateAppearance, getItemDetails, unlockColor }}>
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
