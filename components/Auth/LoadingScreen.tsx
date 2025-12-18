
import React from 'react';
import { motion } from 'framer-motion';
import { Loader } from 'lucide-react';

const LoadingScreen: React.FC = () => {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 dark:from-slate-950 dark:via-indigo-950 dark:to-purple-950">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
            >
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <span className="text-3xl font-black text-white">W</span>
                </div>
                <Loader size={32} className="text-indigo-500 animate-spin mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading...</p>
            </motion.div>
        </div>
    );
};

export default LoadingScreen;
