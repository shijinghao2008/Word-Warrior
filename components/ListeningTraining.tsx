
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, Play, Pause, Rewind, FastForward, CheckCircle2, AlertCircle, RefreshCcw, Eye, EyeOff } from 'lucide-react';
import { generateListeningQuiz, synthesizeSpeech } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface ListeningTrainingProps {
  onSuccess: (exp: number) => void;
}

const ListeningTraining: React.FC<ListeningTrainingProps> = ({ onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getWavBlob = (base64Data: string) => {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      buffer[i] = binaryString.charCodeAt(i);
    }
    
    // WAV Header parameters for Gemini TTS (24kHz, 16-bit Mono PCM)
    const numChannels = 1;
    const sampleRate = 24000;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = buffer.length;
    
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // file length
    view.setUint32(4, 36 + dataSize, true);
    // RIFF type
    writeString(view, 8, 'WAVE');
    // format chunk identifier
    writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, byteRate, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, blockAlign, true);
    // bits per sample
    view.setUint16(34, bitsPerSample, true);
    // data chunk identifier
    writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, dataSize, true);
    
    return new Blob([header, buffer], { type: 'audio/wav' });
  };

  const initSession = async () => {
    setIsLoading(true);
    setQuizData(null);
    setAudioUrl(null);
    setSubmitted(false);
    setSelectedOption(null);
    setShowTranscript(false);
    setProgress(0);
    setDuration(0);
    setIsPlaying(false);

    try {
      // 1. Generate Text
      const data = await generateListeningQuiz();
      setQuizData(data);

      // 2. Synthesize Audio (Script + Question)
      const textToSpeak = `${data.script} ... Question: ${data.question}`;
      const base64Audio = await synthesizeSpeech(textToSpeak);
      
      if (base64Audio) {
        // Convert raw PCM to WAV blob
        const audioBlob = getWavBlob(base64Audio);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      }
    } catch (e) {
      console.error("Listening setup failed", e);
      alert("通信干扰，无法建立听力连接。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initSession();
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isDragging) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(100);
  };

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.error("Play failed", e));
      setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(e => console.error("Play failed", e));
        setIsPlaying(true);
      }
    }
  };

  const skipTime = (seconds: number) => {
    if (audioRef.current && duration) {
      const newTime = Math.min(Math.max(audioRef.current.currentTime + seconds, 0), duration);
      audioRef.current.currentTime = newTime;
      setProgress((newTime / duration) * 100);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    if (audioRef.current && duration) {
      audioRef.current.currentTime = (val / 100) * duration;
    }
  };

  const handleOptionSelect = (opt: string) => {
    if (submitted) return;
    setSelectedOption(opt);
    setSubmitted(true);
    setShowTranscript(false); // Ensure hidden by default

    if (opt === quizData.correctAnswer) {
      onSuccess(20); // High reward for listening without text
    }
  };

  const getOptionStyle = (opt: string) => {
    if (!submitted) {
      return 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20';
    }
    
    if (opt === quizData.correctAnswer) {
      return 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400';
    }
    if (opt === selectedOption && opt !== quizData.correctAnswer) {
      return 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400';
    }
    return 'opacity-50 border-slate-200 dark:border-slate-800';
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black rpg-font flex items-center gap-3 text-cyan-600 dark:text-cyan-400">
          <Headphones size={24} /> 听力特训 (Listening Ops)
        </h3>
        <button 
          onClick={initSession}
          disabled={isLoading}
          className="text-xs font-black text-slate-500 hover:text-cyan-600 dark:hover:text-white transition-all uppercase tracking-widest flex items-center gap-2"
        >
          <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} /> 切换频道
        </button>
      </div>

      <div className="dark:bg-slate-950 bg-white border dark:border-slate-800 border-slate-200 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
            <div className="animate-spin h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full mb-4" />
            <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-600 animate-pulse">接收信号中 (Receiving)...</p>
          </div>
        )}

        {/* Audio Player Section */}
        <div className="mb-12 space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 shadow-xl transition-all ${isPlaying ? 'border-cyan-500 bg-cyan-500/10 scale-105 shadow-cyan-500/30' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900'}`}>
              <Headphones size={48} className={isPlaying ? 'text-cyan-500 animate-pulse' : 'text-slate-400'} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Secure Frequency</p>
              <p className="text-lg font-bold dark:text-white text-slate-900 font-mono">
                {audioRef.current ? formatTime(audioRef.current.currentTime) : "0:00"} / {formatTime(duration)}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4 max-w-md mx-auto w-full min-h-[100px] flex flex-col justify-center">
            {/* Custom Progress Bar - Always Visible */}
            <div className="relative w-full h-3 group">
              <div className="absolute inset-0 bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 overflow-hidden">
                 <motion.div 
                   className="h-full bg-cyan-500"
                   initial={{ width: 0 }}
                   animate={{ width: `${progress}%` }}
                   transition={{ ease: "linear", duration: 0.1 }}
                 />
              </div>
              {/* Seeking only enabled after submission */}
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={progress}
                onChange={handleSeek}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onTouchStart={() => setIsDragging(true)}
                onTouchEnd={() => setIsDragging(false)}
                disabled={!submitted}
                className={`absolute inset-0 w-full h-full opacity-0 z-10 ${submitted ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              />
            </div>

            {/* Main Start Button - Only visible before playing and before submission */}
            {!submitted && !isPlaying && progress === 0 && (
               <div className="flex justify-center pt-2">
                 <button 
                   onClick={playAudio}
                   disabled={!audioUrl}
                   className="flex items-center gap-2 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full font-bold uppercase tracking-widest shadow-lg shadow-cyan-500/30 transition-all active:scale-95"
                 >
                   <Play size={18} fill="currentColor" /> 开始听力
                 </button>
               </div>
            )}

            {/* Status Message while playing first time */}
            {!submitted && isPlaying && (
              <div className="text-center pt-2">
                <span className="text-xs font-black uppercase tracking-widest text-cyan-600 animate-pulse">正在播放 (Listening...)</span>
              </div>
            )}
            
            {/* Playback Controls - Only visible AFTER submission */}
            {submitted && (
              <div className="flex justify-center items-center gap-6 pt-2">
                 <button 
                   onClick={() => skipTime(-5)}
                   disabled={!audioUrl}
                   className="p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                   title="-5s"
                 >
                   <Rewind size={20} />
                 </button>

                 <button 
                   onClick={togglePlay}
                   disabled={!audioUrl}
                   className="flex items-center justify-center w-14 h-14 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full shadow-lg shadow-cyan-500/30 transition-all active:scale-95"
                 >
                   {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                 </button>

                 <button 
                   onClick={() => skipTime(5)}
                   disabled={!audioUrl}
                   className="p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                   title="+5s"
                 >
                   <FastForward size={20} />
                 </button>
              </div>
            )}
          </div>

          {/* Hidden Audio Element */}
          {audioUrl && (
            <audio 
              ref={audioRef}
              src={audioUrl}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              className="hidden"
            />
          )}
        </div>

        {/* Options Section */}
        {quizData && (
          <div className="space-y-4">
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-2 pl-2">Select the best answer</h4>
            <div className="grid grid-cols-1 gap-4">
              {quizData.options.map((opt: string, i: number) => (
                <button
                  key={i}
                  onClick={() => handleOptionSelect(opt)}
                  disabled={submitted}
                  className={`p-5 rounded-2xl text-left font-medium transition-all border-2 ${getOptionStyle(opt)}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                      submitted && opt === quizData.correctAnswer ? 'border-emerald-500 bg-emerald-500 text-white' : 
                      (submitted && opt === selectedOption ? 'border-red-500 bg-red-500 text-white' : 'border-slate-300 dark:border-slate-700 text-slate-400')
                    }`}>
                      {['A','B','C','D'][i]}
                    </div>
                    {opt}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Post-Answer Section (Script & Feedback) */}
        <AnimatePresence>
          {submitted && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-8 pt-8 border-t dark:border-slate-800 border-slate-100 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <div className={`flex items-center gap-2 font-black uppercase tracking-widest text-xs ${selectedOption === quizData.correctAnswer ? 'text-emerald-500' : 'text-red-500'}`}>
                   {selectedOption === quizData.correctAnswer ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                   {selectedOption === quizData.correctAnswer ? 'Correct Answer' : 'Missed Target'}
                </div>
                <button 
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="flex items-center gap-2 text-xs font-bold text-cyan-600 hover:text-cyan-500 transition-colors"
                >
                  {showTranscript ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showTranscript ? 'Hide Details' : 'Show Details'}
                </button>
              </div>

              {showTranscript && (
                 <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="space-y-4"
                 >
                    <div className="space-y-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Audio Script</span>
                          <p className="text-sm leading-relaxed dark:text-slate-300 text-slate-700 italic font-serif">"{quizData.script}"</p>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question</span>
                          <p className="text-sm font-bold dark:text-white text-slate-900">{quizData.question}</p>
                        </div>
                    </div>

                    {selectedOption !== quizData.correctAnswer && (
                        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                           <p className="text-xs font-bold text-red-500 mb-1">Analysis (Why you missed it):</p>
                           <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                             <ReactMarkdown>{quizData.explanation}</ReactMarkdown>
                           </p>
                        </div>
                    )}
                 </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default ListeningTraining;
