import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Shield, User, Zap, Flame, Sword, Target, ShieldCheck, Loader2, XCircle, Skull } from 'lucide-react';
import { startLiveSession, encodeAudio, resampleAudio } from '../services/liveService';
import { MOCK_GRAMMAR_QUESTIONS, MOCK_VOCAB_CARDS, MOCK_CHANT_QUESTIONS } from '../constants.tsx';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useWarrior } from '../contexts/WarriorContext';
import { soundService } from '../services/soundService';
import BattleScene from './Warrior/BattleScene';
import ChantBattleScene from './Warrior/ChantBattleScene';
import { supabase } from '../services/supabaseClient';
import { findWordBlitzMatch, cancelWordBlitzMatchmaking, submitWordBlitzAnswer, getOpponentProfile, checkWordBlitzMatchStatus, abandonWordBlitzMatch, PvPRoom } from '../services/pvpService';
import { findGrammarMatch, cancelGrammarMatchmaking, submitGrammarAnswer, checkGrammarMatchStatus, abandonGrammarMatch } from '../services/grammarPvpService';
import { PixelCard, PixelButton, PixelProgress } from './ui/PixelComponents';

interface BattleArenaProps {
  mode: string;
  playerStats: any;
  onVictory: () => void;
  onDefeat: () => void;
}

const BattleArena: React.FC<BattleArenaProps> = ({ mode, playerStats, onVictory, onDefeat }) => {
  const { user } = useAuth();
  const { getColorClass, primaryColor } = useTheme();
  const { state: warriorState } = useWarrior();
  const userId = user?.id;

  // Generic State
  const [playerHp, setPlayerHp] = useState(playerStats.hp);
  const [enemyHp, setEnemyHp] = useState(100);
  const [combatEvent, setCombatEvent] = useState<{ type: 'attack' | 'hit' | 'block'; target: 'player' | 'enemy'; damage?: number } | null>(null);
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
  const [isGameConnected, setIsGameConnected] = useState(false);

  // Refs
  const stateRef = useRef({
    playerHp: playerStats.hp,
    enemyHp: 100,
    currentQIndex: 0,
    hasAnswered: false,
    pvpState: 'idle' as 'idle' | 'searching' | 'matched' | 'playing' | 'end',
    roomId: null as string | null,
    userId: undefined as string | undefined
  });

  useEffect(() => {
    stateRef.current.playerHp = playerHp;
    stateRef.current.enemyHp = enemyHp;
    stateRef.current.currentQIndex = currentQIndex;
    stateRef.current.hasAnswered = hasAnsweredCurrent;
    stateRef.current.pvpState = pvpState;
    stateRef.current.roomId = roomId;
    stateRef.current.userId = userId;
  }, [playerHp, enemyHp, currentQIndex, hasAnsweredCurrent, pvpState, roomId, userId]);

  // Handle manual exit / unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pvpState === 'playing' && roomId && userId && !roomId.startsWith('local_ai_')) {
        if (mode === 'pvp_tactics') abandonGrammarMatch(roomId, userId);
        else abandonWordBlitzMatch(roomId, userId);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pvpState, roomId, userId, mode]);

  // Other Modes State
  const [currentGrammarQ, setCurrentGrammarQ] = useState(MOCK_GRAMMAR_QUESTIONS[0]);
  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const currentSessionRef = useRef<any>(null);

  useEffect(() => {
    if (mode === 'pvp_blitz' || mode === 'pvp_tactics' || mode === 'pvp_chant') {
      setPvpState('idle');
    }
    return () => {
      if (matchmakingChannelRef.current) {
        supabase.removeChannel(matchmakingChannelRef.current);
        matchmakingChannelRef.current = null;
      }
      if (roomId && userId) {
        if (mode === 'pvp_blitz') cancelWordBlitzMatchmaking(userId);
        if (mode === 'pvp_tactics') cancelGrammarMatchmaking(userId);
      }

      // Check for abandonment on unmount (navigation)
      const currentRef = stateRef.current;
      if (currentRef.pvpState === 'playing' && currentRef.roomId && currentRef.userId && !currentRef.roomId.startsWith('local_ai_')) {
        if (mode === 'pvp_tactics') abandonGrammarMatch(currentRef.roomId, currentRef.userId);
        else abandonWordBlitzMatch(currentRef.roomId, currentRef.userId);
      }
    };
  }, [mode]);

  // ============================================
  // PVP LOGIC (BLITZ MODE)
  // ============================================

  const matchmakingChannelRef = useRef<any>(null);

  const startMatchmaking = async () => {
    if (!userId) return;
    setStatus('SEARCHING...');
    setPvpState('searching');
    setSearchingTime(0);

    if (mode === 'pvp_chant') {
      setTimeout(() => startAiMatch(), 1500);
      return;
    }

    let elapsedTime = 0;
    const timer = setInterval(async () => {
      elapsedTime++;
      setSearchingTime(elapsedTime);

      if (elapsedTime >= 20) { // Increased timeout to 20s
        clearInterval(timer);
        startAiMatch();
        return;
      }

      // POLLING FALLBACK: Check every 2 seconds
      if (elapsedTime % 2 === 0) {
        let pollResult;
        if (mode === 'pvp_tactics') {
          pollResult = await checkGrammarMatchStatus(userId);
        } else {
          pollResult = await checkWordBlitzMatchStatus(userId);
        }

        if (pollResult) {
          console.log('🔄 Polling found match!', pollResult);
          clearInterval(timer);
          if (matchmakingChannelRef.current) {
            await supabase.removeChannel(matchmakingChannelRef.current);
            matchmakingChannelRef.current = null;
          }
          setRoomId(pollResult.roomId);
          setMyRole(pollResult.role);
          setPvpState('matched');
          setStatus('MATCH FOUND!');
        }
      }
    }, 1000);

    const setupSubscription = new Promise<void>((resolve) => {
      console.log('🔌 Setting up Matchmaking Listener for player1_id=' + userId);

      if (matchmakingChannelRef.current) {
        supabase.removeChannel(matchmakingChannelRef.current);
      }

      const table = mode === 'pvp_tactics' ? 'pvp_grammar_rooms' : 'pvp_word_blitz_rooms';

      const channel = supabase.channel('matchmaking_' + userId)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: table, filter: `player1_id=eq.${userId}` },
          async (payload) => {
            console.log('✅ Match created Event Received!', payload);
            const newRoom = payload.new as PvPRoom;

            if (matchmakingChannelRef.current) {
              await supabase.removeChannel(matchmakingChannelRef.current);
              matchmakingChannelRef.current = null;
            }

            clearInterval(timer);

            console.log('Matchmaking channel removed, switching to game room...');
            setMyRole('player1');
            setRoomId(newRoom.id);
            setPvpState('matched');
            setStatus('MATCH FOUND!');
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            resolve();
          }
        });

      matchmakingChannelRef.current = channel;
      setTimeout(resolve, 2000);
    });

    await setupSubscription;

    let result;
    if (mode === 'pvp_tactics') {
      result = await findGrammarMatch(userId);
    } else {
      result = await findWordBlitzMatch(userId);
    }

    if (result.status === 'matched' && result.roomId && result.role) {
      clearInterval(timer);
      if (matchmakingChannelRef.current) {
        await supabase.removeChannel(matchmakingChannelRef.current);
        matchmakingChannelRef.current = null;
      }
      setTimeout(() => {
        setRoomId(result.roomId);
        setMyRole(result.role as 'player1' | 'player2');
        setPvpState('matched');
        setStatus('MATCH FOUND!');
      }, 100);

    } else if (result.status === 'waiting') {
      console.log('⏳ Added to queue, waiting for opponent...');
    } else {
      clearInterval(timer);
      setStatus('ERROR');
      setPvpState('idle');
      if (matchmakingChannelRef.current) {
        await supabase.removeChannel(matchmakingChannelRef.current);
        matchmakingChannelRef.current = null;
      }
    }
  };

  const cancelSearchImpl = async (isSwitchingToAi: boolean) => {
    if (!userId) return;

    if (matchmakingChannelRef.current) {
      await supabase.removeChannel(matchmakingChannelRef.current);
      matchmakingChannelRef.current = null;
    }

    const p1 = mode === 'pvp_tactics' ? cancelGrammarMatchmaking(userId) : cancelWordBlitzMatchmaking(userId);

    if (!isSwitchingToAi) {
      await p1;
      setPvpState('idle');
      setStatus('CANCELLED');
    }
  };

  const handleCancelSearch = () => cancelSearchImpl(false);

  const [enemyAppearance, setEnemyAppearance] = useState({
    skinColor: '#cccccc',
    hairColor: '#000000',
    armorId: 'default',
    weaponId: 'default'
  });

  const generateRandomAppearance = () => {
    const skins = ['#f5d0b0', '#e0ac69', '#8d5524', '#523318', '#ffdbac'];
    const hairs = ['#000000', '#4a3b2a', '#e6cea0', '#a52a2a', '#ffffff', '#666666'];
    const armors = ['arm_leather', 'arm_iron', 'arm_golden', 'default'];
    const weapons = ['wpn_wood_sword', 'wpn_iron_sword', 'wpn_flame_blade', 'default'];

    return {
      skinColor: skins[Math.floor(Math.random() * skins.length)],
      hairColor: hairs[Math.floor(Math.random() * hairs.length)],
      armorId: armors[Math.floor(Math.random() * armors.length)],
      weaponId: weapons[Math.floor(Math.random() * weapons.length)]
    };
  };

  const startAiMatch = async () => {
    console.log('🤖 Starting AI Match...');
    await cancelSearchImpl(true);

    let mockQuestions;
    if (mode === 'pvp_tactics') mockQuestions = MOCK_GRAMMAR_QUESTIONS;
    else if (mode === 'pvp_chant') mockQuestions = MOCK_CHANT_QUESTIONS;
    else mockQuestions = MOCK_VOCAB_CARDS;

    const selectedQuestions = [...mockQuestions]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);

    setQuestions(selectedQuestions);
    setOpponentName('AI Trainer');
    setRoomId('local_ai_' + Date.now());
    setMyRole('player1');
    setPvpState('matched');
    setStatus('OPPONENT FOUND!');
    setIsGameConnected(true);

    setEnemyAppearance(generateRandomAppearance());

    setTimeout(() => {
      setCurrentQIndex(0);
      setShuffledOptions([...selectedQuestions[0].options].sort(() => Math.random() - 0.5));
      setPvpState('playing');
      setStatus('V.S.');
      setTimeLeft(10);
    }, 1500);
  };

  useEffect(() => {
    if (!roomId || !roomId.startsWith('local_ai_') || pvpState !== 'playing') return;
    const aiThinkTime = Math.random() * 4000 + 3000;

    const aiTimer = setTimeout(() => {
      const isCorrect = Math.random() > 0.2;
      const damage = isCorrect ? Math.floor(Math.random() * 5) + 5 : 0;

      if (isCorrect) {
        setPlayerHp(prev => {
          const newVal = Math.max(0, prev - damage);
          if (newVal < playerHp) triggerEffect(damage, 'player');
          return newVal;
        });
        if (playerHp - damage <= 0) {
          handleLocalGameOver('lost');
        }
      } else {
        triggerEffect(0, 'player', 'block');
      }

    }, aiThinkTime);

    return () => clearTimeout(aiTimer);
  }, [roomId, pvpState, currentQIndex, playerHp]);

  const handleLocalGameOver = (result: 'won' | 'lost') => {
    setPvpState('end');
    if (result === 'won') {
      setStatus('YOU WIN!');
    } else {
      setStatus('YOU LOSE!');
    }
  };

  useEffect(() => {
    if (!roomId || !myRole) return;

    if (roomId.startsWith('local_ai_')) {
      setIsGameConnected(true);
      return;
    }

    let activeChannel: any = null;
    let retryTimeout: any = null;
    let isMounted = true;

    const fetchAndSubscribe = async () => {
      try {
        const table = mode === 'pvp_tactics' ? 'pvp_grammar_rooms' : 'pvp_word_blitz_rooms';
        const { data, error } = await supabase.from(table).select('*').eq('id', roomId).single();
        if (error) throw error;
        if (data && isMounted) {
          console.log('📥 Initial Room State:', data);
          handleRoomUpdate(data as PvPRoom);
        }
      } catch (err) {
        console.error('Error fetching initial room state:', err);
      }

      if (!isMounted) return;
      subscribeToGame();
    };

    const subscribeToGame = () => {
      console.log(`🔌 Connecting to Game Room: ${roomId}`);
      const table = mode === 'pvp_tactics' ? 'pvp_grammar_rooms' : 'pvp_word_blitz_rooms';
      const channel = supabase.channel('game_' + roomId)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: table, filter: `id=eq.${roomId}` },
          (payload) => {
            console.log('📥 Game Update Received:', payload.new);
            handleRoomUpdate(payload.new as PvPRoom);
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            setIsGameConnected(true);
          } else {
            setIsGameConnected(false);
          }

          if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            supabase.removeChannel(channel);
            setIsGameConnected(false);
            if (isMounted) retryTimeout = setTimeout(subscribeToGame, 2000);
          }
        });

      activeChannel = channel;

      // Cleanup on unmount or game end
      return () => {
        if (pvpState === 'playing' || pvpState === 'matched') {
          // Basic disconnect tracking could go here if we tracked presence
        }
      };
    };

    fetchAndSubscribe();

    return () => {
      isMounted = false;
      if (activeChannel) supabase.removeChannel(activeChannel);
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [roomId, myRole]);

  useEffect(() => {
    if (!roomId || !myRole) return;

    const fetchOpponent = async () => {
      const table = mode === 'pvp_tactics' ? 'pvp_grammar_rooms' : 'pvp_word_blitz_rooms';
      const { data } = await supabase.from(table).select('player1_id, player2_id').eq('id', roomId).single();
      if (data) {
        const oppId = myRole === 'player1' ? data.player2_id : data.player1_id;
        const profile = await getOpponentProfile(oppId);
        if (profile) setOpponentName(profile.username);
      }
    };
    fetchOpponent();
  }, [roomId, myRole]);

  const handleRoomUpdate = (room: PvPRoom) => {
    const current = stateRef.current;
    const myIdsHp = myRole === 'player1' ? room.player1_hp : room.player2_hp;
    const oppIdsHp = myRole === 'player1' ? room.player2_hp : room.player1_hp;

    if (myIdsHp < current.playerHp) {
      triggerEffect(current.playerHp - myIdsHp, 'player');
    }
    if (oppIdsHp < current.enemyHp) {
      triggerEffect(current.enemyHp - oppIdsHp, 'enemy', 'crit');
    }

    setPlayerHp(myIdsHp);
    setEnemyHp(oppIdsHp);

    if (room.questions && room.questions.length > questions.length) {
      setQuestions(room.questions);
    } else if (questions.length === 0 && room.questions && room.questions.length > 0) {
      setQuestions(room.questions);
    }

    if (room.status === 'finished') {
      setPvpState('end');

      // Determine if victory was normal or by resignation/abandonment
      // Abandonment: I am winner, but opponent still has HP > 0
      // OR: Opponent has <= 0 HP means normal kill

      const myRoleInRoom = room.player1_id === userId ? 'player1' : 'player2';
      const myFinalHp = myRoleInRoom === 'player1' ? room.player1_hp : room.player2_hp;
      const oppFinalHp = myRoleInRoom === 'player1' ? room.player2_hp : room.player1_hp;

      if (room.winner_id === userId) {
        if (oppFinalHp > 0) {
          setStatus('VICTORY (OPPONENT RESIGNED)');
        } else {
          setStatus('YOU WIN!');
        }
      } else {
        // If I lost, check if I resigned (my HP > 0)
        if (myFinalHp > 0) {
          setStatus('DEFEAT (RESIGNED)');
        } else {
          setStatus('YOU LOSE!');
        }
      }
      return;
    }

    if (room.current_question_index !== current.currentQIndex) {
      setCurrentQIndex(room.current_question_index);
      setHasAnsweredCurrent(false);
      setTimeLeft(10);
      const currentList = (room.questions && room.questions.length > questions.length) ? room.questions : questions;
      const q = currentList[room.current_question_index];

      if (q) {
        setShuffledOptions([...q.options].sort(() => Math.random() - 0.5));
        setPvpState('playing');
        setStatus('V.S.');
      } else {
        setStatus('LOADING NEXT ROUND...');
      }
    }

    if (current.currentQIndex === 0 && room.current_question_index === 0 && pvpState !== 'playing' && room.questions && room.questions.length > 0) {
      if (!current.hasAnswered) {
        const q = room.questions[0];
        setShuffledOptions([...q.options].sort(() => Math.random() - 0.5));
        setPvpState('playing');
        setStatus('V.S.');
      }
    }
  };

  useEffect(() => {
    if (pvpState !== 'playing') return;
    if (timeLeft <= 0 && !hasAnsweredCurrent) {
      handlePvPAnswer(false, 0);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, pvpState, hasAnsweredCurrent]);

  const handlePvPAnswer = async (correct: boolean, timeRemaining: number) => {
    if (!roomId || !userId || hasAnsweredCurrent) return;
    setHasAnsweredCurrent(true);
    setStatus(correct ? 'ATTACKING!' : 'DEFENDING...');

    if (roomId.startsWith('local_ai_')) {
      setTimeout(() => {
        if (correct) {
          const dmg = timeRemaining * 2;
          setEnemyHp(prev => {
            const newVal = Math.max(0, prev - dmg);
            if (newVal < enemyHp) triggerEffect(dmg, 'enemy', 'crit');
            if (newVal <= 0) handleLocalGameOver('won');
            return newVal;
          });
        } else {
          const dmg = 5;
          setPlayerHp(prev => {
            const newVal = Math.max(0, prev - dmg);
            triggerEffect(dmg, 'player');
            if (newVal <= 0) handleLocalGameOver('lost');
            return newVal;
          });
        }

        if (currentQIndex < questions.length - 1) {
          setTimeout(() => {
            const nextIdx = currentQIndex + 1;
            setCurrentQIndex(nextIdx);
            setHasAnsweredCurrent(false);
            setTimeLeft(10);
            const q = questions[nextIdx];
            setShuffledOptions([...q.options].sort(() => Math.random() - 0.5));
            setStatus('V.S.');
          }, 1000);
        } else {
          setTimeout(() => {
            if (playerHp > enemyHp) handleLocalGameOver('won');
            else handleLocalGameOver('lost');
          }, 1000);
        }
      }, 500);
      return;
    }

    if (mode === 'pvp_tactics') {
      await submitGrammarAnswer(roomId, userId, currentQIndex, correct, timeRemaining);
    } else {
      await submitWordBlitzAnswer(roomId, userId, currentQIndex, correct, timeRemaining);
    }
  };

  const handleChoice = (option: string) => {
    if (hasAnsweredCurrent) return;
    const currentQ = questions[currentQIndex];
    if (!currentQ) return;
    const isCorrect = option === currentQ.correctAnswer;
    handlePvPAnswer(isCorrect, timeLeft);
  };

  const triggerEffect = (val: number, target: 'player' | 'enemy', type?: 'crit' | 'block') => {
    const id = Date.now() + Math.random();
    setDamageNumbers(prev => [...prev, { id, val, target, type }]);
    setIsShaking(target);
    soundService.playAttack(type === 'crit' ? 'fire' : 'slash');
    setCombatEvent({
      type: type === 'block' ? 'block' : 'attack',
      target: target,
      damage: val
    });
    setTimeout(() => setCombatEvent(null), 500);
    setTimeout(() => setIsShaking(null), 300);
    setTimeout(() => setDamageNumbers(prev => prev.filter(d => d.id !== id)), 1200);
  };

  if ((mode === 'pvp_blitz' || mode === 'pvp_tactics' || mode === 'pvp_chant') && (pvpState === 'idle' || pvpState === 'searching')) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="text-4xl md:text-5xl font-black italic tracking-tighter text-indigo-500 mb-4 animate-pulse">
            {mode === 'pvp_tactics' ? 'GRAMMAR STRONGHOLD' : mode === 'pvp_chant' ? 'CHANT DUEL' : 'BATTLE ARENA'}
          </div>
          <PixelCard variant="dark" className="inline-block px-4 py-2">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
              {mode === 'pvp_tactics' ? 'PvP Grammar Tactics' : mode === 'pvp_chant' ? 'PvP Translation Duel' : 'PvP Vocabulary Blitz'}
            </span>
          </PixelCard>
        </div>

        <div className="relative group">
          <button
            onClick={pvpState === 'searching' ? handleCancelSearch : startMatchmaking}
            className={`
                relative w-48 h-48 bg-slate-900 border-4 ${pvpState === 'searching' ? 'border-amber-500' : 'border-indigo-500'} 
                flex flex-col items-center justify-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] 
                active:translate-y-1 active:shadow-none transition-all
            `}
          >
            {pvpState === 'searching' ? (
              <>
                <Loader2 size={40} className="text-amber-500 animate-spin mb-3" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">MATCHING...</span>
                <span className="text-xs font-bold text-slate-500 mt-1">{searchingTime}s</span>
              </>
            ) : (
              <>
                <Sword size={48} className="text-white mb-2" />
                <span className="text-xl font-black italic text-white tracking-widest">FIGHT</span>
              </>
            )}

            {/* Corner bolts */}
            <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-slate-700" />
            <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-slate-700" />
            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-slate-700" />
            <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-slate-700" />
          </button>
        </div>

        {pvpState === 'searching' && (
          <PixelButton variant="danger" size="sm" onClick={handleCancelSearch}>
            <span className="flex items-center gap-2"><XCircle size={14} /> CANCEL</span>
          </PixelButton>
        )}
      </div>
    );
  }



  return (
    <div className="h-full flex flex-col space-y-4 max-w-5xl mx-auto py-2 px-0">

      {/* HP HEADER */}
      <div className="flex justify-between items-center gap-4 px-4 pt-2">
        {/* PLAYER */}
        <div className={`flex-1 transition-all ${isShaking === 'player' ? 'animate-shake' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 border-2 border-black bg-indigo-500/10 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <User className="text-indigo-500" size={16} />
            </div>
            <div className="overflow-hidden">
              <span className="block text-[8px] font-black uppercase tracking-widest text-slate-500">HERO</span>
              <span className="block text-sm font-black text-slate-200 leading-none">{playerHp} HP</span>
            </div>
          </div>
          <PixelProgress value={playerHp} max={playerStats.maxHp} color="bg-indigo-500" showValue={false} />
        </div>

        {/* VS / TIMER */}
        <div className="flex flex-col items-center mx-2 shrink-0 w-16">
          <div className={`text-2xl font-black italic ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
            {pvpState === 'playing' ? timeLeft : 'VS'}
          </div>
          {pvpState === 'playing' && <span className="text-[8px] uppercase tracking-widest text-slate-600">SECONDS</span>}
        </div>

        {/* ENEMY */}
        <div className={`flex-1 transition-all ${isShaking === 'enemy' ? 'animate-shake' : ''} text-right`}>
          <div className="flex items-center gap-2 mb-2 justify-end">
            <div className="overflow-hidden">
              <span className="block text-[8px] font-black uppercase tracking-widest text-slate-500 truncate max-w-[80px]">{opponentName}</span>
              <span className="block text-sm font-black text-slate-200 leading-none">{enemyHp} HP</span>
            </div>
            <div className="w-10 h-10 border-2 border-black bg-red-500/10 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Skull className="text-red-500" size={16} />
            </div>
          </div>
          <PixelProgress value={enemyHp} max={100} color="bg-red-500" showValue={false} />
        </div>
      </div>

      {/* BATTLE SCENE */}
      <div className="relative w-full max-w-2xl mx-auto z-0 opacity-90 grayscale-[20%] hover:grayscale-0 transition-all duration-500">
        {mode === 'pvp_chant' ? (
          <ChantBattleScene
            playerIds={{
              skinColor: warriorState.appearance.skinColor,
              hairColor: warriorState.appearance.hairColor,
              armorId: warriorState.equipped.armor || 'default',
              weaponId: warriorState.equipped.weapon || 'default'
            }}
            enemyIds={enemyAppearance}
            combatEvent={combatEvent}
          />
        ) : (
          <BattleScene
            playerIds={{
              skinColor: warriorState.appearance.skinColor,
              hairColor: warriorState.appearance.hairColor,
              armorId: warriorState.equipped.armor || 'default',
              weaponId: warriorState.equipped.weapon || 'default'
            }}
            enemyIds={enemyAppearance}
            combatEvent={combatEvent}
          />
        )}
      </div>

      {/* INTERACTION AREA */}
      <PixelCard variant="dark" className="flex-1 mx-2 md:mx-auto md:w-full md:max-w-2xl p-6 flex flex-col items-center justify-center relative min-h-[280px]">
        <AnimatePresence>
          {damageNumbers.map(d => (
            <motion.div
              key={d.id}
              initial={{ y: 0, opacity: 1, scale: 0.5 }}
              animate={{ y: -150, opacity: 0, scale: 1.5 }}
              exit={{ opacity: 0 }}
              className={`absolute font-black z-50 flex flex-col items-center ${d.target === 'player' ? 'text-red-500 left-10' : 'text-yellow-400 right-10'}`}
            >
              <span className="text-4xl drop-shadow-[2px_2px_0_#000]">-{d.val}</span>
              {d.type && <span className="text-[10px] uppercase tracking-widest bg-black text-white px-2 py-0.5 border border-white">{d.type}</span>}
            </motion.div>
          ))}
        </AnimatePresence>

        {mode === 'pvp_blitz' && questions[currentQIndex] && (
          <div className="space-y-6 w-full text-center">
            <motion.div
              key={questions[currentQIndex].word}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="py-4 border-b-2 border-slate-800"
            >
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-widest uppercase drop-shadow-[4px_4px_0_#000]">
                {questions[currentQIndex].word}
              </h2>
            </motion.div>
            <div className="grid grid-cols-2 gap-3">
              {shuffledOptions.map((opt, idx) => (
                <PixelButton
                  key={`${currentQIndex}-${idx}`}
                  variant="neutral"
                  onClick={() => handleChoice(opt)}
                  disabled={hasAnsweredCurrent || !isGameConnected}
                  className="h-16 text-xs md:text-sm whitespace-normal"
                >
                  {opt}
                </PixelButton>
              ))}
            </div>
          </div>
        )}

        {mode === 'pvp_tactics' && questions[currentQIndex] && (
          <div className="space-y-6 w-full text-center">
            <div className="py-2">
              <h2 className="text-lg md:text-xl font-bold text-white italic">
                {questions[currentQIndex].prompt}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {questions[currentQIndex].options?.map((opt: string) => (
                <PixelButton
                  key={opt}
                  fullWidth
                  variant="neutral"
                  onClick={() => handleChoice(opt)}
                  disabled={hasAnsweredCurrent || !isGameConnected}
                  className="py-4 text-xs md:text-sm"
                >
                  {opt}
                </PixelButton>
              ))}
            </div>
          </div>
        )}

        {!isGameConnected && (
          <div className="absolute bottom-2 text-[10px] font-black uppercase text-indigo-500 animate-pulse bg-black px-2 border border-indigo-900">
            Connecting...
          </div>
        )}
      </PixelCard>

      {/* FOOTER STATS */}
      <div className="flex justify-center gap-4 pb-20 opacity-50">
        <PixelCard noBorder variant="dark" className="px-3 py-1 bg-black/50 border-2 border-slate-800 flex items-center gap-2">
          <Sword size={12} className="text-indigo-400" />
          <span className="text-[10px] font-mono">{playerStats.atk}</span>
        </PixelCard>
        <PixelCard noBorder variant="dark" className="px-3 py-1 bg-black/50 border-2 border-slate-800 flex items-center gap-2">
          <Shield size={12} className="text-emerald-400" />
          <span className="text-[10px] font-mono">{playerStats.def}</span>
        </PixelCard>
      </div>

      {/* GAME OVER OVERLAY */}
      <AnimatePresence>
        {status.includes('WIN') || status.includes('LOSE') || status.includes('VICTORY') || status.includes('DEFEAT') ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-8"
          >
            <PixelCard variant="dark" className="p-12 flex flex-col items-center gap-8 border-white shadow-[0_0_50px_rgba(79,70,229,0.3)]">
              <div className="text-center space-y-4">
                <h2 className={`text-4xl md:text-6xl font-black italic tracking-tighter ${status.includes('WIN') || status.includes('VICTORY') ? 'text-yellow-400' : 'text-red-500'}`}>
                  {status === 'VICTORY (OPPONENT RESIGNED)' ? 'OPPONENT RESIGNED' :
                    status === 'DEFEAT (RESIGNED)' ? 'YOU RESIGNED' : status}
                </h2>
                <p className="text-slate-400 font-bold tracking-widest uppercase text-sm">
                  {status.includes('VICTORY') || status.includes('WIN') ? 'Victory Achieved' : 'Defeat accepted'}
                </p>
              </div>

              <div className="flex gap-4">
                <PixelButton
                  size="lg"
                  variant={status.includes('WIN') || status.includes('VICTORY') ? 'warning' : 'danger'}
                  onClick={() => (status.includes('WIN') || status.includes('VICTORY')) ? onVictory() : onDefeat()}
                >
                  {status.includes('WIN') || status.includes('VICTORY') ? 'CLAIM REWARD' : 'RETURN TO BASE'}
                </PixelButton>
              </div>
            </PixelCard>
          </motion.div>
        ) : null}
      </AnimatePresence>

    </div >
  );
};

export default BattleArena;
