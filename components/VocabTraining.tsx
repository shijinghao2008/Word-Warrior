
import React, { useMemo, useState, useEffect } from 'react';
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
  onPrev: () => void;
}

const LearningCard: React.FC<LearningCardProps> = ({ word, index, total, onNext, onPrev }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const [isRevealed, setIsRevealed] = useState(false);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x < -100) {
      onNext();     // 向左滑动 → 下一个
    } else if (info.offset.x > 100) {
      onPrev();     // 向右滑动 → 上一个
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
      className="absolute inset-0 ww-surface ww-surface--soft rounded-[26px] flex flex-col items-center justify-between p-7 cursor-pointer active:cursor-grabbing overflow-hidden touch-none"
    >
      {/* Header: Progress */}
      <div className="w-full flex justify-end items-center select-none">
        <span className="text-[10px] font-black uppercase tracking-widest ww-muted">
          {index + 1} / {total}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-8 w-full text-center">
        <div>
          <h2 className="text-5xl md:text-6xl font-mono font-black tracking-tight ww-ink mb-2 select-none">
            {word.word}
          </h2>
          {word.phonetic && (
            <p className="text-lg ww-muted font-mono">/{word.phonetic}/</p>
          )}
        </div>

        <div className="min-h-[110px] flex flex-col justify-center">
          {!isRevealed ? (
            <div className="ww-muted">
              <span className="text-[10px] uppercase tracking-[0.2em] font-black">轻触显示释义</span>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              {translations.map((line, i) => (
                <p key={i} className="text-xl md:text-2xl font-black leading-snug" style={{ color: 'var(--ww-stroke)' }}>
                  {line.trim()}
                </p>
              ))}
              {word.definition && (
                <p className="text-sm ww-muted max-w-xs mx-auto italic leading-relaxed line-clamp-3 mt-4">
                  {word.definition.split(/\\n|\n/)[0]}
                </p>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer: Hint */}
      <div className="text-[10px] uppercase tracking-widest font-black ww-muted">
        ← 下一个 | → 上一个
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
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-[10px] font-black uppercase tracking-widest ww-muted">
          {questionIndex + 1} / {totalQuestions}
        </div>
        <h2 className="text-4xl md:text-5xl font-mono font-black text-white">
          {question.word.word}
        </h2>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-3">
        {question.options.map((option) => {
          const isSelected = selectedParams?.id === option.id;
          const isCorrectOption = option.id === question.correctOptionId;
          const showCorrectProcess = selectedParams !== null;

          let btnClass =
            "ww-surface ww-surface--soft border-2 rounded-2xl p-5 text-left font-black transition-all transform active:scale-[0.98] flex justify-between items-center";
          let btnStyle: React.CSSProperties = { borderColor: 'rgba(43,23,63,0.22)', boxShadow: '0 10px 18px rgba(0,0,0,0.14)' };

          if (showCorrectProcess) {
            if (isCorrectOption) {
              btnClass = `${btnClass} bg-[rgba(16,185,129,0.18)]`;
              btnStyle = { borderColor: 'rgba(16,185,129,0.75)', boxShadow: '0 10px 18px rgba(0,0,0,0.14)' };
            } else if (isSelected && !isCorrectOption) {
              btnClass = `${btnClass} bg-[rgba(239,68,68,0.14)]`;
              btnStyle = { borderColor: 'rgba(239,68,68,0.75)', boxShadow: '0 10px 18px rgba(0,0,0,0.14)' };
            } else {
              btnClass = `${btnClass} opacity-50 grayscale`;
            }
          } else {
            // default hover affordance
            btnStyle = { borderColor: 'rgba(43,23,63,0.22)', boxShadow: '0 10px 18px rgba(0,0,0,0.14)' };
          }

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option)}
              disabled={selectedParams !== null}
              className={btnClass}
              style={btnStyle}
            >
              <span className="line-clamp-2 ww-ink whitespace-pre-line">
                {option.translation?.split(/\\n|\n/).map(t => t.trim()).filter(t => t).join('\n')}
              </span>
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

const STORAGE_KEY = 'ww_vocab_session';

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

  // Persistence logic
  useEffect(() => {
    if (user?.id && mode !== 'loading' && mode !== 'summary') {
      const session = {
        mode,
        batch,
        currentIndex,
        quizQuestions,
        score,
        userId: user.id
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
    if (mode === 'summary') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [mode, batch, currentIndex, quizQuestions, score, user?.id]);

  const progress = useMemo(() => {
    if (mode === 'learning') {
      const total = Math.max(1, batch.length);
      const current = Math.min(total, currentIndex + 1);
      return { label: '背单词进度', current, total };
    }
    if (mode === 'quiz') {
      const total = Math.max(1, quizQuestions.length);
      const current = Math.min(total, currentIndex + 1);
      return { label: '测验进度', current, total };
    }
    return null;
  }, [mode, batch.length, quizQuestions.length, currentIndex]);

  const ProgressBar = ({ current, total }: { current: number; total: number }) => {
    const pct = Math.max(0, Math.min(100, Math.round((current / Math.max(1, total)) * 100)));
    return (
      <div className="w-full max-w-md mx-auto mt-3 mb-4">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/85">
          <span>{progress?.label}</span>
          <span>{current}/{total}</span>
        </div>
        <div className="mt-2 h-3 rounded-full overflow-hidden" style={{ border: '3px solid var(--ww-stroke)', background: 'rgba(253,246,227,0.22)' }}>
          <div className="h-full" style={{ width: `${pct}%`, background: 'var(--ww-accent)' }} />
        </div>
      </div>
    );
  };

  // Load Batch
  useEffect(() => {
    const init = async () => {
      if (!user) return;

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const session = JSON.parse(saved);
          if (session.userId === user.id && session.batch.length > 0) {
            console.log('📦 Restoring saved session...');
            setBatch(session.batch);
            setQuizQuestions(session.quizQuestions);
            setCurrentIndex(session.currentIndex);
            setScore(session.score);
            setMode(session.mode);
            return;
          }
        } catch (e) {
          console.error('Failed to restore session:', e);
        }
      }
      
      await loadBatch();
    };

    init();
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
      setScore(0);
      
      // Pre-generate quiz for this batch
      await generateQuiz(words);
      setMode('learning');
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

  const handleLearningPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
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
      <div className="w-full flex flex-col items-center pt-4">
        {progress && <ProgressBar current={progress.current} total={progress.total} />}
        <div className="relative w-full max-w-sm md:max-w-md aspect-[3/4.2]">
          <AnimatePresence mode="wait">
            <LearningCard
              key={currentWord.id}
              word={currentWord}
              index={currentIndex}
              total={batch.length}
              onNext={handleLearningNext}
              onPrev={handleLearningPrev}
            />
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (mode === 'quiz') {
    const currentQuestion = quizQuestions[currentIndex];
    return (
      <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-start pt-4 px-6">
        {progress && <ProgressBar current={progress.current} total={progress.total} />}
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
