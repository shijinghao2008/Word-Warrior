
import React from 'react';
import { Palette, User } from 'lucide-react';
import { useWarrior } from '../../contexts/WarriorContext';
import WarriorPreview from '../Warrior/WarriorPreview';

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
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</span>
            <div className="flex flex-wrap gap-2">
                {options.map((c: string) => (
                    <button
                        key={c}
                        onClick={() => onChange(c)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${current === c ? 'border-white ring-2 ring-indigo-500 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>
        </div>
    );

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-6 flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/2 h-[300px] border border-slate-700 rounded-2xl bg-black/20 relative">
                <WarriorPreview
                    skinColor={state.appearance.skinColor}
                    hairColor={state.appearance.hairColor}
                    armorId={state.equipped.armor || 'default'}
                    weaponId={state.equipped.weapon || 'default'}
                />
            </div>

            <div className="w-full md:w-1/2 space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                        <Palette size={16} className="text-indigo-500" />
                        外观定制
                    </h3>
                </div>

                <div className="space-y-6">
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
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hair Style</span>
                        <div className="grid grid-cols-2 gap-2">
                            {HAIR_STYLES.map(style => (
                                <button
                                    key={style}
                                    onClick={() => updateAppearance({ hairStyle: style as any })}
                                    className={`py-2 rounded-lg text-xs font-bold uppercase transition-colors ${state.appearance.hairStyle === style
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                                        }`}
                                >
                                    {style}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomizerPanel;
