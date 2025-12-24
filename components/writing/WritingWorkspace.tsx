import React, { useState } from 'react';
import { WritingMaterial, WritingResult } from '../../types';
import { writingService } from '../../services/writingService';
import { useAuth } from '../../contexts/AuthContext';
import { Send, ArrowLeft, PenTool, Sparkles } from 'lucide-react';
import WritingResultDisplay from './WritingResult';
import XPNotification from '../ui/XPNotification';

interface WritingWorkspaceProps {
    material: WritingMaterial;
    onBack: () => void;
    onComplete: (xpAwarded: number, goldAwarded?: number) => void;
}

const WritingWorkspace: React.FC<WritingWorkspaceProps> = ({ material, onBack, onComplete }) => {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<WritingResult | null>(null);
    const [showXPNotification, setShowXPNotification] = useState(false);
    const [xpEarned, setXpEarned] = useState(0);
    const [goldEarned, setGoldEarned] = useState(0);

    const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    const minWords = 20;

    const handleSubmit = async () => {
        if (!user) return;
        if (wordCount < minWords) {
            alert(`Please write at least ${minWords} words.`);
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await writingService.submitWriting(user.id, material, content);

            if (response.success && response.result) {
                setResult(response.result);
                if (response.xpAwarded > 0) {
                    setXpEarned(response.xpAwarded);
                    setGoldEarned(response.goldAwarded || 0);
                    setShowXPNotification(true);
                    onComplete(response.xpAwarded, response.goldAwarded);
                }
                // Force scroll to top or show success feedback
            } else {
                alert(response.message || 'Submission failed');
            }
        } catch (e) {
            console.error(e);
            alert('An unexpected error occurred during grading.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <button
                onClick={onBack}
                className="ww-btn ww-btn--ink px-4 py-2 rounded-2xl text-[10px] flex items-center gap-2 self-start mb-4"
            >
                <ArrowLeft size={16} /> 返回
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                {/* Left Side: Writing Area */}
                <div className="lg:col-span-7 flex flex-col space-y-4 h-full">
                    <div className="ww-surface ww-surface--soft p-6 rounded-3xl flex-1 flex flex-col">
                        <div className="mb-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] ww-muted">题目</span>
                            <h2 className="text-xl font-black ww-ink mt-1">{material.title}</h2>
                        </div>

                        <div className="relative flex-1">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                disabled={isSubmitting || !!result}
                                placeholder="Start writing here..."
                                className="custom-scrollbar w-full h-full min-h-[600px] dark:bg-slate-950 bg-slate-50 border-2 dark:border-slate-800 border-slate-200 rounded-xl p-4 focus:border-fuchsia-500 dark:focus:border-fuchsia-400 outline-none transition-all resize-none font-medium leading-relaxed dark:text-white text-slate-800"
                            />
                            <div className="absolute bottom-4 right-4 text-[10px] font-black ww-muted px-2 py-1 rounded-xl border-2"
                                style={{ borderColor: 'rgba(43,23,63,0.18)', background: 'rgba(255,255,255,0.25)' }}
                            >
                                {wordCount} 词
                            </div>
                        </div>

                        {!result && (
                            <div className="mt-4">
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || wordCount < minWords}
                                    className={`w-full py-3 rounded-2xl text-[10px] flex items-center justify-center gap-2 transition-all ${isSubmitting || wordCount < minWords ? 'ww-btn ww-btn--ink opacity-60 cursor-not-allowed' : 'ww-btn ww-btn--accent'}`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                            批改中...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} /> 提交
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Result & Feedback */}
                <div className="lg:col-span-5 h-full">
                    <div className="ww-surface ww-surface--soft p-6 rounded-3xl h-full">
                        {result ? (
                            <WritingResultDisplay result={result} />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-4">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(26,15,40,0.10)', border: '2px solid rgba(43,23,63,0.18)' }}>
                                    <Sparkles size={32} />
                                </div>
                                <p className="text-sm font-black uppercase tracking-wider ww-muted">
                                    提交后显示 AI 反馈
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <XPNotification
                amount={xpEarned}
                gold={goldEarned}
                isVisible={showXPNotification}
                onClose={() => setShowXPNotification(false)}
            />
        </div>
    );
};

export default WritingWorkspace;
