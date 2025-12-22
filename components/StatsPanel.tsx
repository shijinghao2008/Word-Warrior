import React from 'react';
import { Swords, Shield, Zap, Heart, Star, Trophy, Sparkles } from 'lucide-react';
import { UserStats, Rank } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { PixelProgress, PixelCard, PixelBadge } from './ui/PixelComponents';

interface StatsPanelProps {
  stats: UserStats;
  username?: string;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, username }) => {
  const { getColorClass, avatar } = useTheme();

  const StatItem = ({ icon: Icon, label, value, max, color }: any) => {
    // Generate Tailwind color class for PixelProgress
    // Map text colors to bg colors roughly
    let progressColor = 'bg-slate-500';
    if (color.includes('fuchsia')) progressColor = 'bg-fuchsia-500';
    else if (color.includes('blue')) progressColor = 'bg-blue-500';
    else if (color.includes('emerald')) progressColor = 'bg-emerald-500';
    else if (color.includes('amber')) progressColor = 'bg-amber-500';
    else if (color.includes('indigo')) progressColor = 'bg-indigo-500';

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <Icon size={12} className={color} /> {label}
          </span>
          <span className="text-xs font-bold text-slate-200">{value}{max ? ` / ${max}` : ''}</span>
        </div>
        <PixelProgress value={value} max={max || 100} color={progressColor} showValue={false} height="h-4" />
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="flex items-center gap-6 pb-6 border-b-4 border-black">
        <div className="w-24 h-24 border-4 border-black bg-slate-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
          {avatar.startsWith('data:image') || avatar.startsWith('http') ? (
            <img src={avatar} alt="User Avatar" className="w-full h-full object-cover pixel-art" />
          ) : (
            <div className="flex items-center justify-center h-full text-4xl">{avatar}</div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white drop-shadow-[2px_2px_0_#000]">
            {username || 'UNKNOWN WARRIOR'}
          </h2>
          <PixelBadge variant="warning">
            RANK: {stats.rank}
          </PixelBadge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <StatItem icon={Star} label="EXP Progress" value={stats.exp} max={stats.level * 100} color="text-indigo-400" />
          <StatItem icon={Heart} label="Max Health (HP)" value={stats.hp} max={stats.maxHp} color="text-fuchsia-500" />
          <StatItem icon={Sparkles} label="Mana / Energy" value={Math.round(stats.crit * 100)} max={100} color="text-amber-500" />
        </div>

        <div className="space-y-6">
          <StatItem icon={Swords} label="Attack Power (ATK)" value={stats.atk} max={stats.level * 20} color="text-blue-500" />
          <StatItem icon={Shield} label="Defense (DEF)" value={stats.def} max={stats.level * 20} color="text-emerald-500" />
        </div>
      </div>

      {/* Footer Stats inside Cards */}
      <div className="grid grid-cols-2 gap-4 pt-4">
        <PixelCard variant="dark" className="p-4 flex flex-col items-center gap-2">
          <Trophy size={24} className="text-yellow-500" />
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Rank Points</p>
          <p className="text-2xl font-black text-white">{stats.rankPoints}</p>
        </PixelCard>

        <PixelCard variant="dark" className="p-4 flex flex-col items-center gap-2">
          <Zap size={24} className="text-indigo-500" />
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Win Streak</p>
          <p className="text-2xl font-black text-white">{stats.winStreak}</p>
        </PixelCard>
      </div>

    </div>
  );
};

export default StatsPanel;
