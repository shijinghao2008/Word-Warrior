
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Award } from 'lucide-react';
import { ACHIEVEMENTS } from '../constants.tsx';
import { UserStats } from '../types';

interface AchievementsPanelProps {
  stats: UserStats;
}

const AchievementsPanel: React.FC<AchievementsPanelProps> = ({ stats }) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  // Calculate unlocked status for all achievements
  const processedAchievements = ACHIEVEMENTS.map(ach => ({
    ...ach,
    isUnlocked: ach.condition(stats)
  }));

  const filteredList = processedAchievements.filter(ach => {
    if (filter === 'unlocked') return ach.isUnlocked;
    if (filter === 'locked') return !ach.isUnlocked;
    return true;
  });

  const unlockedCount = processedAchievements.filter(a => a.isUnlocked).length;
  const totalCount = processedAchievements.length;

  return (
    <div className="space-y-6">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Award size={18} className="text-amber-500" />
          <h2 className="text-[12px] font-black uppercase tracking-widest text-slate-500">荣耀殿堂 (Achievements)</h2>
          <div className="ml-auto bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500">
            {unlockedCount} / {totalCount}
          </div>
        </div>
        
        <div className="flex bg-slate-200 dark:bg-slate-800/50 p-1 rounded-xl">
          {(['all', 'unlocked', 'locked'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f 
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {f === 'all' ? '全部' : f === 'unlocked' ? '已达成' : '未达成'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredList.map((ach) => (
            <motion.div
              layout
              key={ach.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`relative aspect-square rounded-3xl p-4 flex flex-col items-center justify-center text-center gap-3 border-2 transition-all overflow-hidden group ${
                ach.isUnlocked 
                  ? `${ach.bg} dark:bg-opacity-10 bg-opacity-50 border-opacity-30` 
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60 grayscale'
              }`}
            >
              {/* Unlock Glow Effect */}
              {ach.isUnlocked && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
              )}

              {/* Icon Container */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-sm ${
                ach.isUnlocked 
                  ? `bg-white dark:bg-slate-800 ${ach.color} border-current` 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
              }`}>
                {ach.isUnlocked ? ach.icon : <Lock size={20} />}
              </div>

              {/* Text Info */}
              <div className="z-10 w-full px-1">
                <h4 className={`text-xs font-black uppercase tracking-tight mb-1 truncate ${
                  ach.isUnlocked ? 'text-slate-800 dark:text-white' : 'text-slate-500'
                }`}>
                  {ach.title}
                </h4>
                <p className="text-[9px] font-bold text-slate-400 leading-tight line-clamp-2">
                  {ach.desc}
                </p>
              </div>

              {/* Completed Badge */}
              {ach.isUnlocked && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredList.length === 0 && (
          <div className="col-span-2 md:col-span-3 py-12 text-center text-slate-400">
            <p className="text-xs font-black uppercase tracking-widest">暂无相关成就</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementsPanel;
