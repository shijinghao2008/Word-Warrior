
import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import FreeTalking from './oral/FreeTalking';
import SpeakingAssessment from './speaking-assessment/SpeakingAssessment';
import { Mic2 } from 'lucide-react';

interface OralTrainingProps {
  playerStats: any;
  onSuccess: (exp: number, gold?: number) => void;
  onToggleStatusBar?: (hidden: boolean) => void;
}

const OralTraining: React.FC<OralTrainingProps> = ({ playerStats, onSuccess, onToggleStatusBar }) => {
  const { getColorClass } = useTheme();
  const { user } = useAuth();

  // Mode State - 只有两个模式：AI评估和自由对话
  const [mode, setMode] = useState<'freeTalking' | 'assessment'>('assessment');

  return (
    <div className="h-full flex flex-col relative select-none pb-20 max-w-6xl mx-auto px-4 pt-6">
      <div className="ww-surface ww-surface--soft rounded-[22px] p-4 flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{
            background: 'rgba(252,203,89,0.95)',
            border: '3px solid var(--ww-stroke)',
            boxShadow: '0 6px 0 rgba(0,0,0,0.18)',
          }}
        >
          <Mic2 className="w-6 h-6 text-black" />
        </div>
        <div className="min-w-0">
          <h2 className="text-[14px] font-black ww-ink uppercase tracking-widest">口语修行</h2>
          <p className="text-[10px] font-black ww-muted uppercase tracking-[0.18em]">评估或自由对话 → 领取 EXP</p>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="shrink-0">
        <div className="ww-surface ww-surface--soft flex gap-2 p-1.5 rounded-[22px]">
          <button
            onClick={() => setMode('assessment')}
            className={`flex-1 py-3 px-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${mode === 'assessment'
              ? 'bg-[rgba(252,203,89,0.95)] text-black border-[color:var(--ww-stroke)]'
              : 'bg-[rgba(255,255,255,0.22)] text-[rgba(26,15,40,0.75)] border-[color:var(--ww-stroke-soft)]'
              }`}
          >
            AI评估
          </button>
          <button
            onClick={() => setMode('freeTalking')}
            className={`flex-1 py-3 px-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${mode === 'freeTalking'
              ? 'bg-[rgba(252,203,89,0.95)] text-black border-[color:var(--ww-stroke)]'
              : 'bg-[rgba(255,255,255,0.22)] text-[rgba(26,15,40,0.75)] border-[color:var(--ww-stroke-soft)]'
              }`}
          >
            自由对话
          </button>
        </div>
      </div>

      {/* Conditional Rendering Based on Mode */}
      {mode === 'assessment' ? (
        <div className="mt-4">
          <SpeakingAssessment
            userId={user?.id || ''}
            onSuccess={onSuccess}
            onClose={() => setMode('assessment')}
            onToggleStatusBar={onToggleStatusBar}
          />
        </div>
      ) : (
        <div className="mt-4">
          <FreeTalking
            onSuccess={onSuccess}
            onClose={() => {
              setMode('assessment');
              onToggleStatusBar?.(false);
            }}
            onMount={() => onToggleStatusBar?.(true)}
          />
        </div>
      )}

    </div>
  );
};

export default OralTraining;
