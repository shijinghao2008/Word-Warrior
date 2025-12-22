import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Trophy, Shield, User, ChevronRight, LayoutGrid, Star, Flame, Target, BookOpen, Swords, Mic2, Headphones, PenTool, ShieldCheck, ShoppingBag, Terminal } from 'lucide-react';
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
import CustomizerPanel from './components/Shop/CustomizerPanel';

// Pixel UI
import { PixelCard, PixelButton } from './components/ui/PixelComponents';
import MatchHistory from './components/MatchHistory';

import { ThemeProvider, useTheme } from './contexts/ThemeContext';

import { WarriorProvider, useWarrior } from './contexts/WarriorContext';

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

interface AuthenticatedAppProps {
  userId: string;
}

const AuthenticatedApp: React.FC<AuthenticatedAppProps> = ({ userId }) => {
  const { themeMode } = useTheme();
  const { user } = useAuth();
  const { state: warriorState } = useWarrior();
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem(`ww_stats_${userId}`);
    return saved ? { ...INITIAL_STATS, ...JSON.parse(saved) } : INITIAL_STATS;
  });

  const [activeTab, setActiveTab] = useState('vocab');
  const [isArenaMenuOpen, setIsArenaMenuOpen] = useState(false);

  // Sync stats logic...
  useEffect(() => {
    localStorage.setItem(`ww_stats_${userId}`, JSON.stringify(stats));
  }, [stats, userId]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const remoteStats = await getUserStats(userId);
        if (remoteStats) setStats(prev => ({ ...prev, ...remoteStats }));
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };
    loadStats();
  }, [userId]);

  const handleGainExp = (exp: number, statType?: 'atk' | 'def' | 'crit' | 'hp', word?: string) => {
    setStats(prev => {
      let newStats = { ...prev, exp: prev.exp + exp };
      const expNeeded = newStats.level * 100;
      if (newStats.exp >= expNeeded) {
        newStats.exp -= expNeeded;
        newStats.level += 1;
        const levelScaler = newStats.level;
        newStats.maxHp += 10 * levelScaler;
        newStats.hp = newStats.maxHp;
        newStats.atk += 1 * levelScaler;
        newStats.def += 1 * levelScaler;
        newStats.crit = parseFloat((newStats.crit + (0.001 * levelScaler)).toFixed(3));
      }
      if (statType) {
        if (statType === 'crit') newStats.crit = parseFloat((newStats.crit + 0.001).toFixed(3));
        else (newStats as any)[statType] += 1;
      }
      if (statType === 'atk' && word) {
        newStats.masteredWordsCount = (newStats.masteredWordsCount || 0) + 1;
        addMasteredWord(userId, word).catch(console.error);
      }
      // Update DB (debounced/background)
      updateUserStats(userId, newStats).catch(console.error);
      return newStats;
    });
  };

  // ==========================================
  // RENDERERS
  // ==========================================

  const renderTopHUD = () => (
    <div className="sticky top-0 z-50 bg-[#1a1a1a] border-b-4 border-black px-4 py-2 flex items-center justify-between shadow-[0px_4px_0px_0px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-4">
        {/* User Info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">LV.{stats.level}</span>
            <span className="text-sm font-black text-white tracking-widest truncate max-w-[120px]">{user?.user_metadata?.username || 'WARRIOR'}</span>
          </div>
          {/* Mini EXP Bar */}
          <div className="w-24 h-2 bg-black border border-zinc-700 relative mt-0.5">
            <div
              className="h-full bg-indigo-500"
              style={{ width: `${Math.min((stats.exp / (stats.level * 100)) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        {/* Resources */}
        <div className="flex items-center gap-2 px-3 py-1 bg-black border-2 border-zinc-700">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-mono text-amber-400">{warriorState.gold || 0} G</span>
        </div>
      </div>
    </div>
  );

  const renderScholarPath = () => {
    const modeStyles: Record<string, string> = {
      listening: 'border-l-cyan-500',
      oral: 'border-l-amber-500',
      reading: 'border-l-indigo-500',
      writing: 'border-l-fuchsia-500',
    };

    return (
      <div className="max-w-3xl mx-auto space-y-6 pt-6 pb-40 px-6">
        <PixelCard variant="paper" className="p-4 flex items-start gap-4 mb-8">
          <Terminal size={24} className="text-slate-800 shrink-0 mt-1" />
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-1">QUEST LOG: SCHOLAR'S PATH</h3>
            <p className="text-xs font-mono text-slate-700">Improve your base stats to prepare for combat.<br />Select a training module below.</p>
          </div>
        </PixelCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TRAINING_MODES.filter(m => m.id !== 'vocab').map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveTab(mode.id)}
              className={`group relative h-24 bg-slate-800 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-700 active:translate-y-1 active:shadow-none transition-all flex items-center overflow-hidden`}
            >
              {/* Colored Stripe Indicator */}
              <div className={`absolute left-0 top-0 bottom-0 w-2 ${modeStyles[mode.id]?.replace('border-l-', 'bg-') || 'bg-slate-500'}`} />

              <div className="ml-6 flex-1 flex items-center justify-between pr-6">
                <div className="flex items-center gap-4">
                  {React.cloneElement(mode.icon as any, { size: 24, className: 'text-slate-400 group-hover:text-white transition-colors' })}
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-black uppercase tracking-wider text-white">
                      {mode.name.replace('磨炼', '').replace('修行', '').replace('试炼', '').replace('工坊', '')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <Target size={10} /> +{mode.stat}
                    </span>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const [showShop, setShowShop] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);

  const renderProfile = () => (
    <div className="max-w-xl mx-auto space-y-8 pt-6 px-4 pb-32">
      <div className="flex justify-between items-end mb-4 border-b-4 border-black pb-2">
        <h2 className="text-lg font-black uppercase tracking-widest text-white">WARRIOR PROFILE</h2>
        <div className="flex gap-2">
          <PixelButton size="sm" variant="neutral" onClick={() => setShowCustomizer(true)}>
            <PenTool size={14} className="mr-1" /> EDIT
          </PixelButton>
          <PixelButton size="sm" variant="warning" onClick={() => setShowShop(true)}>
            <ShoppingBag size={14} className="mr-1" /> SHOP
          </PixelButton>
        </div>
      </div>

      <PixelCard variant="dark" className="p-6">
        <StatsPanel stats={stats} username={user?.user_metadata?.username || 'Word Warrior'} />
      </PixelCard>

      {/* Achievements Section */}
      <div className="space-y-4">
        <AchievementsPanel stats={stats} />
      </div>

      <MatchHistory userId={user?.id || ''} />

      <div className="pt-8">
        <PixelButton fullWidth variant="neutral" onClick={() => setActiveTab('admin')}>
          SYSTEM SETTINGS
        </PixelButton>
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
    { id: 'vocab', label: 'BATTLE', icon: <Swords size={20} /> },
    { id: 'scholar', label: 'QUESTS', icon: <BookOpen size={20} /> },
    { id: 'arena', label: 'ARENA', icon: <Flame size={24} />, special: true },
    { id: 'leaderboard', label: 'RANK', icon: <Trophy size={20} /> },
    { id: 'profile', label: 'HERO', icon: <User size={20} /> },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#1a1a1a] text-slate-100 font-pixel">
      {/* 1. TOP HUD */}
      {renderTopHUD()}

      {/* 2. MAIN SCROLLABLE AREA */}
      <main className={`flex-1 overflow-y-auto custom-scrollbar relative ${isArenaMenuOpen ? 'blur-sm pointer-events-none brightness-50' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {/* Context Back Button */}
            {['reading', 'writing', 'listening', 'oral', 'pvp_blitz', 'pvp_tactics', 'pvp_chant', 'admin'].includes(activeTab) && (
              <div className="px-4 pt-4">
                <PixelButton
                  size="sm"
                  variant="neutral"
                  onClick={() => {
                    if (['reading', 'writing', 'listening', 'oral'].includes(activeTab)) setActiveTab('scholar');
                    else setActiveTab('vocab');
                  }}
                >
                  <span className="flex items-center gap-1"><X size={12} /> BACK</span>
                </PixelButton>
              </div>
            )}
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 3. BOTTOM CONSOLE (Replaces Floating Nav) */}
      <div className="bg-[#111] border-t-4 border-black p-2 z-[100] shadow-[0px_-4px_0px_0px_rgba(0,0,0,0.5)]">
        <div className="max-w-lg mx-auto flex items-stretch justify-center gap-2 h-16">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;

            if (item.special) {
              return (
                <button
                  key={item.id}
                  onClick={() => setIsArenaMenuOpen(!isArenaMenuOpen)}
                  className={`
                            relative -top-6
                            w-20 h-20 
                            bg-red-600 hover:bg-red-500 
                            border-4 border-black 
                            shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                            flex flex-col items-center justify-center 
                            transition-transform active:translate-y-1 active:shadow-none
                            z-20
                        `}
                >
                  <Flame size={32} className="text-white animate-pulse" />
                  <span className="text-[10px] font-black uppercase text-white tracking-widest mt-1">FIGHT</span>
                </button>
              )
            }

            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsArenaMenuOpen(false); }}
                className={`
                        flex-1 
                        flex flex-col items-center justify-center gap-1
                        border-b-4 
                        transition-all
                        ${isActive
                    ? 'bg-zinc-800 border-indigo-500 text-indigo-400 -translate-y-1'
                    : 'bg-transparent border-transparent text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
                  }
                    `}
              >
                {item.icon}
                <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ARENA MODAL */}
      <AnimatePresence>
        {isArenaMenuOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center pointer-events-none">
            {/* Backdrop is handled by main container blur */}

            <div className="pointer-events-auto w-full max-w-md px-6 pb-24 flex flex-col gap-4 items-center animate-shake">
              <h2 className="text-3xl font-black text-white italic drop-shadow-[4px_4px_0_#000]">CHOOSE MODE</h2>
              {PVP_MODES.map((mode, idx) => (
                <motion.button
                  key={mode.id}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 50, opacity: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => { setActiveTab(mode.id); setIsArenaMenuOpen(false); }}
                  className="w-full bg-slate-800 border-4 border-white hover:bg-indigo-600 hover:border-indigo-300 p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4 group transition-colors"
                >
                  <div className="p-2 bg-black/20 border-2 border-white/20 group-hover:bg-white/20 group-hover:text-white">
                    {mode.icon}
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-black uppercase italic text-white">{mode.name}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">1 VS 1 BATTLE</div>
                  </div>
                  <div className="ml-auto text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Swords size={24} />
                  </div>
                </motion.button>
              ))}
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                onClick={() => setIsArenaMenuOpen(false)}
                className="mt-4 px-6 py-2 bg-black/50 text-white font-bold uppercase tracking-widest text-xs hover:bg-red-500/20"
              >
                Cancel
              </motion.button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
