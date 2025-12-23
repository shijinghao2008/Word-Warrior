import React, { useState } from 'react';
import { ReadingMaterial, ReadingQuestion } from '../../types';
import { ArrowLeft, CheckCircle, XCircle, Brain, Send, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface ReadingReaderProps {
    material: ReadingMaterial;
    onBack: () => void;
    onComplete: (score: number) => void;
}

// Answer state for each question
interface QuestionAnswer {
    questionId: string;
    selectedOption: string | null;
    isChecked: boolean;
    isCorrect: boolean;
}

const ReadingReader: React.FC<ReadingReaderProps> = ({ material, onBack, onComplete }) => {
    const [answers, setAnswers] = useState<QuestionAnswer[]>(
        material.questions.map(q => ({
            questionId: q.id,
            selectedOption: null,
            isChecked: false,
            isCorrect: false
        }))
    );
    const [showReview, setShowReview] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const answeredCount = answers.filter(a => a.selectedOption !== null).length;
    const allAnswered = answeredCount === material.questions.length;
    const score = answers.filter(a => a.isCorrect).length;

    const handleOptionSelect = (questionIndex: number, option: string) => {
        if (isSubmitted) return;

        setAnswers(prev => prev.map((a, i) =>
            i === questionIndex ? { ...a, selectedOption: option } : a
        ));
    };

    const handleSubmitAll = () => {
        if (!allAnswered) return;

        const newAnswers = answers.map((a, i) => {
            const question = material.questions[i];
            const isCorrect = a.selectedOption?.trim() === (question.answer || '').trim();
            return { ...a, isChecked: true, isCorrect };
        });

        setAnswers(newAnswers);
        setIsSubmitted(true);

        const correctCount = newAnswers.filter(a => a.isCorrect).length;
        if (correctCount === material.questions.length) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#FCCB59', '#5B3C8E', '#10b981', '#4A2F75']
            });
        } else if (correctCount > 0) {
            confetti({
                particleCount: 30,
                spread: 40,
                origin: { y: 0.8 },
                colors: ['#FCCB59', '#5B3C8E', '#10b981']
            });
        }
    };

    const handleFinish = () => {
        onComplete(score);
    };

    // Review Mode Component
    const ReviewSection = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 space-y-6"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black ww-ink flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    答题回顾
                </h3>
                <span className="text-sm ww-muted font-bold">
                    正确 {score} / {material.questions.length}
                </span>
            </div>

            {material.questions.map((question, index) => {
                const answer = answers[index];
                return (
                    <div
                        key={question.id}
                        className={`ww-surface ww-surface--soft p-5 rounded-[18px] ${answer.isCorrect ? 'ww-choice--ok' : 'ww-choice--bad'}`}
                    >
                        <div className="flex items-start gap-3 mb-3">
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white ${answer.isCorrect ? 'bg-green-500' : 'bg-red-500'
                                }`}>
                                {answer.isCorrect ? '✓' : '✗'}
                            </span>
                            <p className="font-black ww-ink flex-1">Q{index + 1}. {question.question}</p>
                        </div>

                        <div className="ml-10 space-y-2 text-sm">
                            <p className="ww-muted">
                                <span className="font-black">你的答案：</span>
                                <span className={answer.isCorrect ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                                    {answer.selectedOption || '未作答'}
                                </span>
                            </p>
                            {!answer.isCorrect && (
                                <p className="ww-muted">
                                    <span className="font-black">正确答案：</span>
                                    <span className="text-green-600 font-bold">{question.answer}</span>
                                </p>
                            )}
                            {question.explanation && (
                                <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(252,203,89,0.25)', border: '2px solid rgba(252,203,89,0.5)' }}>
                                    <p className="ww-ink flex items-start gap-2">
                                        <Brain className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--ww-accent)' }} />
                                        <span>{question.explanation}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </motion.div>
    );

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
                    <header className="mb-6 border-b pb-6 ww-divider">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="ww-pill ww-pill--accent px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                                {material.category || '通用'}
                            </span>
                            <span className="ww-muted text-sm">•</span>
                            <span className="ww-muted text-sm font-bold">{material.difficulty}</span>
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

                    <div className="mt-8 pt-8 border-t ww-divider">
                        {/* Progress Indicator */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-black ww-ink flex items-center gap-3">
                                <span className="w-8 h-8 rounded-2xl flex items-center justify-center text-sm font-black"
                                    style={{ background: 'var(--ww-accent)', border: '3px solid var(--ww-stroke)', boxShadow: '0 6px 0 rgba(0,0,0,0.18)' }}
                                >
                                    ?
                                </span>
                                阅读理解题
                            </h2>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-black ww-muted">
                                    已答 {answeredCount} / {material.questions.length}
                                </span>
                                <div className="w-24 h-3 rounded-full overflow-hidden" style={{ border: '2px solid var(--ww-stroke)', background: 'rgba(255,255,255,0.5)' }}>
                                    <div
                                        className="h-full transition-all duration-300 rounded-full"
                                        style={{
                                            width: `${(answeredCount / material.questions.length) * 100}%`,
                                            background: isSubmitted ? 'rgba(16,185,129,0.9)' : 'var(--ww-accent)'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Questions */}
                        <div className="space-y-6">
                            {material.questions.map((question, qIndex) => {
                                const answer = answers[qIndex];
                                return (
                                    <div key={question.id} className="ww-surface ww-surface--soft rounded-[18px] p-6 md:p-8">
                                        <h3 className="text-xl font-black ww-ink mb-6 flex gap-3">
                                            <span style={{ color: 'var(--ww-accent)' }}>Q{qIndex + 1}.</span>
                                            {question.question}
                                        </h3>

                                        <div className="space-y-3">
                                            {question.options.map((option, idx) => {
                                                const isCorrectOption = option.trim() === (question.answer || '').trim();
                                                const isSelected = answer.selectedOption === option;

                                                let choiceClass = "ww-choice w-full text-left p-4 flex items-center justify-between ";

                                                if (isSubmitted) {
                                                    if (isCorrectOption) {
                                                        choiceClass += "ww-choice--ok ";
                                                    } else if (isSelected && !isCorrectOption) {
                                                        choiceClass += "ww-choice--bad ";
                                                    } else {
                                                        choiceClass += "opacity-50 ";
                                                    }
                                                } else {
                                                    if (isSelected) {
                                                        choiceClass += "ring-4 ring-offset-2 ";
                                                        // Add accent ring style
                                                    }
                                                }

                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleOptionSelect(qIndex, option)}
                                                        disabled={isSubmitted}
                                                        className={choiceClass}
                                                        style={isSelected && !isSubmitted ? {
                                                            borderColor: 'var(--ww-accent)',
                                                            boxShadow: '0 6px 0 rgba(0,0,0,0.25), 0 0 0 4px rgba(252,203,89,0.4)'
                                                        } : undefined}
                                                    >
                                                        <span className="ww-ink">{option}</span>
                                                        {isSubmitted && isCorrectOption && (
                                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                                        )}
                                                        {isSubmitted && isSelected && !isCorrectOption && (
                                                            <XCircle className="w-5 h-5 text-red-500" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Show explanation after submission */}
                                        <AnimatePresence>
                                            {isSubmitted && question.explanation && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    className="mt-6 overflow-hidden"
                                                >
                                                    <div className="p-4 rounded-xl" style={{ background: 'rgba(252,203,89,0.25)', border: '2px solid rgba(252,203,89,0.5)' }}>
                                                        <p className="font-black mb-1 flex items-center gap-2 ww-ink">
                                                            <Brain className="w-4 h-4" style={{ color: 'var(--ww-accent)' }} />
                                                            解析
                                                        </p>
                                                        <p className="ww-ink">{question.explanation}</p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Submit All Button */}
                        {!isSubmitted && (
                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={handleSubmitAll}
                                    disabled={!allAnswered}
                                    className={`ww-btn flex items-center gap-2 px-10 py-4 rounded-2xl text-xs ${allAnswered ? 'ww-btn--accent' : ''
                                        }`}
                                >
                                    <Send className="w-4 h-4" />
                                    全部提交 ({answeredCount}/{material.questions.length})
                                </button>
                            </div>
                        )}

                        {/* Results Section */}
                        {isSubmitted && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-8 flex flex-col items-center justify-center p-8 rounded-[22px]"
                                style={{ background: 'rgba(255,255,255,0.5)', border: '3px solid var(--ww-stroke)' }}
                            >
                                <div className="mb-4">
                                    <div className="w-20 h-20 mx-auto mb-3 rounded-full flex items-center justify-center"
                                        style={{ background: 'var(--ww-accent)', border: '4px solid var(--ww-stroke)', boxShadow: '0 8px 0 rgba(0,0,0,0.25)' }}
                                    >
                                        <CheckCircle className="w-10 h-10" style={{ color: 'var(--ww-stroke)' }} />
                                    </div>
                                    <p className="text-xl font-black ww-ink text-center">完成！</p>
                                </div>
                                <p className="ww-muted mb-6 font-black text-lg">
                                    正确 <span className="ww-ink text-3xl">{score}</span> / <span className="ww-ink">{material.questions.length}</span>
                                </p>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowReview(!showReview)}
                                        className="ww-btn ww-btn--ink px-6 py-3 rounded-2xl text-[10px] flex items-center gap-2"
                                    >
                                        <Eye className="w-4 h-4" />
                                        {showReview ? '收起回顾' : '查看回顾'}
                                    </button>
                                    <button
                                        onClick={handleFinish}
                                        className="ww-btn ww-btn--accent px-8 py-3 rounded-2xl text-[10px]"
                                    >
                                        领取 EXP
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Review Section */}
                        {isSubmitted && showReview && <ReviewSection />}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ReadingReader;
