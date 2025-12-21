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
            <div className="text-center p-8 text-gray-500">
                <Headphones className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No listening materials found.</p>
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
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${selectedLevel === lvl
                            ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                            : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white border border-white/5'
                            }`}
                    >
                        {lvl === 'All' ? 'All Levels' : lvl}
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
                        className="group relative overflow-hidden bg-gray-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-cyan-500/50 hover:bg-gray-800/80 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-cyan-500/10"
                    >
                        {/* Hover Effect Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-cyan-500/0 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        <div className="flex justify-between items-start mb-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getLevelColor(material.level || 'Primary')}`}>
                                {material.level || 'Primary'}
                            </span>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors flex items-center gap-2">
                            {material.title}
                            {completedIds.has(material.id) && (
                                <CheckCircle className="w-5 h-5 text-green-500 fill-green-500/10" />
                            )}
                        </h3>

                        <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-white/5 pt-4 mt-auto">
                            <div className="flex items-center gap-1.5">
                                <Activity className="w-4 h-4 text-cyan-400" />
                                <span>{material.questions?.length || 0} Questions</span>
                            </div>
                            {material.audio_url && (
                                <div className="flex items-center gap-1.5">
                                    <Music className="w-4 h-4 text-cyan-400" />
                                    <span>Audio Available</span>
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
