import React, { useState } from 'react';
import { ReadingMaterial } from '../../types';
import { ArrowLeft, BookOpen, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import ReadingQuestionItem from './ReadingQuestionItem';
import confetti from 'canvas-confetti';

interface ReadingReaderProps {
    material: ReadingMaterial;
    onBack: () => void;
    onComplete: (score: number) => void;
}

const ReadingReader: React.FC<ReadingReaderProps> = ({ material, onBack, onComplete }) => {
    const [score, setScore] = useState(0);
    const [answeredCount, setAnsweredCount] = useState(0);

    const handleQuestionAnswer = (isCorrect: boolean) => {
        if (isCorrect) {
            setScore(prev => prev + 1);
            confetti({
                particleCount: 30,
                spread: 40,
                origin: { y: 0.8 },
                colors: ['#8b5cf6', '#6366f1', '#10b981']
            });
        }
        setAnsweredCount(prev => prev + 1);
    };

    const handleFinish = () => {
        onComplete(score);
    };

    const allAnswered = answeredCount === material.questions.length;

    return (
        <div className="max-w-4xl mx-auto">
            <button
                onClick={onBack}
                className="ww-btn ww-btn--ink px-4 py-2 rounded-2xl text-[10px] flex items-center gap-2 mb-4"
            >
                <ArrowLeft className="w-5 h-5" />
                返回
            </button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="ww-surface ww-surface--soft rounded-[22px] p-8 md:p-10 relative overflow-hidden mb-12"
            >
                <div className="relative z-10">
                    <header className="mb-6 border-b pb-6" style={{ borderColor: 'rgba(43,23,63,0.16)' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2"
                                style={{ borderColor: 'rgba(43,23,63,0.22)', background: 'rgba(255,255,255,0.25)', color: 'rgba(26,15,40,0.75)' }}
                            >
                                {material.category || '通用'}
                            </span>
                            <span className="ww-muted text-sm">•</span>
                            <span className="ww-muted text-sm">{material.difficulty}</span>
                        </div>
                        <h1 className="text-2xl md:text-4xl font-black ww-ink mb-2 leading-tight">
                            {material.title}
                        </h1>
                    </header>

                    <div className="max-w-none mb-10">
                        {material.content.split('\n').map((paragraph, index) => (
                            <p key={index} className="mb-5 ww-ink leading-relaxed text-base md:text-lg">
                                {paragraph}
                            </p>
                        ))}
                    </div>

                    <div className="mt-8 pt-8 border-t" style={{ borderColor: 'rgba(43,23,63,0.16)' }}>
                        <h2 className="text-lg font-black ww-ink mb-6 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-2xl flex items-center justify-center text-sm font-black"
                                style={{ background: 'rgba(252,203,89,0.95)', border: '3px solid var(--ww-stroke)', boxShadow: '0 6px 0 rgba(0,0,0,0.18)' }}
                            >
                                ?
                            </span>
                            阅读理解题
                        </h2>

                        <div className="space-y-2">
                            {material.questions.map((question, index) => (
                                <ReadingQuestionItem
                                    key={question.id}
                                    index={index}
                                    question={question}
                                    onAnswer={handleQuestionAnswer}
                                />
                            ))}
                        </div>

                        {allAnswered && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-8 flex flex-col items-center justify-center p-8 rounded-[22px] border-2"
                                style={{ borderColor: 'rgba(43,23,63,0.22)', background: 'rgba(255,255,255,0.18)' }}
                            >
                                <div className="mb-4">
                                    <CheckCircle className="w-16 h-16 mx-auto mb-2" style={{ color: 'rgba(16,185,129,0.95)' }} />
                                    <p className="text-xl font-black ww-ink text-center">完成！</p>
                                </div>
                                <p className="ww-muted mb-6 font-black">
                                    正确 <span className="ww-ink">{score}</span> / <span className="ww-ink">{material.questions.length}</span>
                                </p>
                                <button
                                    onClick={handleFinish}
                                    className="px-8 py-3 ww-btn ww-btn--accent rounded-2xl text-[10px]"
                                >
                                    领取 EXP
                                </button>
                            </motion.div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ReadingReader;
