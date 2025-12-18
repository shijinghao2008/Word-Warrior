
import React from 'react';
import { Trophy, Medal, Crown, TrendingUp, User } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_LEADERS = [
  { rank: 1, name: "GodOfVocab", title: "Vocabulary Titan", level: 99, winRate: "98%", points: 2840, isUser: false },
  { rank: 2, name: "SyntaxSorcerer", title: "Grammar Guardian", level: 85, winRate: "92%", points: 2610, isUser: false },
  { rank: 3, name: "ChantMaster", title: "Oral Emperor", level: 78, winRate: "89%", points: 2450, isUser: false },
  { rank: 4, name: "ExamHunter", title: "TOEFL Slayer", level: 72, winRate: "85%", points: 2100, isUser: false },
  { rank: 5, name: "QuietScholar", title: "Reading Sage", level: 68, winRate: "84%", points: 1980, isUser: false },
  { rank: 6, name: "NightOwl", title: "Dictation Ghost", level: 65, winRate: "81%", points: 1850, isUser: false },
];

const MOCK_USER_NEIGHBORS = [
  { rank: 41, name: "ShadowWord", title: "Pioneer", level: 32, winRate: "65%", points: 1250, isUser: false },
  { rank: 42, name: "You (你)", title: "Rising Warrior", level: 31, winRate: "68%", points: 1240, isUser: true },
  { rank: 43, name: "EchoLearner", title: "Explorer", level: 30, winRate: "62%", points: 1220, isUser: false },
];

const LeaderRow: React.FC<{ leader: any }> = ({ leader }) => (
  <tr className={`group transition-colors ${leader.isUser ? 'bg-indigo-500/10 dark:bg-indigo-500/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
    <td className={`px-4 py-4 md:px-8 md:py-6 text-sm font-black ${leader.isUser ? 'text-indigo-600' : 'text-slate-400'}`}>
      #{leader.rank}
    </td>
    <td className="px-4 py-4 md:px-8 md:py-6">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="relative shrink-0">
          <img 
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${leader.name}`} 
            className={`w-7 h-7 md:w-10 md:h-10 rounded-full border ${leader.isUser ? 'border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'border-slate-200 dark:border-slate-800'} bg-white dark:bg-slate-800`} 
            alt="" 
          />
          {leader.isUser && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white dark:border-slate-900" />}
        </div>
        <span className={`font-bold text-xs md:text-sm truncate max-w-[80px] md:max-w-none ${leader.isUser ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-white'}`}>
          {leader.name}
        </span>
      </div>
    </td>
    <td className="px-4 py-4 md:px-8 md:py-6">
      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 md:px-3 md:py-1 rounded-md">
        {leader.title}
      </span>
    </td>
    <td className="px-8 py-6 hidden md:table-cell">
      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Lvl {leader.level}</span>
    </td>
    <td className="px-8 py-6 hidden lg:table-cell">
      <div className="flex items-center gap-2">
        <TrendingUp size={14} className="text-emerald-500" />
        <span className="text-sm font-bold text-slate-800 dark:text-white">{leader.winRate}</span>
      </div>
    </td>
    <td className={`px-4 py-4 md:px-8 md:py-6 text-right font-black rpg-font text-xs md:text-base ${leader.isUser ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
      {leader.points}
    </td>
  </tr>
);

const Leaderboard: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8 px-2 md:px-0">
      <div className="text-center space-y-2">
        <h2 className="text-3xl md:text-4xl font-black rpg-font tracking-tighter uppercase dark:text-white text-slate-900 underline decoration-indigo-500 decoration-4 underline-offset-8">排行榜</h2>
        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em]">全球实时数据 • 竞争白热化</p>
      </div>

      {/* Top 3 Featured */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        {MOCK_LEADERS.slice(0, 3).map((leader) => (
          <motion.div 
            key={leader.rank} 
            whileHover={{ y: -5 }}
            className={`relative p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border-2 flex flex-col items-center text-center transition-all ${
              leader.rank === 1 ? 'dark:bg-amber-500/10 bg-amber-50 border-amber-500/50 shadow-amber-500/10 shadow-xl' : 
              leader.rank === 2 ? 'dark:bg-slate-400/10 bg-slate-50 border-slate-400/50 shadow-slate-400/5 shadow-lg' : 
              'dark:bg-orange-900/10 bg-orange-50 border-orange-900/40 shadow-orange-900/5 shadow-lg'
            }`}
          >
            <div className="absolute -top-3 bg-white dark:bg-slate-900 border-2 border-inherit px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
              {leader.rank === 1 ? <Crown size={12} className="text-amber-500" /> : <Medal size={12} className="text-inherit" />}
              Rank {leader.rank}
            </div>
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${leader.name}`} 
              className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-white dark:border-slate-800 shadow-md mb-3 bg-white dark:bg-slate-800" 
              alt={leader.name}
            />
            <h3 className="text-lg font-black rpg-font mb-0.5 dark:text-white text-slate-900 truncate w-full px-2">{leader.name}</h3>
            <span className="text-[8px] md:text-[9px] font-black uppercase text-indigo-500 dark:text-indigo-400 mb-3">{leader.title}</span>
            <div className="flex justify-around w-full pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase">Points</p>
                <p className="text-xs font-bold text-slate-800 dark:text-white">{leader.points}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase">Lvl</p>
                <p className="text-xs font-bold text-slate-800 dark:text-white">{leader.level}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Leaderboard Table */}
      <div className="space-y-6">
        <div className="dark:bg-slate-900/40 bg-white border dark:border-slate-800 border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="dark:bg-slate-950 bg-slate-50 text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest border-b dark:border-slate-800 border-slate-200">
              <tr>
                <th className="px-4 py-4 md:px-8 md:py-6 w-[15%] md:w-24">排名</th>
                <th className="px-4 py-4 md:px-8 md:py-6 w-[35%]">武者</th>
                <th className="px-4 py-4 md:px-8 md:py-6 w-[25%] md:w-auto">段位</th>
                <th className="px-8 py-6 hidden md:table-cell">等级</th>
                <th className="px-8 py-6 hidden lg:table-cell">胜率</th>
                <th className="px-4 py-4 md:px-8 md:py-6 text-right w-[25%] md:w-32">分数</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800 divide-slate-100">
              {MOCK_LEADERS.slice(3).map((leader) => (
                <LeaderRow key={leader.rank} leader={leader} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Separator / Your Position Section */}
        <div className="relative flex items-center justify-center py-4">
           <div className="absolute inset-0 flex items-center">
             <div className="w-full border-t border-dashed dark:border-slate-800 border-slate-200" />
           </div>
           <div className="relative px-6 bg-slate-50 dark:bg-[#020617] flex items-center gap-2">
             <User size={14} className="text-indigo-500" />
             <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">你的实时顺位 (Your Standing)</span>
           </div>
        </div>

        <div className="dark:bg-slate-900/40 bg-white border-2 border-indigo-500/30 rounded-[2rem] overflow-hidden shadow-lg shadow-indigo-500/5">
           <table className="w-full text-left border-collapse table-fixed">
             <tbody className="divide-y dark:divide-slate-800 divide-slate-100">
               {MOCK_USER_NEIGHBORS.map((leader) => (
                 <LeaderRow key={leader.rank} leader={leader} />
               ))}
             </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
