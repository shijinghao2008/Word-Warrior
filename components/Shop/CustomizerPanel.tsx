import React from 'react';
import { Palette, User, X } from 'lucide-react';
import { useWarrior } from '../../contexts/WarriorContext';
import WarriorPreview from '../Warrior/WarriorPreview';
import { PixelCard, PixelButton } from '../ui/PixelComponents';

interface CustomizerPanelProps {
    onClose: () => void;
}

const COLORS = {
    skin: ['#f5d0b0', '#e0ac69', '#8d5524', '#523318', '#ffdbac'],
    hair: ['#000000', '#4a3b2a', '#e6cea0', '#a52a2a', '#ffffff', '#666666'],
    eyes: ['#000000', '#634e34', '#2e536f', '#3d6e3d', '#763c3c']
};

const HAIR_STYLES = ['default', 'messy', 'topknot', 'bald'];

const CustomizerPanel: React.FC<CustomizerPanelProps> = ({ onClose }) => {
    const { state, updateAppearance } = useWarrior();

    const ColorPicker = ({ label, options, current, onChange }: any) => (
        <div className="space-y-3">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-1 inline-block border-2 border-slate-300 dark:border-slate-700">
                {label}
            </span>
            <div className="flex flex-wrap gap-3">
                {options.map((c: string) => (
                    <button
                        key={c}
                        onClick={() => onChange(c)}
                        className={`
                            w-8 h-8 md:w-10 md:h-10 
                            border-4 
                            transition-transform hover:scale-110 active:scale-95
                            shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]
                            ${current === c ? 'border-white ring-2 ring-indigo-500 scale-110 z-10' : 'border-black'}
                        `}
                        style={{ backgroundColor: c }}
                        aria-label={`Select color ${c}`}
                    />
                ))}
            </div>
        </div>
    );

    return (
        <PixelCard variant="paper" className="w-[95%] max-w-4xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-slate-900 border-b-4 border-black shrink-0">
                <h3 className="text-lg font-black uppercase tracking-widest text-white flex items-center gap-2">
                    <Palette size={20} className="text-indigo-400" />
                    HERO CUSTOMIZER
                </h3>
                <PixelButton size="sm" variant="danger" onClick={onClose} className="!p-2">
                    <X size={16} />
                </PixelButton>
            </div>

            <div className="p-6 flex flex-col md:flex-row gap-8 overflow-y-auto">
                {/* Preview Section */}
                <div className="w-full md:w-1/2 flex flex-col gap-4 shrink-0">
                    <div className="aspect-[3/4] w-full border-4 border-black bg-[#444] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-20" style={{
                            backgroundImage: 'radial-gradient(#fff 2px, transparent 2px)',
                            backgroundSize: '16px 16px'
                        }} />

                        <div className="absolute inset-4 top-8 bottom-8">
                            <WarriorPreview
                                skinColor={state.appearance.skinColor}
                                hairColor={state.appearance.hairColor}
                                armorId={state.equipped.armor || 'default'}
                                weaponId={state.equipped.weapon || 'default'}
                            />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Live Preview</p>
                    </div>
                </div>

                {/* Controls Section */}
                <div className="w-full md:w-1/2 space-y-8">
                    <ColorPicker
                        label="Skin Tone"
                        options={COLORS.skin}
                        current={state.appearance.skinColor}
                        onChange={(c: string) => updateAppearance({ skinColor: c })}
                    />

                    <ColorPicker
                        label="Hair Color"
                        options={COLORS.hair}
                        current={state.appearance.hairColor}
                        onChange={(c: string) => updateAppearance({ hairColor: c })}
                    />

                    <ColorPicker
                        label="Eye Color"
                        options={COLORS.eyes}
                        current={state.appearance.eyeColor}
                        onChange={(c: string) => updateAppearance({ eyeColor: c })}
                    />

                    <div className="space-y-3">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-1 inline-block border-2 border-slate-300 dark:border-slate-700">
                            Hair Style
                        </span>
                        <div className="grid grid-cols-2 gap-3">
                            {HAIR_STYLES.map(style => (
                                <PixelButton
                                    key={style}
                                    variant={state.appearance.hairStyle === style ? 'primary' : 'neutral'}
                                    onClick={() => updateAppearance({ hairStyle: style as any })}
                                    className="text-xs"
                                >
                                    {style}
                                </PixelButton>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </PixelCard>
    );
};

export default CustomizerPanel;
