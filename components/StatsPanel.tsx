
import React, { useState } from 'react';
import { Swords, Shield, Heart, Star, ShoppingBag, ChevronRight, Zap, Info } from 'lucide-react';
import { UserStats, Rank } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { calculateKP, getKPRank } from '../constants';
import { useWarrior } from '../contexts/WarriorContext';

interface StatsPanelProps {
  stats: UserStats;
  username?: string;
  onShopClick?: () => void;
  onCustomClick?: () => void;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, username, onShopClick, onCustomClick }) => {
  const { getColorClass, avatar } = useTheme();
  const { state: warriorState, getItemDetails } = useWarrior();
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const getGearBonuses = () => {
    const bonuses = { atk: 0, def: 0, hp: 0 };
    if (warriorState.equipped.weapon) {
      const item = getItemDetails(warriorState.equipped.weapon);
      if (item?.statBonus) {
        bonuses.atk += item.statBonus.atk || 0;
        bonuses.def += item.statBonus.def || 0;
        bonuses.hp += item.statBonus.hp || 0;
      }
    }
    if (warriorState.equipped.armor) {
      const item = getItemDetails(warriorState.equipped.armor);
      if (item?.statBonus) {
        bonuses.atk += item.statBonus.atk || 0;
        bonuses.def += item.statBonus.def || 0;
        bonuses.hp += item.statBonus.hp || 0;
      }
    }
    return bonuses;
  };

  const gear = getGearBonuses();
  const kp = calculateKP({
    atk: stats.atk,
    def: stats.def,
    hp: stats.maxHp,
    level: stats.level
  }, gear);
  const currentRank = getKPRank(kp);

  const StatRow = ({
    icon: Icon,
    label,
    value,
    colorClassName,
    contribution,
    statType,
    gearContribution = 0,
  }: {
    icon: any;
    label: string;
    value: React.ReactNode;
    colorClassName?: string;
    contribution: number;
    statType: string;
    gearContribution?: number;
  }) => (
    <div 
      className="relative flex items-center justify-between gap-3 py-3 px-4 rounded-2xl bg-[rgba(255,255,255,0.35)] border-2 border-[color:var(--ww-stroke-soft)] cursor-pointer group hover:border-[color:var(--ww-stroke)] transition-colors"
      onClick={() => setActiveTooltip(activeTooltip === statType ? null : statType)}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={14} className={colorClassName ?? 'text-[color:var(--ww-stroke)]'} />
        <span className="text-[13px] font-black uppercase tracking-widest ww-muted truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-sm font-black ww-ink tabular-nums">{value}</div>
        <Info size={12} className="ww-muted opacity-50" />
      </div>

      {activeTooltip === statType && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-2 px-3 rounded-lg z-10 w-48 shadow-xl animate-in fade-in zoom-in duration-200">
          <div className="font-bold mb-1">当前 {statType} 贡献了 {(contribution + gearContribution).toLocaleString()} 点战力！</div>
          {gearContribution > 0 && (
            <div className="text-yellow-400 mb-1">(其中装备贡献了 {gearContribution} 点)</div>
          )}
          <div className="opacity-80">继续提升 {statType} 以获得更多 KP！</div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45" />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Big avatar with Rank Border */}
      <div className="flex flex-col items-center text-center gap-4">
        <div className="relative group">
          {/* Rank Badge Floating */}
          <div className={`absolute -top-2 -right-2 z-10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-lg border-2 ${currentRank.bg} ${currentRank.color} ${currentRank.border} transform -rotate-12 group-hover:rotate-0 transition-transform`}>
            {currentRank.name}
          </div>
          
          <div
            className={`w-40 h-40 md:w-44 md:h-44 rounded-[999px] bg-[rgba(252,203,89,0.95)] shadow-2xl relative overflow-hidden flex items-center justify-center border-4 ${currentRank.border}`}
          >
            {avatar.startsWith('data:image') || avatar.startsWith('http') ? (
              <img src={avatar} alt="User Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-6xl">{avatar}</span>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Zap size={20} className="text-yellow-500 fill-yellow-500 animate-pulse" />
            <span className="text-3xl font-black italic tracking-tighter text-yellow-600 drop-shadow-sm">
              {kp.toLocaleString()}
            </span>
          </div>
          <h2 className="text-xl font-black rpg-font uppercase tracking-tighter ww-ink flex items-center justify-center gap-2">
            {username || '战士档案'}
          </h2>
        </div>
      </div>

      {/* Pure numbers (no progress bars) */}
      <div className="grid grid-cols-1 gap-3">
        <StatRow
          icon={Star}
          label="等级与经验"
          statType="Level"
          contribution={stats.level * 100}
          value={
            <span>
              Lv.{stats.level}{' '}
              <span className="ww-muted text-[12px] font-black">EXP {stats.exp}/{stats.level * 100}</span>
            </span>
          }
          colorClassName={getColorClass('text', 500)}
        />
        <StatRow 
          icon={Heart} 
          label="生命上限 (HP)" 
          statType="HP"
          contribution={stats.maxHp * 2}
          gearContribution={gear.hp * 2}
          value={stats.maxHp + (gear.hp > 0 ? ` (+${gear.hp})` : '')} 
          colorClassName="text-fuchsia-600" 
        />
        <StatRow 
          icon={Swords} 
          label="词汇攻击 (ATK)" 
          statType="ATK"
          contribution={stats.atk * 10}
          gearContribution={gear.atk * 10}
          value={stats.atk + (gear.atk > 0 ? ` (+${gear.atk})` : '')} 
          colorClassName="text-blue-600" 
        />
        <StatRow 
          icon={Shield} 
          label="语法防御 (DEF)" 
          statType="DEF"
          contribution={stats.def * 15}
          gearContribution={gear.def * 15}
          value={stats.def + (gear.def > 0 ? ` (+${gear.def})` : '')} 
          colorClassName="text-emerald-600" 
        />
      </div>

      {/* Shop Button (Big Entry) */}
      {onShopClick && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onShopClick}
            className="col-span-2 relative overflow-hidden group rounded-2xl p-4 transition-all active:scale-[0.98] border-2 border-[color:var(--ww-stroke)]"
            style={{ background: 'var(--ww-surface-0)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-rose-400/20 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-lg border-2 border-[color:var(--ww-stroke)]">
                  <ShoppingBag size={24} className="text-white" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-black ww-ink">商店</div>
                  <div className="text-[10px] ww-muted font-bold uppercase tracking-widest">Upgrade Gear</div>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center group-hover:translate-x-1 transition-transform border border-[color:var(--ww-stroke-soft)]">
                <ChevronRight size={16} className="text-[color:var(--ww-stroke)]" />
              </div>
            </div>
          </button>

          {/* Customizer Button (Added) */}
          <button
            onClick={onCustomClick}
            className="col-span-2 relative overflow-hidden group rounded-2xl p-3 transition-all active:scale-[0.98] border-2 border-[color:var(--ww-stroke-soft)] hover:border-[color:var(--ww-stroke)] bg-[color:var(--ww-surface-soft)]"
          >
            <div className="relative flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                {/* Mini Icon */}
                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-md border border-indigo-400">
                  <Swords size={16} className="text-white" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-black ww-ink">外观定制</div>
                  <div className="text-[9px] ww-muted font-bold uppercase tracking-widest">Customize Look</div>
                </div>
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default StatsPanel;
