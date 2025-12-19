
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Shield, User, Zap, Flame, Sword, Target, ShieldCheck, Loader2, XCircle } from 'lucide-react';
import { startLiveSession, encodeAudio, resampleAudio } from '../services/liveService';
import { MOCK_GRAMMAR_QUESTIONS } from '../constants.tsx';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import { findMatch, cancelMatchmaking, submitAnswer, getOpponentProfile, PvPRoom } from '../services/pvpService';

interface BattleArenaProps {
  mode: string;
  playerStats: any;
  onVictory: () => void;
  onDefeat: () => void;
}

const BattleArena: React.FC<BattleArenaProps> = ({ mode, playerStats, onVictory, onDefeat }) => {
  const { user } = useAuth();
  const { getColorClass, primaryColor } = useTheme();
  const userId = user?.id;

  // Generic State
  const [playerHp, setPlayerHp] = useState(playerStats.hp);
  const [enemyHp, setEnemyHp] = useState(100); // For non-PvP modes or initial PvP
  const [status, setStatus] = useState('READY');
  const [isShaking, setIsShaking] = useState<'player' | 'enemy' | null>(null);
  const [damageNumbers, setDamageNumbers] = useState<{ id: number, val: number, target: 'player' | 'enemy', type?: 'crit' | 'block' }[]>([]);

  // PvP Specific State
  const [pvpState, setPvpState] = useState<'idle' | 'searching' | 'matched' | 'playing' | 'end'>('idle');
  const [opponentName, setOpponentName] = useState('Opponent');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [myRole, setMyRole] = useState<'player1' | 'player2' | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);
  const [searchingTime, setSearchingTime] = useState(0);

  // State Refs for Subscription Callbacks (Avoid Stale Closures)
  const stateRef = useRef({
    playerHp: playerStats.hp,
    enemyHp: 100,
    currentQIndex: 0,
    hasAnswered: false
  });

  // Sync refs with state
  useEffect(() => {
    stateRef.current.playerHp = playerHp;
    stateRef.current.enemyHp = enemyHp;
    stateRef.current.currentQIndex = currentQIndex;
    stateRef.current.hasAnswered = hasAnsweredCurrent;
  }, [playerHp, enemyHp, currentQIndex, hasAnsweredCurrent]);

  // Other Modes State
  const [currentGrammarQ, setCurrentGrammarQ] = useState(MOCK_GRAMMAR_QUESTIONS[0]);
  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const currentSessionRef = useRef<any>(null);

  // Initial Setup & Cleanup
  useEffect(() => {
    if (mode === 'pvp_blitz') {
      setPvpState('idle');
    }
    return () => {
      if (roomId && userId) cancelMatchmaking(userId);
    };
  }, [mode]);

  // ============================================
  // PVP LOGIC (BLITZ MODE)
  // ============================================

  // 1. Matchmaking
  const startMatchmaking = async () => {
    if (!userId) return;
    setStatus('SEARCHING...');
    setPvpState('searching');
    setSearchingTime(0);

    // Timer for UI only
    const timer = setInterval(() => setSearchingTime(t => t + 1), 1000);

    const result = await findMatch(userId);

    clearInterval(timer);

    if (result.status === 'matched' && result.roomId && result.role) {
      setRoomId(result.roomId);
      setMyRole(result.role);
      setPvpState('matched');
      setStatus('MATCH FOUND!');
      // Fetch initial room state to get started immediately
      const { data } = await supabase.from('pvp_rooms').select('*').eq('id', result.roomId).single();
      if (data) handleRoomUpdate(data);
    } else {
      // If waiting, the Realtime subscription will handle the match event
      // Wait, join_pvp_queue returns 'waiting'. We need to listen to the queue NOT generically, but specifically or just listen to 'pvp_queue' for our user?
      // Actually simpler: Listen to 'pvp_queue' filtered by userId? No, row level security might not be set up.
      // Better: The 'join_pvp_queue' adds us. If we are waiting, we should poll or listen.
      // My SQL removes users from queue when matched. 
      // Simplest 'Waiting' logic: Poll for room where I am player !
      // OR: The second player CALLS 'join_pvp_queue' and gets 'matched'. The FIRST player needs to know.
      // The SQL creates a room. So Player 1 should listen to 'pvp_rooms' INSERT where player1_id = me.
      if (result.status === 'waiting') {
        // Listen for room creation
        console.log('⏳ Waiting for match... Subscribing to pvp_rooms for player1_id=' + userId);
        const channel = supabase.channel('matchmaking_' + userId)
          .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'pvp_rooms', filter: `player1_id=eq.${userId}` },
            async (payload) => {
              console.log('✅ Match created Event Received!', payload);
              const newRoom = payload.new as PvPRoom;

              // Important: Unsubscribe first and WAIT
              // This prevents socket contention which causes TIMED_OUT on the next subscribe
              await supabase.removeChannel(channel);
              console.log('Matchmaking channel removed, switching to game room...');

              // Helper to delay state update slightly to allow socket cleanup
              setTimeout(() => {
                setMyRole('player1');
                setRoomId(newRoom.id);
                setPvpState('matched');
                setStatus('MATCH FOUND!');

                // Then update room data
                handleRoomUpdate(newRoom);
              }, 100);
            }
          )
          .subscribe((status) => console.log('Matchmaking subscription status:', status));
      }
    }
  };

  const handleCancelSearch = async () => {
    if (!userId) return;
    await cancelMatchmaking(userId);
    setPvpState('idle');
    setStatus('CANCELLED');
  };

  // 2. Game Loop Subscription
  // 2. Game Loop Subscription
  useEffect(() => {
    if (!roomId) return;

    let activeChannel: any = null;
    let retryTimeout: any = null;

    const subscribeToGame = () => {
      console.log(`🔌 Connecting to Game Room: ${roomId}`);
      const channel = supabase.channel('game_' + roomId)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'pvp_rooms', filter: `id=eq.${roomId}` },
          (payload) => {
            console.log('📥 Game Update Received:', payload.new);
            handleRoomUpdate(payload.new as PvPRoom);
          }
        )
        .subscribe((status, err) => {
          console.log(`Game Room Subscription Status (${roomId}):`, status, err);

          if (status === 'TIMED_OUT') {
            console.warn(`⚠️ Subscription timed out for room ${roomId}. Retrying in 2s...`);
            // Clean up this failed attempt
            supabase.removeChannel(channel);
            // Retry
            retryTimeout = setTimeout(subscribeToGame, 2000);
          }
          if (status === 'CHANNEL_ERROR') {
            console.warn(`⚠️ Subscription channel error. Retrying...`);
            supabase.removeChannel(channel);
            retryTimeout = setTimeout(subscribeToGame, 2000);
          }
        });

      activeChannel = channel;
    };

    subscribeToGame();

    return () => {
      console.log(`🧹 Cleaning up game subscription for ${roomId}`);
      if (activeChannel) supabase.removeChannel(activeChannel);
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [roomId]);

  // 2.5 Fetch Opponent (Separate Effect)
  useEffect(() => {
    if (!roomId || !myRole) return;

    const fetchOpponent = async () => {
      const { data } = await supabase.from('pvp_rooms').select('player1_id, player2_id').eq('id', roomId).single();
      if (data) {
        const oppId = myRole === 'player1' ? data.player2_id : data.player1_id;
        const profile = await getOpponentProfile(oppId);
        if (profile) setOpponentName(profile.username);
      }
    };
    fetchOpponent();
  }, [roomId, myRole]);

  // 3. Room State Handling
  const handleRoomUpdate = (room: PvPRoom) => {
    // Current State from Ref to avoid closures
    const current = stateRef.current;

    // Sync HP
    const myIdsHp = myRole === 'player1' ? room.player1_hp : room.player2_hp;
    const oppIdsHp = myRole === 'player1' ? room.player2_hp : room.player1_hp;

    // Check for damage changes to trigger effects
    if (myIdsHp < current.playerHp) {
      triggerEffect(current.playerHp - myIdsHp, 'player');
    }
    if (oppIdsHp < current.enemyHp) {
      triggerEffect(current.enemyHp - oppIdsHp, 'enemy', 'crit');
    }

    setPlayerHp(myIdsHp);
    setEnemyHp(oppIdsHp);

    // Only set questions if we don't have them or they changed (rare)
    if (room.questions && (!questions || questions.length === 0)) {
      setQuestions(room.questions);
    } else if (room.questions && room.questions.length > 0 && questions.length === 0) {
      // fallback
      setQuestions(room.questions);
    }

    // Verify Game Over
    if (room.status === 'finished') {
      setPvpState('end');
      if (room.winner_id === userId) {
        setStatus('YOU WIN!');
        onVictory();
      } else {
        setStatus('YOU LOSE!');
        onDefeat();
      }
      return;
    }

    // Sync Question
    // We compare with Ref to ensure we catch the change even if closure is stale
    if (room.current_question_index !== current.currentQIndex) {
      console.log(`🔄 Next Question: ${current.currentQIndex} -> ${room.current_question_index}`);
      // New Question!
      setCurrentQIndex(room.current_question_index);
      setHasAnsweredCurrent(false);
      setTimeLeft(10); // Reset timer

      const q = room.questions ? room.questions[room.current_question_index] : null;

      // Access questions from state if passed or from 'questions' state? 
      // 'questions' state might be stale here too? 
      // Actually 'questions' doesn't change after load, so usually fine.
      // But safer to use room.questions if provided, or fallback to the prop if we stored it?
      // Since room.questions is on the room object, we can use it directly.
      if (q) {
        setShuffledOptions([...q.options].sort(() => Math.random() - 0.5));
      }

      setPvpState('playing');
      setStatus('V.S.');
    }

    // If first load/Start
    if (current.currentQIndex === 0 && room.current_question_index === 0 && pvpState !== 'playing' && room.questions && room.questions.length > 0) {
      // Initialize First Question
      if (!current.hasAnswered) { // Prevent reset if we already answered 0? No, pvpState check handles it.
        const q = room.questions[0];
        setShuffledOptions([...q.options].sort(() => Math.random() - 0.5));
        setPvpState('playing');
        setStatus('V.S.');
      }
    }

    // Fallback: If we are in 'playing' but question options are empty?
  };

  // 4. Timer Logic
  useEffect(() => {
    if (pvpState !== 'playing') return;
    if (timeLeft <= 0 && !hasAnsweredCurrent) {
      // Time's up - send 0 damage miss
      handlePvPAnswer(false, 0);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, pvpState, hasAnsweredCurrent]); // Depend on timeLeft to trigger 0 check

  // 5. Interaction
  const handlePvPAnswer = async (correct: boolean, timeRemaining: number) => {
    if (!roomId || !userId || hasAnsweredCurrent) return;
    setHasAnsweredCurrent(true);

    // Optimistic Updates? No, wait for server to ensure "Same Question" logic holds.
    // But we should show "Waiting for result..."
    setStatus(correct ? 'ATTACKING!' : 'DEFENDING...');

    // Logic: If correct -> dmg = timeRemaining. If wrong -> self dmg = timeRemaining.
    // Database takes: (roomId, userId, qIndex, isCorrect, timeRemaining)
    await submitAnswer(roomId, userId, currentQIndex, correct, timeRemaining);
  };

  const handleChoice = (option: string) => {
    if (hasAnsweredCurrent) return;
    const currentQ = questions[currentQIndex];
    const isCorrect = option === currentQ.correctAnswer;
    handlePvPAnswer(isCorrect, timeLeft);
  };


  // ============================================
  // SHARED EFFECTS
  // ============================================

  const triggerEffect = (val: number, target: 'player' | 'enemy', type?: 'crit' | 'block') => {
    const id = Date.now() + Math.random(); // Prevent duplicate keys
    setDamageNumbers(prev => [...prev, { id, val, target, type }]);
    setIsShaking(target);
    setTimeout(() => setIsShaking(null), 300);
    setTimeout(() => setDamageNumbers(prev => prev.filter(d => d.id !== id)), 1200);
  };

  // ============================================
  // OLD MODES LOGIC (Tactics, Chant)
  // ============================================
  const handleTacticsAnswer = (ans: string) => {
    // ... preserved old logic specific to tactics
    if (ans === currentGrammarQ.correctAnswer) {
      const dmg = playerStats.atk;
      setEnemyHp(p => Math.max(0, p - dmg));
      triggerEffect(dmg, 'enemy');
      setStatus('CORRECT!');
    } else {
      setStatus('INCORRECT!');
    }
    setTimeout(() => {
      setCurrentGrammarQ(MOCK_GRAMMAR_QUESTIONS[Math.floor(Math.random() * MOCK_GRAMMAR_QUESTIONS.length)]);
      // Simple bot attack
      setPlayerHp(p => Math.max(0, p - 10));
      triggerEffect(10, 'player');
    }, 1000);
  };

  // Chant Logic Preserved...
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


  // ============================================
  // RENDER - MATCHMAKING SCREEN
  // ============================================
  if (mode === 'pvp_blitz' && (pvpState === 'idle' || pvpState === 'searching')) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-6xl font-black rpg-font italic tracking-tighter text-indigo-500">
            BATTLE ARENA
          </h1>
          <p className="text-xs font-black uppercase tracking-[0.5em] text-slate-400">PvP Vocabulary Blitz</p>
        </div>

        <div className="relative group">
          <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full" />
          <button
            onClick={pvpState === 'searching' ? handleCancelSearch : startMatchmaking}
            className="relative w-48 h-48 rounded-full bg-slate-900 border-4 border-indigo-500/50 flex flex-col items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95"
          >
            {pvpState === 'searching' ? (
              <>
                <Loader2 size={48} className="text-indigo-500 animate-spin mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Searching...</span>
                <span className="text-xs font-bold text-slate-500 mt-1">{searchingTime}s</span>
              </>
            ) : (
              <>
                <Sword size={48} className="text-white mb-2" />
                <span className="text-xl font-black italic text-white">FIGHT</span>
              </>
            )}
          </button>
        </div>

        {pvpState === 'searching' && (
          <button onClick={handleCancelSearch} className="flex items-center gap-2 text-slate-500 hover:text-red-500 text-xs font-bold uppercase tracking-widest transition-colors">
            <XCircle size={14} /> Cancel
          </button>
        )}
      </div>
    );
  }

  // ============================================
  // RENDER - GAME SCREEN
  // ============================================
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
              <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">YOU</p>
              <p className="rpg-font text-base md:text-2xl font-black leading-none">{playerHp} HP</p>
            </div>
          </div>
          <div className="h-2 md:h-3 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border dark:border-slate-800 shadow-inner">
            <motion.div animate={{ width: `${(playerHp / playerStats.maxHp) * 100}%` }} className="h-full bg-gradient-to-r from-blue-600 to-indigo-500" />
          </div>
        </div>

        <div className="flex flex-col items-center opacity-80 shrink-0">
          <div className={`text-2xl font-black rpg-font ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
            {mode === 'pvp_blitz' ? timeLeft : '∞'}
          </div>
          <span className="text-[10px] md:text-xs font-black rpg-font text-slate-500">VS</span>
        </div>

        <div className={`flex-1 text-right transition-all ${isShaking === 'enemy' ? 'animate-shake' : ''}`}>
          <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-3 justify-end">
            <div className="overflow-hidden text-right">
              <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">{mode === 'pvp_blitz' ? opponentName : 'WRAITH'}</p>
              <p className="rpg-font text-base md:text-2xl font-black leading-none">{enemyHp} HP</p>
            </div>
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shadow-lg shrink-0">
              <User className="text-red-500" size={18} />
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
            {questions[currentQIndex] ? (
              <>
                <motion.h2
                  key={questions[currentQIndex].word}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-3xl md:text-7xl font-mono font-bold tracking-tighter dark:text-white text-slate-900 px-4"
                >
                  {questions[currentQIndex].word}
                </motion.h2>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {shuffledOptions.map((opt, idx) => (
                    <button
                      key={`${currentQIndex}-${idx}`}
                      onClick={() => handleChoice(opt)}
                      disabled={hasAnsweredCurrent}
                      className="p-4 md:p-8 dark:bg-slate-950 bg-slate-50 border-2 dark:border-slate-800 border-slate-200 rounded-2xl md:rounded-3xl hover:border-indigo-500 font-bold text-xs md:text-base transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-slate-500 font-bold animate-pulse">Loading Question...</div>
            )}

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
                  disabled={false}
                  className="p-4 md:p-6 dark:bg-slate-950 bg-slate-50 border-2 dark:border-slate-800 border-slate-200 rounded-2xl md:rounded-3xl hover:border-cyan-500 font-bold text-xs md:text-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'pvp_chant' && (
          /* ... Preserved Chant UI ... */
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

      {mode === 'pvp_chant' && (
        <div className="fixed z-[150] flex flex-col items-center gap-4 right-6 bottom-32 md:right-12 md:bottom-[140px]">
          <div className="flex flex-col items-center gap-4">
            {/* ... preserved mic button ... */}
            <motion.button
              onMouseDown={startChant}
              onMouseUp={stopChant}
              onTouchStart={startChant}
              onTouchEnd={stopChant}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`group relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all shadow-[0_15px_40px_rgba(0,0,0,0.4)] border-4 border-white dark:border-slate-900 ${isRecording ? 'bg-red-600' :
                `${getColorClass('bg', 600)} shadow-lg shadow-${primaryColor}-500/40`
                }`}
            >
              <Mic size={28} className="text-white" />
            </motion.button>
          </div>
        </div>
      )}

    </div>
  );
};

export default BattleArena;
