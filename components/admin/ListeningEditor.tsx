
import React, { useState, useRef, useEffect } from 'react';
import { ListeningMaterial, ListeningQuestion } from '../../types';
import { listeningService } from '../../services/listeningService';
import { Play, Pause, FastForward, RotateCcw, Upload, Plus, Trash2, Save, X, ArrowUp, ArrowDown, Check, AlertCircle } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';

interface ListeningEditorProps {
    material?: ListeningMaterial;
    onSave: () => void;
    onCancel: () => void;
}

const ListeningEditor: React.FC<ListeningEditorProps> = ({ material, onSave, onCancel }) => {
    // Form State
    const [title, setTitle] = useState(material?.title || '');
    const [content, setContent] = useState(material?.content || '');
    const [level, setLevel] = useState(material?.level || 'Primary');
    const [questions, setQuestions] = useState<ListeningQuestion[]>(material?.questions || []);
    const [audioUrl, setAudioUrl] = useState<string | null>(material?.audio_url || null);

    // UI State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadingAudio, setUploadingAudio] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Audio Player State
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    // Audio Handlers
    const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingAudio(true);
            const url = await listeningService.uploadListeningAudio(file);
            setAudioUrl(url);
        } catch (err) {
            console.error(err);
            setError('Failed to upload audio');
        } finally {
            setUploadingAudio(false);
        }
    };

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
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

    const handleSkip = (seconds: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime += seconds;
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (audioRef.current && duration) {
            audioRef.current.currentTime = (val / 100) * duration;
            setProgress(val);
        }
    };

    // Question Handlers
    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                question: '',
                options: ['', ''],
                answer: '',
                explanation: ''
            }
        ]);
    };

    const updateQuestion = (index: number, field: keyof ListeningQuestion, value: any) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = value;

        // If this option was the answer, update the answer too? 
        // No, answer stores the string value directly in current type definition (based on `types.ts`).
        // If we change the option text, we might break the answer reference if it stores value.
        // Let's check `types.ts`: `answer: string;`. Usually storing index is safer, but if it stores text, we need to be careful.
        // Assuming it stores text value.

        // Actually, if we change the option text that IS the answer, we should update the answer.
        const oldOptionValue = questions[qIndex].options[oIndex];
        if (newQuestions[qIndex].answer === oldOptionValue) {
            newQuestions[qIndex].answer = value;
        }

        setQuestions(newQuestions);
    };

    const addOption = (qIndex: number) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options.push('');
        setQuestions(newQuestions);
    };

    const removeOption = (qIndex: number, oIndex: number) => {
        const newQuestions = [...questions];
        const optToRemove = newQuestions[qIndex].options[oIndex];

        if (newQuestions[qIndex].options.length <= 2) return; // Min 2 options

        newQuestions[qIndex].options.splice(oIndex, 1);

        // If we removed the answer, clear it
        if (newQuestions[qIndex].answer === optToRemove) {
            newQuestions[qIndex].answer = '';
        }

        setQuestions(newQuestions);
    };

    const removeQuestion = (index: number) => {
        const newQuestions = [...questions];
        newQuestions.splice(index, 1);
        setQuestions(newQuestions);
    };

    const moveQuestion = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === questions.length - 1) return;

        const newQuestions = [...questions];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newQuestions[index], newQuestions[swapIndex]] = [newQuestions[swapIndex], newQuestions[index]];
        setQuestions(newQuestions);
    };

    // Validation & Submit
    const validate = () => {
        if (!title.trim()) return "Title is required";
        if (!content.trim()) return "Transcript is required";
        if (questions.length === 0) return "At least one question is required";

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.question.trim()) return `Question ${i + 1} text is empty`;
            if (q.options.some(o => !o.trim())) return `Question ${i + 1} has empty options`;
            if (q.options.length < 2) return `Question ${i + 1} needs at least 2 options`;
            if (!q.answer) return `Question ${i + 1} has no correct answer selected`;
            if (!q.options.includes(q.answer)) return `Question ${i + 1} answer must match one of the options`;
        }

        return null;
    };

    const handleSubmit = async () => {
        const err = validate();
        if (err) {
            setError(err);
            return;
        }

        try {
            setIsSubmitting(true);
            await listeningService.upsertListeningMaterial({
                id: material?.id,
                title,
                content,
                level,
                questions,
                audio_url: audioUrl
            });
            onSave();
        } catch (e) {
            console.error(e);
            setError('Failed to save material');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border dark:border-slate-800 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-20 pb-4 border-b dark:border-slate-800">
                <h2 className="text-xl font-black uppercase text-slate-800 dark:text-white">
                    {material ? 'Edit Listening Material' : 'New Listening Material'}
                </h2>
                <div className="flex gap-2">
                    <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
                        <X size={20} />
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold disabled:opacity-50"
                    >
                        <Save size={18} /> {isSubmitting ? 'Saving...' : 'Submit'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 text-red-500 rounded-xl flex items-center gap-2 text-sm font-bold animate-pulse">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Details & Audio */}
                <div className="space-y-6">
                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-500">Title</label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500"
                            placeholder="e.g., At the Library"
                        />
                    </div>

                    {/* Level */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-500">Level</label>
                        <select
                            value={level}
                            onChange={e => setLevel(e.target.value)}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500"
                        >
                            <option value="Primary">Primary (小学)</option>
                            <option value="Middle">Middle (初中)</option>
                            <option value="High">High (高中)</option>
                        </select>
                    </div>

                    {/* Audio Section */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-500">Audio</label>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-4">
                            {audioUrl ? (
                                <div className="space-y-4">
                                    <audio
                                        ref={audioRef}
                                        src={audioUrl}
                                        onTimeUpdate={handleTimeUpdate}
                                        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                                        onEnded={() => setIsPlaying(false)}
                                    />

                                    {/* Custom Player Controls */}
                                    <div className="flex flex-col gap-2">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={progress}
                                            onChange={handleSeek}
                                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full"
                                        />
                                        <div className="flex items-center justify-center gap-4">
                                            <button onClick={() => handleSkip(-5)} className="p-2 text-slate-500 hover:text-indigo-500"><RotateCcw size={20} /></button>
                                            <button onClick={togglePlay} className="p-3 bg-indigo-500 text-white rounded-full hover:bg-indigo-400 shadow-lg shadow-indigo-500/30">
                                                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                                            </button>
                                            <button onClick={() => handleSkip(5)} className="p-2 text-slate-500 hover:text-indigo-500"><FastForward size={20} /></button>
                                        </div>
                                    </div>

                                    <div className="border-t dark:border-slate-700 pt-4">
                                        <p className="text-xs text-center text-slate-400 mb-2">Replace current audio?</p>
                                        <label className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-indigo-500 transition-colors">
                                            <Upload size={16} className="text-slate-400" />
                                            <span className="text-xs font-bold text-slate-500">Upload New Audio</span>
                                            <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <label className="flex flex-col items-center gap-2 cursor-pointer group">
                                        <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-full group-hover:scale-110 transition-transform">
                                            <Upload size={24} className="text-indigo-500" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-500">Upload Audio File</span>
                                        <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                                    </label>
                                </div>
                            )}
                            {uploadingAudio && <p className="text-xs text-center text-indigo-500 animate-pulse">Uploading...</p>}
                        </div>
                    </div>

                    {/* Transcript */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-500">Transcript (Original Text)</label>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            className="w-full p-4 h-64 bg-slate-50 dark:bg-slate-800 rounded-xl border-none font-medium text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 ring-indigo-500 resize-none font-serif leading-relaxed"
                            placeholder="Enter the full transcript here..."
                        />
                    </div>
                </div>

                {/* Right Column: Questions */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase text-slate-500">Questions ({questions.length})</label>
                        <button
                            onClick={addQuestion}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                        >
                            <Plus size={14} /> Add Question
                        </button>
                    </div>

                    <div className="space-y-4">
                        {questions.map((q, qIndex) => (
                            <div key={qIndex} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4 relative group">
                                {/* Question Controls */}
                                <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => moveQuestion(qIndex, 'up')} className="p-1 text-slate-400 hover:text-indigo-500"><ArrowUp size={14} /></button>
                                    <button onClick={() => moveQuestion(qIndex, 'down')} className="p-1 text-slate-400 hover:text-indigo-500"><ArrowDown size={14} /></button>
                                    <button onClick={() => removeQuestion(qIndex)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                                </div>

                                {/* Question Input */}
                                <div>
                                    <span className="text-xs font-bold text-slate-400 mb-1 block">Question {qIndex + 1}</span>
                                    <input
                                        value={q.question}
                                        onChange={e => updateQuestion(qIndex, 'question', e.target.value)}
                                        className="w-full p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-bold outline-none focus:border-indigo-500"
                                        placeholder="Enter question..."
                                    />
                                </div>

                                {/* Options */}
                                <div className="space-y-2">
                                    {q.options.map((opt, oIndex) => (
                                        <div key={oIndex} className="flex items-center gap-2">
                                            {/* Correct Answer Radio */}
                                            <button
                                                onClick={() => updateQuestion(qIndex, 'answer', opt)} // Set answer to this option's value
                                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${q.answer === opt && opt !== ''
                                                        ? 'bg-green-500 border-green-500 text-white'
                                                        : 'border-slate-300 dark:border-slate-600 hover:border-green-500'
                                                    }`}
                                                title="Mark as correct answer"
                                            >
                                                {q.answer === opt && opt !== '' && <Check size={12} />}
                                            </button>

                                            <input
                                                value={opt}
                                                onChange={e => updateOption(qIndex, oIndex, e.target.value)}
                                                className="flex-1 p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 text-xs outline-none focus:border-indigo-500"
                                                placeholder={`Option ${oIndex + 1}`}
                                            />

                                            <button
                                                onClick={() => removeOption(qIndex, oIndex)}
                                                className="p-1.5 text-slate-400 hover:text-red-500"
                                                disabled={q.options.length <= 2}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => addOption(qIndex)}
                                        className="text-xs font-bold text-indigo-500 hover:text-indigo-600 px-2"
                                    >
                                        + Add Option
                                    </button>
                                </div>
                            </div>
                        ))}

                        {questions.length === 0 && (
                            <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                <p className="text-sm">No questions added yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ListeningEditor;
