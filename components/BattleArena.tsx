
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Shield, User, Zap, Flame, Sword, Target, ShieldCheck, Loader2 } from 'lucide-react';
import { startLiveSession, encodeAudio, resampleAudio } from '../services/liveService';
import { MOCK_VOCAB_CARDS, MOCK_GRAMMAR_QUESTIONS } from '../constants.tsx';

interface BattleArenaProps {
  mode: string;
  playerStats: any;
  onVictory: () => void;
  onDefeat: () => void;
}

const BattleArena: React.FC<BattleArenaProps> = ({ mode, playerStats, onVictory, onDefeat }) => {
  const [playerHp, setPlayerHp] = useState(playerStats.hp);
  const [enemyHp, setEnemyHp] = useState(100);
  const [isRecording, setIsRecording] = useState(false);
  const [isShaking, setIsShaking] = useState<'player' | 'enemy' | null>(null);
  const [damageNumbers, setDamageNumbers] = useState<{ id: number, val: number, target: 'player' | 'enemy', type?: 'crit' | 'block' }[]>([]);
  const [status, setStatus] = useState('YOUR TURN');

  // Quiz specific states
  const [currentVocabQ, setCurrentVocabQ] = useState(MOCK_VOCAB_CARDS[0]);
  const [currentGrammarQ, setCurrentGrammarQ] = useState(MOCK_GRAMMAR_QUESTIONS[0]);
  const [answered, setAnswered] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const currentSessionRef = useRef<any>(null);

  const triggerEffect = (val: number, target: 'player' | 'enemy', type?: 'crit' | 'block') => {
    const id = Date.now();
    setDamageNumbers(prev => [...prev, { id, val, target, type }]);
    setIsShaking(target);
    setTimeout(() => setIsShaking(null), 300);
    setTimeout(() => setDamageNumbers(prev => prev.filter(d => d.id !== id)), 1200);
  };

  const enemyAttack = () => {
    setStatus('ENEMY TURN...');
    setTimeout(() => {
      let dmg = Math.floor(Math.random() * 12 + 10);
      let type: 'crit' | 'block' | undefined;

      // Mitigation logic for pvp_tactics where DEF matters
      if (mode === 'pvp_tactics') {
        const reduction = Math.floor(playerStats.def / 2);
        dmg = Math.max(5, dmg - reduction);
        if (reduction > 5) type = 'block';
      }

      setPlayerHp(p => Math.max(0, p - dmg));
      triggerEffect(dmg, 'player', type);
      setStatus('YOUR TURN');
    }, 1200);
  };

  const handleBlitzAnswer = (ans: string) => {
    if (answered) return;
    setAnswered(true);
    if (ans === currentVocabQ.correctAnswer) {
      const dmg = Math.floor(playerStats.atk * 1.5);
      setEnemyHp(p => Math.max(0, p - dmg));
      triggerEffect(dmg, 'enemy', 'crit');
      setStatus('STRIKE!');
    } else {
      triggerEffect(0, 'enemy');
      setStatus('MISSED!');
    }
    setTimeout(() => {
      setAnswered(false);
      setCurrentVocabQ(MOCK_VOCAB_CARDS[Math.floor(Math.random() * MOCK_VOCAB_CARDS.length)]);
      enemyAttack();
    }, 1000);
  };

  const handleTacticsAnswer = (ans: string) => {
    if (answered) return;
    setAnswered(true);
    if (ans === currentGrammarQ.correctAnswer) {
      const dmg = playerStats.atk;
      setEnemyHp(p => Math.max(0, p - dmg));
      triggerEffect(dmg, 'enemy');
      setStatus('CORRECT!');
    } else {
      setStatus('INCORRECT!');
    }
    setTimeout(() => {
      setAnswered(false);
      setCurrentGrammarQ(MOCK_GRAMMAR_QUESTIONS[Math.floor(Math.random() * MOCK_GRAMMAR_QUESTIONS.length)]);
      enemyAttack();
    }, 1000);
  };

  const startChant = async () => {
    setIsRecording(true);
    setStatus('INCANTING...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const nativeRate = audioContextRef.current.sampleRate;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      const sessionHandles = startLiveSession((fullText: string) => {
        const scoreMatch = fullText.match(/Score:?\s*(\d+)/i) || fullText.match(/(\d+)/);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

        let dmg = 0;
        let type: 'crit' | undefined;

        if (score >= 90) {
          dmg = 100;
          type = 'crit';
          setStatus('ULTIMATE CHANT!');
        } else if (score >= 60) {
          dmg = Math.floor(playerStats.atk * (score / 50));
          setStatus('CHANT SUCCESS');
        } else {
          setStatus('CHANT FAILED');
        }

        if (dmg > 0) {
          setEnemyHp(prev => Math.max(0, prev - dmg));
          triggerEffect(dmg, 'enemy', type);
        }
        stopChant();
        enemyAttack();
      }, "Score a translation of a heroic spell. Respond ONLY with Score: [0-100]");

      currentSessionRef.current = sessionHandles;

      scriptProcessorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const resampled = resampleAudio(inputData, nativeRate, 16000);
        const l = resampled.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) int16[i] = resampled[i] * 32768;
        const pcmBlob = { data: encodeAudio(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };

        sessionHandles.sessionPromise.then((session: any) => session.sendRealtimeInput({ media: pcmBlob }));
      };
      source.connect(scriptProcessorRef.current);
      scriptProcessorRef.current.connect(audioContextRef.current.destination);
    } catch (e) {
      setIsRecording(false);
      setStatus('YOUR TURN');
    }
  };

  const stopChant = () => {
    if (scriptProcessorRef.current) scriptProcessorRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close();
    setIsRecording(false);
  };

  useEffect(() => {
    if (enemyHp <= 0) setTimeout(onVictory, 1500);
    if (playerHp <= 0) setTimeout(onDefeat, 1500);
  }, [enemyHp, playerHp, onVictory, onDefeat]);

  return (
    <div className="h-full flex flex-col space-y-6 md:space-y-12 max-w-5xl mx-auto py-4 px-0">

      {/* HP HEADER - Scaled for Mobile */}
      <div className="flex justify-between items-center gap-4 md:gap-12 pt-4 px-4 md:px-8">
        <div className={`flex-1 transition-all ${isShaking === 'player' ? 'animate-shake' : ''}`}>
          <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-3">
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-lg shrink-0">
              <User className="text-indigo-500" size={18} />
            </div>
            <div className="overflow-hidden">
              <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">SCHOLAR</p>
              <p className="rpg-font text-base md:text-2xl font-black leading-none">{playerHp} HP</p>
            </div>
          </div>
          <div className="h-2 md:h-3 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border dark:border-slate-800 shadow-inner">
            <motion.div animate={{ width: `${(playerHp / playerStats.maxHp) * 100}%` }} className="h-full bg-gradient-to-r from-blue-600 to-indigo-500" />
          </div>
        </div>

        <div className="flex flex-col items-center opacity-30 shrink-0">
          <Sword size={16} className="md:w-6 md:h-6" />
          <span className="text-[10px] md:text-xs font-black rpg-font">VS</span>
        </div>

        <div className={`flex-1 text-right transition-all ${isShaking === 'enemy' ? 'animate-shake' : ''}`}>
          <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-3 justify-end">
            <div className="overflow-hidden text-right">
              <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">WRAITH</p>
              <p className="rpg-font text-base md:text-2xl font-black leading-none">{enemyHp} HP</p>
            </div>
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shadow-lg shrink-0">
              <Zap className="text-red-500" size={18} />
            </div>
          </div>
          <div className="h-2 md:h-3 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border dark:border-slate-800 shadow-inner">
            <motion.div animate={{ width: `${enemyHp}%` }} className="h-full bg-gradient-to-l from-red-600 to-orange-500" />
          </div>
        </div>
      </div>

      <div className="flex-1 mx-2 md:mx-4 dark:bg-slate-900/30 bg-white border dark:border-slate-800 border-slate-200 rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-12 flex flex-col items-center justify-center relative shadow-2xl backdrop-blur-sm overflow-hidden min-h-[400px]">
        <AnimatePresence>
          {damageNumbers.map(d => (
            <motion.div
              key={d.id}
              initial={{ y: 0, opacity: 1, scale: 0.5 }}
              animate={{ y: -150, opacity: 0, scale: 1.5 }}
              exit={{ opacity: 0 }}
              className={`absolute font-black rpg-font z-50 flex flex-col items-center ${d.target === 'player' ? 'text-red-500 left-1/4' : 'text-yellow-500 right-1/4'}`}
            >
              <span className={d.type === 'crit' ? 'text-4xl md:text-6xl' : 'text-2xl md:text-4xl'}>-{d.val}</span>
              {d.type && <span className="text-[10px] md:text-xs uppercase tracking-widest">{d.type}</span>}
            </motion.div>
          ))}
        </AnimatePresence>

        {mode === 'pvp_blitz' && (
          <div className="space-y-6 md:space-y-12 w-full max-w-md text-center px-6 md:px-0">
            <motion.h2
              key={currentVocabQ.word}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl md:text-7xl font-black rpg-font tracking-tighter dark:text-white text-slate-900 px-4"
            >
              {currentVocabQ.word}
            </motion.h2>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {currentVocabQ.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => handleBlitzAnswer(opt)}
                  disabled={answered}
                  className="p-4 md:p-8 dark:bg-slate-950 bg-slate-50 border-2 dark:border-slate-800 border-slate-200 rounded-2xl md:rounded-3xl hover:border-indigo-500 font-bold text-xs md:text-base transition-all active:scale-95 disabled:opacity-50"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'pvp_tactics' && (
          <div className="space-y-6 md:space-y-12 w-full max-w-2xl text-center px-6 md:px-0">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500">Syntax Challenge</span>
              <motion.h2
                key={currentGrammarQ.prompt}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg md:text-3xl font-bold dark:text-white text-slate-900 px-4 leading-relaxed italic"
              >
                {currentGrammarQ.prompt}
              </motion.h2>
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {currentGrammarQ.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => handleTacticsAnswer(opt)}
                  disabled={answered}
                  className="p-4 md:p-6 dark:bg-slate-950 bg-slate-50 border-2 dark:border-slate-800 border-slate-200 rounded-2xl md:rounded-3xl hover:border-cyan-500 font-bold text-xs md:text-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'pvp_chant' && (
          <div className="space-y-8 md:space-y-12 text-center w-full max-w-xl px-6 md:px-0">
            <h2 className="text-xl md:text-4xl font-black rpg-font italic leading-relaxed px-4 dark:text-white text-slate-900">
              "在这片充满未知的土地上，唯有知识能驱散永恒的黑暗。"
            </h2>

            <div className="py-12">
              <div className="text-xs md:text-sm font-black uppercase tracking-[0.4em] text-slate-500 animate-pulse">{status}</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-6 md:gap-16 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 pb-24 md:pb-8">
        <div className="flex items-center gap-1.5"><Sword size={10} /> ATK: {playerStats.atk}</div>
        <div className="flex items-center gap-1.5"><Shield size={10} /> DEF: {playerStats.def}</div>
        <div className="flex items-center gap-1.5"><Zap size={10} /> CRIT: {Math.round(playerStats.crit * 100)}%</div>
      </div>

      {/* FLOATING ACTION MIC FOR CHANT DUEL - Consistent with Oral Training repositioning */}
      {(mode === 'pvp_chant') && (
        <div className="fixed z-[150] flex flex-col items-center gap-4 right-6 bottom-32 md:right-12 md:bottom-[140px]">
          <div className="flex flex-col items-center gap-4">

            <AnimatePresence>
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="px-4 py-1.5 rounded-full bg-red-600 text-white border border-white/20 shadow-2xl backdrop-blur-md whitespace-nowrap"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse">
                    CHANTER ACTIVE...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              onMouseDown={startChant}
              onMouseUp={stopChant}
              onTouchStart={startChant}
              onTouchEnd={stopChant}
              disabled={status === 'STRIKING...'}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`group relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all shadow-[0_15px_40px_rgba(0,0,0,0.4)] border-4 border-white dark:border-slate-900 ${isRecording ? 'bg-red-600' :
                'bg-indigo-600 shadow-indigo-500/40'
                }`}
            >
              {isRecording && (
                <motion.div
                  animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="absolute inset-0 bg-red-400 rounded-full"
                />
              )}
              <Mic size={28} className="text-white" />

              <div className="absolute right-full mr-4 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-white/10 pointer-events-none hidden md:block">
                Hold to Chant (咏唱)
              </div>
            </motion.button>
          </div>
        </div>
      )}

    </div>
  );
};

export default BattleArena;
