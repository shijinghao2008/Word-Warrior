
import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { BookOpen, RotateCcw, CheckCircle2, ArrowRight, Zap, Target } from 'lucide-react';
import { MOCK_VOCAB_CARDS } from '../constants.tsx';

interface VocabCardProps {
  card: typeof MOCK_VOCAB_CARDS[0];
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  index: number;
  total: number;
}

const VocabCard: React.FC<VocabCardProps> = ({ card, onSwipeLeft, onSwipeRight, index, total }) => {
  const [showDefinition, setShowDefinition] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const color = useTransform(x, [-100, 100], ["#ef4444", "#22c55e"]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) {
      onSwipeRight();
    } else if (info.offset.x < -100) {
      onSwipeLeft();
    }
  };

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ 
        x: x.get() > 0 ? 500 : (x.get() < 0 ? -500 : 0), 
        opacity: 0, 
        scale: 0.5,
        transition: { duration: 0.4, ease: "easeOut" } 
      }}
      className="absolute inset-0 dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl flex flex-col items-center justify-between p-8 md:p-12 cursor-grab active:cursor-grabbing group overflow-hidden touch-none"
    >
      <motion.div 
        style={{ 
          backgroundColor: color, 
          opacity: useTransform(x, [-100, 0, 100], [0.15, 0, 0.15]) 
        }}
        className="absolute inset-0 pointer-events-none"
      />

      <div className="w-full flex flex-col items-center gap-6 z-10">
        <div className="flex gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'bg-indigo-500 w-8 shadow-[0_0_12px_rgba(99,102,241,0.6)]' : 'dark:bg-slate-700 bg-slate-200 w-1.5'}`} />
          ))}
        </div>
      </div>

      <div className="w-full flex-1 flex flex-col items-center justify-center space-y-8 select-none">
        <div className="w-full overflow-hidden px-2">
          <h2 className="text-[clamp(1.8rem,8vw,5rem)] font-black rpg-font tracking-tight dark:text-white text-slate-900 leading-none whitespace-nowrap text-center">
            {card.word}
          </h2>
        </div>
        
        <div className="min-h-[160px] flex items-center justify-center w-full px-4">
          <AnimatePresence mode="wait">
            {showDefinition ? (
              <motion.div 
                key="def"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="text-center space-y-4"
              >
                <p className="text-2xl md:text-4xl text-indigo-500 dark:text-indigo-400 font-black tracking-tight">{card.chinese}</p>
                <p className="dark:text-slate-400 text-slate-500 text-sm md:text-lg italic leading-relaxed max-w-sm mx-auto">
                  {card.definition}
                </p>
              </motion.div>
            ) : (
              <motion.button 
                key="btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                   e.stopPropagation();
                   setShowDefinition(true);
                }}
                className="px-8 py-4 text-[11px] md:text-sm font-black tracking-[0.25em] uppercase dark:text-slate-400 text-slate-500 border-2 dark:border-slate-800 border-slate-200 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all active:scale-95 shadow-md"
              >
                Reveal Scroll
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full flex justify-between items-center px-4 md:px-8 text-[10px] md:text-xs font-black tracking-[0.2em] dark:text-slate-600 text-slate-400 uppercase pointer-events-none">
        <div className="flex flex-col items-start gap-2">
          <span className="text-red-500/80">← Forget</span>
          <div className="h-[2px] w-12 bg-current opacity-20" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-emerald-500/80">Learn →</span>
          <div className="h-[2px] w-12 bg-current opacity-20" />
        </div>
      </div>
    </motion.div>
  );
};

interface VocabTrainingProps {
  onMastered: (word: string) => void;
}

const VocabTraining: React.FC<VocabTrainingProps> = ({ onMastered }) => {
  const [phase, setPhase] = useState<'learning' | 'quiz' | 'mastery'>('learning');
  const [index, setIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null);

  const nextLearningCard = () => {
    if (index < MOCK_VOCAB_CARDS.length - 1) {
      setIndex(prev => prev + 1);
    } else {
      setPhase('quiz');
    }
  };

  const handleQuizAnswer = (answer: string) => {
    if (quizAnswered) return;
    const currentCard = MOCK_VOCAB_CARDS[quizIndex];
    const isCorrect = answer === currentCard.correctAnswer;
    
    setQuizAnswered(true);
    setQuizFeedback(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      onMastered(currentCard.word);
    }

    setTimeout(() => {
      setQuizAnswered(false);
      setQuizFeedback(null);
      if (quizIndex < MOCK_VOCAB_CARDS.length - 1) {
        setQuizIndex(prev => prev + 1);
      } else {
        setPhase('mastery');
      }
    }, 1200);
  };

  const reset = () => {
    setIndex(0);
    setQuizIndex(0);
    setPhase('learning');
  };

  if (phase === 'mastery') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[400px] h-[65vh] text-center space-y-8 px-6"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500 blur-[80px] opacity-10 rounded-full animate-pulse" />
          <div className="relative dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 p-12 rounded-full shadow-2xl">
            <CheckCircle2 size={64} className="text-emerald-500" />
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-3xl md:text-4xl font-black rpg-font uppercase tracking-tight dark:text-white text-slate-900">Trial Conquered</h3>
          <p className="dark:text-slate-500 text-slate-400 max-w-sm mx-auto text-xs md:text-sm font-bold uppercase tracking-[0.2em] leading-relaxed">
            Words have been etched into your soul. You are now stronger.
          </p>
        </div>
        <button 
          onClick={reset}
          className="flex items-center gap-4 bg-indigo-600 text-white px-12 py-5 rounded-full font-black uppercase tracking-[0.2em] text-xs hover:bg-indigo-500 transition-all transform active:scale-95 shadow-2xl shadow-indigo-500/30"
        >
          <RotateCcw size={16} /> New Session
        </button>
      </motion.div>
    );
  }

  if (phase === 'quiz') {
    const currentCard = MOCK_VOCAB_CARDS[quizIndex];
    return (
      <div className="w-full flex flex-col items-center justify-center max-w-2xl mx-auto space-y-12 pt-10 px-6 pb-40">
        <div className="text-center space-y-4">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-500">Final Trial</span>
          <h2 className="text-5xl md:text-7xl font-black rpg-font dark:text-white text-slate-900">{currentCard.word}</h2>
          <div className="flex justify-center gap-2">
             {MOCK_VOCAB_CARDS.map((_, i) => (
               <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i <= quizIndex ? 'bg-indigo-500 w-6' : 'bg-slate-200 dark:bg-slate-800 w-3'}`} />
             ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {currentCard.options.map((opt) => (
            <button
              key={opt}
              onClick={() => handleQuizAnswer(opt)}
              disabled={quizAnswered}
              className={`p-6 rounded-3xl border-2 transition-all text-left font-bold text-sm md:text-base flex justify-between items-center group
                ${quizAnswered && opt === currentCard.correctAnswer ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 
                  quizAnswered && opt !== currentCard.correctAnswer && opt === quizFeedback ? 'bg-red-500/10 border-red-500 text-red-600' :
                  'dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 hover:border-indigo-500 hover:shadow-lg'}
              `}
            >
              <span>{opt}</span>
              <ArrowRight size={16} className={`opacity-0 group-hover:opacity-100 transition-all ${quizAnswered ? 'hidden' : ''}`} />
              {quizAnswered && opt === currentCard.correctAnswer && <CheckCircle2 size={18} />}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {quizFeedback && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex items-center gap-3 px-6 py-3 rounded-full border font-black uppercase tracking-widest text-[10px]
                ${quizFeedback === 'correct' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-red-500/10 border-red-500 text-red-500'}
              `}
            >
              {quizFeedback === 'correct' ? <Zap size={14} /> : <Target size={14} />}
              {quizFeedback === 'correct' ? 'Knowledge Secured! +5 ATK' : 'Echoes of Doubt...'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-start overflow-visible pt-4 md:pt-10">
      <div className="relative w-full max-w-[min(90vw,420px)] md:max-w-xl aspect-[3/4.2] flex items-center justify-center mb-32 md:mb-40">
        <AnimatePresence mode="wait">
          <VocabCard 
            key={index}
            card={MOCK_VOCAB_CARDS[index]}
            index={index}
            total={MOCK_VOCAB_CARDS.length}
            onSwipeRight={nextLearningCard}
            onSwipeLeft={nextLearningCard}
          />
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VocabTraining;
