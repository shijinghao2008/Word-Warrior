import React, { useState } from 'react';
import { ReadingMaterial, ReadingQuestion } from '../../types';
import { CheckCircle, XCircle, ChevronRight, RefreshCw, Award, ArrowLeft, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface ReadingQuizProps {
    material: ReadingMaterial;
    onBack: () => void;
    onComplete?: (score: number) => void;
}

const ReadingQuiz: React.FC<ReadingQuizProps> = ({ material, onBack, onComplete }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [answers, setAnswers] = useState<{ questionId: string, isCorrect: boolean, selected: string }[]>([]);

    const questions = material.questions;
    const currentQuestion = questions[currentQuestionIndex];

    const handleOptionSelect = (option: string) => {
        if (isAnswered) return;
        setSelectedOption(option);
    };

    const calculateScore = () => {
        // Simple calculation, could be more complex
        return answers.filter(a => a.isCorrect).length;
    }

    const handleCheckAnswer = () => {
        if (!selectedOption || isAnswered) return;

        const isCorrect = selectedOption === currentQuestion.answer;
        setIsAnswered(true);

        if (isCorrect) {
            setScore(s => s + 1);
            confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.7 }
            });
        }

        const newAnswers = [...answers, {
            questionId: currentQuestion.id,
            isCorrect,
            selected: selectedOption
        }];
        setAnswers(newAnswers);
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedOption(null);
            setIsAnswered(false);
        } else {
            setShowResult(true);
            if (onComplete) {
                onComplete(calculateScore());
            }
        }
    };

    const handleRetry = () => {
        setCurrentQuestionIndex(0);
        setSelectedOption(null);
        setIsAnswered(false);
        setScore(0);
        setShowResult(false);
        setAnswers([]);
    };

    if (showResult) {
        const percentage = Math.round((score / questions.length) * 100);
        let message = "Keep practicing!";
        if (percentage === 100) message = "Perfect Score! Amazing!";
        else if (percentage >= 80) message = "Great Job!";
        else if (percentage >= 60) message = "Good Effort!";

        return (
            <div className="max-w-2xl mx-auto bg-gray-800/50 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center shadow-2xl">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                >
                    <Award className={`w-24 h-24 mx-auto mb-6 ${percentage >= 80 ? 'text-yellow-400' : 'text-violet-400'}`} />
                    <h2 className="text-4xl font-bold text-white mb-2">{message}</h2>
                    <p className="text-gray-400 mb-8">You scored {score} out of {questions.length}</p>

                    <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400 mb-12">
                        {percentage}%
                    </div>

                    <div className="flex justify-center gap-4">
                        <button
                            onClick={handleRetry}
                            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-semibold"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Try Again
                        </button>
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors font-semibold shadow-lg"
                        >
                            Finish
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
            >
                <ArrowLeft className="w-5 h-5" />
                Quit Quiz
            </button>

            <div className="mb-6 flex items-center justify-between text-gray-400 text-sm">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-violet-500 transition-all duration-300"
                        style={{ width: `${((currentQuestionIndex + (isAnswered ? 1 : 0)) / questions.length) * 100}%` }}
                    />
                </div>
            </div>

            <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-gray-800/50 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-xl"
            >
                <h2 className="text-2xl font-bold text-white mb-8">
                    {currentQuestion.question}
                </h2>

                <div className="space-y-4">
                    {currentQuestion.options.map((option, idx) => {
                        let optionClass = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ";

                        if (isAnswered) {
                            if (option === currentQuestion.answer) {
                                optionClass += "border-green-500/50 bg-green-500/10 text-green-100";
                            } else if (option === selectedOption) {
                                optionClass += "border-red-500/50 bg-red-500/10 text-red-100";
                            } else {
                                optionClass += "border-white/5 bg-white/5 text-gray-400 opacity-50";
                            }
                        } else {
                            if (selectedOption === option) {
                                optionClass += "border-violet-500 bg-violet-500/20 text-white";
                            } else {
                                optionClass += "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:border-white/20";
                            }
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleOptionSelect(option)}
                                disabled={isAnswered}
                                className={optionClass}
                            >
                                <span>{option}</span>
                                {isAnswered && option === currentQuestion.answer && (
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                )}
                                {isAnswered && option === selectedOption && option !== currentQuestion.answer && (
                                    <XCircle className="w-5 h-5 text-red-400" />
                                )}
                            </button>
                        );
                    })}
                </div>

                <AnimatePresence>
                    {isAnswered && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-6 pt-6 border-t border-white/10 overflow-hidden"
                        >
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-blue-200">
                                <p className="font-semibold mb-1 flex items-center gap-2">
                                    <Brain className="w-4 h-4" />
                                    Explanation:
                                </p>
                                <p>{currentQuestion.explanation}</p>
                            </div>

                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={handleNextQuestion}
                                    className="flex items-center gap-2 px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold shadow-lg transition-transform hover:-translate-y-1"
                                >
                                    {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'View Results'}
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!isAnswered && (
                    <div className="flex justify-end mt-8">
                        <button
                            onClick={handleCheckAnswer}
                            disabled={!selectedOption}
                            className={`px-8 py-3 rounded-xl font-bold shadow-lg transition-all ${selectedOption
                                ? 'bg-white text-gray-900 hover:bg-gray-100 hover:scale-105'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            Check Answer
                        </button>
                    </div>
                )}

            </motion.div>
        </div>
    );
};

export default ReadingQuiz;
