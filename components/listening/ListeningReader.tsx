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
            if (userAnswers[idx] === q.answer) {
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
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
                <ArrowLeft size={20} />
                <span>Back to Library</span>
            </button>

            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-white">{material.title}</h1>
                <span className="text-cyan-400 text-sm font-medium">{material.level || 'Primary'} Level</span>
            </div>

            {/* Audio Player Card */}
            <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl sticky top-4 z-10 transition-all">
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
                    <div className="relative w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            className="absolute top-0 left-0 h-full bg-cyan-500"
                            style={{ width: `${progress}%` }}
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

                    <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
                        <span>{audioRef.current ? formatTime(audioRef.current.currentTime) : "0:00"}</span>
                        <span>{formatTime(duration)}</span>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-6">
                        <button
                            onClick={() => skipTime(-5)}
                            disabled={!isSubmitted}
                            className={`p-2 rounded-full transition-colors ${isSubmitted ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-700 cursor-not-allowed'}`}
                        >
                            <RotateCcw size={20} />
                        </button>

                        <button
                            onClick={togglePlay}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-lg ${isPlaying
                                    ? (isSubmitted ? 'bg-amber-500 text-white shadow-amber-500/30' : 'bg-gray-600 text-gray-400 cursor-not-allowed') // Playing but locked (pause disabled)
                                    : 'bg-cyan-500 text-white shadow-cyan-500/30 hover:bg-cyan-400' // Not playing (can play)
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
                            className={`p-2 rounded-full transition-colors ${isSubmitted ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-700 cursor-not-allowed'}`}
                        >
                            <FastForward size={20} />
                        </button>
                    </div>
                    {!isSubmitted && (
                        <p className="text-center text-xs text-amber-500/80 mt-2 font-medium">
                            Audio controls are locked until you submit your answers.
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
                        <div key={idx} className="bg-gray-800/30 rounded-xl p-6 border border-white/5 space-y-4">
                            <h3 className="text-lg font-bold text-white flex gap-3">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm">{idx + 1}</span>
                                {q.question}
                            </h3>

                            <div className="grid grid-cols-1 gap-3 pl-11">
                                {q.options.map((opt, optIdx) => {
                                    // Colors logic
                                    let btnClass = "bg-gray-900/50 border-gray-700 text-gray-300 hover:bg-gray-800";

                                    if (isSubmitted) {
                                        if (opt === q.answer) {
                                            btnClass = "bg-green-500/20 border-green-500 text-green-400"; // Correct answer (always green)
                                        } else if (opt === userAnswer && opt !== q.answer) {
                                            btnClass = "bg-red-500/20 border-red-500 text-red-400"; // Wrong selected answer (red)
                                        } else {
                                            btnClass = "bg-gray-900/50 border-gray-700 text-gray-500 opacity-50"; // Others
                                        }
                                    } else {
                                        if (userAnswer === opt) {
                                            btnClass = "bg-cyan-500/20 border-cyan-500 text-cyan-300"; // Selected
                                        }
                                    }

                                    return (
                                        <button
                                            key={optIdx}
                                            onClick={() => handleOptionSelect(idx, opt)}
                                            disabled={isSubmitted}
                                            className={`p-4 rounded-xl text-left border transition-all flex items-center justify-between group ${btnClass}`}
                                        >
                                            <span>{opt}</span>
                                            {isSubmitted && opt === q.answer && <CheckCircle size={18} />}
                                            {isSubmitted && opt === userAnswer && opt !== q.answer && <AlertCircle size={18} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer / Submit */}
            <div className="sticky bottom-0 p-4 bg-gray-900/95 backdrop-blur border-t border-white/10 -mx-4 px-8 flex items-center justify-between">

                {/* Transcript Toggle */}
                <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    disabled={!isSubmitted}
                    className={`flex items-center gap-2 font-medium transition-colors ${isSubmitted ? 'text-cyan-400 hover:text-cyan-300' : 'text-gray-600 cursor-not-allowed'}`}
                >
                    {showTranscript ? <EyeOff size={18} /> : <Eye size={18} />}
                    {showTranscript ? "Hide Transcript" : "View Original Text"}
                </button>

                {!isSubmitted ? (
                    <button
                        onClick={handleSubmit}
                        disabled={Object.keys(userAnswers).length < material.questions.length}
                        className={`px-8 py-3 rounded-full font-bold uppercase tracking-wide transition-all ${Object.keys(userAnswers).length < material.questions.length
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/25'
                            }`}
                    >
                        Submit Answers
                    </button>
                ) : (
                    <div className="text-right">
                        <span className="text-sm text-gray-400 block">Review your results</span>
                        <span className="text-green-500 font-bold">Completed</span>
                    </div>
                )}
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
                        <div className="bg-gray-800/50 rounded-2xl p-8 border border-white/10 mt-8">
                            <h3 className="text-sm font-black uppercase text-gray-500 tracking-widest mb-4">Transcript</h3>
                            <p className="leading-relaxed text-gray-300 font-serif text-lg">
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
