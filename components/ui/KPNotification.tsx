
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ArrowUp } from 'lucide-react';

interface KPNotificationProps {
  kpGain: number;
  promotion?: {
    from: string;
    to: string;
  };
}

export const KPNotification: React.FC<KPNotificationProps> = ({ kpGain, promotion }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (kpGain > 0 || promotion) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [kpGain, promotion]);

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-x-0 top-24 z-[200] pointer-events-none flex flex-col items-center gap-4">
          {/* KP Gain Toast */}
          {kpGain > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              className="bg-yellow-500 text-white px-6 py-3 rounded-full shadow-[0_10px_25px_rgba(234,179,8,0.4)] flex items-center gap-3 border-2 border-yellow-300"
            >
              <Zap size={20} className="fill-white animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Knowledge Power</span>
                <span className="text-xl font-black italic tracking-tighter">+{kpGain.toLocaleString()} KP</span>
              </div>
            </motion.div>
          )}

          {/* Promotion Banner */}
          {promotion && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 1.5, filter: 'blur(10px)' }}
              className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white px-8 py-6 rounded-[2rem] shadow-2xl border-4 border-white/20 relative overflow-hidden text-center"
            >
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              
              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-center gap-2 text-yellow-400">
                  <ArrowUp size={24} className="animate-bounce" />
                  <span className="text-sm font-black uppercase tracking-[0.3em]">Rank Promoted!</span>
                  <ArrowUp size={24} className="animate-bounce" />
                </div>
                <h2 className="text-4xl font-black italic tracking-tighter drop-shadow-lg">
                  {promotion.to}
                </h2>
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">
                  从 {promotion.from} 晋升
                </p>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};

