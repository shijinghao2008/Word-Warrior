import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Coins, Lock, Check, Sword, Shield, X, LayoutGrid } from 'lucide-react';
import { useWarrior } from '../../contexts/WarriorContext';
import { SHOP_ITEMS } from '../../constants.tsx';
import { ShopItem } from '../../types';
import { PixelCard, PixelButton, PixelBadge } from '../ui/PixelComponents';

interface ShopPanelProps {
    onClose: () => void;
}

const ShopPanel: React.FC<ShopPanelProps> = ({ onClose }) => {
    const { state, buyItem, equipItem } = useWarrior();
    const [filter, setFilter] = useState<'all' | 'weapon' | 'armor'>('all');

    const filteredItems = SHOP_ITEMS.filter(item => filter === 'all' || item.type === filter);

    const handleBuy = (item: ShopItem) => {
        buyItem(item.id);
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
                className="w-full max-w-4xl max-h-[90vh] flex flex-col pointer-events-auto"
            >
                <PixelCard variant="dark" className="p-0 flex flex-col h-full overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">

                    {/* Header */}
                    <div className="p-4 md:p-6 border-b-4 border-black bg-slate-900 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-600 border-4 border-black flex items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]">
                                <ShoppingBag className="text-white" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-white">THE ARMORY</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Equip Yourself for Battle</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <PixelCard variant="secondary" noBorder className="px-3 py-1 flex items-center gap-2 border-2 border-slate-700 bg-slate-800">
                                <Coins size={16} className="text-amber-400" />
                                <span className="text-amber-400 font-bold font-mono text-sm">{state.gold} G</span>
                            </PixelCard>
                            <PixelButton size="sm" variant="danger" onClick={onClose} className="!p-2">
                                <X size={20} />
                            </PixelButton>
                        </div>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {/* Sidebar / Filter */}
                        <div className="w-20 md:w-24 border-r-4 border-black bg-slate-950 flex flex-col items-center py-6 gap-4">
                            <PixelButton
                                size="sm"
                                variant={filter === 'all' ? 'primary' : 'neutral'}
                                onClick={() => setFilter('all')}
                                className="!p-3"
                            >
                                <LayoutGrid size={20} />
                            </PixelButton>
                            <PixelButton
                                size="sm"
                                variant={filter === 'weapon' ? 'primary' : 'neutral'}
                                onClick={() => setFilter('weapon')}
                                className="!p-3"
                            >
                                <Sword size={20} />
                            </PixelButton>
                            <PixelButton
                                size="sm"
                                variant={filter === 'armor' ? 'primary' : 'neutral'}
                                onClick={() => setFilter('armor')}
                                className="!p-3"
                            >
                                <Shield size={20} />
                            </PixelButton>
                        </div>

                        {/* Item Grid */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50 custom-scrollbar">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                {filteredItems.map(item => {
                                    const isOwned = state.inventory.includes(item.id);
                                    const isEquipped = state.equipped.armor === item.id || state.equipped.weapon === item.id;
                                    const canAfford = state.gold >= item.price;

                                    return (
                                        <PixelCard
                                            key={item.id}
                                            variant="secondary"
                                            className={`p-4 flex flex-col gap-3 group transition-transform hover:-translate-y-1 ${isEquipped ? 'border-amber-500 shadow-[4px_4px_0_0_#b45309]' : ''}`}
                                        >
                                            <div className="aspect-square bg-slate-900 border-4 border-black/20 flex items-center justify-center relative overflow-hidden group-hover:border-indigo-500/30 transition-colors">
                                                {item.type === 'weapon' ? (
                                                    <Sword size={48} className="text-slate-700 group-hover:text-indigo-400 transition-colors duration-300" />
                                                ) : (
                                                    <Shield size={48} className="text-slate-700 group-hover:text-indigo-400 transition-colors duration-300" />
                                                )}

                                                {isEquipped && (
                                                    <div className="absolute top-0 right-0 bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 border-l-2 border-b-2 border-black">
                                                        EQUIPPED
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-900 text-sm uppercase leading-tight mb-1">{item.name}</h3>
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                    {item.statBonus.atk && <span className="text-[9px] font-black bg-slate-200 px-1 text-slate-600">+ATK {item.statBonus.atk}</span>}
                                                    {item.statBonus.def && <span className="text-[9px] font-black bg-slate-200 px-1 text-slate-600">+DEF {item.statBonus.def}</span>}
                                                </div>
                                            </div>

                                            {isOwned ? (
                                                <PixelButton
                                                    size="sm"
                                                    fullWidth
                                                    variant={isEquipped ? 'neutral' : 'primary'}
                                                    onClick={() => handleEquip(item)}
                                                    disabled={isEquipped}
                                                >
                                                    {isEquipped ? 'EQUIPPED' : 'EQUIP'}
                                                </PixelButton>
                                            ) : (
                                                <PixelButton
                                                    size="sm"
                                                    fullWidth
                                                    variant={canAfford ? 'success' : 'neutral'}
                                                    onClick={() => handleBuy(item)}
                                                    disabled={!canAfford}
                                                >
                                                    <div className="flex items-center justify-center gap-1">
                                                        <span>{item.price}</span>
                                                        <Coins size={12} className={canAfford ? "text-white" : "text-slate-400"} />
                                                    </div>
                                                </PixelButton>
                                            )}
                                        </PixelCard>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </PixelCard>
            </motion.div>
        </div>
    );
};

export default ShopPanel;
