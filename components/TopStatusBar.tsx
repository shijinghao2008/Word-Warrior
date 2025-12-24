import React from 'react';
import { Coins, Star, Zap } from 'lucide-react';
import { getKPRank } from '../constants';

export type TopStatusBarProps = {
  avatar: string;
  username: string;
  level: number;
  gold: number;
  kp: number;
};

export const TopStatusBar: React.FC<TopStatusBarProps> = ({ avatar, username, level, gold, kp }) => {
  const currentRank = getKPRank(kp);

  return (
    <header className="shrink-0 px-4 pt-4">
      <div className="max-w-3xl mx-auto">
        <div className="ww-surface ww-surface--soft rounded-[22px] px-4 py-3 flex items-center gap-3 border-2 border-[color:var(--ww-stroke-soft)] shadow-lg">
          {/* Avatar with Rank Border */}
          <div className="relative">
            <div
              className={`w-12 h-12 rounded-full bg-[rgba(252,203,89,0.95)] overflow-hidden flex items-center justify-center shrink-0 border-2 ${currentRank.border}`}
            >
              {avatar.startsWith('data:image') || avatar.startsWith('http') ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">{avatar}</span>
              )}
            </div>
          </div>

          {/* Name + KP + Level */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="text-sm font-black ww-ink truncate">{username}</div>
              <div className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${currentRank.bg} ${currentRank.color} border border-current opacity-80`}>
                {currentRank.name}
              </div>
            </div>
            <div className="mt-0.5 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star size={12} className="text-yellow-500 fill-yellow-500" />
                <div className="text-[10px] font-black uppercase tracking-widest ww-muted">Lv.{level}</div>
              </div>
              <div className="flex items-center gap-1">
                <Zap size={12} className="text-yellow-600 fill-yellow-600" />
                <div className="text-[10px] font-black italic tracking-tighter text-yellow-700">
                  {kp.toLocaleString()} KP
                </div>
              </div>
            </div>
          </div>

          {/* Gold */}
          <div className="shrink-0">
            <div className="px-3 py-1.5 ww-pill ww-pill--accent flex items-center gap-2 border-2 border-[color:var(--ww-stroke)]">
              <Coins size={14} className="text-black" />
              <span className="text-black font-black font-mono tabular-nums text-xs">{gold}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};


