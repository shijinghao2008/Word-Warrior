
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PETS_DATA, RARITY_CONFIG, PetDefinition } from '../../constants/pets';
import { getPetLevel } from '../../services/lotteryService';
import { Heart, Lock } from 'lucide-react';

interface UserPet {
    pet_id: string;
    count: number;
}

interface PetGalleryProps {
    userPets: UserPet[];
}

const PetGallery: React.FC<PetGalleryProps> = ({ userPets }) => {
    // Compute map for fast lookup
    const userPetMap = React.useMemo(() => {
        const map: Record<string, number> = {};
        userPets.forEach(p => map[p.pet_id] = p.count);
        return map;
    }, [userPets]);

    const [filter, setFilter] = useState<'all' | string>('all');

    const filteredPets = filter === 'all'
        ? PETS_DATA
        : PETS_DATA.filter(p => p.rarity === filter);

    return (
        <div className="p-4 space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-white text-black' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                >
                    All
                </button>
                {Object.keys(RARITY_CONFIG).map((r) => (
                    <button
                        key={r}
                        onClick={() => setFilter(r)}
                        className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-colors ${filter === r ? 'bg-white text-black' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                        style={{ color: filter === r ? undefined : RARITY_CONFIG[r as any].color.replace('text-', '#').replace('slate', 'gray') }} // Approximate helper or just use class
                    >
                        {r}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {filteredPets.map((pet) => {
                    const count = userPetMap[pet.id] || 0;
                    const level = getPetLevel(count);
                    const isOwned = count > 0;
                    const config = RARITY_CONFIG[pet.rarity];

                    return (
                        <motion.div
                            key={pet.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 ${isOwned ? `border-${config.color.split('-')[1]}-500` : 'border-slate-800'} bg-slate-900 group`}
                        >
                            {/* Image Placeholder */}
                            <div className={`absolute inset-0 bg-slate-950 flex items-center justify-center ${!isOwned && 'grayscale opacity-30'}`}>
                                {/* Ideally fetch image from /assets/pets/{pet.id}.png */}
                                <img
                                    src={`/assets/pets/${pet.rarity}_generic.png`} // Fallback for now until we generate all
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=?';
                                    }}
                                    alt={pet.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Lock Overlay */}
                            {!isOwned && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <Lock size={24} className="text-slate-600" />
                                </div>
                            )}

                            {/* Info Card */}
                            <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/90 to-transparent pt-6">
                                <div className={`text-[10px] font-black uppercase tracking-wider ${config.color} mb-0.5`}>
                                    {pet.rarity}
                                </div>
                                <div className="text-xs font-bold text-white mb-1 truncate">{pet.name}</div>

                                {isOwned && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 text-[9px] text-green-400 font-bold">
                                            <Heart size={8} fill="currentColor" />
                                            <span>+{level} HP</span>
                                        </div>
                                        <div className="px-1.5 py-0.5 bg-white/20 rounded text-[9px] text-white font-mono">
                                            Lv.{level}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Count Badge */}
                            {isOwned && count > 1 && (
                                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-slate-300 font-mono">
                                    x{count}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default PetGallery;
