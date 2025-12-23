
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Shield, User, Zap, Flame, Sword, Target, ShieldCheck, Loader2, XCircle } from 'lucide-react';

import { MOCK_GRAMMAR_QUESTIONS, MOCK_VOCAB_CARDS, PVP_MODES } from '../constants.tsx';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useWarrior } from '../contexts/WarriorContext';
import { soundService } from '../services/soundService';
import BattleScene from './Warrior/BattleScene';
import { supabase } from '../services/supabaseClient';
import { findWordBlitzMatch, cancelWordBlitzMatchmaking, submitWordBlitzAnswer, getOpponentProfile, checkWordBlitzMatchStatus, abandonWordBlitzMatch, claimWordBlitzVictory, PvPRoom } from '../services/pvpService';
import { findGrammarMatch, cancelGrammarMatchmaking, submitGrammarAnswer, checkGrammarMatchStatus, abandonGrammarMatch, claimGrammarVictory } from '../services/grammarPvpService';

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
  const modeMeta = PVP_MODES.find(m => m.id === mode);
  const modeTitle = modeMeta?.name ?? '对战';
  const modeDesc = modeMeta?.description ?? '匹配对手，开始战斗。';

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
  const [opponentId, setOpponentId] = useState<string | null>(null);
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

  // Choice feedback (for immediate learning)
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [choiceFeedback, setChoiceFeedback] = useState<null | { kind: 'ok' | 'bad'; text: string }>(null);
  const choiceFeedbackTimerRef = useRef<number | null>(null);

  // State Refs for Subscription Callbacks (Avoid Stale Closures)
  const stateRef = useRef({
    playerHp: playerStats.hp,
    enemyHp: 100,
    currentQIndex: 0,
    hasAnswered: false,
    questions: [] as any[], // Fix for stale closure
    opponentId: null as string | null // Added opponentId
  });

  const isFinishedRef = useRef(false); // Synchronous guard for finish state

  // Sync refs with state
  useEffect(() => {
    stateRef.current.playerHp = playerHp;
    stateRef.current.enemyHp = enemyHp;
    stateRef.current.currentQIndex = currentQIndex;
    stateRef.current.hasAnswered = hasAnsweredCurrent;
    stateRef.current.questions = questions;
    stateRef.current.opponentId = opponentId;
  }, [playerHp, enemyHp, currentQIndex, hasAnsweredCurrent, questions, opponentId]);

  // Reset choice UI feedback when the question changes / mode changes
  useEffect(() => {
    setSelectedOption(null);
    setChoiceFeedback(null);
    if (choiceFeedbackTimerRef.current) {
      window.clearTimeout(choiceFeedbackTimerRef.current);
      choiceFeedbackTimerRef.current = null;
    }
  }, [currentQIndex, roomId, pvpState]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (choiceFeedbackTimerRef.current) {
        window.clearTimeout(choiceFeedbackTimerRef.current);
        choiceFeedbackTimerRef.current = null;
      }
    };
  }, []);

  // Other Modes State
  const [currentGrammarQ, setCurrentGrammarQ] = useState(MOCK_GRAMMAR_QUESTIONS[0]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const currentSessionRef = useRef<any>(null);
  const opponentPresenceTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Timeout for detecting missing opponent

  // State Refs for Cleanup (Avoid Stale Closures in useEffect)
  const cleanupRef = useRef({
    roomId,
    pvpState,
    mode,
    userId,
    matchmakingChannel: null as any,
    pollingInterval: null as NodeJS.Timeout | null
  });

  // Sync cleanup ref
  useEffect(() => {
    cleanupRef.current.roomId = roomId;
    cleanupRef.current.pvpState = pvpState;
    cleanupRef.current.mode = mode;
    cleanupRef.current.userId = userId;
    // Note: channels and intervals are updated directly in refs where they are created
  }, [roomId, pvpState, mode, userId]);

  // Initial Setup & Cleanup
  useEffect(() => {
    if (mode === 'pvp_blitz' || mode === 'pvp_tactics') {
      setPvpState('idle');

      // Auto-Resume Check for Blitz
      if (mode === 'pvp_blitz' && userId) {
        checkWordBlitzMatchStatus(userId).then(match => {
          // RACE CONDITION FIX:
          // Ensure we are not overwriting an ongoing or finished match.
          // We only auto-resume if we are effectively doing nothing yet.
          const currentState = cleanupRef.current.pvpState;
          if (currentState !== 'idle' && currentState !== 'searching') {
            console.log('🚫 Auto-resume ignored, current state is:', currentState);
            return;
          }

          if (match) {
            console.log('Found active match, resuming...', match);
            setRoomId(match.roomId);
            setMyRole(match.role);
            setPvpState('matched');
            setStatus('RESUMING...');
            setIsGameConnected(true);
            isFinishedRef.current = false; // Reset guard
          }
        });
      }
    }

    const handleCleanup = () => {
      const { roomId, pvpState, mode, userId, matchmakingChannel, pollingInterval } = cleanupRef.current;

      console.log('🧹 Cleanup Triggered:', { roomId, pvpState, mode });

      if (matchmakingChannel) {
        supabase.removeChannel(matchmakingChannel);
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }

      if (userId) {
        if (pvpState === 'searching') {
          console.log('🚫 Cancelling Matchmaking...');
          if (mode === 'pvp_blitz') cancelWordBlitzMatchmaking(userId);
          if (mode === 'pvp_tactics') cancelGrammarMatchmaking(userId);
        } else if ((pvpState === 'playing' || pvpState === 'matched') && roomId) {
          // Skip abandon for local AI
          if (!roomId.startsWith('local_ai_')) {
            console.log('🏳️ Abandoning Match:', roomId);
            if (mode === 'pvp_blitz') abandonWordBlitzMatch(roomId, userId);
            if (mode === 'pvp_tactics') abandonGrammarMatch(roomId, userId);
          }
        }
      }
    };

    // Handle Browser Close / Refresh
    window.addEventListener('beforeunload', handleCleanup);

    return () => {
      window.removeEventListener('beforeunload', handleCleanup);
      handleCleanup();
    };
  }, [mode]);

  // Capture refs for manual access in sub-functions if needed
  useEffect(() => {
    cleanupRef.current.matchmakingChannel = matchmakingChannelRef.current;
    cleanupRef.current.pollingInterval = pollingIntervalRef.current;
  }); // Run on every render to ensure refs are fresh if they were mutated directly

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
    isFinishedRef.current = false; // Reset guard



    // Timer for UI only - Modified to trigger AI
    const timer = setInterval(() => {
      setSearchingTime(t => {
        // Wait 10 seconds before triggering AI
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
      if (cleanupRef.current.pvpState !== 'searching') {
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
    weaponId: 'default',
    modelColor: 'blue' // Added default
  });

  // Helper: Generate Random Appearance
  const generateRandomAppearance = () => {
    const skins = ['#f5d0b0', '#e0ac69', '#8d5524', '#523318', '#ffdbac'];
    const hairs = ['#000000', '#4a3b2a', '#e6cea0', '#a52a2a', '#ffffff', '#666666'];
    const colors = ['blue', 'red', 'yellow', 'purple', 'black']; // Randomize tint

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
      weaponId: weapons[Math.floor(Math.random() * weapons.length)],
      modelColor: colors[Math.floor(Math.random() * colors.length)]
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

    let mockQuestions;
    if (mode === 'pvp_tactics') mockQuestions = MOCK_GRAMMAR_QUESTIONS;
    else mockQuestions = MOCK_VOCAB_CARDS;

    // Shuffle questions
    const selectedQuestions = [...mockQuestions]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5); // Take 5 questions for quick match

    setQuestions(selectedQuestions);

    // Random AI Name
    const aiNames = ['Word Master', 'Vocab Bot', 'Grammar Guardian', 'Syntax Sage', 'Lexicon Legend', 'Word Warrior AI'];
    setOpponentName(aiNames[Math.floor(Math.random() * aiNames.length)]);

    setRoomId('local_ai_' + Date.now());
    setMyRole('player1');
    setPvpState('matched');
    setStatus('OPPONENT FOUND!');
    setIsGameConnected(true); // Always connected for local AI
    isFinishedRef.current = false; // Reset for AI

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

      const channel = supabase.channel('game_' + roomId, {
        config: {
          presence: {
            key: userId,
          },
        },
      })
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: table, filter: `id=eq.${roomId}` },
          (payload) => {
            console.log('📥 Game Update Received:', payload.new);
            handleRoomUpdate(payload.new as PvPRoom);
          }
        )
        .on('presence', { event: 'sync' }, () => {
          const newState = channel.presenceState();
          console.log('👥 Presence State Synced:', newState);

          // Check if opponent is present
          const currentOpponentId = stateRef.current.opponentId;
          if (currentOpponentId && !newState[currentOpponentId]) {
            // Opponent not present! Start grace period timer if not already started
            if (!opponentPresenceTimeoutRef.current) {
              console.log('⏳ Opponent not detected in presence. Starting 15s grace period...');
              opponentPresenceTimeoutRef.current = setTimeout(() => {
                // Re-check if opponent still missing and game not finished
                const latestState = channel.presenceState();
                const stillMissing = !latestState[currentOpponentId];
                const notFinished = !isFinishedRef.current;

                if (stillMissing && notFinished) {
                  console.log('🏆 Opponent failed to join within grace period. Claiming victory...');
                  if (mode === 'pvp_tactics') {
                    claimGrammarVictory(roomId, userId);
                  } else {
                    claimWordBlitzVictory(roomId, userId);
                  }
                  setStatus('YOU WIN!');
                  setPvpState('end');
                  isFinishedRef.current = true;
                }
                opponentPresenceTimeoutRef.current = null;
              }, 10000);
            }
          } else if (currentOpponentId && newState[currentOpponentId]) {
            // Opponent is present, clear any pending timeout
            if (opponentPresenceTimeoutRef.current) {
              console.log('✅ Opponent detected in presence. Clearing grace period timer.');
              clearTimeout(opponentPresenceTimeoutRef.current);
              opponentPresenceTimeoutRef.current = null;
            }
          }
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('👤 Player Joined:', key, newPresences);
          const currentOpponentId = stateRef.current.opponentId;
          // If opponent joined, clear the grace period timeout
          if (key === currentOpponentId && opponentPresenceTimeoutRef.current) {
            console.log('✅ Opponent joined! Clearing grace period timer.');
            clearTimeout(opponentPresenceTimeoutRef.current);
            opponentPresenceTimeoutRef.current = null;
          }
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('👋 Player Left:', key, leftPresences);
          const currentOpponentId = stateRef.current.opponentId;
          const currentPvpState = cleanupRef.current.pvpState; // Use cleanupRef for pvpState to stay consistent or stateRef? stateRef doesn't have pvpState. Let's use cleanRef or just trust pvpState?
          // Actually pvpState in closure might be fine if re-render happens, but subscribeToGame is not re-run often. 
          // Let's use cleanupRef for reliably fresh state variables not in stateRef.

          console.log(`🔍 Checking Leave: Key=${key}, Expected=${currentOpponentId}`);

          // If the opponent left, we claim victory!
          if (key === currentOpponentId) {
            // We don't check pvpState strictly to 'playing' just in case it's 'matched' transitioning to 'playing'
            // But we should ensure we are not 'end' or 'idle'
            // Let's check if we have a room.
            console.log('🏆 Opponent disconnected! Claiming victory...');

            // Clear any pending grace period timeout
            if (opponentPresenceTimeoutRef.current) {
              clearTimeout(opponentPresenceTimeoutRef.current);
              opponentPresenceTimeoutRef.current = null;
            }

            if (mode === 'pvp_tactics') {
              claimGrammarVictory(roomId, userId);
            } else {
              claimWordBlitzVictory(roomId, userId);
            }
            setStatus('YOU WIN!');
            setPvpState('end');
            isFinishedRef.current = true; // Lock state instantly
          }
        })
        .subscribe(async (status, err) => {
          console.log(`Game Room Subscription Status (${roomId}):`, status, err);

          if (status === 'SUBSCRIBED') {
            setIsGameConnected(true);
            // Track my presence
            await channel.track({
              joined_at: new Date().toISOString(),
              user_id: userId
            });
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
      // Clear opponent presence timeout on cleanup
      if (opponentPresenceTimeoutRef.current) {
        clearTimeout(opponentPresenceTimeoutRef.current);
        opponentPresenceTimeoutRef.current = null;
      }
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
        setOpponentId(oppId);
        const profile = await getOpponentProfile(oppId);
        if (profile) {
          setOpponentName(profile.username);
          if (profile.avatarColor) {
            setEnemyAppearance(prev => ({
              ...prev,
              modelColor: profile.avatarColor || 'blue'
            }));
          }
        }
      }
    };
    fetchOpponent();
  }, [roomId, myRole]);

  // 3. Room State Handling
  const handleRoomUpdate = (room: PvPRoom) => {
    // Current State from Ref to avoid closures
    const current = stateRef.current;

    // GUARD: If we have already finished locally (e.g. via Presence leave), 
    // ignore any late updates that claim the game is still active.
    // We update ONLY if the new status is 'finished' (to capture score/details).
    if (isFinishedRef.current && room.status !== 'finished') {
      console.log('🛡️ Ignoring active room update because local state is already END.');
      return;
    }

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
    if (room.questions && room.questions.length > current.questions.length) {
      console.log(`📜 Received new questions! Old: ${current.questions.length}, New: ${room.questions.length}`);
      setQuestions(room.questions);
    } else if (current.questions.length === 0 && room.questions && room.questions.length > 0) {
      // First load
      setQuestions(room.questions);
    }

    // IMMEDIATE OPPONENT ID SET (Fix for early disconnects)
    if (!current.opponentId) {
      const oppId = myRole === 'player1' ? room.player2_id : room.player1_id;
      if (oppId) {
        console.log('⚡ Fast-setting opponentId from room update:', oppId);
        setOpponentId(oppId); // Trigger UI update (and eventually ref update via effect)
        stateRef.current.opponentId = oppId; // Immediate update for event handlers
      }
    }

    // Verify Game Over
    if (room.status === 'finished') {
      setPvpState('end');
      isFinishedRef.current = true; // Lock state
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
      // But we are waiting for questions update.
      const currentList = (room.questions && room.questions.length > current.questions.length) ? room.questions : current.questions;
      const q = currentList[room.current_question_index];

      if (q) {
        setShuffledOptions([...q.options].sort(() => Math.random() - 0.5));
        setPvpState('playing');
        setStatus('V.S.');
      } else {
        // Question not here yet! UI Lock.
        console.warn(`⚠️ Current question index ${room.current_question_index} out of bounds (Questions: ${currentList.length}), waiting for question data...`);
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
    if (!isGameConnected) return;
    const currentQ = questions[currentQIndex];
    if (!currentQ) return;
    const isCorrect = option === currentQ.correctAnswer;

    // Immediate feedback on the choice itself (not just HP change)
    setSelectedOption(option);
    setChoiceFeedback(isCorrect ? { kind: 'ok', text: '正确' } : { kind: 'bad', text: '错误' });
    if (!isCorrect && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        // Short haptic for mobile (best-effort)
        (navigator as any).vibrate?.(120);
      } catch {
        // ignore
      }
    }
    if (choiceFeedbackTimerRef.current) window.clearTimeout(choiceFeedbackTimerRef.current);
    choiceFeedbackTimerRef.current = window.setTimeout(() => setChoiceFeedback(null), 650);

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



  // ============================================
  // RENDER - MATCHMAKING SCREEN
  // ============================================
  // ============================================
  // MEMOIZED PROPS (Must be unconditional)
  // ============================================
  const memoizedPlayerIds = useMemo(() => ({
    skinColor: warriorState.appearance.skinColor,
    hairColor: warriorState.appearance.hairColor,
    armorId: warriorState.equipped.armor || 'default',
    weaponId: warriorState.equipped.weapon || 'default',
    modelColor: warriorState.appearance.modelColor
  }), [warriorState.appearance, warriorState.equipped]);

  const memoizedEnemyIds = useMemo(() => enemyAppearance, [enemyAppearance]);

  // ============================================
  // RENDER - MATCHMAKING SCREEN
  // ============================================
  if ((mode === 'pvp_blitz' || mode === 'pvp_tactics') && (pvpState === 'idle' || pvpState === 'searching')) {
    return (
      <div className="h-full flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl ww-surface ww-surface--soft rounded-[2.5rem] p-6 md:p-8">
          <div className="text-center space-y-2">
            <div className="text-[10px] font-black uppercase tracking-[0.35em] ww-muted">Arena</div>
            <h1 className="text-2xl md:text-4xl font-black ww-ink">{modeTitle}</h1>
            <p className="text-[11px] font-bold ww-muted leading-relaxed">{modeDesc}</p>
          </div>

          <div className="mt-6 flex flex-col items-center gap-4">
            <button
              onClick={pvpState === 'searching' ? handleCancelSearch : startMatchmaking}
              className={`ww-btn ${pvpState === 'searching' ? 'ww-btn--ink' : 'ww-btn--accent'} rounded-[999px] w-[220px] md:w-[260px] py-4 md:py-5 text-[12px]`}
            >
              <span className="inline-flex items-center gap-3 justify-center">
                {pvpState === 'searching' ? <Loader2 size={18} className="animate-spin" /> : <Sword size={18} />}
                {pvpState === 'searching' ? '匹配中…' : '开始匹配'}
              </span>
            </button>

            <div className="text-[11px] font-bold ww-muted">
              {pvpState === 'searching' ? `已等待 ${searchingTime}s（再次点击可取消）` : '匹配成功后将自动进入战斗。'}
            </div>

            {pvpState === 'searching' && (
              <button
                onClick={handleCancelSearch}
                className="inline-flex items-center gap-2 text-[11px] font-black tracking-widest ww-muted hover:text-red-600 transition-colors"
              >
                <XCircle size={14} /> 取消匹配
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER - GAME SCREEN
  // ============================================
  return (
    <div className="h-full flex flex-col gap-3 md:gap-8 max-w-5xl mx-auto pt-2 md:pt-4 pb-2 px-0">

      {/* HP HEADER - Scaled for Mobile */}
      <div className="pt-1 md:pt-3 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Mobile-first: single-row, equal-height (me / timer / opponent). */}
          <div className="md:hidden">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
              {/* Me */}
              <div className={`ww-surface ww-surface--soft rounded-[18px] p-2 h-[86px] ${isShaking === 'player' ? 'animate-shake' : ''}`}>
                <div className="h-full flex flex-col justify-between">
                  <div className="flex items-center justify-start">
                    <span className="ww-pill ww-pill--accent px-2 py-0.5 text-[9px] font-black tracking-widest">我方</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="text-[11px] font-bold ww-muted truncate min-w-0">
                      {user?.user_metadata?.username || user?.email?.split('@')?.[0] || '你'}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="rpg-font text-[16px] font-black ww-ink tabular-nums leading-none">{playerHp}</div>
                      <div className="text-[9px] font-black ww-muted tracking-widest">HP</div>
                    </div>
                  </div>

                  <div
                    className="h-3 rounded-full overflow-hidden"
                    style={{ border: '2px solid var(--ww-stroke)', background: 'rgba(26,15,40,0.08)' }}
                  >
                    <motion.div
                      animate={{ width: `${Math.max(0, Math.min(100, (playerHp / (playerStats?.maxHp || 1)) * 100))}%` }}
                      className="h-full"
                      style={{ background: 'linear-gradient(90deg, #2563eb, #6366f1)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Timer */}
              <div className="ww-surface ww-surface--soft rounded-[18px] px-3 h-[86px] flex flex-col items-center justify-center gap-1">
                <div className={`rpg-font text-[20px] font-black ww-ink tabular-nums ${timeLeft <= 3 ? 'animate-pulse' : ''}`}>
                  {mode === 'pvp_blitz' || mode === 'pvp_tactics' || mode === 'pvp_chant' ? timeLeft : '∞'}
                </div>
                <div className="text-[10px] font-black ww-muted tracking-[0.35em]">VS</div>
              </div>

              {/* Opponent */}
              <div className={`ww-surface ww-surface--soft rounded-[18px] p-2 h-[86px] ${isShaking === 'enemy' ? 'animate-shake' : ''}`}>
                <div className="h-full flex flex-col justify-between">
                  <div className="flex items-center justify-start">
                    <span className="ww-pill px-2 py-0.5 text-[9px] font-black tracking-widest">对手</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="text-[11px] font-bold ww-muted truncate min-w-0">
                      {mode === 'pvp_blitz' || mode === 'pvp_tactics' || mode === 'pvp_chant' ? opponentName : '幽影'}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="rpg-font text-[16px] font-black ww-ink tabular-nums leading-none">{enemyHp}</div>
                      <div className="text-[9px] font-black ww-muted tracking-widest">HP</div>
                    </div>
                  </div>

                  <div
                    className="h-3 rounded-full overflow-hidden"
                    style={{ border: '2px solid var(--ww-stroke)', background: 'rgba(26,15,40,0.08)' }}
                  >
                    <motion.div
                      animate={{ width: `${Math.max(0, Math.min(100, enemyHp))}%` }}
                      className="h-full"
                      style={{ background: 'linear-gradient(90deg, #f97316, #ef4444)' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: richer 3-column layout */}
          <div className="hidden md:grid grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
            {/* Me */}
            <div className={`ww-surface ww-surface--soft rounded-[22px] p-4 ${isShaking === 'player' ? 'animate-shake' : ''}`}>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: 'rgba(99,102,241,0.10)',
                    border: '2px solid rgba(99,102,241,0.35)',
                    boxShadow: '0 5px 0 rgba(0,0,0,0.16)',
                  }}
                >
                  <User className="text-indigo-600" size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="ww-pill ww-pill--accent px-2 py-0.5 text-[9px] font-black tracking-widest">我方</span>
                    <div className="text-[13px] font-black ww-ink truncate">
                      {user?.user_metadata?.username || user?.email?.split('@')?.[0] || '你'}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="rpg-font text-[18px] font-black ww-ink tabular-nums leading-none">{playerHp}</div>
                  <div className="text-[10px] font-black ww-muted tracking-widest">HP</div>
                </div>
              </div>

              <div
                className="mt-2 h-3 rounded-full overflow-hidden"
                style={{ border: '2px solid var(--ww-stroke)', background: 'rgba(26,15,40,0.08)' }}
              >
                <motion.div
                  animate={{ width: `${Math.max(0, Math.min(100, (playerHp / (playerStats?.maxHp || 1)) * 100))}%` }}
                  className="h-full"
                  style={{ background: 'linear-gradient(90deg, #2563eb, #6366f1)' }}
                />
              </div>
            </div>

            {/* VS / Timer */}
            <div className="flex flex-col items-center justify-center gap-1 px-2">
              <div className={`ww-pill ww-pill--accent px-3 py-1 font-black rpg-font tabular-nums ${timeLeft <= 3 ? 'animate-pulse' : ''}`}>
                {mode === 'pvp_blitz' || mode === 'pvp_tactics' || mode === 'pvp_chant' ? timeLeft : '∞'}
              </div>
              <div className="text-[10px] font-black ww-muted tracking-[0.35em]">VS</div>
            </div>

            {/* Opponent */}
            <div className={`ww-surface ww-surface--soft rounded-[22px] p-4 ${isShaking === 'enemy' ? 'animate-shake' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="text-left shrink-0">
                  <div className="rpg-font text-[18px] font-black ww-ink tabular-nums leading-none">{enemyHp}</div>
                  <div className="text-[10px] font-black ww-muted tracking-widest">HP</div>
                </div>

                <div className="min-w-0 flex-1 text-right">
                  <div className="flex items-center justify-end gap-2 min-w-0">
                    <div className="text-[13px] font-black ww-ink truncate">
                      {mode === 'pvp_blitz' || mode === 'pvp_tactics' || mode === 'pvp_chant' ? opponentName : '幽影'}
                    </div>
                    <span className="ww-pill px-2 py-0.5 text-[9px] font-black tracking-widest">对手</span>
                  </div>
                </div>

                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: 'rgba(239,68,68,0.10)',
                    border: '2px solid rgba(239,68,68,0.35)',
                    boxShadow: '0 5px 0 rgba(0,0,0,0.16)',
                  }}
                >
                  <User className="text-red-600" size={18} />
                </div>
              </div>

              <div
                className="mt-2 h-3 rounded-full overflow-hidden"
                style={{ border: '2px solid var(--ww-stroke)', background: 'rgba(26,15,40,0.08)' }}
              >
                <motion.div
                  animate={{ width: `${Math.max(0, Math.min(100, enemyHp))}%` }}
                  className="h-full"
                  style={{ background: 'linear-gradient(90deg, #f97316, #ef4444)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BATTLE SCENE */}
      <div className="relative w-full max-w-3xl mx-auto -mt-1 md:-mt-4 z-0 px-2 md:px-0">
        <BattleScene
          playerIds={memoizedPlayerIds}
          enemyIds={memoizedEnemyIds}
          combatEvent={combatEvent}
        />

      </div>

      {/* Question + options: sticky on mobile so it's always above the bottom nav */}
      <div
        className="mx-2 md:mx-4 dark:bg-slate-900/30 bg-white border dark:border-slate-800 border-slate-200 rounded-[2rem] md:rounded-[3rem] p-4 md:p-12 flex flex-col items-center justify-center relative shadow-2xl backdrop-blur-sm overflow-hidden md:static sticky z-[30]"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}
      >
        {/* a11y: announce correctness */}
        <div className="sr-only" aria-live="assertive">
          {choiceFeedback?.text || ''}
        </div>

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

        <AnimatePresence>
          {choiceFeedback ? (
            <motion.div
              key={`choice-feedback-${currentQIndex}-${choiceFeedback.kind}`}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className={`absolute top-3 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full text-[12px] font-black tracking-widest shadow-lg border ${choiceFeedback.kind === 'bad'
                ? 'bg-red-500 text-white border-red-200'
                : 'bg-emerald-500 text-white border-emerald-200'
                }`}
            >
              {choiceFeedback.text}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {mode === 'pvp_blitz' && (
          <div className="space-y-4 md:space-y-12 w-full max-w-md text-center px-2 md:px-0">
            {questions[currentQIndex] ? (
              <>
                <motion.h2
                  key={questions[currentQIndex].word}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-2xl md:text-7xl font-mono font-bold tracking-tighter dark:text-white text-slate-900 px-2 md:px-4"
                >
                  {questions[currentQIndex].word}
                </motion.h2>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {shuffledOptions.map((opt, idx) => (
                    <button
                      key={`${currentQIndex}-${idx}`}
                      onClick={() => handleChoice(opt)}
                      disabled={hasAnsweredCurrent || !isGameConnected}
                      className={[
                        'ww-choice p-3 md:p-8 text-[11px] md:text-base active:scale-[0.99] disabled:cursor-not-allowed transition-colors',
                        selectedOption
                          ? (opt === selectedOption
                            ? (opt === questions[currentQIndex]?.correctAnswer
                              ? 'ww-choice--ok bg-emerald-50'
                              : 'ww-choice--bad bg-red-50 animate-shake')
                            : 'opacity-60')
                          : ''
                      ].join(' ')}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-slate-500 font-bold animate-pulse">正在加载题目…</div>
            )}

            {!isGameConnected && (
              <div className="text-xs font-black tracking-widest text-indigo-500 animate-pulse">正在连接对战服务器…</div>
            )}

          </div>
        )}

        {mode === 'pvp_tactics' && (
          <div className="space-y-4 md:space-y-12 w-full max-w-2xl text-center px-2 md:px-0">
            <div className="space-y-2">
              <span className="text-[10px] font-black tracking-[0.4em] text-cyan-600">语法挑战</span>
              <motion.h2
                key={questions[currentQIndex]?.prompt || 'loading'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-base md:text-3xl font-bold dark:text-white text-slate-900 px-2 md:px-4 leading-relaxed italic"
              >
                {questions[currentQIndex]?.prompt || (status === 'READY' ? '准备中…' : '正在加载题目…')}
              </motion.h2>
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {questions[currentQIndex]?.options?.map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => handleChoice(opt)}
                  disabled={hasAnsweredCurrent || !isGameConnected}
                  className={[
                    'ww-choice p-3 md:p-6 text-[11px] md:text-lg active:scale-[0.99] disabled:opacity-50 transition-colors',
                    selectedOption
                      ? (opt === selectedOption
                        ? (opt === questions[currentQIndex]?.correctAnswer
                          ? 'ww-choice--ok bg-emerald-50'
                          : 'ww-choice--bad bg-red-50 animate-shake')
                        : 'opacity-60')
                      : ''
                  ].join(' ')}
                >
                  {opt}
                </button>
              )) || (
                  <div className="col-span-2 text-slate-500 animate-pulse">等待服务器下发题目…</div>
                )}
            </div>
            {!isGameConnected && (
              <div className="text-xs font-black tracking-widest text-indigo-500 animate-pulse">正在连接对战服务器…</div>
            )}
          </div>
        )}

        {mode === 'pvp_chant' && (
          <div className="space-y-4 md:space-y-12 w-full max-w-2xl text-center px-2 md:px-0">
            <div className="space-y-2">
              <span className="text-[10px] font-black tracking-[0.4em] text-cyan-600">咏唱挑战</span>
              <motion.h2
                key={questions[currentQIndex]?.prompt || 'loading'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-base md:text-3xl font-bold dark:text-white text-slate-900 px-2 md:px-4 leading-relaxed italic"
              >
                {questions[currentQIndex]?.prompt || (status === 'READY' ? '准备中…' : '正在加载题目…')}
              </motion.h2>
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {questions[currentQIndex]?.options?.map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => handleChoice(opt)}
                  disabled={hasAnsweredCurrent || !isGameConnected}
                  className={[
                    'ww-choice p-3 md:p-6 text-[11px] md:text-lg active:scale-[0.99] disabled:opacity-50 transition-colors',
                    selectedOption
                      ? (opt === selectedOption
                        ? (opt === questions[currentQIndex]?.correctAnswer
                          ? 'ww-choice--ok bg-emerald-50'
                          : 'ww-choice--bad bg-red-50 animate-shake')
                        : 'opacity-60')
                      : ''
                  ].join(' ')}
                >
                  {opt}
                </button>
              )) || (
                  <div className="col-span-2 text-slate-500 animate-pulse">等待服务器下发题目…</div>
                )}
            </div>
            {!isGameConnected && (
              <div className="text-xs font-black tracking-widest text-indigo-500 animate-pulse">正在连接对战服务器…</div>
            )}
          </div>
        )}


      </div>

      <div className="flex justify-center gap-2 md:gap-3 pb-24 md:pb-8 px-3">
        <div className="ww-pill px-3 py-1 text-[10px] font-black tracking-widest ww-ink inline-flex items-center gap-2">
          <Sword size={12} /> ATK {playerStats.atk}
        </div>
        <div className="ww-pill px-3 py-1 text-[10px] font-black tracking-widest ww-ink inline-flex items-center gap-2">
          <Shield size={12} /> DEF {playerStats.def}
        </div>
        <div className="ww-pill px-3 py-1 text-[10px] font-black tracking-widest ww-ink inline-flex items-center gap-2">
          <Zap size={12} /> 暴击 {Math.round(playerStats.crit * 100)}%
        </div>
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
                  {status === 'YOU WIN!' ? '胜利！' : '失败…'}
                </h2>
                <p className="text-slate-400 font-bold tracking-widest">
                  {status === 'YOU WIN!' ? '奖励已结算' : '不要气馁，再来一局'}
                </p>
              </div>

              {matchDetails && (
                <div className="bg-slate-800/50 rounded-xl p-6 text-left space-y-2 min-w-[250px] border border-slate-700">
                  <div className="flex justify-between text-slate-400 font-bold">
                    <span>基础分：</span>
                    <span className={matchDetails.base >= 0 ? 'text-green-400' : 'text-red-400'}>{matchDetails.base > 0 ? '+' : ''}{matchDetails.base}</span>
                  </div>
                  {matchDetails.hp_bonus > 0 && (
                    <div className="flex justify-between text-slate-400 font-bold">
                      <span>生命加成：</span>
                      <span className="text-green-400">+{matchDetails.hp_bonus}</span>
                    </div>
                  )}
                  {matchDetails.streak_bonus > 0 && (
                    <div className="flex justify-between text-slate-400 font-bold">
                      <span>连胜加成：</span>
                      <span className="text-green-400">+{matchDetails.streak_bonus}</span>
                    </div>
                  )}
                  {/* Protection (New) */}
                  {matchDetails.protection && matchDetails.protection > 0 && (
                    <div className="flex justify-between text-slate-400 font-bold">
                      <span>{status === 'YOU WIN!' ? '段位保护：' : '败方保护：'}</span>
                      <span className="text-blue-400">+{matchDetails.protection}</span>
                    </div>
                  )}
                  <div className="h-px bg-slate-600 my-2" />
                  <div className="flex justify-between text-white font-black text-xl">
                    <span>总计：</span>
                    <span className={(matchDetails.base + matchDetails.hp_bonus + matchDetails.streak_bonus + (matchDetails.protection || 0)) >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {(matchDetails.base + matchDetails.hp_bonus + matchDetails.streak_bonus + (matchDetails.protection || 0)) > 0 ? '+' : ''}
                      {matchDetails.base + matchDetails.hp_bonus + matchDetails.streak_bonus + (matchDetails.protection || 0)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => status === 'YOU WIN!' ? onVictory() : onDefeat()}
                  className={`px-12 py-4 rounded-2xl font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-xl ${status === 'YOU WIN!' ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'bg-red-500 text-white hover:bg-red-400'}`}
                >
                  {status === 'YOU WIN!' ? '领取奖励' : '返回'}
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

