
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Sparkles, History, Hexagon } from 'lucide-react';
import { drawPet, savePetDraw, getUserPets, getTotalPetHpBonus } from '../../services/lotteryService';
import { PetDefinition, RARITY_CONFIG } from '../../constants/pets';
import PetGallery from './PetGallery';
import { useAuth } from '../../contexts/AuthContext';

interface LotteryPanelProps {
    onClose: () => void;
}

const LotteryPanel: React.FC<LotteryPanelProps> = ({ onClose }) => {
    const { user } = useAuth();
    const [view, setView] = useState<'draw' | 'gallery'>('draw');
    const [isDrawing, setIsDrawing] = useState(false);
    const [result, setResult] = useState<{ pet: PetDefinition; isNew: boolean; level: number } | null>(null);
    const [userPets, setUserPets] = useState<any[]>([]);
    const [totalHp, setTotalHp] = useState(0);

    const fetchPets = async () => {
        if (user) {
            const pets = await getUserPets(user.id);
            setUserPets(pets);
            setTotalHp(getTotalPetHpBonus(pets));
        }
    };

    useEffect(() => {
        fetchPets();
    }, [user]);

    const handleDraw = async () => {
        if (isDrawing || !user) return;
        setIsDrawing(true);
        setResult(null);

        // Artificial delay for animation
        const drawnPet = drawPet();

        // Save to DB
        try {
            const saved = await savePetDraw(user.id, drawnPet.id);

            setTimeout(() => {
                setIsDrawing(false);
                setResult({
                    pet: drawnPet,
                    isNew: saved?.isNew || false,
                    level: Math.floor(Math.log2(saved?.count || 1)) + 1
                });
                fetchPets(); // Refresh stats
            }, 2000); // 2 seconds spin

        } catch (e) {
            console.error(e);
            setIsDrawing(false);
        }
    };

    const currentPetConfig = result ? RARITY_CONFIG[result.pet.rarity] : RARITY_CONFIG['white'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/50">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-indigo-500/10 rounded-xl">
                            <Sparkles size={24} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-widest text-white">
                                {view === 'draw' ? 'Pet Summon' : 'Pet Gallery'}
                            </h2>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                <span>Total Bonus:</span>
                                <span className="text-green-400">+{totalHp} HP</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setView(view === 'draw' ? 'gallery' : 'draw')}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-black uppercase tracking-wider text-slate-300 transition-colors flex items-center gap-2"
                        >
                            {view === 'draw' ? <><Hexagon size={14} /> Gallery</> : <><Sparkles size={14} /> Summon</>}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 min-h-[400px]">
                    {view === 'gallery' ? (
                        <PetGallery userPets={userPets} />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center relative">

                            {/* Main Draw Area */}
                            <div className="relative z-10 flex flex-col items-center gap-8">
                                <AnimatePresence mode="wait">
                                    {result ? (
                                        <motion.div
                                            key="result"
                                            initial={{ scale: 0, rotate: -10 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            exit={{ scale: 0 }}
                                            className="flex flex-col items-center gap-4"
                                        >
                                            <div className={`
                                 w-64 h-64 rounded-[2rem] border-4 
                                 shadow-[0_0_100px_-20px_var(--shadow-color)]
                                 flex items-center justify-center bg-slate-950 relative overflow-hidden group
                              `}
                                                style={{
                                                    borderColor: currentPetConfig.color.replace('text-', '#').replace('slate', 'gray'),
                                                    '--shadow-color': currentPetConfig.shadow.replace('shadow-', '').replace('/50', '')
                                                } as any}
                                            >
                                                <img
                                                    src={`/assets/pets/${result.pet.rarity}_generic.png`}
                                                    onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200?text=?'}
                                                    className="w-full h-full object-cover"
                                                />

                                                {/* Rarity Flash */}
                                                <div className={`absolute inset-0 bg-white mix-blend-overlay opacity-0 animate-[ping_0.5s_ease-out_1]`} />
                                            </div>

                                            <div className="text-center space-y-1">
                                                <motion.div
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    delay={0.2}
                                                    className={`text-sm font-black uppercase tracking-[0.2em] ${currentPetConfig.color}`}
                                                >
                                                    {result.pet.rarity}
                                                </motion.div>
                                                <motion.h3
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    delay={0.3}
                                                    className="text-3xl font-black text-white"
                                                >
                                                    {result.pet.name}
                                                </motion.h3>
                                                <motion.p
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    delay={0.4}
                                                    className="text-slate-400 text-sm italic"
                                                >
                                                    {result.pet.description}
                                                </motion.p>

                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    delay={0.5}
                                                    className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-lg text-xs font-mono text-slate-300"
                                                >
                                                    {result.isNew ? 'NEW!' : 'DUPLICATE'} • LV.{result.level}
                                                </motion.div>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="placeholder"
                                            animate={isDrawing ? {
                                                scale: [1, 1.1, 0.9, 1.1, 1],
                                                rotate: [0, 5, -5, 5, 0],
                                                filter: ["brightness(1)", "brightness(2)", "brightness(1)"]
                                            } : {}}
                                            transition={isDrawing ? { duration: 0.5, repeat: Infinity } : {}}
                                            className="w-48 h-48 rounded-full border-4 border-slate-700 border-dashed flex items-center justify-center"
                                        >
                                            <Sparkles size={64} className="text-slate-700" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <button
                                    disabled={isDrawing}
                                    onClick={handleDraw}
                                    className={`
                           relative group px-12 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl
                           box-shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                           ${isDrawing ? 'scale-95' : 'hover:scale-105 hover:shadow-indigo-500/25'}
                        `}
                                >
                                    <span className="relative z-10 text-white font-black uppercase tracking-widest text-lg flex items-center gap-2">
                                        {isDrawing ? 'Summoning...' : 'Summon Pet'}
                                        {!isDrawing && <Trophy size={20} />}
                                    </span>

                                    {/* Button Glow */}
                                    <div className="absolute inset-0 rounded-2xl bg-white/20 blur-lg opacity-0 group-hover:opacity-50 transition-opacity" />
                                </button>

                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                                    Cost: Free (Unlimited Tickets)
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default LotteryPanel;
