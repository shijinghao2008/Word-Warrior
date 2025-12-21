
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
                className="w-full max-w-4xl bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-indigo-500/20 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <ShoppingBag className="text-indigo-400" size={24} />
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-widest text-white">军械库 (Armory)</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Upgrade Your Gear</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-full border border-amber-500/30">
                            <Coins size={16} className="text-amber-400" />
                            <span className="text-amber-400 font-bold font-mono">{state.gold} G</span>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar / Filter */}
                    <div className="w-16 md:w-20 border-r border-indigo-500/10 bg-slate-950/50 flex flex-col items-center py-6 gap-6">
                        <button
                            onClick={() => setFilter('all')}
                            className={`p-3 rounded-xl transition-all ${filter === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:bg-white/5'}`}
                        >
                            <LayoutGridIcon size={20} />
                        </button>
                        <button
                            onClick={() => setFilter('weapon')}
                            className={`p-3 rounded-xl transition-all ${filter === 'weapon' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:bg-white/5'}`}
                        >
                            <Sword size={20} />
                        </button>
                        <button
                            onClick={() => setFilter('armor')}
                            className={`p-3 rounded-xl transition-all ${filter === 'armor' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:bg-white/5'}`}
                        >
                            <Shield size={20} />
                        </button>
                    </div>

                    {/* Item Grid */}
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-900/30">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {filteredItems.map(item => {
                                const isOwned = state.inventory.includes(item.id);
                                const isEquipped = state.equipped.armor === item.id || state.equipped.weapon === item.id;
                                const canAfford = state.gold >= item.price;

                                return (
                                    <motion.div
                                        key={item.id}
                                        whileHover={{ y: -2 }}
                                        className={`relative p-4 rounded-2xl border ${isEquipped ? 'border-amber-500 bg-amber-500/5' : isOwned ? 'border-indigo-500/30 bg-slate-800/50' : 'border-slate-800 bg-slate-900'} group`}
                                    >
                                        <div className="aspect-square mb-4 rounded-xl bg-slate-950/50 flex items-center justify-center relative overflow-hidden">
                                            {/* Placeholder for Phaser Asset preview - using icon for now */}
                                            {item.type === 'weapon' ? <Sword size={32} className="text-slate-600 group-hover:text-indigo-400 transition-colors" /> : <Shield size={32} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />}

                                            {isEquipped && (
                                                <div className="absolute top-2 right-2 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                                    Equipped
                                                </div>
                                            )}
                                        </div>

                                        <h3 className="font-bold text-slate-200 text-sm">{item.name}</h3>
                                        <div className="flex gap-2 text-[10px] text-slate-500 mt-1 uppercase tracking-wider mb-3">
                                            {item.statBonus.atk && <span className="text-red-400">+ {item.statBonus.atk} ATK</span>}
                                            {item.statBonus.def && <span className="text-blue-400">+ {item.statBonus.def} DEF</span>}
                                        </div>

                                        {isOwned ? (
                                            <button
                                                onClick={() => handleEquip(item)}
                                                disabled={isEquipped}
                                                className={`w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${isEquipped
                                                    ? 'bg-slate-800 text-slate-500 cursor-default'
                                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/50'
                                                    }`}
                                            >
                                                {isEquipped ? '已装备' : '装备'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleBuy(item)}
                                                disabled={!canAfford}
                                                className={`w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${canAfford
                                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50'
                                                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                                    }`}
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
