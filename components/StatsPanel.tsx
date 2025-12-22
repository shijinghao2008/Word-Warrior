
import React from 'react';
import { Swords, Shield, Heart, Star } from 'lucide-react';
import { UserStats, Rank } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface StatsPanelProps {
  stats: UserStats;
  username?: string;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, username }) => {
  const { getColorClass, avatar } = useTheme();

  const StatRow = ({
    icon: Icon,
    label,
    value,
    colorClassName,
  }: {
    icon: any;
    label: string;
    value: React.ReactNode;
    colorClassName?: string;
  }) => (
    <div className="flex items-center justify-between gap-3 py-3 px-4 rounded-2xl bg-[rgba(255,255,255,0.35)] border-2 border-[color:var(--ww-stroke-soft)]">
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={14} className={colorClassName ?? 'text-[color:var(--ww-stroke)]'} />
        <span className="text-[10px] font-black uppercase tracking-widest ww-muted truncate">{label}</span>
      </div>
      <div className="text-sm font-black ww-ink tabular-nums">{value}</div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Big avatar */}
      <div className="flex flex-col items-center text-center gap-4">
        <div
          className="w-40 h-40 md:w-44 md:h-44 rounded-[999px] bg-[rgba(252,203,89,0.95)] shadow-2xl relative overflow-hidden flex items-center justify-center"
          style={{ border: '4px solid var(--ww-stroke)' }}
        >
          {avatar.startsWith('data:image') || avatar.startsWith('http') ? (
            <img src={avatar} alt="User Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-6xl">{avatar}</span>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-black rpg-font uppercase tracking-tighter ww-ink">
            {username || '战士档案'}
          </h2>
        </div>
      </div>

      {/* Pure numbers (no progress bars) */}
      <div className="grid grid-cols-1 gap-3">
        <StatRow
          icon={Star}
          label="等级（含成长进度）"
          value={
            <span>
              Lv.{stats.level}{' '}
              <span className="ww-muted text-[12px] font-black">EXP {stats.exp}/{stats.level * 100}</span>
            </span>
          }
          colorClassName={getColorClass('text', 500)}
        />
        <StatRow icon={Heart} label="生命上限 (HP)" value={stats.maxHp} colorClassName="text-fuchsia-600" />
        <StatRow icon={Swords} label="词汇攻击 (ATK)" value={stats.atk} colorClassName="text-blue-600" />
        <StatRow icon={Shield} label="语法防御 (DEF)" value={stats.def} colorClassName="text-emerald-600" />
      </div>
    </div>
  );
};

export default StatsPanel;
