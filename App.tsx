
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Trophy, Shield, User, ChevronRight, LayoutGrid, Star, Flame, Target, BookOpen, Swords, Mic2, Headphones, PenTool, ShieldCheck, ShoppingBag } from 'lucide-react';
import { INITIAL_STATS, NAVIGATION, TRAINING_MODES, PVP_MODES } from './constants.tsx';
import { UserStats, Rank } from './types';
import { getUserStats, updateUserStats, addMasteredWord } from './services/databaseService';
import { useAuth } from './contexts/AuthContext';
import AuthPage from './components/Auth/AuthPage';
import LoadingScreen from './components/Auth/LoadingScreen';

// Components
import StatsPanel from './components/StatsPanel';
import VocabTraining from './components/VocabTraining';
import ReadingTraining from './components/ReadingTraining';
import WritingTraining from './components/WritingTraining';
import OralTraining from './components/OralTraining';
import ListeningTraining from './components/ListeningTraining';
import BattleArena from './components/BattleArena';
import AdminPanel from './components/AdminPanel';
import Leaderboard from './components/Leaderboard';
import AchievementsPanel from './components/AchievementsPanel';
import ShopPanel from './components/Shop/ShopPanel';
import MatchHistory from './components/MatchHistory';
import CustomizerPanel from './components/Shop/CustomizerPanel';

import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { WarriorProvider } from './contexts/WarriorContext';

const App: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthPage />;

  return (
    <ThemeProvider>
      <WarriorProvider>
        <AuthenticatedApp userId={user.id} />
      </WarriorProvider>
    </ThemeProvider>
  );
};

// ... existing code ...

interface AuthenticatedAppProps {
  userId: string;
}

const AuthenticatedApp: React.FC<AuthenticatedAppProps> = ({ userId }) => {
  const { user } = useAuth();
  const { themeMode, getColorClass, primaryColor } = useTheme(); // Use Theme Context

  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem(`ww_stats_${userId}`);
    return saved ? { ...INITIAL_STATS, ...JSON.parse(saved) } : INITIAL_STATS;
  });

  // Removed local theme state in favor of context

  const [activeTab, setActiveTab] = useState('vocab');
  const [isArenaMenuOpen, setIsArenaMenuOpen] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);

  // Sync stats from database on load
  useEffect(() => {
    if (!userId) return;

    const loadStats = async () => {
      console.log('Fetching user stats from database...');
      const dbStats = await getUserStats(userId);
      if (dbStats) {
        console.log('Stats loaded:', dbStats);
        setStats(prev => ({ ...prev, ...dbStats }));
      }
      setDbLoaded(true);
    };

    loadStats();
  }, [userId]);

  // Sync stats to database on change (debounced)
  useEffect(() => {
    if (!dbLoaded || !userId) return;

    const timer = setTimeout(() => {
      console.log('Syncing stats to database:', stats);
      updateUserStats(userId, stats);
      // Also update local storage as backup
      localStorage.setItem(`ww_stats_${userId}`, JSON.stringify(stats));
    }, 2000);

    return () => clearTimeout(timer);
  }, [stats, userId, dbLoaded]);

  // Handlers ... (unchanged)

  const handleGainExp = (exp: number, statType?: 'atk' | 'def' | 'crit' | 'hp', word?: string) => {
    setStats(prev => {
      let newStats = { ...prev, exp: prev.exp + exp };

      // Level Up Logic
      const expNeeded = newStats.level * 100;
      if (newStats.exp >= expNeeded) {
        newStats.exp -= expNeeded;
        newStats.level += 1;

        // Proportional Stat Increase based on New Level
        // Higher level = more stats gained per level up
        const levelScaler = newStats.level;

        newStats.maxHp += 10 * levelScaler;
        newStats.hp = newStats.maxHp;     // Full heal on level up
        newStats.atk += 1 * levelScaler;
        newStats.def += 1 * levelScaler;

        // Crit gains are smaller but scale slightly
        // e.g. Level 2: +0.002, Level 10: +0.01
        newStats.crit = parseFloat((newStats.crit + (0.001 * levelScaler)).toFixed(3));
      }

      // Stat Increase from Training (Training specific bonuses remain flat or small)
      if (statType) {
        if (statType === 'crit') newStats.crit = parseFloat((newStats.crit + 0.001).toFixed(3));
        else (newStats as any)[statType] += 1;
      }

      // Track Word Mastery specifically for vocab/atk gains
      if (statType === 'atk' && word) {
        newStats.masteredWordsCount = (newStats.masteredWordsCount || 0) + 1;
        // Async database sync for mastered word (fire and forget)
        addMasteredWord(userId, word).catch(err =>
          console.error('Error adding mastered word to DB:', err)
        );
      }

      return newStats;
    });
  };

  const renderScholarPath = () => {
    const modeStyles: Record<string, string> = {
      listening: 'from-cyan-500 to-blue-600 shadow-cyan-500/20',
      oral: 'from-amber-400 to-orange-600 shadow-orange-500/20',
      reading: 'from-indigo-500 to-violet-700 shadow-indigo-500/20',
      writing: 'from-fuchsia-500 to-pink-600 shadow-pink-500/20',
    };

    return (
      <div className="max-w-3xl mx-auto space-y-8 pt-6 pb-40 px-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Star size={20} className="text-indigo-500" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">学者之路</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">提升基础数值以迎接挑战</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {TRAINING_MODES.filter(m => m.id !== 'vocab').map((mode) => (
            <motion.button
              key={mode.id}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(mode.id)}
              className={`relative aspect-square flex flex-col items-center justify-center p-6 rounded-[2rem] bg-gradient-to-br ${modeStyles[mode.id] || 'from-slate-700 to-slate-900'} shadow-2xl border border-white/10 group overflow-hidden`}
            >
              {/* Glass Reflection Effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-lg transition-transform group-hover:scale-110">
                  {React.cloneElement(mode.icon as any, { size: 32 })}
                </div>
                <div className="text-center">
                  <h3 className="font-black text-sm md:text-base text-white uppercase tracking-tight mb-1">
                    {mode.name.replace('磨炼', '').replace('修行', '').replace('试炼', '').replace('工坊', '')}
                  </h3>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-white/90 text-[9px] font-black uppercase tracking-widest">
                    <Target size={10} />
                    {mode.stat} +
                  </div>
                </div>
              </div>

              {/* Decorative Corner Icon */}
              <div className="absolute -bottom-2 -right-2 opacity-10 text-white group-hover:scale-150 transition-transform">
                {React.cloneElement(mode.icon as any, { size: 64 })}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Tip section */}
        <div className="p-6 rounded-3xl dark:bg-slate-900/50 bg-white border dark:border-slate-800 border-slate-200 shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
            <Zap size={18} className="text-indigo-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-widest dark:text-slate-200 text-slate-800">修炼指南</h4>
            <p className="text-[10px] font-medium leading-relaxed dark:text-slate-500 text-slate-500 uppercase tracking-tight">
              听力增加防御 (DEF)，阅读增加生命 (HP)，口语增加法力 (Mana)，写作增加攻击 (ATK)。合理的属性搭配是获胜的关键。
            </p>
          </div>
        </div>
      </div>
    );
  };

  const [showShop, setShowShop] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);

  // ... (keep renderScholarPath)

  const renderProfile = () => (
    <div className="max-w-xl mx-auto space-y-8 pt-4 px-4 pb-32">
      {/* 1. Main Stats */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <User size={16} className="text-slate-400" />
            <h2 className="text-[12px] font-black uppercase tracking-widest text-slate-500">战士档案 (Warrior Profile)</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCustomizer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-wider"
            >
              <PenTool size={12} /> Customize
            </button>
            <button
              onClick={() => setShowShop(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-wider"
            >
              <ShoppingBag size={12} /> Armory
            </button>
          </div>
        </div>
        <div className="dark:bg-slate-900/40 bg-white p-6 rounded-[2.5rem] border dark:border-slate-800 border-slate-200 shadow-xl backdrop-blur-sm">
          <StatsPanel stats={stats} username={user?.user_metadata?.username || 'Word Warrior'} />
          <div className="mt-8 border-t border-slate-700/50 pt-8">
            <MatchHistory userId={userId} />
          </div>
        </div>
      </div>

      {/* 2. Achievements Section */}
      <div className="space-y-4">
        <AchievementsPanel stats={stats} />
      </div>

      {/* 3. Settings Button */}
      <div className="pt-4 border-t dark:border-slate-800 border-slate-100">
        <button
          onClick={() => setActiveTab('admin')}
          className="w-full py-4 dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:dark:text-white transition-colors"
        >
          系统设置 & 管理
        </button>
      </div>

      <AnimatePresence>
        {showShop && <ShopPanel onClose={() => setShowShop(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showCustomizer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowCustomizer(false)}>
            <div onClick={e => e.stopPropagation()}>
              <CustomizerPanel onClose={() => setShowCustomizer(false)} />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'vocab': return <VocabTraining onMastered={(word) => handleGainExp(1, 'atk', word)} />;
      case 'scholar': return renderScholarPath();
      case 'leaderboard': return <div className="pb-32"><Leaderboard /></div>;
      case 'profile': return renderProfile();
      case 'reading': return <div className="pb-32"><ReadingTraining onSuccess={(exp) => handleGainExp(exp, 'hp')} /></div>;
      case 'writing': return <div className="pb-32"><WritingTraining onSuccess={(exp) => handleGainExp(exp, 'atk')} /></div>;
      case 'listening': return <div className="pb-32"><ListeningTraining onSuccess={(exp) => handleGainExp(exp, 'def')} /></div>;
      case 'oral': return <div className="pb-32"><OralTraining playerStats={stats} onSuccess={(exp) => handleGainExp(exp, 'crit')} /></div>;
      case 'pvp_blitz':
      case 'pvp_tactics':
      case 'pvp_chant':
        return <div className="pb-32"><BattleArena mode={activeTab} playerStats={stats} onVictory={() => setActiveTab('vocab')} onDefeat={() => setActiveTab('vocab')} /></div>;
      case 'admin': return <AdminPanel onUpdateStats={setStats} />;
      default: return <VocabTraining onMastered={(word) => handleGainExp(1, 'atk')} />;
    }
  };

  const navItems = [
    { id: 'vocab', label: '单词', icon: <Swords size={24} /> },
    { id: 'scholar', label: '学习', icon: <Star size={24} /> },
    { id: 'arena', label: '对战', icon: <Flame size={32} />, special: true },
    { id: 'leaderboard', label: '排行', icon: <Trophy size={24} /> },
    { id: 'profile', label: '档案', icon: <User size={24} /> },
  ];

  return (
    <div className="h-screen flex flex-col transition-colors duration-500 overflow-hidden dark:bg-[#020617] bg-slate-50">
      {/* Mini Header */}


      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto px-4 custom-scrollbar relative transition-all duration-300 ${isArenaMenuOpen ? 'blur-sm scale-95 opacity-80 pointer-events-none select-none' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {/* Context Back Button for Sub-pages */}
            {['reading', 'writing', 'listening', 'oral', 'pvp_blitz', 'pvp_tactics', 'pvp_chant', 'admin'].includes(activeTab) && (
              <button
                onClick={() => {
                  if (['reading', 'writing', 'listening', 'oral'].includes(activeTab)) setActiveTab('scholar');
                  else setActiveTab('vocab');
                }}
                className="mt-4 mb-2 flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600"
              >
                <X size={12} /> 返回
              </button>
            )}
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-[200] px-4 pb-8 pt-2 pointer-events-none">
        <div className="max-w-lg mx-auto relative pointer-events-auto">

          {/* Arena Pop-up Menu */}
          <AnimatePresence>
            {isArenaMenuOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsArenaMenuOpen(false)}
                  className="fixed inset-0 z-[-1]"
                />
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-4 md:gap-8 items-end justify-center w-full px-4">
                  {PVP_MODES.map((mode, idx) => (
                    <motion.div
                      key={mode.id}
                      initial={{ opacity: 0, y: 50, scale: 0.5 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 50, scale: 0.5 }}
                      transition={{ delay: idx * 0.05, type: 'spring', damping: 15 }}
                      className="flex flex-col items-center gap-3 flex-1 min-w-[80px]"
                    >
                      <button
                        onClick={() => {
                          setActiveTab(mode.id);
                          setIsArenaMenuOpen(false);
                        }}
                        className={`w-16 h-16 md:w-20 md:h-20 p-4 md:p-6 rounded-3xl flex items-center justify-center bg-gradient-to-br ${mode.color} border-2 border-white/30 shadow-2xl transition-all active:scale-90 hover:scale-105`}
                      >
                        {mode.icon}
                      </button>
                      <span className="bg-slate-900/95 dark:bg-white dark:text-black text-white text-[9px] md:text-[11px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest whitespace-nowrap shadow-xl text-center">
                        {mode.name}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </AnimatePresence>

          {/* Nav Bar Body - Slightly larger (h-20) for better spacing */}
          <div className="dark:bg-[#0f172a]/95 bg-white/95 backdrop-blur-xl border dark:border-slate-800 border-slate-200 h-20 rounded-[2.5rem] shadow-2xl flex items-center justify-around px-4 relative overflow-visible">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.special) {
                    setIsArenaMenuOpen(!isArenaMenuOpen);
                  } else {
                    setActiveTab(item.id);
                    setIsArenaMenuOpen(false);
                  }
                }}
                className={`relative flex flex-col items-center justify-center transition-all flex-1 px-1 h-full ${item.special
                  ? `-mt-12 w-20 h-20 ${getColorClass('bg', 600)} rounded-full text-white border-[6px] dark:border-[#020617] border-slate-50 shadow-2xl z-20 max-w-[80px]`
                  : ''
                  }`}
              >
                <div className={`transition-all duration-300 ${!item.special && activeTab === item.id ? `${getColorClass('text', 600)} scale-110` : 'text-slate-500'}`}>
                  {item.icon}
                </div>

                <span className={`text-[11px] font-black uppercase mt-1.5 tracking-tighter text-center whitespace-nowrap ${item.special ? 'text-white' : (activeTab === item.id ? getColorClass('text', 600) : 'text-slate-400')
                  }`}>
                  {item.label}
                </span>

                {/* Active Indicator Dot */}
                {!item.special && activeTab === item.id && (
                  <motion.div
                    layoutId="active-nav"
                    className={`absolute bottom-2 w-1.5 h-1.5 ${getColorClass('bg', 600)} rounded-full`}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
