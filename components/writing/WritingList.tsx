import React from 'react';
import { WritingMaterial } from '../../types';
import { PenTool, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface WritingListProps {
    materials: WritingMaterial[];
    onSelect: (material: WritingMaterial) => void;
    completedIds?: Set<string>;
}

const WritingList: React.FC<WritingListProps> = ({ materials, onSelect, completedIds = new Set() }) => {
    const [selectedDifficulty, setSelectedDifficulty] = React.useState<string>('All');

    const filteredMaterials = materials.filter(material => {
        if (selectedDifficulty === 'All') return true;
        return material.difficulty === selectedDifficulty;
    });

    const difficulties = ['All', '小学', '初中', '高中'];

    if (materials.length === 0) {
        return (
            <div className="text-center p-8 text-gray-500">
                <PenTool className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No writing topics found.</p>
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
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${selectedDifficulty === diff
                            ? 'bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/25'
                            : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white border border-white/5'
                            }`}
                    >
                        {diff === 'All' ? 'All Levels' : diff}
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
                        className="group relative overflow-hidden bg-gray-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-fuchsia-500/50 hover:bg-gray-800/80 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-fuchsia-500/10"
                    >
                        {/* Hover Effect Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/0 via-fuchsia-500/0 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        <div className="flex justify-between items-start mb-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyColor(material.difficulty)}`}>
                                {material.difficulty}
                            </span>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-fuchsia-400 transition-colors flex items-center gap-2">
                            {material.title}
                            {completedIds.has(material.id) && (
                                <CheckCircle className="w-5 h-5 text-green-500 fill-green-500/10" />
                            )}
                        </h3>

                        <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-white/5 pt-4 mt-6">
                            <div className="flex items-center gap-1.5">
                                <PenTool className="w-4 h-4 text-fuchsia-400" />
                                <span>Write an Essay</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default WritingList;
