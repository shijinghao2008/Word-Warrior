import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Coffee,
    Plane,
    Briefcase,
    BookOpen,
    Rocket,
    Mic,
    Square,
    Loader,
    Award,
    Clock,
    History,
    ArrowLeft,
    CheckCircle,
    XCircle,
    Trophy,
} from 'lucide-react';
import XPNotification from '../ui/XPNotification';
import {
    fetchSpeakingQuestions,
    AudioRecorder,
    audioBlobToBase64,
    assessSpeakingWithAI,
    saveAssessment,
    fetchUserAssessments,
} from '../../services/speakingAssessmentService';
import { type SpeakingAssessment, SpeakingQuestion, AssessmentScore } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface SpeakingAssessmentProps {
    userId: string;
    onSuccess: (exp: number, gold?: number) => void;
    onClose?: () => void;
    onToggleStatusBar?: (hidden: boolean) => void;
}

type ViewState = 'selection' | 'recording' | 'evaluating' | 'result' | 'history';

const CATEGORY_ICONS: Record<string, React.ReactElement> = {
    'Daily Chat': <Coffee size={24} />,
    Travel: <Plane size={24} />,
    Business: <Briefcase size={24} />,
    Academic: <BookOpen size={24} />,
    Tech: <Rocket size={24} />,
};

const CATEGORY_COLORS: Record<string, string> = {
    'Daily Chat': 'from-amber-400 to-orange-500',
    Travel: 'from-sky-400 to-blue-500',
    Business: 'from-slate-500 to-gray-600',
    Academic: 'from-indigo-400 to-purple-500',
    Tech: 'from-violet-400 to-fuchsia-500',
};

const SpeakingAssessment: React.FC<SpeakingAssessmentProps> = ({
    userId,
    onSuccess,
    onClose,
    onToggleStatusBar,
}) => {
    const { getColorClass, primaryColor } = useTheme();

    // State
    const [viewState, setViewState] = useState<ViewState>('selection');
    const [selectedDifficulty, setSelectedDifficulty] = useState<'初级' | '中级' | '高级' | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [questions, setQuestions] = useState<SpeakingQuestion[]>([]);
    const [selectedQuestion, setSelectedQuestion] = useState<SpeakingQuestion | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [assessmentResult, setAssessmentResult] = useState<AssessmentScore | null>(null);
    const [expAwarded, setExpAwarded] = useState(0);
    const [assessmentHistory, setAssessmentHistory] = useState<SpeakingAssessment[]>([]);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<SpeakingAssessment | null>(null);
    const [showXPNotification, setShowXPNotification] = useState(false);
    const [goldAwarded, setGoldAwarded] = useState(0);

    // Refs
    const audioRecorderRef = useRef<AudioRecorder | null>(null);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Load questions on mount
    useEffect(() => {
        loadQuestions();
    }, [selectedDifficulty, selectedCategory]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
        };
    }, []);

    const loadQuestions = async () => {
        const data = await fetchSpeakingQuestions(
            selectedDifficulty || undefined,
            selectedCategory as any
        );
        setQuestions(data);
    };

    const loadHistory = async () => {
        const history = await fetchUserAssessments(userId);
        setAssessmentHistory(history);
    };

    const startRecording = async () => {
        try {
            if (!audioRecorderRef.current) {
                audioRecorderRef.current = new AudioRecorder();
            }

            await audioRecorderRef.current.startRecording();
            setIsRecording(true);
            setRecordingDuration(0);

            // Start timer
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration((prev) => prev + 1);
            }, 1000);
        } catch (error: any) {
            alert(error.message || '无法开始录音');
        }
    };

    const stopRecording = async () => {
        try {
            if (!audioRecorderRef.current || !selectedQuestion) return;

            // Stop timer
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }

            setIsRecording(false);
            setViewState('evaluating');

            const audioBlob = await audioRecorderRef.current.stopRecording();
            const audioBase64 = await audioBlobToBase64(audioBlob);

            // Call AI assessment
            const result = await assessSpeakingWithAI(audioBase64, selectedQuestion);
            setAssessmentResult(result);

            // Save to database
            const { expAwarded: exp, goldAwarded: gold } = await saveAssessment(
                userId,
                selectedQuestion.id,
                result
            );
            setExpAwarded(exp);
            setGoldAwarded(gold);

            // Call parent success handler
            if (exp > 0) {
                setShowXPNotification(true);
                onSuccess(exp, gold);
            }

            setViewState('result');
        } catch (error: any) {
            alert(error.message || '评估失败，请重试');
            setViewState('recording');
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const resetToSelection = () => {
        setViewState('selection');
        setSelectedQuestion(null);
        setRecordingDuration(0);
        setAssessmentResult(null);
        setExpAwarded(0);
        onToggleStatusBar?.(false);
    };

    // ===== RENDER FUNCTIONS =====

    const renderSelection = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pb-20"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black ww-ink">口语评估</h2>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                        await loadHistory();
                        setViewState('history');
                    }}
                    className="flex items-center gap-2 px-4 py-2 ww-btn ww-btn--accent rounded-2xl text-[10px]"
                >
                    <History size={16} />
                    历史记录
                </motion.button>
            </div>

            {/* Difficulty Filter */}
            <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest ww-muted">
                    选择难度
                </h3>
                <div className="grid grid-cols-3 gap-2">
                    {['初级', '中级', '高级'].map((difficulty) => (
                        <motion.button
                            key={difficulty}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() =>
                                setSelectedDifficulty(
                                    selectedDifficulty === difficulty ? null : (difficulty as any)
                                )
                            }
                            className={`py-3 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${selectedDifficulty === difficulty
                                ? 'bg-[rgba(252,203,89,0.95)] text-black border-[color:var(--ww-stroke)]'
                                : 'bg-[rgba(255,255,255,0.22)] text-[rgba(26,15,40,0.75)] border-[color:var(--ww-stroke-soft)]'
                                }`}
                        >
                            {difficulty}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest ww-muted">
                    选择领域
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    {Object.keys(CATEGORY_ICONS).map((category) => (
                        <motion.button
                            key={category}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() =>
                                setSelectedCategory(selectedCategory === category ? null : category)
                            }
                            className={`p-3 rounded-2xl border-2 transition-all ${selectedCategory === category
                                ? `bg-gradient-to-br ${CATEGORY_COLORS[category]} text-white`
                                : 'bg-[rgba(255,255,255,0.22)] text-[rgba(26,15,40,0.75)]'
                                }`}
                            style={{
                                borderColor: selectedCategory === category ? 'var(--ww-stroke)' : 'rgba(43,23,63,0.22)',
                                boxShadow: selectedCategory === category ? '0 10px 18px rgba(0,0,0,0.14)' : undefined,
                            }}
                        >
                            <div className="flex items-center gap-2">
                                {CATEGORY_ICONS[category]}
                                <span className="text-sm font-black">{category}</span>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Question List */}
            <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest ww-muted">
                    选择题目 ({questions.length})
                </h3>
                {questions.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 ww-pill" style={{ background: 'rgba(255,255,255,0.25)' }}>
                            <Mic size={14} style={{ color: 'var(--ww-stroke)' }} />
                            <p className="text-[10px] font-black uppercase tracking-widest ww-muted">没有找到题目</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {questions.map((question) => (
                            <motion.button
                                key={question.id}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => {
                                    setSelectedQuestion(question);
                                    setViewState('recording');
                                    onToggleStatusBar?.(true);
                                }}
                                className="w-full p-4 rounded-[22px] border-2 text-left transition-all"
                                style={{ borderColor: 'rgba(43,23,63,0.22)', background: 'rgba(255,255,255,0.22)', boxShadow: '0 10px 18px rgba(0,0,0,0.10)' }}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <p className="text-sm font-black ww-ink mb-1">
                                            {question.question_text}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs ww-muted">
                                            <span className="px-2 py-1 rounded-xl border-2" style={{ borderColor: 'rgba(43,23,63,0.18)', background: 'rgba(255,255,255,0.18)' }}>
                                                {question.difficulty}
                                            </span>
                                            <span className="px-2 py-1 rounded-xl border-2" style={{ borderColor: 'rgba(43,23,63,0.18)', background: 'rgba(255,255,255,0.18)' }}>
                                                {question.category}
                                            </span>
                                            <Clock size={12} />
                                            <span>{question.expected_duration}秒</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );

    const renderRecording = () => (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col"
        >
            {/* Back Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetToSelection}
                className="self-start flex items-center gap-2 ww-btn ww-btn--ink px-4 py-2 rounded-2xl text-[10px] mb-4"
            >
                <ArrowLeft size={20} />
                <span className="font-black">返回</span>
            </motion.button>

            {/* Question Display */}
            <div className="ww-surface ww-surface--soft p-6 rounded-3xl mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 rounded-xl text-xs font-black border-2" style={{ borderColor: 'rgba(43,23,63,0.22)', background: 'rgba(252,203,89,0.95)', color: 'black' }}>
                        {selectedQuestion?.difficulty}
                    </span>
                    <span className="px-3 py-1 rounded-xl text-xs font-black border-2" style={{ borderColor: 'rgba(43,23,63,0.18)', background: 'rgba(255,255,255,0.18)', color: 'rgba(26,15,40,0.75)' }}>
                        {selectedQuestion?.category}
                    </span>
                </div>
                <p className="text-base font-black ww-ink">
                    {selectedQuestion?.question_text}
                </p>
            </div>

            {/* Recording Interface */}
            <div className="flex-1 flex flex-col items-center justify-center">
                <motion.div
                    animate={{
                        scale: isRecording ? [1, 1.1, 1] : 1,
                        opacity: isRecording ? [0.8, 1, 0.8] : 1,
                    }}
                    transition={{ duration: 1, repeat: isRecording ? Infinity : 0 }}
                    className={`w-32 h-32 rounded-full ${isRecording
                        ? 'bg-gradient-to-br from-red-400 to-pink-500'
                        : 'bg-gradient-to-br from-emerald-400 to-cyan-500'
                        } flex items-center justify-center shadow-2xl mb-6`}
                >
                    <Mic size={48} className="text-white" />
                </motion.div>

                {isRecording && (
                    <div className="text-3xl font-black ww-ink mb-4">
                        {formatTime(recordingDuration)}
                    </div>
                )}

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`px-8 py-4 rounded-2xl font-black text-base uppercase tracking-widest transition-all ${isRecording ? 'ww-btn' : 'ww-btn ww-btn--accent'}`}
                    style={isRecording ? { background: 'rgba(239,68,68,0.95)', color: 'white' } : undefined}
                >
                    {isRecording ? (
                        <div className="flex items-center gap-2">
                            <Square size={20} />
                            停止录音
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Mic size={20} />
                            开始录音
                        </div>
                    )}
                </motion.button>

                <p className="text-xs ww-muted mt-4 text-center font-black">
                    建议录音时长：{selectedQuestion?.expected_duration} 秒
                </p>
            </div>
        </motion.div>
    );

    const renderEvaluating = () => (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col items-center justify-center p-6"
        >
            <div className="ww-surface ww-surface--soft rounded-[22px] p-8 text-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                    <Loader size={56} style={{ color: 'var(--ww-accent)' }} />
                </motion.div>
                <p className="text-lg font-black ww-ink mt-6">AI 正在评估中...</p>
                <p className="text-sm ww-muted mt-2 font-black">请稍候，这可能需要几秒钟</p>
            </div>
        </motion.div>
    );

    const renderResult = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pb-20"
        >
            {/* Header */}
            <div className="text-center mb-6">
                <Award size={64} className="mx-auto mb-3" style={{ color: 'var(--ww-accent)' }} />
                <h2 className="text-2xl font-black ww-ink">评估完成!</h2>
            </div>

            {/* Total Score */}
            <div className="ww-surface ww-surface--soft p-8 rounded-3xl text-center">
                <p className="text-sm font-black ww-muted mb-2">总分</p>
                <p className="text-6xl font-black ww-ink mb-2">
                    {assessmentResult?.total_score}
                </p>
                <p className="text-xs ww-muted font-black">满分 100</p>
                {expAwarded > 0 && (
                    <div className="mt-4 flex flex-col items-center gap-2">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center gap-2"
                            style={{ color: 'rgba(16,185,129,0.95)' }}
                        >
                            <CheckCircle size={20} />
                            <span className="text-sm font-black">获得 {expAwarded} 经验值!</span>
                        </motion.div>
                        {/* We can infer gold from exp (gold = exp / 2) or use a passed prop if we refactored enough. 
                             For now, let's just calculate it or rely on the fact that 20XP/10Gold ratio is fixed. 
                             Or strictly, we should have stored goldAwarded in state. 
                         */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center gap-2"
                            style={{ color: 'rgba(252,203,89,1)' }}
                        >
                            <Trophy size={18} />
                            <span className="text-sm font-black">获得 {expAwarded / 2} 金币!</span>
                        </motion.div>
                        <p className="text-xs ww-muted font-black mt-2">
                            (基于 {assessmentResult?.sentence_count || 0} 个有效句子)
                        </p>
                    </div>
                )}
            </div>

            {/* Detailed Scores */}
            <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest ww-muted">
                    详细评分
                </h3>
                {[
                    { label: '发音准确度', score: assessmentResult?.pronunciation_score },
                    { label: '流畅度', score: assessmentResult?.fluency_score },
                    { label: '词汇使用', score: assessmentResult?.vocabulary_score },
                    { label: '内容丰富度', score: assessmentResult?.content_score },
                    { label: '是否切题', score: assessmentResult?.on_topic_score },
                ].map((item, index) => (
                    <div key={index} className="ww-surface ww-surface--soft p-4 rounded-[22px]">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-black ww-ink">
                                {item.label}
                            </span>
                            <span className="text-lg font-black ww-ink">
                                {item.score}
                            </span>
                        </div>
                        <div className="w-full h-3 rounded-full overflow-hidden" style={{ border: '3px solid var(--ww-stroke)', background: 'rgba(26,15,40,0.10)' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${item.score}%` }}
                                transition={{ duration: 1, delay: index * 0.1 }}
                                className="h-full"
                                style={{ background: 'var(--ww-accent)' }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Feedback */}
            <div className="ww-surface ww-surface--soft p-6 rounded-3xl">
                <h3 className="text-xs font-black uppercase tracking-widest ww-ink mb-3">
                    详细反馈
                </h3>
                <p className="text-sm ww-ink leading-relaxed">
                    {assessmentResult?.feedback_text}
                </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={resetToSelection}
                    className="py-4 rounded-2xl ww-btn ww-btn--ink text-[10px]"
                >
                    再来一题
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onClose?.()}
                    className="py-4 rounded-2xl ww-btn ww-btn--accent text-[10px]"
                >
                    完成
                </motion.button>
            </div>
        </motion.div>
    );

    const renderHistory = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 pb-20"
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black ww-ink">做题记录</h2>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        setViewState('selection');
                        setSelectedHistoryItem(null);
                    }}
                    className="ww-btn ww-btn--ink px-3 py-2 rounded-2xl"
                >
                    <ArrowLeft size={20} />
                </motion.button>
            </div>

            {assessmentHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                    <History size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">还没有做题记录</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {assessmentHistory.map((assessment) => (
                        <motion.button
                            key={assessment.id}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => setSelectedHistoryItem(assessment)}
                            className="w-full p-4 rounded-[22px] border-2 text-left"
                            style={{ borderColor: 'rgba(43,23,63,0.22)', background: 'rgba(255,255,255,0.22)', boxShadow: '0 10px 18px rgba(0,0,0,0.10)' }}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <p className="text-sm font-black ww-ink mb-2">
                                        {assessment.question?.question_text || '题目已删除'}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs ww-muted">
                                        <span className="px-2 py-1 rounded-xl border-2" style={{ borderColor: 'rgba(43,23,63,0.18)', background: 'rgba(255,255,255,0.18)' }}>
                                            {assessment.question?.difficulty}
                                        </span>
                                        <span className="px-2 py-1 rounded-xl border-2" style={{ borderColor: 'rgba(43,23,63,0.18)', background: 'rgba(255,255,255,0.18)' }}>
                                            {new Date(assessment.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black ww-ink">
                                        {assessment.total_score}
                                    </p>
                                    <p className="text-xs ww-muted font-black">分</p>
                                </div>
                            </div>
                        </motion.button>
                    ))}
                </div>
            )}

            {/* History Detail Modal */}
            <AnimatePresence>
                {selectedHistoryItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setSelectedHistoryItem(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                            className="ww-surface ww-surface--soft rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
                        >
                            <div className="text-center mb-6">
                                <p className="text-4xl font-black ww-ink mb-2">
                                    {selectedHistoryItem.total_score}
                                </p>
                                <p className="text-sm ww-muted font-black">
                                    {new Date(selectedHistoryItem.created_at).toLocaleString()}
                                </p>
                            </div>

                            <div className="space-y-3 mb-6">
                                {[
                                    { label: '发音', score: selectedHistoryItem.pronunciation_score },
                                    { label: '流畅度', score: selectedHistoryItem.fluency_score },
                                    { label: '词汇', score: selectedHistoryItem.vocabulary_score },
                                    { label: '内容', score: selectedHistoryItem.content_score },
                                    { label: '切题', score: selectedHistoryItem.on_topic_score },
                                ].map((item, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <span className="text-sm ww-muted font-black">
                                            {item.label}
                                        </span>
                                        <span className="text-lg font-black ww-ink">
                                            {item.score}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 rounded-2xl mb-6" style={{ background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(43,23,63,0.18)' }}>
                                <p className="text-xs font-black ww-muted mb-2">反馈</p>
                                <p className="text-sm ww-ink">
                                    {selectedHistoryItem.feedback_text}
                                </p>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedHistoryItem(null)}
                                className="w-full py-3 rounded-2xl ww-btn ww-btn--accent text-[10px]"
                            >
                                关闭
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );

    return (
        <div className="h-full flex flex-col">
            <AnimatePresence mode="wait">
                {viewState === 'selection' && <div key="selection">{renderSelection()}</div>}
                {viewState === 'recording' && <div key="recording">{renderRecording()}</div>}
                {viewState === 'evaluating' && <div key="evaluating">{renderEvaluating()}</div>}
                {viewState === 'result' && <div key="result">{renderResult()}</div>}
                {viewState === 'history' && <div key="history">{renderHistory()}</div>}
            </AnimatePresence>

            <XPNotification
                amount={expAwarded}
                gold={goldAwarded}
                isVisible={showXPNotification}
                onClose={() => setShowXPNotification(false)}
            />
        </div>
    );
};

export default SpeakingAssessment;
