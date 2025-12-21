import React, { useState } from 'react';
import { WritingMaterial, WritingResult } from '../../types';
import { writingService } from '../../services/writingService';
import { useAuth } from '../../contexts/AuthContext';
import { Send, ArrowLeft, PenTool, Sparkles } from 'lucide-react';
import WritingResultDisplay from './WritingResult';

interface WritingWorkspaceProps {
    material: WritingMaterial;
    onBack: () => void;
    onComplete: (xpAwarded: number) => void;
}

const WritingWorkspace: React.FC<WritingWorkspaceProps> = ({ material, onBack, onComplete }) => {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<WritingResult | null>(null);

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
                    onComplete(response.xpAwarded);
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
                className="self-start mb-4 flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
            >
                <ArrowLeft size={16} /> Back to Topics
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                {/* Left Side: Writing Area */}
                <div className="lg:col-span-7 flex flex-col space-y-4 h-full">
                    <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 p-6 rounded-3xl shadow-xl flex-1 flex flex-col">
                        <div className="mb-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-500/50">Topic / 题目</span>
                            <h2 className="text-xl font-bold dark:text-white text-slate-900 mt-1">{material.title}</h2>
                        </div>

                        <div className="relative flex-1">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                disabled={isSubmitting || !!result}
                                placeholder="Start writing here..."
                                className="w-full h-full dark:bg-slate-950 bg-slate-50 border-2 dark:border-slate-800 border-slate-200 rounded-xl p-4 focus:border-fuchsia-500 dark:focus:border-fuchsia-400 outline-none transition-all resize-none font-medium leading-relaxed dark:text-white text-slate-800"
                            />
                            <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                {wordCount} words
                            </div>
                        </div>

                        {!result && (
                            <div className="mt-4">
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || wordCount < minWords}
                                    className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 rounded-xl font-black tracking-widest uppercase flex items-center justify-center gap-2 text-white shadow-lg shadow-fuchsia-500/20 transition-all"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                            Grading...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} /> Submit
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Result & Feedback */}
                <div className="lg:col-span-5 h-full">
                    <div className="dark:bg-slate-900/50 bg-white/50 border dark:border-slate-800 border-slate-200 p-6 rounded-3xl h-full shadow-inner backdrop-blur-sm">
                        {result ? (
                            <WritingResultDisplay result={result} />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                                    <Sparkles size={32} />
                                </div>
                                <p className="text-sm font-bold uppercase tracking-wider text-slate-500">
                                    Write and submit<br />to get AI Feedback
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WritingWorkspace;
