import React, { useState, useRef, useEffect } from 'react';
import { ListeningMaterial } from '../../types';
import { ArrowLeft, Play, Pause, RotateCcw, FastForward, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ListeningReaderProps {
    material: ListeningMaterial;
    onBack: () => void;
    onComplete: (score: number) => void;
}

const ListeningReader: React.FC<ListeningReaderProps> = ({ material, onBack, onComplete }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({}); // valid index -> answer
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showTranscript, setShowTranscript] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Audio Methods
    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            // Requirement: "Before submitting answers, listening cannot be paused"
            if (!isSubmitted) return; // Ignore pause attempt if not submitted

            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().catch(console.error);
            setIsPlaying(true);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const dur = audioRef.current.duration;
            if (dur) setProgress((current / dur) * 100);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setProgress(100);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Requirement: "Before submitting answers, cannot fast forward/rewind or drag progress bar"
        if (!isSubmitted) return;

        const val = parseFloat(e.target.value);
        if (audioRef.current && duration) {
            audioRef.current.currentTime = (val / 100) * duration;
            setProgress(val);
        }
    };

    const skipTime = (seconds: number) => {
        // Requirement: "Before submitting answers, cannot fast forward/rewind"
        if (!isSubmitted) return;

        if (audioRef.current) {
            audioRef.current.currentTime += seconds;
        }
    };

    // Selection
    const handleOptionSelect = (qIndex: number, option: string) => {
        if (isSubmitted) return;
        setUserAnswers(prev => ({ ...prev, [qIndex]: option }));
    };

    const handleSubmit = () => {
        // Validate all answered
        if (Object.keys(userAnswers).length < material.questions.length) {
            alert("Please answer all questions before submitting.");
            return;
        }

        setIsSubmitted(true); // This unlocks the UI

        // Calculate score
        let score = 0;
        material.questions.forEach((q, idx) => {
            if (userAnswers[idx]?.trim() === q.answer?.trim()) {
                score++;
            }
        });

        // Notify parent to save progress
        if (onComplete) {
            onComplete(score);
        }
    };

    const formatTime = (time: number) => {
        if (!time) return "0:00";
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-28">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <button onClick={onBack} className="ww-btn ww-btn--ink px-4 py-2 rounded-2xl text-[10px] flex items-center gap-2">
                    <ArrowLeft size={16} />
                    返回
                </button>
                <div className="px-3 py-1.5 ww-pill ww-pill--accent">
                    <span className="text-[10px] font-black text-black uppercase tracking-widest">{material.level || 'Primary'}</span>
                </div>
            </div>

            <div className="ww-surface ww-surface--soft rounded-[22px] p-5">
                <h1 className="text-xl md:text-2xl font-black ww-ink">{material.title}</h1>
                <p className="text-[10px] font-black ww-muted uppercase tracking-[0.18em] mt-1">先听音频 → 再提交答案（提交后可快进/查看原文）</p>
            </div>

            {/* Audio Player Card */}
            <div className="ww-surface ww-surface--soft rounded-[22px] p-6 sticky top-4 z-10">
                <audio
                    ref={audioRef}
                    src={material.audio_url || undefined}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    className="hidden"
                />

                <div className="flex flex-col gap-4">
                    {/* Progress Bar */}
                    <div
                        className="relative w-full h-3 rounded-full overflow-hidden"
                        style={{ border: '3px solid var(--ww-stroke)', background: 'rgba(26,15,40,0.10)' }}
                    >
                        <motion.div
                            className="absolute top-0 left-0 h-full"
                            style={{ width: `${progress}%` }}
                            animate={{ backgroundColor: 'var(--ww-accent)' as any }}
                        />
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={progress}
                            onChange={handleSeek}
                            disabled={!isSubmitted} // LOCK
                            className={`absolute inset-0 w-full h-full opacity-0 ${isSubmitted ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-black ww-muted font-mono">
                        <span>{audioRef.current ? formatTime(audioRef.current.currentTime) : "0:00"}</span>
                        <span>{formatTime(duration)}</span>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-6">
                        <button
                            onClick={() => skipTime(-5)}
                            disabled={!isSubmitted}
                            className={`p-2 rounded-full transition-colors ${isSubmitted ? 'ww-btn ww-btn--accent' : 'ww-btn ww-btn--ink opacity-60 cursor-not-allowed'}`}
                        >
                            <RotateCcw size={20} />
                        </button>

                        <button
                            onClick={togglePlay}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all transform active:scale-95 ${isPlaying
                                ? (isSubmitted ? 'ww-btn ww-btn--accent' : 'ww-btn ww-btn--ink opacity-70 cursor-not-allowed')
                                : 'ww-btn ww-btn--accent'
                                }`}
                        >
                            {/* Icon Logic: If Playing & NOT Submitted -> Show Pause but it acts disabled? User req says "cannot pause". So Pause icon but clicking does nothing? 
                                Actually, "Clicking play button starts listening... cannot pause". 
                                The togglePlay function handles logic. Here we just show icon.
                             */}
                            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                        </button>

                        <button
                            onClick={() => skipTime(5)}
                            disabled={!isSubmitted}
                            className={`p-2 rounded-full transition-colors ${isSubmitted ? 'ww-btn ww-btn--accent' : 'ww-btn ww-btn--ink opacity-60 cursor-not-allowed'}`}
                        >
                            <FastForward size={20} />
                        </button>
                    </div>
                    {!isSubmitted && (
                        <p className="text-center text-[10px] mt-2 font-black" style={{ color: 'rgba(252,203,89,0.95)' }}>
                            未提交前：不可暂停 / 快进 / 拖动进度条
                        </p>
                    )}
                </div>
            </div>

            {/* Questions List */}
            <div className="space-y-8">
                {material.questions.map((q, idx) => {
                    const isCorrect = userAnswers[idx] === q.answer;
                    const userAnswer = userAnswers[idx];

                    return (
                        <div key={idx} className="ww-surface ww-surface--soft rounded-[22px] p-6 space-y-4">
                            <h3 className="text-[14px] font-black ww-ink flex gap-3">
                                <span
                                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
                                    style={{ background: 'rgba(252,203,89,0.95)', border: '3px solid var(--ww-stroke)', boxShadow: '0 6px 0 rgba(0,0,0,0.18)' }}
                                >
                                    {idx + 1}
                                </span>
                                {q.question}
                            </h3>

                            <div className="grid grid-cols-1 gap-3 pl-11">
                                {q.options.map((opt, optIdx) => {
                                    // Colors logic
                                    let btnClass = "ww-surface ww-surface--soft border-2";
                                    let btnStyle: React.CSSProperties = { borderColor: 'rgba(43,23,63,0.22)' };

                                    const trimmedOpt = opt.trim();
                                    const trimmedAnswer = q.answer?.trim();
                                    const trimmedUserAnswer = userAnswer?.trim();

                                    if (isSubmitted) {
                                        if (trimmedOpt === trimmedAnswer) {
                                            btnClass = "ww-surface ww-surface--soft border-2";
                                            btnStyle = { borderColor: 'rgba(16,185,129,0.75)', background: 'rgba(16,185,129,0.14)' };
                                        } else if (trimmedOpt === trimmedUserAnswer && trimmedOpt !== trimmedAnswer) {
                                            btnClass = "ww-surface ww-surface--soft border-2";
                                            btnStyle = { borderColor: 'rgba(239,68,68,0.75)', background: 'rgba(239,68,68,0.12)' };
                                        } else {
                                            btnClass = "ww-surface ww-surface--soft border-2 opacity-60";
                                            btnStyle = { borderColor: 'rgba(43,23,63,0.18)' };
                                        }
                                    } else {
                                        if (userAnswer === opt) {
                                            btnClass = "ww-surface ww-surface--soft border-2";
                                            btnStyle = { borderColor: 'rgba(252,203,89,0.75)', background: 'rgba(252,203,89,0.28)' };
                                        }
                                    }

                                    return (
                                        <button
                                            key={optIdx}
                                            onClick={() => handleOptionSelect(idx, opt)}
                                            disabled={isSubmitted}
                                            className={`p-4 rounded-2xl text-left transition-all flex items-center justify-between ${btnClass}`}
                                            style={btnStyle}
                                        >
                                            <span className="ww-ink font-black">{opt}</span>
                                            {isSubmitted && trimmedOpt === trimmedAnswer && <CheckCircle size={18} />}
                                            {isSubmitted && trimmedOpt === trimmedUserAnswer && trimmedOpt !== trimmedAnswer && <AlertCircle size={18} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer / Submit */}
            <div className="sticky bottom-0 -mx-4 px-6 py-4 flex items-center justify-between">
                <div className="ww-surface ww-surface--soft rounded-[22px] w-full px-4 py-3 flex items-center justify-between">

                    {/* Transcript Toggle */}
                    <button
                        onClick={() => setShowTranscript(!showTranscript)}
                        disabled={!isSubmitted}
                        className={`flex items-center gap-2 font-black transition-colors ${isSubmitted ? 'ww-link' : 'ww-muted cursor-not-allowed'}`}
                    >
                        {showTranscript ? <EyeOff size={18} /> : <Eye size={18} />}
                        {showTranscript ? "隐藏原文" : "查看原文"}
                    </button>

                    {!isSubmitted ? (
                        <button
                            onClick={handleSubmit}
                            disabled={Object.keys(userAnswers).length < material.questions.length}
                            className={`px-6 py-3 rounded-2xl text-[10px] transition-all ${Object.keys(userAnswers).length < material.questions.length
                                ? 'ww-btn ww-btn--ink opacity-60 cursor-not-allowed'
                                : 'ww-btn ww-btn--accent'
                                }`}
                        >
                            提交答案
                        </button>
                    ) : (
                        <div className="text-right">
                            <span className="text-[10px] ww-muted font-black block">已提交</span>
                            <span className="font-black" style={{ color: 'rgba(16,185,129,0.95)' }}>完成</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Transcript Area */}
            <AnimatePresence>
                {showTranscript && isSubmitted && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="ww-surface ww-surface--soft rounded-[22px] p-8 mt-6">
                            <h3 className="text-sm font-black uppercase ww-ink tracking-widest mb-4">原文</h3>
                            <p className="leading-relaxed ww-ink font-serif text-lg">
                                {material.content}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default ListeningReader;
