
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { CheckCircle2, RotateCcw, Zap, Target, Loader2, ArrowRight } from 'lucide-react';
import { getBatchWords, getRandomDistractors, markWordProgress, getUserLearningStats, Word, LearningStats } from '../services/databaseService';
import { useAuth } from '../contexts/AuthContext';
import confetti from 'canvas-confetti';

// ==========================================
// TYPES
// ==========================================
type Mode = 'learning' | 'quiz' | 'summary' | 'loading';

interface QuizQuestion {
  word: Word;
  options: Word[]; // 1 correct + 3 distractors
  correctOptionId: string;
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

// 1. Learning Card Component
interface LearningCardProps {
  word: Word;
  index: number;
  total: number;
  onNext: () => void;
}

const LearningCard: React.FC<LearningCardProps> = ({ word, index, total, onNext }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const [isRevealed, setIsRevealed] = useState(false);

  const handleDragEnd = (_: any, info: any) => {
    if (Math.abs(info.offset.x) > 100) {
      onNext();
    }
  };

  // Parse meaning - handle both literal \n and actual newlines
  const translations = word.translation?.split(/\\n|\n/).filter(t => t.trim()) || [];
  const primaryTranslation = translations.map(t => t.trim()).join('\n'); // Join all parts for display

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      onClick={() => setIsRevealed(true)}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="absolute inset-0 dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-between p-8 cursor-pointer active:cursor-grabbing group overflow-visible touch-none"
    >
      {/* Header: Progress */}
      <div className="w-full flex justify-between items-center text-slate-400 font-bold text-xs tracking-widest uppercase select-none">
        <span>Learning Phase</span>
        <span>{index + 1} / {total}</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-8 w-full text-center">
        <div>
          <h2 className="text-5xl md:text-6xl font-mono font-bold tracking-tight dark:text-white text-slate-900 mb-2 select-none">
            {word.word}
          </h2>
          {word.phonetic && (
            <p className="text-lg text-slate-500 font-mono">/{word.phonetic}/</p>
          )}
        </div>

        <div className={`w-full h-[1px] bg-slate-200 dark:bg-slate-800 max-w-[100px] transition-opacity duration-300 ${isRevealed ? 'opacity-100' : 'opacity-0'}`} />

        <div className="space-y-2 min-h-[100px] flex flex-col justify-center">
          {!isRevealed ? (
            <div className="animate-pulse flex flex-col items-center gap-2 text-slate-400">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Tap to reveal</span>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              {translations.map((line, i) => (
                <p key={i} className="text-xl md:text-2xl font-bold text-indigo-500 dark:text-indigo-400 leading-snug">
                  {line.trim()}
                </p>
              ))}
              {word.definition && (
                <p className="text-sm text-slate-400 max-w-xs mx-auto italic leading-relaxed line-clamp-3 mt-4">
                  {word.definition.split(/\\n|\n/)[0]}
                </p>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer: Hint */}
      <div className="text-slate-300 dark:text-slate-700 text-[10px] uppercase tracking-widest font-black">
        Swipe to continue
      </div>
    </motion.div>
  );
};

// 2. Quiz Card Component
interface QuizCardProps {
  question: QuizQuestion;
  onAnswer: (correct: boolean) => void;
  questionIndex: number;
  totalQuestions: number;
}

const QuizCard: React.FC<QuizCardProps> = ({ question, onAnswer, questionIndex, totalQuestions }) => {
  const [selectedParams, setSelectedParams] = useState<{ id: string, isCorrect: boolean } | null>(null);

  const handleSelect = (option: Word) => {
    if (selectedParams) return; // Prevent double selecting

    const isCorrect = option.id === question.correctOptionId;
    setSelectedParams({ id: option.id, isCorrect });

    if (isCorrect) {
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#10b981', '#34d399']
      });
    }

    // Delay before next question
    setTimeout(() => {
      onAnswer(isCorrect);
    }, 1200);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="text-xs font-black uppercase tracking-widest text-indigo-500">
          Quiz {questionIndex + 1} / {totalQuestions}
        </span>
        <h2 className="text-4xl md:text-5xl font-mono font-bold dark:text-white text-slate-900">
          {question.word.word}
        </h2>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-3">
        {question.options.map((option) => {
          const isSelected = selectedParams?.id === option.id;
          const isCorrectOption = option.id === question.correctOptionId;
          const showCorrectProcess = selectedParams !== null;

          let btnClass = "dark:bg-slate-800 bg-white border-2 dark:border-slate-700 border-slate-200 hover:border-indigo-500 hover:shadow-lg";

          if (showCorrectProcess) {
            if (isCorrectOption) {
              btnClass = "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400";
            } else if (isSelected && !isCorrectOption) {
              btnClass = "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400";
            } else {
              btnClass = "opacity-50 grayscale";
            }
          }

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option)}
              disabled={selectedParams !== null}
              className={`p-5 rounded-2xl text-left font-bold transition-all transform active:scale-[0.98] flex justify-between items-center ${btnClass}`}
            >
              <span className="line-clamp-1">{option.translation?.split('\n')[0]}</span>
              {showCorrectProcess && isCorrectOption && <CheckCircle2 size={18} />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

interface VocabTrainingProps {
  onMastered: (word: string) => void;
}

const VocabTraining: React.FC<VocabTrainingProps> = ({ onMastered }) => {
  const { user } = useAuth();

  // State
  const [mode, setMode] = useState<Mode>('loading');
  const [batch, setBatch] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [score, setScore] = useState(0);

  // Load Batch
  useEffect(() => {
    if (user) {
      loadBatch();
    }
  }, [user]);

  const loadBatch = async () => {
    if (!user) return;
    setMode('loading');
    console.log('🔄 Loading new batch...');

    try {
      const words = await getBatchWords(user.id, 10);
      if (words.length === 0) {
        // Handle empty state (all words learned)
        setMode('summary'); // Or a special 'complete' state
        return;
      }
      setBatch(words);
      setCurrentIndex(0);
      setMode('learning');

      // Pre-generate quiz for this batch
      generateQuiz(words);
    } catch (e) {
      console.error(e);
    }
  };

  const generateQuiz = async (words: Word[]) => {
    const questions: QuizQuestion[] = [];
    for (const word of words) {
      const distractors = await getRandomDistractors(word.id, 3);
      // Combine and shuffle
      const options = [...distractors, word].sort(() => Math.random() - 0.5);
      questions.push({
        word,
        options,
        correctOptionId: word.id
      });
    }
    setQuizQuestions(questions);
  };

  // Handlers
  const handleLearningNext = () => {
    if (currentIndex < batch.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Finished learning batch, start quiz
      setCurrentIndex(0);
      setScore(0);
      setMode('quiz');
    }
  };

  const handleQuizAnswer = async (correct: boolean) => {
    const currentWord = quizQuestions[currentIndex].word;

    if (correct) {
      setScore(prev => prev + 1);
      if (user) {
        // Mark as learned in DB
        await markWordProgress(user.id, currentWord.id, true);
        onMastered(currentWord.word);
      }
    } else {
      // Log incorrect attempt if needed
      if (user) {
        await markWordProgress(user.id, currentWord.id, false);
      }
    }

    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setMode('summary');
    }
  };

  // Render Logic
  if (mode === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] h-[60vh]">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Preparing your session...</p>
      </div>
    );
  }

  if (mode === 'learning') {
    const currentWord = batch[currentIndex];
    return (
      <div className="w-full flex flex-col items-center pt-8">
        <div className="relative w-full max-w-sm md:max-w-md aspect-[3/4.2]">
          <AnimatePresence mode="wait">
            <LearningCard
              key={currentWord.id}
              word={currentWord}
              index={currentIndex}
              total={batch.length}
              onNext={handleLearningNext}
            />
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (mode === 'quiz') {
    const currentQuestion = quizQuestions[currentIndex];
    return (
      <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center pt-8 px-6">
        <QuizCard
          key={currentQuestion.word.id}
          question={currentQuestion}
          questionIndex={currentIndex}
          totalQuestions={quizQuestions.length}
          onAnswer={handleQuizAnswer}
        />
      </div>
    );
  }

  if (mode === 'summary') {
    const percentage = Math.round((score / batch.length) * 100);
    return (
      <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center text-center space-y-8 px-6">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500 blur-[60px] opacity-20 animate-pulse rounded-full" />
          <div className="relative border-4 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-full p-12 shadow-2xl">
            <span className="text-6xl font-black text-indigo-500">{percentage}%</span>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-black rpg-font dark:text-white text-slate-900">Session Complete</h2>
          <p className="text-slate-400 font-bold">You mastered {score} out of {batch.length} words!</p>
        </div>

        <button
          onClick={loadBatch}
          className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-black uppercase tracking-widest text-xs transition-all transform active:scale-95 shadow-xl shadow-indigo-500/20 flex items-center gap-2"
        >
          <RotateCcw size={16} /> Start Next Batch
        </button>
      </div>
    );
  }

  return null;
};

export default VocabTraining;
