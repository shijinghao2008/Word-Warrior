import React from 'react';
import { ReadingMaterial } from '../../types';
import { BookOpen, Brain, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReadingListProps {
    materials: ReadingMaterial[];
    onSelect: (material: ReadingMaterial) => void;
    completedIds?: Set<string>;
}

const ReadingList: React.FC<ReadingListProps> = ({ materials, onSelect, completedIds = new Set() }) => {
    const [selectedDifficulty, setSelectedDifficulty] = React.useState<string>('All');

    const filteredMaterials = materials.filter(material => {
        if (selectedDifficulty === 'All') return true;
        return material.difficulty === selectedDifficulty;
    });

    const difficulties = ['All', '小学', '初中', '高中'];

    if (materials.length === 0) {
        return (
            <div className="text-center p-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 ww-pill" style={{ background: 'rgba(255,255,255,0.25)' }}>
                    <BookOpen className="w-5 h-5" style={{ color: 'var(--ww-stroke)' }} />
                    <p className="text-[10px] font-black uppercase tracking-widest ww-muted">暂无阅读材料</p>
                </div>
            </div>
        );
    }

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case '小学': return 'text-green-500 bg-green-500/10 border-green-500/20';
            case '初中': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            case '高中': return 'text-red-500 bg-red-500/10 border-red-500/20';
            default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
        }
    };

    return (
        <div className="space-y-6">
            {/* Filter Controls */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {difficulties.map((diff) => (
                    <button
                        key={diff}
                        onClick={() => setSelectedDifficulty(diff)}
                        className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${selectedDifficulty === diff
                            ? 'bg-[rgba(252,203,89,0.95)] text-black border-[color:var(--ww-stroke)]'
                            : 'bg-[rgba(255,255,255,0.20)] text-[rgba(26,15,40,0.75)] border-[color:var(--ww-stroke-soft)]'
                            }`}
                    >
                        {diff === 'All' ? '全部' : diff}
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
                                {material.difficulty}
                            </span>
                            {material.category && (
                                <span className="text-[10px] font-black ww-muted px-2 py-1 rounded-xl border-2"
                                    style={{ borderColor: 'rgba(43,23,63,0.18)', background: 'rgba(255,255,255,0.18)' }}
                                >
                                    {material.category}
                                </span>
                            )}
                        </div>

                        <h3 className="text-lg font-black ww-ink mb-2 flex items-center gap-2">
                            {material.title}
                            {completedIds.has(material.id) && (
                                <CheckCircle className="w-5 h-5" style={{ color: 'rgba(16,185,129,0.95)' }} />
                            )}
                        </h3>

                        <p className="ww-muted text-sm line-clamp-3 mb-6">
                            {material.content}
                        </p>

                        <div className="flex items-center gap-4 text-[10px] ww-muted border-t pt-4 mt-auto"
                            style={{ borderColor: 'rgba(43,23,63,0.16)' }}
                        >
                            <div className="flex items-center gap-1.5">
                                <Brain className="w-4 h-4" style={{ color: 'var(--ww-stroke)' }} />
                                <span>{material.questions?.length || 0} 题</span>
                            </div>
                            {/* You could ensure word count or other stats here if available */}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default ReadingList;
