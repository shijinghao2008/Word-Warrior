import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { CheckCircle2, RotateCcw, Zap, Target, Loader2, ArrowRight, BookOpen, Quote } from 'lucide-react';
import { getBatchWords, getRandomDistractors, markWordProgress, getUserLearningStats, Word, LearningStats } from '../services/databaseService';
import { useAuth } from '../contexts/AuthContext';
import confetti from 'canvas-confetti';
import { PixelCard, PixelButton, PixelBadge } from './ui/PixelComponents';

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
      className="absolute inset-0 z-10"
    >
      <PixelCard variant="paper" className="h-full flex flex-col items-center justify-between p-8 cursor-pointer active:cursor-grabbing touch-none select-none">
        {/* Header: Progress */}
        <div className="w-full flex justify-between items-center text-slate-800 font-bold text-[10px] tracking-widest uppercase">
          <span className="flex items-center gap-1"><BookOpen size={12} /> GRIMOIRE PAGE</span>
          <span className="bg-slate-800 text-white px-2 py-0.5 rounded-sm">{index + 1} / {total}</span>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 w-full text-center">
          <div className="space-y-2">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              {word.word}
            </h2>
            {word.phonetic && (
              <p className="text-sm text-slate-500 font-mono tracking-wide">/{word.phonetic}/</p>
            )}
          </div>

          <div className={`w-full h-[2px] bg-slate-300 max-w-[100px] transition-opacity duration-300 ${isRevealed ? 'opacity-100' : 'opacity-0'}`} />

          <div className="space-y-4 min-h-[120px] flex flex-col justify-center w-full">
            {!isRevealed ? (
              <div className="animate-pulse flex flex-col items-center gap-2 text-slate-400">
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold border-2 border-dashed border-slate-300 px-4 py-2 mt-4">
                  Tap to decipher
                </span>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {translations.map((line, i) => (
                  <p key={i} className="text-xl md:text-2xl font-bold text-indigo-700 leading-snug font-serif">
                    {line.trim()}
                  </p>
                ))}
                {word.definition && (
                  <div className="relative mt-4 pt-4 border-t border-slate-200">
                    <Quote size={12} className="absolute -top-2 left-1/2 -translate-x-1/2 text-slate-300 bg-[#fefce8] px-1" />
                    <p className="text-xs text-slate-600 italic leading-relaxed line-clamp-3 font-serif">
                      "{word.definition.split(/\\n|\n/)[0]}"
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer: Hint */}
        <div className="text-slate-400 text-[9px] uppercase tracking-widest font-black flex items-center gap-1 opacity-50">
          <ArrowRight size={10} /> Swipe to turn page
        </div>
      </PixelCard>
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
    if (selectedParams) return;

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
      <div className="text-center space-y-2 mb-4">
        <PixelBadge variant="primary" className="mx-auto">
          Battle {questionIndex + 1} / {totalQuestions}
        </PixelBadge>
        <PixelCard variant="dark" className="p-6 mt-4">
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-widest uppercase">
            {question.word.word}
          </h2>
        </PixelCard>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {question.options.map((option) => {
          const isSelected = selectedParams?.id === option.id;
          const isCorrectOption = option.id === question.correctOptionId;
          const showCorrectProcess = selectedParams !== null;

          let variant: 'neutral' | 'success' | 'danger' = 'neutral';

          if (showCorrectProcess) {
            if (isCorrectOption) variant = 'success';
            else if (isSelected && !isCorrectOption) variant = 'danger';
          }

          return (
            <PixelButton
              key={option.id}
              variant={variant}
              fullWidth
              onClick={() => handleSelect(option)}
              disabled={selectedParams !== null}
              className={`justify-between h-auto py-4 ${showCorrectProcess && !isCorrectOption && !isSelected ? 'opacity-50' : ''}`}
            >
              <span className="text-xs md:text-sm font-bold text-left line-clamp-1">{option.translation?.split('\n')[0]}</span>
              {showCorrectProcess && isCorrectOption && <CheckCircle2 size={18} />}
            </PixelButton>
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
  const [mode, setMode] = useState<Mode>('loading');
  const [batch, setBatch] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (user) {
      loadBatch();
    }
  }, [user]);

  const loadBatch = async () => {
    if (!user) return;
    setMode('loading');

    try {
      const words = await getBatchWords(user.id, 10);
      if (words.length === 0) {
        setMode('summary');
        return;
      }
      setBatch(words);
      setCurrentIndex(0);
      setMode('learning');
      generateQuiz(words);
    } catch (e) {
      console.error(e);
    }
  };

  const generateQuiz = async (words: Word[]) => {
    const questions: QuizQuestion[] = [];
    for (const word of words) {
      const distractors = await getRandomDistractors(word.id, 3);
      const options = [...distractors, word].sort(() => Math.random() - 0.5);
      questions.push({
        word,
        options,
        correctOptionId: word.id
      });
    }
    setQuizQuestions(questions);
  };

  const handleLearningNext = () => {
    if (currentIndex < batch.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
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
        await markWordProgress(user.id, currentWord.id, true);
        onMastered(currentWord.word);
      }
    } else {
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

  if (mode === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] h-[60vh]">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">Summoning Words...</p>
      </div>
    );
  }

  if (mode === 'learning') {
    const currentWord = batch[currentIndex];
    return (
      <div className="w-full flex justify-center pt-8 pb-32">
        <div className="relative w-full max-w-sm aspect-[3/4.5]">
          <AnimatePresence mode="wait">
            <LearningCard
              key={currentWord.id}
              word={currentWord}
              index={currentIndex}
              total={batch.length}
              onNext={handleLearningNext}
            />
          </AnimatePresence>
          {/* Back Stack Effect */}
          <div className="absolute inset-0 translate-x-3 translate-y-3 bg-white border-4 border-black z-0 opacity-50" />
          <div className="absolute inset-0 translate-x-6 translate-y-6 bg-white border-4 border-black -z-10 opacity-20" />
        </div>
      </div>
    );
  }

  if (mode === 'quiz') {
    const currentQuestion = quizQuestions[currentIndex];
    return (
      <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center pt-8 px-6 pb-24">
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
      <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center text-center space-y-8 px-6 pb-24">
        <PixelCard variant={percentage >= 80 ? 'primary' : 'secondary'} className="p-8 rotate-3">
          <div className="text-6xl font-black">{percentage}%</div>
          <div className="text-[10px] uppercase tracking-widest font-bold mt-2">Accuracy</div>
        </PixelCard>

        <div className="space-y-2">
          <h2 className="text-3xl font-black italic uppercase text-white drop-shadow-[2px_2px_0_#000]">Quest Complete</h2>
          <p className="text-slate-400 font-bold text-sm">You mastered {score} out of {batch.length} words!</p>
        </div>

        <PixelButton
          size="lg"
          variant="primary"
          onClick={loadBatch}
        >
          <span className="flex items-center gap-2">START NEXT QUEST <RotateCcw size={16} /></span>
        </PixelButton>
      </div>
    );
  }

  return null;
};

export default VocabTraining;
