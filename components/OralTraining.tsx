
import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import FreeTalking from './oral/FreeTalking';
import SpeakingAssessment from './speaking-assessment/SpeakingAssessment';

interface OralTrainingProps {
  playerStats: any;
  onSuccess: (exp: number) => void;
}

const OralTraining: React.FC<OralTrainingProps> = ({ playerStats, onSuccess }) => {
  const { getColorClass } = useTheme();
  const { user } = useAuth();

  // Mode State - 只有两个模式：AI评估和自由对话
  const [mode, setMode] = useState<'freeTalking' | 'assessment'>('assessment');

  return (
    <div className="h-full flex flex-col relative select-none pb-20">

      {/* Mode Switcher */}
      <div className="px-4 pt-4 shrink-0">
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setMode('assessment')}
            className={`flex-1 py-3 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'assessment'
              ? `${getColorClass('bg', 600)} text-white shadow-md`
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            AI评估
          </button>
          <button
            onClick={() => setMode('freeTalking')}
            className={`flex-1 py-3 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'freeTalking'
              ? `${getColorClass('bg', 600)} text-white shadow-md`
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            自由对话
          </button>
        </div>
      </div>

      {/* Conditional Rendering Based on Mode */}
      {mode === 'assessment' ? (
        <SpeakingAssessment
          userId={user?.id || ''}
          onSuccess={onSuccess}
          onClose={() => setMode('assessment')}
        />
      ) : (
        <FreeTalking onSuccess={onSuccess} onClose={() => setMode('assessment')} />
      )}

    </div>
  );
};

export default OralTraining;
