import React from 'react';
import { motion } from 'framer-motion';
import { Palette, X, Check, Coins } from 'lucide-react';
import { useWarrior } from '../../contexts/WarriorContext';
import WarriorPreview from '../Warrior/WarriorPreview';

interface CustomizerPanelProps {
    onClose: () => void;
}

const MODEL_COLORS = [
    { id: 'blue', color: '#60a5fa', label: '经典蓝' },
    { id: 'red', color: '#f87171', label: '赤红' },
    { id: 'yellow', color: '#facc15', label: '金黄' },
    { id: 'purple', color: '#c084fc', label: '神秘紫' },
    { id: 'black', color: '#334155', label: '暗影黑' },
];

const CustomizerPanel: React.FC<CustomizerPanelProps> = ({ onClose }) => {
    const { state, updateAppearance } = useWarrior();

    const handleColorSelect = (colorId: string) => {
        updateAppearance({ modelColor: colorId } as any);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-4xl max-h-[85vh] ww-surface ww-modal rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            >
                {/* Header */}
                <div className="p-6 ww-divider flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Palette style={{ color: 'var(--ww-stroke)' }} size={24} />
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-widest ww-ink">外观定制</h2>
                            <p className="text-[10px] ww-muted font-bold uppercase tracking-widest">Customize Your Look</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Gold Display */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-300">
                            <Coins size={16} className="text-amber-600" />
                            <span className="text-sm font-black text-amber-800 tabular-nums">{state.gold}</span>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full transition-colors ww-btn ww-btn--ink" aria-label="Close customizer">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row p-6 gap-8 overflow-hidden h-full">
                    {/* Preview Area */}
                    <div className="w-full md:w-1/3 md:h-auto basis-1/3 rounded-2xl bg-[rgba(26,15,40,0.05)] border-2 border-[color:var(--ww-stroke-soft)] relative overflow-hidden flex items-center justify-center min-h-[180px] md:min-h-[300px]">
                        <div className="scale-75 md:scale-100">
                            <WarriorPreview
                                skinColor={state.appearance.skinColor}
                                hairColor={state.appearance.hairColor}
                                armorId={state.equipped.armor || 'default'}
                                weaponId={state.equipped.weapon || 'default'}
                                modelColor={(state.appearance as any).modelColor}
                            />
                        </div>

                        <div className="absolute bottom-4 left-0 right-0 text-center">
                            <span className="ww-pill ww-pill--accent text-[10px] font-black px-3 py-1 uppercase tracking-widest">
                                实时预览
                            </span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="w-full md:w-2/3 md:h-auto basis-2/3 flex flex-col gap-6 overflow-hidden">
                        <div className="space-y-4 flex flex-col h-full overflow-hidden">
                            <h3 className="text-sm font-black ww-ink uppercase tracking-wider flex items-center gap-2 shrink-0">
                                <span className="w-1 h-4 bg-[color:var(--ww-brand)] rounded-full"></span>
                                选择配色主题
                            </h3>

                            <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                                {MODEL_COLORS.map(opt => {
                                    const isSelected = (state.appearance as any).modelColor === opt.id || (!(state.appearance as any).modelColor && opt.id === 'blue');

                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => handleColorSelect(opt.id)}
                                            className={`
                                                relative p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between group shrink-0
                                                ${isSelected
                                                    ? 'bg-[rgba(252,203,89,0.15)] border-[color:var(--ww-brand)] shadow-sm'
                                                    : 'bg-white/5 border-[color:var(--ww-stroke-soft)] hover:border-[color:var(--ww-stroke)] hover:bg-white/10'}
                                            `}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`w-8 h-8 rounded-full border-2 shadow-sm flex items-center justify-center transition-transform group-hover:scale-110
                                                        ${isSelected ? 'border-[color:var(--ww-brand)]' : 'border-transparent'}
                                                    `}
                                                    style={{ backgroundColor: opt.color }}
                                                >
                                                    {isSelected && <Check size={14} className="text-white drop-shadow-md" strokeWidth={4} />}
                                                </div>
                                                <div>
                                                    <span className={`text-sm font-black uppercase tracking-wide block ${isSelected ? 'ww-ink' : 'text-[color:var(--ww-muted)]'}`}>
                                                        {opt.label}
                                                    </span>
                                                </div>
                                            </div>

                                            {isSelected && (
                                                <div className="w-2 h-2 rounded-full bg-[color:var(--ww-brand)]"></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-auto p-4 rounded-xl bg-[rgba(26,15,40,0.03)] border border-[color:var(--ww-stroke-soft)]">
                            <p className="text-[11px] ww-muted font-bold leading-relaxed">
                                注意：选定的配色主题将应用于您的角色外观，并在对战中对所有玩家可见。
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default CustomizerPanel;
