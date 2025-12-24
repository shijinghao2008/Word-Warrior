import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles } from 'lucide-react';

interface XPNotificationProps {
    amount: number;
    gold?: number;
    isVisible: boolean;
    onClose: () => void;
}

const XPNotification: React.FC<XPNotificationProps> = ({ amount, gold, isVisible, onClose }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.5, opacity: 0, y: -50 }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 15
                        }}
                        className="bg-slate-900/90 backdrop-blur-xl border border-fuchsia-500/30 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 min-w-[300px]"
                    >
                        <div className="relative">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 blur-xl bg-fuchsia-500/30 rounded-full"
                            />
                            <div className="relative w-24 h-24 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
                                <Trophy className="w-12 h-12 text-white" fill="currentColor" />
                            </div>
                            <div className="absolute -top-2 -right-2">
                                <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" fill="currentColor" />
                            </div>
                        </div>

                        <div className="text-center space-y-1">
                            <motion.h3
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-2xl font-black text-white uppercase tracking-wider"
                            >
                                Level Up!
                            </motion.h3>
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-fuchsia-300 font-medium"
                            >
                                Rewards Gained
                            </motion.p>
                        </div>

                        <div className="flex flex-col gap-2 w-full">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.4, type: "spring" }}
                                className="bg-slate-800/50 rounded-xl px-6 py-2 border border-slate-700 text-center"
                            >
                                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                                    +{amount} XP
                                </span>
                            </motion.div>

                            {gold !== undefined && gold > 0 && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.5, type: "spring" }}
                                    className="bg-slate-800/50 rounded-xl px-6 py-2 border border-slate-700 text-center"
                                >
                                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500">
                                        +{gold} Coins
                                    </span>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default XPNotification;
