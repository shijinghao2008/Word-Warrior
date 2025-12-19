
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Award, CheckCircle2, Sparkles, Activity, MessageSquare, RefreshCw } from 'lucide-react';
import { startLiveSession, encodeAudio, resampleAudio } from '../services/liveService';
import ReactMarkdown from 'react-markdown';

interface OralTrainingProps {
  playerStats: any;
  onSuccess: (exp: number) => void;
}

interface Assessment {
  score: number;
  feedback: string;
  dimensions?: {
    clarity: number;
    argument: number;
    logic: number;
    accuracy: number;
    pronunciation: number;
  };
}

const ORAL_TOPICS = [
  "Describe a book you have read recently that you found interesting.",
  "What are the advantages and disadvantages of working from home?",
  "Talk about a traditional festival in your country.",
  "How has technology changed the way people communicate in the last decade?",
  "Should schools focus more on practical skills than academic knowledge?",
  "Describe a place you have visited that you would recommend to others.",
  "What qualities make a good leader in today's society?",
  "Do you think artificial intelligence will replace human teachers one day?",
  "Discuss the importance of protecting the environment for future generations.",
  "If you could travel back in time, which era would you visit and why?"
];

const OralTraining: React.FC<OralTrainingProps> = ({ playerStats, onSuccess }) => {
  // State
  const [status, setStatus] = useState<'ready' | 'listening' | 'analyzing'>('ready');
  const [result, setResult] = useState<Assessment | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [micPermission, setMicPermission] = useState(true);
  const [currentTopic, setCurrentTopic] = useState("");

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);

  // Gesture Refs
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);

  useEffect(() => {
    refreshTopic();
    // Check permission on mount
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => setMicPermission(true))
      .catch(() => setMicPermission(false));

    return () => {
      cleanupAudio();
      if (sessionRef.current) sessionRef.current.close();
    };
  }, []);

  const refreshTopic = () => {
    const randomTopic = ORAL_TOPICS[Math.floor(Math.random() * ORAL_TOPICS.length)];
    setCurrentTopic(randomTopic);
  };

  const cleanupAudio = () => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const initSessionIfNeeded = () => {
    if (!sessionRef.current) {
      const systemPrompt = `
        You are an expert English Evaluator. 
        Wait for the user to provide an audio speech.
        The user is speaking about the topic: "${currentTopic}"
        When you receive the text command "EVALUATE_NOW", analyze the preceding speech.
        
        OUTPUT FORMAT (Strict JSON):
        {
          "score": 0-100,
          "feedback": "A short summary (max 50 words) in Chinese.",
          "dimensions": {
            "clarity": 0-100,
            "argument": 0-100,
            "logic": 0-100,
            "accuracy": 0-100,
            "pronunciation": 0-100
          },
          "suggestions": "1-2 specific points in Chinese for improvement."
        }
      `;

      sessionRef.current = startLiveSession((response) => {
        try {
          const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
          const data = JSON.parse(jsonStr);

          setResult({
            score: data.score || 0,
            feedback: (data.feedback || "") + "\n\n" + (data.suggestions || ""),
            dimensions: data.dimensions
          });

          if (data.score > 60) {
            onSuccess(Math.floor(data.score / 10));
          }
        } catch (e) {
          setResult({
            score: 0,
            feedback: response
          });
        }
        setStatus('ready');
      }, systemPrompt);
    }
  };

  const handleStart = async (clientX: number, clientY: number) => {
    if (!micPermission) return;
    startXRef.current = clientX;
    startYRef.current = clientY;
    setIsCanceling(false);
    setStatus('listening');
    setResult(null);

    initSessionIfNeeded();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const nativeRate = audioContextRef.current.sampleRate;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      scriptProcessorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const resampled = resampleAudio(inputData, nativeRate, 16000);
        const l = resampled.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) int16[i] = resampled[i] * 32768;

        if (sessionRef.current) {
          const pcmBlob = { data: encodeAudio(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
          sessionRef.current.sessionPromise.then((s: any) => s.sendRealtimeInput({ media: pcmBlob }));
        }
      };

      source.connect(scriptProcessorRef.current);
      scriptProcessorRef.current.connect(audioContextRef.current.destination);
    } catch (e) {
      setStatus('ready');
    }
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (status !== 'listening') return;
    const diffX = startXRef.current - clientX;
    if (diffX > 80) {
      if (!isCanceling) setIsCanceling(true);
    } else {
      if (isCanceling) setIsCanceling(false);
    }
  };

  const handleEnd = () => {
    if (status !== 'listening') return;
    cleanupAudio();
    if (isCanceling) {
      setStatus('ready');
      setIsCanceling(false);
    } else {
      setStatus('analyzing');
      if (sessionRef.current) sessionRef.current.sendText("EVALUATE_NOW");
    }
  };

  const DimensionItem = ({ label, score }: { label: string, score: number }) => (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[10px] uppercase font-black text-slate-500">
        <span>{label}</span>
        <span>{score}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          className={`h-full ${score > 80 ? 'bg-emerald-500' : score > 60 ? 'bg-amber-500' : 'bg-red-500'}`}
        />
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col relative select-none pb-20">

      {/* 1. Topic Section - Quest Scroll Design */}
      <div className="px-4 pt-4 shrink-0">
        <div className="relative group">
          <div className="absolute inset-0 bg-indigo-500/5 blur-2xl rounded-[2rem] -z-10" />
          <div className="bg-white dark:bg-slate-900 border-2 dark:border-slate-800 border-slate-200 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <Sparkles size={16} className="text-indigo-500" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">修行课题 (Topic)</span>
              </div>
              <button
                onClick={refreshTopic}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-indigo-500"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <h3 className="text-lg md:text-xl font-bold dark:text-white text-slate-900 leading-snug italic pr-8">
              "{currentTopic}"
            </h3>
            <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">请针对以上话题发表你的见解</p>
          </div>
        </div>
      </div>

      {/* 2. Main Display: Score & Evaluation */}
      <div className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar">
        {result ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">综合评定 (Overall)</span>
              <div className="relative">
                <span className="text-7xl md:text-8xl font-black rpg-font text-slate-900 dark:text-white">{result.score}</span>
                <span className="absolute -top-2 -right-6 text-2xl text-slate-300 dark:text-slate-700 font-black">/100</span>
              </div>
            </div>

            {result.dimensions && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                <DimensionItem label="清晰度" score={result.dimensions.clarity} />
                <DimensionItem label="论证度" score={result.dimensions.argument} />
                <DimensionItem label="逻辑性" score={result.dimensions.logic} />
                <DimensionItem label="准确性" score={result.dimensions.accuracy} />
                <DimensionItem label="发音" score={result.dimensions.pronunciation} />
              </div>
            )}

            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-500/30">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare size={16} className="text-indigo-500" />
                <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">大贤者建议</span>
              </div>
              <div className="markdown-content text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                <ReactMarkdown>{result.feedback}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-6">
            <div className={`p-8 rounded-full border-4 border-dashed border-slate-300 dark:border-slate-700 transition-all ${status === 'listening' ? 'scale-110 border-emerald-500 border-solid animate-pulse' : ''}`}>
              {status === 'analyzing' ? (
                <Activity size={64} className="text-indigo-500" />
              ) : (
                <Award size={64} className="text-slate-400" />
              )}
            </div>
            <div className="text-center space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">
                {status === 'listening' ? '正聆听你的声音...' : '评估未开始'}
              </p>
              <p className="text-[10px] font-bold text-slate-400 max-w-[240px] leading-relaxed">
                点击悬浮球并长按开始口语对战，大贤者将实时分析你的口译水平
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Floating Mic Controls - Always Right Aligned */}
      <div className="fixed z-[150] flex flex-col items-center gap-4 transition-all duration-500 
        right-6 bottom-32 
        md:right-12 md:bottom-[140px]"
      >

        <AnimatePresence>
          {status === 'listening' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`absolute right-full mr-4 px-4 py-2 rounded-full whitespace-nowrap shadow-2xl border flex items-center gap-3 ${isCanceling
                  ? 'bg-red-600 border-white text-white'
                  : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-slate-200 dark:border-slate-800 text-slate-600 dark:text-white'
                }`}
            >
              {isCanceling ? <X size={16} /> : <Activity size={16} className="text-emerald-500 animate-pulse" />}
              <span className="text-[11px] font-black uppercase tracking-widest">
                {isCanceling ? '松手取消录音' : '左滑取消 (Slide Left)'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {status === 'ready' && (
          <div className="absolute bottom-full mb-3 whitespace-nowrap opacity-70">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 dark:text-indigo-400">长按修行</span>
          </div>
        )}

        <motion.button
          onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
          onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={handleEnd}
          disabled={status === 'analyzing' || !micPermission}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`
            w-16 h-16 md:w-20 md:h-20 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-center transition-all duration-300 border-4 border-white dark:border-slate-950
            ${!micPermission ? 'bg-slate-400 grayscale cursor-not-allowed' :
              status === 'listening'
                ? 'bg-red-600 border-red-400'
                : 'bg-indigo-600 shadow-indigo-500/40 hover:bg-indigo-500'
            }
          `}
        >
          {status === 'listening' && (
            <span className="absolute inset-0 rounded-full bg-red-400/50 animate-ping" />
          )}
          {status === 'analyzing' ? (
            <RefreshCw size={32} className="text-white animate-spin" />
          ) : (
            <Mic size={32} className="text-white relative z-10" />
          )}
        </motion.button>
      </div>

    </div>
  );
};

export default OralTraining;
