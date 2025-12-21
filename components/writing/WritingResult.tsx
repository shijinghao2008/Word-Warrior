import React from 'react';
import { WritingResult } from '../../types';
import { Sparkles, Trophy, BookOpen, PenTool, Brain } from 'lucide-react';
import { motion } from 'framer-motion';

interface WritingResultProps {
    result: WritingResult;
}

const WritingResultDisplay: React.FC<WritingResultProps> = ({ result }) => {
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-500';
        if (score >= 60) return 'text-yellow-500';
        return 'text-red-500';
    };

    const scoreItems = [
        { label: 'Vocabulary', score: result.score.vocab, icon: <BookOpen size={16} /> },
        { label: 'Grammar', score: result.score.grammar, icon: <PenTool size={16} /> },
        { label: 'Content', score: result.score.content, icon: <Brain size={16} /> },
    ];

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">综合得分 (Total Score)</span>
                <span className={`text-5xl font-black rpg-font ${getScoreColor(result.score.total)}`}>{result.score.total}</span>
            </div>

            {/* Sub-scores */}
            <div className="grid grid-cols-3 gap-2">
                {scoreItems.map((item) => (
                    <div key={item.label} className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl flex flex-col items-center gap-1 text-center">
                        <div className="text-fuchsia-500">{item.icon}</div>
                        <span className="text-[10px] uppercase text-slate-500 font-bold">{item.label}</span>
                        <span className={`text-xl font-bold ${getScoreColor(item.score)}`}>{item.score}</span>
                    </div>
                ))}
            </div>

            <div className="space-y-2">
                <p className="text-sm font-bold text-fuchsia-500 dark:text-fuchsia-400 flex items-center gap-2">
                    <Sparkles size={16} /> 大贤者评语 (Feedback)：
                </p>
                <p className="text-sm dark:text-slate-300 text-slate-600 leading-relaxed italic bg-fuchsia-500/5 p-4 rounded-xl border border-fuchsia-500/10">
                    "{result.feedback}"
                </p>
            </div>

            {result.corrections && result.corrections.length > 0 && (
                <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">改进建议 (Suggestions)</p>
                    <ul className="space-y-3">
                        {result.corrections.map((c: string, i: number) => (
                            <li key={i} className="text-xs dark:bg-slate-800/50 bg-slate-100 p-4 rounded-xl border-l-4 border-fuchsia-500 leading-relaxed dark:text-slate-300 text-slate-700">
                                {c}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default WritingResultDisplay;
