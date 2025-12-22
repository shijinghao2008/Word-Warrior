import React from 'react';
import { ListeningMaterial } from '../../types';
import { Headphones, Activity, CheckCircle, Music } from 'lucide-react';
import { motion } from 'framer-motion';

interface ListeningListProps {
    materials: ListeningMaterial[];
    onSelect: (material: ListeningMaterial) => void;
    completedIds?: Set<string>;
}

const ListeningList: React.FC<ListeningListProps> = ({ materials, onSelect, completedIds = new Set() }) => {
    const [selectedLevel, setSelectedLevel] = React.useState<string>('All');

    // Filter by level (Primary, etc. - based on CSV "level" field which we defaulted to 'Primary' but maybe user uses others)
    // The CSV import script set level to 'Primary'.
    // Let's assume levels might vary or just show 'Primary' for now.
    const filteredMaterials = materials.filter(material => {
        if (selectedLevel === 'All') return true;
        return material.level === selectedLevel;
    });

    const levels = ['All', 'Primary', 'Middle', 'High']; // Adjust based on actual data

    if (materials.length === 0) {
        return (
            <div className="text-center p-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 ww-pill" style={{ background: 'rgba(255,255,255,0.25)' }}>
                    <Headphones className="w-5 h-5" style={{ color: 'var(--ww-stroke)' }} />
                    <p className="text-[10px] font-black uppercase tracking-widest ww-muted">暂无听力材料</p>
                </div>
            </div>
        );
    }

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'Primary': return 'text-green-500 bg-green-500/10 border-green-500/20';
            case 'Middle': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            case 'High': return 'text-red-500 bg-red-500/10 border-red-500/20';
            default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
        }
    };

    return (
        <div className="space-y-6">
            {/* Filter Controls - keeping it simple for now */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {levels.map((lvl) => (
                    <button
                        key={lvl}
                        onClick={() => setSelectedLevel(lvl)}
                        className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${selectedLevel === lvl
                            ? 'bg-[rgba(252,203,89,0.95)] text-black border-[color:var(--ww-stroke)]'
                            : 'bg-[rgba(255,255,255,0.20)] text-[rgba(26,15,40,0.75)] border-[color:var(--ww-stroke-soft)]'
                            }`}
                    >
                        {lvl === 'All' ? '全部' : lvl}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMaterials.map((material, index) => (
                    <motion.div
                        key={material.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => onSelect(material)}
                        className="ww-surface ww-surface--soft group relative overflow-hidden rounded-[22px] p-6 cursor-pointer transition-transform"
                        style={{ boxShadow: '0 14px 26px rgba(0,0,0,0.16)' }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2"
                                style={{ borderColor: 'rgba(43,23,63,0.22)', background: 'rgba(255,255,255,0.25)', color: 'rgba(26,15,40,0.75)' }}
                            >
                                {material.level || 'Primary'}
                            </span>
                        </div>

                        <h3 className="text-lg font-black ww-ink mb-2 flex items-center gap-2">
                            {material.title}
                            {completedIds.has(material.id) && (
                                <CheckCircle className="w-5 h-5" style={{ color: 'rgba(16,185,129,0.95)' }} />
                            )}
                        </h3>

                        <div className="flex items-center gap-4 text-[10px] ww-muted border-t pt-4 mt-auto"
                            style={{ borderColor: 'rgba(43,23,63,0.16)' }}
                        >
                            <div className="flex items-center gap-1.5">
                                <Activity className="w-4 h-4" style={{ color: 'var(--ww-stroke)' }} />
                                <span>{material.questions?.length || 0} 题</span>
                            </div>
                            {material.audio_url && (
                                <div className="flex items-center gap-1.5">
                                    <Music className="w-4 h-4" style={{ color: 'var(--ww-stroke)' }} />
                                    <span>含音频</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default ListeningList;
