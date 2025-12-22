
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Coins, Lock, Check, Sword, Shield, X } from 'lucide-react';
import { useWarrior } from '../../contexts/WarriorContext';
import { SHOP_ITEMS } from '../../constants.tsx';
import { ShopItem } from '../../types';

interface ShopPanelProps {
    onClose: () => void;
}

const ShopPanel: React.FC<ShopPanelProps> = ({ onClose }) => {
    const { state, buyItem, equipItem } = useWarrior();
    const [filter, setFilter] = useState<'all' | 'weapon' | 'armor'>('all');
    const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);

    const filteredItems = SHOP_ITEMS.filter(item => filter === 'all' || item.type === filter);

    const handleBuy = (item: ShopItem) => {
        const success = buyItem(item.id);
        if (success) {
            // Auto equip? Maybe explicit equip is better.
            // But let's show success message or interactions
        }
    };

    const handleEquip = (item: ShopItem) => {
        equipItem(item.type, item.id);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-4xl ww-surface ww-modal rounded-3xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="p-6 ww-divider flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <ShoppingBag style={{ color: 'var(--ww-stroke)' }} size={24} />
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-widest ww-ink">军械库 (Armory)</h2>
                            <p className="text-[10px] ww-muted font-bold uppercase tracking-widest">Upgrade Your Gear</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 px-4 py-2 ww-pill ww-pill--accent">
                            <Coins size={16} className="text-black" />
                            <span className="text-black font-black font-mono">{state.gold} G</span>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full transition-colors ww-btn ww-btn--ink" aria-label="Close shop">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar / Filter */}
                    <div className="w-16 md:w-20 border-r border-[color:var(--ww-stroke-soft)] flex flex-col items-center py-6 gap-6">
                        <button
                            onClick={() => setFilter('all')}
                            className={`p-3 rounded-xl transition-all ${filter === 'all' ? 'ww-btn ww-btn--accent' : 'ww-btn'}`}
                        >
                            <LayoutGridIcon size={20} />
                        </button>
                        <button
                            onClick={() => setFilter('weapon')}
                            className={`p-3 rounded-xl transition-all ${filter === 'weapon' ? 'ww-btn ww-btn--accent' : 'ww-btn'}`}
                        >
                            <Sword size={20} />
                        </button>
                        <button
                            onClick={() => setFilter('armor')}
                            className={`p-3 rounded-xl transition-all ${filter === 'armor' ? 'ww-btn ww-btn--accent' : 'ww-btn'}`}
                        >
                            <Shield size={20} />
                        </button>
                    </div>

                    {/* Item Grid */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {filteredItems.map(item => {
                                const isOwned = state.inventory.includes(item.id);
                                const isEquipped = state.equipped.armor === item.id || state.equipped.weapon === item.id;
                                const canAfford = state.gold >= item.price;

                                return (
                                    <motion.div
                                        key={item.id}
                                        whileHover={{ y: -2 }}
                                        className={`relative p-4 rounded-2xl border-2 group ${isEquipped ? 'bg-[rgba(252,203,89,0.25)] border-[color:var(--ww-stroke)]' : isOwned ? 'bg-[rgba(255,255,255,0.25)] border-[color:var(--ww-stroke-soft)]' : 'bg-[rgba(255,255,255,0.12)] border-[color:var(--ww-stroke-soft)]'}`}
                                    >
                                        <div className="aspect-square mb-4 rounded-xl bg-[rgba(26,15,40,0.10)] flex items-center justify-center relative overflow-hidden border border-[color:var(--ww-stroke-soft)]">
                                            {/* Placeholder for Phaser Asset preview - using icon for now */}
                                            {item.type === 'weapon' ? <Sword size={32} className="text-[color:var(--ww-stroke)] transition-colors" /> : <Shield size={32} className="text-[color:var(--ww-stroke)] transition-colors" />}

                                            {isEquipped && (
                                                <div className="absolute top-2 right-2 ww-pill ww-pill--accent text-[10px] font-black px-2 py-0.5 uppercase">
                                                    Equipped
                                                </div>
                                            )}
                                        </div>

                                        <h3 className="font-black ww-ink text-sm">{item.name}</h3>
                                        <div className="flex gap-2 text-[10px] ww-muted mt-1 uppercase tracking-wider mb-3">
                                            {item.statBonus.atk && <span className="text-[color:var(--ww-stroke)]">+ {item.statBonus.atk} ATK</span>}
                                            {item.statBonus.def && <span className="text-[color:var(--ww-stroke)]">+ {item.statBonus.def} DEF</span>}
                                        </div>

                                        {isOwned ? (
                                            <button
                                                onClick={() => handleEquip(item)}
                                                disabled={isEquipped}
                                                className={`w-full py-2 rounded-lg text-xs transition-colors ${isEquipped ? 'ww-btn ww-btn--ink opacity-70 cursor-default' : 'ww-btn ww-btn--accent'}`}
                                            >
                                                {isEquipped ? '已装备' : '装备'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleBuy(item)}
                                                disabled={!canAfford}
                                                className={`w-full py-2 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors ${canAfford ? 'ww-btn ww-btn--accent' : 'ww-btn ww-btn--ink cursor-not-allowed'}`}
                                            >
                                                {item.price} G
                                            </button>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const LayoutGridIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="7" x="3" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="14" rx="1" />
        <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
);

export default ShopPanel;
