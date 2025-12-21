
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { WarriorState, ShopItem } from '../types';
import { SHOP_ITEMS } from '../constants.tsx';

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
        eyeColor: '#000000'
    }
};

interface WarriorContextType {
    state: WarriorState;
    addGold: (amount: number) => void;
    buyItem: (itemId: string) => boolean; // returns success
    equipItem: (type: 'armor' | 'weapon', itemId: string) => void;
    updateAppearance: (updates: Partial<WarriorState['appearance']>) => void;
    getItemDetails: (itemId: string) => ShopItem | undefined;
}

const WarriorContext = createContext<WarriorContextType | undefined>(undefined);

export const WarriorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const userId = user?.id;

    const [state, setState] = useState<WarriorState>(DEFAULT_STATE);
    const [loaded, setLoaded] = useState(false);

    // Load state on mount/user change
    useEffect(() => {
        if (!userId) return;
        const saved = localStorage.getItem(`ww_warrior_${userId}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge with default to ensure new fields (if schema changes) exist
                setState({ ...DEFAULT_STATE, ...parsed });
            } catch (e) {
                console.error("Failed to parse warrior state", e);
            }
        } else {
            setState(DEFAULT_STATE);
        }
        setLoaded(true);
    }, [userId]);

    // Save state on change
    useEffect(() => {
        if (!userId || !loaded) return;
        localStorage.setItem(`ww_warrior_${userId}`, JSON.stringify(state));
    }, [state, userId, loaded]);

    const addGold = (amount: number) => {
        setState(prev => ({ ...prev, gold: prev.gold + amount }));
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
    };

    const getItemDetails = (itemId: string) => SHOP_ITEMS.find(i => i.id === itemId);

    return (
        <WarriorContext.Provider value={{ state, addGold, buyItem, equipItem, updateAppearance, getItemDetails }}>
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
