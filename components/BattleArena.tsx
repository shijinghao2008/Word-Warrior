
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Shield, User, Zap, Flame, Sword, Target, ShieldCheck, Loader2, XCircle } from 'lucide-react';
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
import { findGrammarMatch, cancelGrammarMatchmaking, submitGrammarAnswer, checkGrammarMatchStatus } from '../services/grammarPvpService';

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
  const [combatEvent, setCombatEvent] = useState<{ type: 'attack' | 'hit' | 'block'; target: 'player' | 'enemy'; damage?: number } | null>(null); // For non-PvP modes or initial PvP
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
  const [isGameConnected, setIsGameConnected] = useState(false); // New state to block interaction
  const [matchDetails, setMatchDetails] = useState<any>(null); // Store score breakdown
  const [isBattleBtnPressed, setIsBattleBtnPressed] = useState(false);

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
    if (mode === 'pvp_blitz' || mode === 'pvp_tactics' || mode === 'pvp_chant') {
      setPvpState('idle');

      // Auto-Resume Check for Blitz
      if (mode === 'pvp_blitz' && userId) {
        checkWordBlitzMatchStatus(userId).then(match => {
          if (match) {
            console.log('Found active match, resuming...', match);
            setRoomId(match.roomId);
            setMyRole(match.role);
            setPvpState('matched');
            setStatus('RESUMING...');
            setIsGameConnected(true);
          }
        });
      }
    }
    return () => {
      if (matchmakingChannelRef.current) {
        supabase.removeChannel(matchmakingChannelRef.current);
        matchmakingChannelRef.current = null;
      }
      if (roomId && userId) {
        if (pvpState === 'searching') {
          if (mode === 'pvp_blitz') cancelWordBlitzMatchmaking(userId);
          if (mode === 'pvp_tactics') cancelGrammarMatchmaking(userId);
          // Clear polling interval if unmounting while searching
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        } else if (pvpState === 'playing' || pvpState === 'matched') {
          // If unmounting while playing, treat as abandon?
          // Optional: abandonWordBlitzMatch(roomId, userId);
        }
      }
    };
  }, [mode]);

  // ============================================
  // PVP LOGIC (BLITZ MODE)
  // ============================================

  // 1. Matchmaking
  // 1. Matchmaking
  // 1. Matchmaking
  const matchmakingChannelRef = useRef<any>(null); // Keep track of channel
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null); // Matchmaking fallback poll

  const startMatchmaking = async () => {
    if (!userId) return;
    setStatus('SEARCHING...');
    setPvpState('searching');
    setSearchingTime(0);

    if (mode === 'pvp_chant') {
      setTimeout(() => startAiMatch(), 1500);
      return;
    }

    // Timer for UI only - Modified to trigger AI
    // Timer for UI only - Modified to trigger AI
    const timer = setInterval(() => {
      setSearchingTime(t => {
        if (t >= 10) {
          clearInterval(timer); // Stop counting
          // Clear polling interval if exists
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          startAiMatch(); // Switch to AI
          return t;
        }
        return t + 1;
      });
    }, 1000);

    // Polling Fallback (Every 2s) - Fix for race condition/missed socket events
    const pollingInterval = setInterval(async () => {
      if (pvpState !== 'searching') {
        clearInterval(pollingInterval);
        return;
      }

      const checkFn = mode === 'pvp_tactics' ? checkGrammarMatchStatus : checkWordBlitzMatchStatus;
      const match = await checkFn(userId);

      if (match) {
        console.log('🔄 Polling found match!', match);
        clearInterval(timer);
        clearInterval(pollingInterval);

        if (matchmakingChannelRef.current) {
          await supabase.removeChannel(matchmakingChannelRef.current);
          matchmakingChannelRef.current = null;
        }

        setMyRole(match.role);
        setRoomId(match.roomId);
        setPvpState('matched');
        setStatus('MATCH FOUND!');
      }
    }, 2000);

    // Store polling interval to clear it on cancel/AI switch
    // We need a ref for this content to be accessible in cancel
    pollingIntervalRef.current = pollingInterval;

    // 1. Setup Realtime Subscription FIRST (to avoid race condition)
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

            // Important: Unsubscribe first
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
            // handleRoomUpdate call is handled by the subscription in the next useEffect
          }
        )
        .subscribe((status) => {
          console.log('Matchmaking subscription status:', status);
          if (status === 'SUBSCRIBED') {
            resolve();
          }
        });

      matchmakingChannelRef.current = channel;

      // Safety timeout - if subscription hangs, proceed anyway
      setTimeout(resolve, 2000);
    });

    await setupSubscription;

    // 2. Call RPC to join queue (or match instantly)
    let result;
    if (mode === 'pvp_tactics') {
      result = await findGrammarMatch(userId);
    } else {
      result = await findWordBlitzMatch(userId);
    }

    if (result.status === 'matched' && result.roomId && result.role) {
      clearInterval(timer);

      // We found a match immediately (we were the 2nd player)
      if (matchmakingChannelRef.current) {
        await supabase.removeChannel(matchmakingChannelRef.current);
        matchmakingChannelRef.current = null;
      }

      // Small delay to ensure socket is clean before game subscription starts
      setTimeout(() => {
        setRoomId(result.roomId);
        setMyRole(result.role as 'player1' | 'player2');
        setPvpState('matched');
        setStatus('MATCH FOUND!');
      }, 100);

    } else if (result.status === 'waiting') {
      // We are waiting. The channel we set up in Step 1 will handle the event when it comes.
      console.log('⏳ Added to queue, waiting for opponent...');
    } else {
      // Error
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

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // We don't await these if switching to AI to speed up UI transition
    const p1 = mode === 'pvp_tactics' ? cancelGrammarMatchmaking(userId) : cancelWordBlitzMatchmaking(userId);

    if (!isSwitchingToAi) {
      await p1;
      setPvpState('idle');
      setStatus('CANCELLED');
    }
  };

  const handleCancelSearch = () => cancelSearchImpl(false);

  // Enemy Visual State
  const [enemyAppearance, setEnemyAppearance] = useState({
    skinColor: '#cccccc',
    hairColor: '#000000',
    armorId: 'default',
    weaponId: 'default'
  });

  // Helper: Generate Random Appearance
  const generateRandomAppearance = () => {
    const skins = ['#f5d0b0', '#e0ac69', '#8d5524', '#523318', '#ffdbac'];
    const hairs = ['#000000', '#4a3b2a', '#e6cea0', '#a52a2a', '#ffffff', '#666666'];
    // Filter out weapons/armor from SHOP_ITEMS
    /* 
       We can import SHOP_ITEMS but we need to ensure circular deps are fine.
       Or just hardcode IDs for simplicity as this is "AI" generation.
    */
    const armors = ['arm_leather', 'arm_iron', 'arm_golden', 'default'];
    const weapons = ['wpn_wood_sword', 'wpn_iron_sword', 'wpn_flame_blade', 'default'];

    return {
      skinColor: skins[Math.floor(Math.random() * skins.length)],
      hairColor: hairs[Math.floor(Math.random() * hairs.length)],
      armorId: armors[Math.floor(Math.random() * armors.length)],
      weaponId: weapons[Math.floor(Math.random() * weapons.length)]
    };
  };

  // ============================================
  // SHARED EFFECTS (Moved Up)
  // ============================================

  const triggerEffect = (val: number, target: 'player' | 'enemy', type?: 'crit' | 'block') => {
    const id = Date.now() + Math.random();
    setDamageNumbers(prev => [...prev, { id, val, target, type }]);
    setIsShaking(target);

    // Play Sound
    if (type === 'block') {
      // soundService.playBlock(); // If implemented
    } else {
      soundService.playAttack(type === 'crit' ? 'fire' : 'slash');
    }

    // Trigger Visual Event
    setCombatEvent({
      type: type === 'block' ? 'block' : 'attack',
      target: target,
      damage: val
    });
    // Reset event after short animation time
    setTimeout(() => setCombatEvent(null), 500);

    setTimeout(() => setIsShaking(null), 300);
    setTimeout(() => setDamageNumbers(prev => prev.filter(d => d.id !== id)), 1200);
  };

  // AI MATCH LOGIC
  const startAiMatch = async () => {
    console.log('🤖 Starting AI Match...');
    await cancelSearchImpl(true);

    await cancelSearchImpl(true);

    let mockQuestions;
    if (mode === 'pvp_tactics') mockQuestions = MOCK_GRAMMAR_QUESTIONS;
    else if (mode === 'pvp_chant') mockQuestions = MOCK_CHANT_QUESTIONS;
    else mockQuestions = MOCK_VOCAB_CARDS;

    // Shuffle questions
    const selectedQuestions = [...mockQuestions]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5); // Take 5 questions for quick match

    setQuestions(selectedQuestions);
    setOpponentName('AI Trainer');
    setRoomId('local_ai_' + Date.now());
    setMyRole('player1');
    setPvpState('matched');
    setStatus('OPPONENT FOUND!');
    setIsGameConnected(true); // Always connected for local AI

    // RANDOMIZE ENEMY APPEARANCE
    setEnemyAppearance(generateRandomAppearance());

    // Start Game
    setTimeout(() => {
      setCurrentQIndex(0);
      setShuffledOptions([...selectedQuestions[0].options].sort(() => Math.random() - 0.5));
      setPvpState('playing');
      setStatus('V.S.');
      setTimeLeft(10);
    }, 1500);
  };

  // AI Simulation Loop
  useEffect(() => {
    if (!roomId || !roomId.startsWith('local_ai_') || pvpState !== 'playing') return;

    // AI Bot thinking time
    const aiThinkTime = Math.random() * 4000 + 3000; // 3-7 seconds

    const aiTimer = setTimeout(() => {
      // AI Answer Logic
      const isCorrect = Math.random() > 0.2; // 80% accuracy
      const damage = isCorrect ? Math.floor(Math.random() * 5) + 5 : 0; // Random damage 5-10 approx

      if (isCorrect) {
        setPlayerHp(prev => {
          const newVal = Math.max(0, prev - damage);
          if (newVal < playerHp) triggerEffect(damage, 'player');
          return newVal;
        });
        // Check game over
        if (playerHp - damage <= 0) {
          handleLocalGameOver('lost');
        }
      } else {
        // AI Missed
        triggerEffect(0, 'player', 'block');
      }

    }, aiThinkTime);

    return () => clearTimeout(aiTimer);
  }, [roomId, pvpState, currentQIndex, playerHp]); // Re-run on state change key triggers

  const handleLocalGameOver = (result: 'won' | 'lost') => {
    setPvpState('end');
    if (result === 'won') {
      setStatus('YOU WIN!');
    } else {
      setStatus('YOU LOSE!');
    }
  };

  // 2. Game Loop Subscription & Initial Fetch
  useEffect(() => {
    if (!roomId || !myRole) return;

    // Skip subscription for local AI matches
    if (roomId.startsWith('local_ai_')) {
      setIsGameConnected(true);
      return;
    }

    let activeChannel: any = null;
    let retryTimeout: any = null;
    let isMounted = true;

    const fetchAndSubscribe = async () => {
      // 2.1 Fetch Initial State (Guarantees fresh state vs manual call)
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

      // 2.2 Subscribe
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
          console.log(`Game Room Subscription Status (${roomId}):`, status, err);

          if (status === 'SUBSCRIBED') {
            setIsGameConnected(true);
          } else {
            setIsGameConnected(false);
          }

          if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            console.warn(`⚠️ Subscription issue: ${status}. Retrying...`);
            supabase.removeChannel(channel);
            setIsGameConnected(false);
            if (isMounted) retryTimeout = setTimeout(subscribeToGame, 2000);
          }
        });

      activeChannel = channel;
    };

    fetchAndSubscribe();

    return () => {
      isMounted = false;
      console.log(`🧹 Cleaning up game subscription for ${roomId}`);
      if (activeChannel) supabase.removeChannel(activeChannel);
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [roomId, myRole]); // Run when we have room AND role

  // 2.5 Fetch Opponent (Separate Effect) - Can be merged but keeping separate is fine
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

    // Sync Questions (Append only logic)
    // If server has more questions than us, update local questions
    if (room.questions && room.questions.length > questions.length) {
      console.log(`📜 Received new questions! Old: ${questions.length}, New: ${room.questions.length}`);
      setQuestions(room.questions);
    } else if (questions.length === 0 && room.questions && room.questions.length > 0) {
      // First load
      setQuestions(room.questions);
    }

    // Verify Game Over
    if (room.status === 'finished') {
      setPvpState('end');
      if (room.winner_id === userId) {
        setStatus('YOU WIN!');
        // onVictory(); // Waiting for manual exit
      } else {
        setStatus('YOU LOSE!');
        // onDefeat(); // Waiting for manual exit
      }

      // Set Match Details if available
      if (room.match_details && myRole) {
        setMatchDetails(room.match_details[myRole]);
      }
      return;
    }

    // Sync Question Index
    // We compare with Ref to ensure we catch the change even if closure is stale
    if (room.current_question_index !== current.currentQIndex) {
      console.log(`🔄 Next Question: ${current.currentQIndex} -> ${room.current_question_index}`);

      setCurrentQIndex(room.current_question_index);
      setHasAnsweredCurrent(false);
      setTimeLeft(10); // Reset timer

      // Check if we actually HAVE this question yet
      // Because update might come before the questions array update via Postgres partials? 
      // Actually we send the whole row usually.

      // But if we are at index 10 (size 10), and questions array is size 10 (0..9). 
      // Then we are waiting for questions update.
      const currentList = (room.questions && room.questions.length > questions.length) ? room.questions : questions;
      const q = currentList[room.current_question_index];

      if (q) {
        setShuffledOptions([...q.options].sort(() => Math.random() - 0.5));
        setPvpState('playing');
        setStatus('V.S.');
      } else {
        // Question not here yet! UI Lock.
        console.warn('⚠️ Current question index out of bounds, waiting for question data...');
        setStatus('LOADING NEXT ROUND...');
        // We do NOT set pvpState to 'playing' here to prevent timer start etc.
        // Or we set it but UI disables interaction.
      }
    }

    // If first load/Start
    if (current.currentQIndex === 0 && room.current_question_index === 0 && pvpState !== 'playing' && room.questions && room.questions.length > 0) {
      // Initialize First Question
      if (!current.hasAnswered) {
        const q = room.questions[0];
        setShuffledOptions([...q.options].sort(() => Math.random() - 0.5));
        setPvpState('playing');
        setStatus('V.S.');
      }
    }
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

    // Check if Local AI Match
    if (roomId.startsWith('local_ai_')) {
      // Local Logic
      setTimeout(() => {
        if (correct) {
          const dmg = timeRemaining * 2; // Simple math
          setEnemyHp(prev => {
            const newVal = Math.max(0, prev - dmg);
            if (newVal < enemyHp) triggerEffect(dmg, 'enemy', 'crit');
            if (newVal <= 0) handleLocalGameOver('won');
            return newVal;
          });
        } else {
          // Self damage?
          const dmg = 5;
          setPlayerHp(prev => {
            const newVal = Math.max(0, prev - dmg);
            triggerEffect(dmg, 'player');
            if (newVal <= 0) handleLocalGameOver('lost');
            return newVal;
          });
        }

        // Next Question
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
          // End of questions - check HP winner?
          // Or just loop? Let's end for now.
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
    const isCorrect = option === currentQ.correctAnswer;
    handlePvPAnswer(isCorrect, timeLeft);
  };


  // ============================================
  // SHARED EFFECTS
  // ============================================



  // ============================================
  // OLD MODES LOGIC (Tactics, Chant)
  // ============================================
  const handleTacticsAnswer = (ans: string) => {
    // Legacy single player logic removed in favor of PvP
    // But we reuse this function for PvP interaction to keep UI consistent if desired
    // Or we just map the UI to handleChoice

    // For PvP:
    if (mode === 'pvp_tactics') {
      handleChoice(ans);
      return;
    }
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
  // ============================================
  // RENDER - MATCHMAKING SCREEN
  // ============================================
  if ((mode === 'pvp_blitz' || mode === 'pvp_tactics' || mode === 'pvp_chant') && (pvpState === 'idle' || pvpState === 'searching')) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-6xl font-black rpg-font italic tracking-tighter text-indigo-500">
            {mode === 'pvp_tactics' ? 'GRAMMAR STRONGHOLD' : mode === 'pvp_chant' ? 'CHANT DUEL' : 'BATTLE ARENA'}
          </h1>
          <p className="text-xs font-black uppercase tracking-[0.5em] text-slate-400">
            {mode === 'pvp_tactics' ? 'PvP Grammar Tactics' : mode === 'pvp_chant' ? 'PvP Translation Duel' : 'PvP Vocabulary Blitz'}
          </p>
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
            {mode === 'pvp_blitz' || mode === 'pvp_tactics' || mode === 'pvp_chant' ? timeLeft : '∞'}
          </div>
          <span className="text-[10px] md:text-xs font-black rpg-font text-slate-500">VS</span>
        </div>

        <div className={`flex-1 text-right transition-all ${isShaking === 'enemy' ? 'animate-shake' : ''}`}>
          <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-3 justify-end">
            <div className="overflow-hidden text-right">
              <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">
                {mode === 'pvp_blitz' || mode === 'pvp_tactics' || mode === 'pvp_chant' ? opponentName : 'WRAITH'}
              </p>
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

      {/* BATTLE SCENE */}
      <div className="relative w-full max-w-3xl mx-auto -mt-4 mb-4 z-0">
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

      <div className="flex-1 mx-2 md:mx-4 dark:bg-slate-900/30 bg-white border dark:border-slate-800 border-slate-200 rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-12 flex flex-col items-center justify-center relative shadow-2xl backdrop-blur-sm overflow-hidden min-h-[300px]">
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
                      disabled={hasAnsweredCurrent || !isGameConnected}
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

            {!isGameConnected && (
              <div className="text-xs font-black uppercase tracking-widest text-indigo-500 animate-pulse">Connecting to Live Server...</div>
            )}

          </div>
        )}

        {mode === 'pvp_tactics' && (
          <div className="space-y-6 md:space-y-12 w-full max-w-2xl text-center px-6 md:px-0">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500">Syntax Challenge</span>
              <motion.h2
                key={questions[currentQIndex]?.prompt || 'loading'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg md:text-3xl font-bold dark:text-white text-slate-900 px-4 leading-relaxed italic"
              >
                {questions[currentQIndex]?.prompt || (status === 'READY' ? 'Ready...' : 'Loading Question...')}
              </motion.h2>
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {questions[currentQIndex]?.options?.map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => handleChoice(opt)}
                  disabled={hasAnsweredCurrent || !isGameConnected}
                  className="p-4 md:p-6 dark:bg-slate-950 bg-slate-50 border-2 dark:border-slate-800 border-slate-200 rounded-2xl md:rounded-3xl hover:border-cyan-500 font-bold text-xs md:text-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  {opt}
                </button>
              )) || (
                  <div className="col-span-2 text-slate-500 animate-pulse">Waiting for server...</div>
                )}
            </div>
            {!isGameConnected && (
              <div className="text-xs font-black uppercase tracking-widest text-indigo-500 animate-pulse">Connecting to Live Server...</div>
            )}
          </div>
        )}

        {mode === 'pvp_chant' && (
          <div className="space-y-6 md:space-y-12 w-full max-w-2xl text-center px-6 md:px-0">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500">Translation Challenge</span>
              <motion.h2
                key={questions[currentQIndex]?.prompt || 'loading'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg md:text-3xl font-bold dark:text-white text-slate-900 px-4 leading-relaxed italic"
              >
                {questions[currentQIndex]?.prompt || (status === 'READY' ? 'Ready...' : 'Loading Question...')}
              </motion.h2>
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {questions[currentQIndex]?.options?.map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => handleChoice(opt)}
                  disabled={hasAnsweredCurrent || !isGameConnected}
                  className="p-4 md:p-6 dark:bg-slate-950 bg-slate-50 border-2 dark:border-slate-800 border-slate-200 rounded-2xl md:rounded-3xl hover:border-cyan-500 font-bold text-xs md:text-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  {opt}
                </button>
              )) || (
                  <div className="col-span-2 text-slate-500 animate-pulse">Waiting for server...</div>
                )}
            </div>
            {!isGameConnected && (
              <div className="text-xs font-black uppercase tracking-widest text-indigo-500 animate-pulse">Connecting to Live Server...</div>
            )}
          </div>
        )}


      </div>

      <div className="flex justify-center gap-6 md:gap-16 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 pb-24 md:pb-8">
        <div className="flex items-center gap-1.5"><Sword size={10} /> ATK: {playerStats.atk}</div>
        <div className="flex items-center gap-1.5"><Shield size={10} /> DEF: {playerStats.def}</div>
        <div className="flex items-center gap-1.5"><Zap size={10} /> CRIT: {Math.round(playerStats.crit * 100)}%</div>
      </div>





      {/* GAME OVER OVERLAY */}
      <AnimatePresence>
        {status === 'YOU WIN!' || status === 'YOU LOSE!' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-8"
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="text-center space-y-8"
            >
              <div className="space-y-4">
                <h2 className={`text-6xl md:text-8xl font-black italic tracking-tighter ${status === 'YOU WIN!' ? 'text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]' : 'text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]'}`}>
                  {status}
                </h2>
                <p className="text-slate-400 font-bold tracking-widest uppercase">
                  {status === 'YOU WIN!' ? 'Victory Achieved' : 'Defeat accepted'}
                </p>
              </div>

              {matchDetails && (
                <div className="bg-slate-800/50 rounded-xl p-6 text-left space-y-2 min-w-[250px] border border-slate-700">
                  <div className="flex justify-between text-slate-400 font-bold">
                    <span>Base Score:</span>
                    <span className={matchDetails.base >= 0 ? 'text-green-400' : 'text-red-400'}>{matchDetails.base > 0 ? '+' : ''}{matchDetails.base}</span>
                  </div>
                  {matchDetails.hp_bonus > 0 && (
                    <div className="flex justify-between text-slate-400 font-bold">
                      <span>HP Bonus:</span>
                      <span className="text-green-400">+{matchDetails.hp_bonus}</span>
                    </div>
                  )}
                  {matchDetails.streak_bonus > 0 && (
                    <div className="flex justify-between text-slate-400 font-bold">
                      <span>Streak Bonus:</span>
                      <span className="text-green-400">+{matchDetails.streak_bonus}</span>
                    </div>
                  )}
                  <div className="h-px bg-slate-600 my-2" />
                  <div className="flex justify-between text-white font-black text-xl">
                    <span>Total:</span>
                    <span className={(matchDetails.base + matchDetails.hp_bonus + matchDetails.streak_bonus) >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {(matchDetails.base + matchDetails.hp_bonus + matchDetails.streak_bonus) > 0 ? '+' : ''}
                      {matchDetails.base + matchDetails.hp_bonus + matchDetails.streak_bonus}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => status === 'YOU WIN!' ? onVictory() : onDefeat()}
                  className={`px-12 py-4 rounded-2xl font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-xl ${status === 'YOU WIN!' ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'bg-red-500 text-white hover:bg-red-400'}`}
                >
                  {status === 'YOU WIN!' ? 'CLAIM REWARD' : 'RETURN TO BASE'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

    </div >
  );
};

export default BattleArena;
