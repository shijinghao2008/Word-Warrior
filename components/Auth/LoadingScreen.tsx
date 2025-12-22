
import React from 'react';
import { motion } from 'framer-motion';
import { Loader } from 'lucide-react';

const LoadingScreen: React.FC = () => {
    return (
        <div className="min-h-screen w-full flex items-center justify-center ww-app">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
            >
                <div className="w-20 h-20 ww-surface rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl font-black ww-ink">W</span>
                </div>
                <Loader size={32} className="animate-spin mx-auto mb-4" style={{ color: 'var(--ww-accent)' }} />
                <p className="text-sm font-black uppercase tracking-widest text-white/80">Loading...</p>
            </motion.div>
        </div>
    );
};

export default LoadingScreen;
