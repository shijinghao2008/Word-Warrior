
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Trophy, Shield, User, ChevronRight, LayoutGrid, Star, Flame, Target, BookOpen, Swords, Mic2, Headphones, ShieldCheck, ShoppingBag } from 'lucide-react';
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
import MatchHistory from './components/MatchHistory';

import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { WarriorProvider, useWarrior } from './contexts/WarriorContext';
import { GameBottomNav } from './components/GameBottomNav';
import { TopStatusBar } from './components/TopStatusBar';

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
  const { themeMode, getColorClass, primaryColor, avatar } = useTheme(); // Use Theme Context
  const { state: warriorState, addGold } = useWarrior();

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
    const modeStyles: Record<string, { ring: string; badgeFrom: string; badgeTo: string }> = {
      listening: { ring: 'rgba(34,211,238,0.35)', badgeFrom: '#22d3ee', badgeTo: '#2563eb' },
      oral: { ring: 'rgba(252,203,89,0.45)', badgeFrom: '#FCCB59', badgeTo: '#f59e0b' },
      reading: { ring: 'rgba(99,102,241,0.35)', badgeFrom: '#6366f1', badgeTo: '#7c3aed' },
      writing: { ring: 'rgba(236,72,153,0.35)', badgeFrom: '#ec4899', badgeTo: '#a855f7' },
    };

    return (
      <div className="max-w-3xl mx-auto space-y-8 pt-6 pb-40 px-6">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {TRAINING_MODES.filter(m => m.id !== 'vocab').map((mode) => {
            // Special rendering for Listening mode
            if (mode.id === 'listening') {
              return (
                <motion.button
                  key={mode.id}
                  whileHover={{ scale: 1.05, rotate: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(mode.id)}
                  className="relative aspect-square rounded-[24px] overflow-visible"
                  style={{
                    boxShadow: '0 12px 26px rgba(0,0,0,0.18)',
                  }}
                >
                  <img
                    src="/assets/ui/listening_btn.png"
                    alt="Listening"
                    className="w-full h-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </motion.button>
              );
            }

            // Special rendering for Oral mode
            if (mode.id === 'oral') {
              return (
                <motion.button
                  key={mode.id}
                  whileHover={{ scale: 1.05, rotate: 1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(mode.id)}
                  className="relative aspect-square rounded-[24px] overflow-visible"
                  style={{
                    boxShadow: '0 12px 26px rgba(0,0,0,0.18)',
                  }}
                >
                  <img
                    src="/assets/ui/oral_btn.png"
                    alt="Oral"
                    className="w-full h-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </motion.button>
              );
            }

            // Special rendering for Reading mode
            if (mode.id === 'reading') {
              return (
                <motion.button
                  key={mode.id}
                  whileHover={{ scale: 1.05, rotate: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(mode.id)}
                  className="relative aspect-square rounded-[24px] overflow-visible"
                  style={{
                    boxShadow: '0 12px 26px rgba(0,0,0,0.18)',
                  }}
                >
                  <img
                    src="/assets/ui/reading_btn.png"
                    alt="Reading"
                    className="w-full h-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </motion.button>
              );
            }

            // Special rendering for Writing mode
            if (mode.id === 'writing') {
              return (
                <motion.button
                  key={mode.id}
                  whileHover={{ scale: 1.05, rotate: 1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(mode.id)}
                  className="relative aspect-square rounded-[24px] overflow-visible"
                  style={{
                    boxShadow: '0 12px 26px rgba(0,0,0,0.18)',
                  }}
                >
                  <img
                    src="/assets/ui/writing_btn.png"
                    alt="Writing"
                    className="w-full h-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </motion.button>
              );
            }

            const badge = modeStyles[mode.id];
            const statLabel = mode.id === 'oral' ? 'EXP' : (mode.stat || '');
            const title = mode.name.replace('磨炼', '').replace('修行', '').replace('试炼', '').replace('工坊', '');

            return (
              <motion.button
                key={mode.id}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(mode.id)}
                className="ww-surface ww-surface--soft relative aspect-square flex flex-col items-center justify-center p-5 rounded-[22px]"
                style={{
                  boxShadow: `0 12px 26px rgba(0,0,0,0.18), 0 0 0 5px ${badge?.ring ?? 'rgba(255,255,255,0.12)'}`,
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                  style={{
                    background: `linear-gradient(135deg, ${badge?.badgeFrom ?? '#6b7280'}, ${badge?.badgeTo ?? '#111827'})`,
                    border: '2px solid rgba(43,23,63,0.22)',
                    boxShadow: '0 6px 0 rgba(0,0,0,0.20)',
                    color: 'white',
                  }}
                >
                  {React.cloneElement(mode.icon as any, { size: 26 })}
                </div>

                <div className="text-center px-2">
                  <div className="text-[13px] font-black ww-ink">{title}</div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-widest ww-muted">+ {statLabel}</div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Tip section */}
        <div className="ww-surface ww-surface--soft p-6 rounded-3xl flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(252,203,89,0.95)',
              border: '3px solid var(--ww-stroke)',
              boxShadow: '0 6px 0 rgba(0,0,0,0.25)',
            }}
          >
            <Zap size={18} className="text-black" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-widest ww-ink">修炼指南</h4>
            <p className="text-[10px] font-black leading-relaxed ww-muted uppercase tracking-tight">
              听力增加防御 (DEF)，阅读提升生命上限 (HP)，写作增加攻击 (ATK)，口语增加经验 (EXP)。合理的属性搭配是获胜的关键。
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
        <div className="flex items-center justify-end mb-2">
          {/* Spacer or empty if nothing else */}
        </div>
        <div className="ww-surface p-6 rounded-[2.5rem] backdrop-blur-sm">
          <StatsPanel
            stats={stats}
            username={user?.user_metadata?.username || 'Word Warrior'}
            onShopClick={() => setShowShop(true)}
            onCustomClick={() => setShowCustomizer(true)}
          />
          <div className="mt-8 border-t border-[color:var(--ww-stroke-soft)] pt-8">
            <MatchHistory userId={userId} />
          </div>
        </div>
      </div>

      {/* 2. Achievements Section */}
      <div className="space-y-4">
        <AchievementsPanel stats={stats} />
      </div>

      {/* 3. Settings Button */}
      <div className="pt-4 border-t border-white/10">
        <button
          onClick={() => setActiveTab('admin')}
          className="w-full py-4 ww-btn ww-btn--ink rounded-2xl text-[10px]"
        >
          系统设置 & 管理
        </button>
      </div>

      <AnimatePresence>
        {showShop && <ShopPanel onClose={() => setShowShop(false)} />}
        {showCustomizer && <CustomizerPanel onClose={() => setShowCustomizer(false)} />}
      </AnimatePresence>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'vocab': return <VocabTraining onMastered={(word) => handleGainExp(1, 'atk', word)} />;
      case 'scholar': return renderScholarPath();
      case 'leaderboard': return <div className="pb-32"><Leaderboard /></div>;
      case 'profile': return renderProfile();
      case 'reading': return <div className="h-full"><ReadingTraining onSuccess={(exp, gold) => {
        handleGainExp(exp, 'hp');
        if (gold) {
          addGold(gold);
          setStats(prev => ({ ...prev, gold: (prev.gold || 0) + gold }));
        }
      }} /></div>;
      case 'writing': return <div className="h-full"><WritingTraining onSuccess={(exp, gold) => {
        handleGainExp(exp, 'atk');
        if (gold) {
          addGold(gold);
          setStats(prev => ({ ...prev, gold: (prev.gold || 0) + gold }));
        }
      }} /></div>;
      case 'listening': return <div className="h-full"><ListeningTraining onSuccess={(exp, gold) => {
        handleGainExp(exp, 'def');
        if (gold) {
          addGold(gold);
          setStats(prev => ({ ...prev, gold: (prev.gold || 0) + gold }));
        }
      }} /></div>;
      case 'oral': return <div className="h-full"><OralTraining playerStats={stats} onSuccess={(exp, gold) => {
        handleGainExp(exp);
        if (gold) {
          addGold(gold);
          setStats(prev => ({ ...prev, gold: (prev.gold || 0) + gold }));
        }
      }} /></div>;
      case 'pvp_blitz':
      case 'pvp_tactics':
        return <div className="h-full"><BattleArena mode={activeTab} playerStats={stats} onVictory={() => setActiveTab('vocab')} onDefeat={() => setActiveTab('vocab')} /></div>;
      case 'admin': return <AdminPanel onUpdateStats={setStats} />;
      default: return <VocabTraining onMastered={(word) => handleGainExp(1, 'atk')} />;
    }
  };

  const navActiveId =
    isArenaMenuOpen || ['pvp_blitz', 'pvp_tactics'].includes(activeTab) ? 'arena' : activeTab;

  return (
    <div className="h-screen flex flex-col transition-colors duration-500 overflow-hidden ww-app">
      {/* Mini Header */}

      {/* Mini Header */}
      {!showShop && !showCustomizer && (
        <TopStatusBar
          avatar={avatar}
          username={user?.user_metadata?.username || user?.email || 'Word Warrior'}
          level={stats.level}
          gold={warriorState.gold}
        />
      )}

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
            {['reading', 'writing', 'listening', 'oral', 'pvp_blitz', 'pvp_tactics', 'admin'].includes(activeTab) && (
              <button
                onClick={() => {
                  if (['reading', 'writing', 'listening', 'oral'].includes(activeTab)) setActiveTab('scholar');
                  else setActiveTab('vocab');
                }}
                className="mt-4 mb-2 flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-white/80 hover:text-white"
              >
                <X size={12} /> 返回
              </button>
            )}
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      {/* Arena Pop-up Menu (kept from previous behavior) */}
      <AnimatePresence>
        {isArenaMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsArenaMenuOpen(false)}
              className="fixed inset-0 z-[150] bg-black/35 backdrop-blur-[2px]"
            />

            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 18 }}
              className="fixed bottom-[92px] left-0 right-0 z-[180] px-4 pb-3"
            >
              <div
                className="max-w-4xl mx-auto ww-surface ww-surface--soft rounded-[2rem] p-3 md:p-4 overflow-hidden"
                style={{ maxHeight: '70vh' }}
              >
                <div className="flex items-center justify-between gap-3 px-1 md:px-2">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-[0.32em] ww-muted">Arena</div>
                    <div className="text-[13px] md:text-sm font-black ww-ink">对战模式</div>
                  </div>
                  <button
                    onClick={() => setIsArenaMenuOpen(false)}
                    className="ww-btn ww-btn--ink rounded-2xl px-3 py-2 text-[10px]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <X size={14} /> 关闭
                    </span>
                  </button>
                </div>

                {/* Mobile: stacked compact cards. Desktop: 3-column grid. */}
                <div className="mt-2 grid grid-cols-1 gap-2 md:mt-3 md:grid-cols-3 md:gap-3 overflow-y-auto pr-1" style={{ maxHeight: 'calc(70vh - 56px)' }}>
                  {PVP_MODES.map((mode, idx) => (
                    <motion.button
                      key={mode.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      transition={{ delay: idx * 0.04 }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        setActiveTab(mode.id);
                        setIsArenaMenuOpen(false);
                      }}
                      className="text-left ww-surface ww-surface--soft rounded-[16px] p-2.5 md:p-4"
                      style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.14), 0 0 0 4px rgba(255,255,255,0.10)' }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br ${mode.color} shrink-0`}
                            style={{
                              border: '2px solid rgba(43,23,63,0.22)',
                              boxShadow: '0 5px 0 rgba(0,0,0,0.18)',
                            }}
                          >
                            {React.cloneElement(mode.icon as any, { size: 18 })}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] md:text-sm font-black ww-ink truncate">{mode.name}</div>
                            <div className="mt-0.5 text-[10px] font-bold ww-muted truncate">
                              {mode.description}
                            </div>
                            <div className="mt-1 hidden md:inline-flex ww-pill px-2 py-0.5 text-[9px] font-black tracking-widest whitespace-nowrap">
                              {mode.mechanic}
                            </div>
                          </div>
                        </div>

                        <div className="ww-btn ww-btn--accent inline-flex items-center justify-center rounded-xl px-3 py-2 text-[10px] shrink-0">
                          匹配
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {!['pvp_blitz', 'pvp_tactics', 'reading', 'writing', 'listening', 'oral'].includes(activeTab) && !showShop && !showCustomizer && (
        <GameBottomNav
          activeId={navActiveId}
          onSelect={(id) => {
            // Keep existing routes/tabs; this is purely a UI replacement.
            if (id === 'arena') setIsArenaMenuOpen((v) => !v);
            else {
              setActiveTab(id);
              setIsArenaMenuOpen(false);
            }
          }}
        />
      )}
    </div>
  );
};

export default App;
