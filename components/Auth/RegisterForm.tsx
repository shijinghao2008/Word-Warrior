
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, AlertCircle, Loader, CheckCircle } from 'lucide-react';

interface RegisterFormProps {
    onSubmit: (email: string, password: string, username: string) => Promise<void>;
    onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSubmit, onSwitchToLogin }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!username || !email || !password || !confirmPassword) {
            setError('请填写所有字段');
            return;
        }

        if (username.length < 2) {
            setError('用户名至少需要 2 个字符');
            return;
        }

        if (password.length < 6) {
            setError('密码至少需要 6 个字符');
            return;
        }

        if (password !== confirmPassword) {
            setError('两次密码输入不一致');
            return;
        }

        setLoading(true);
        try {
            await onSubmit(email, password, username);
        } catch (err: any) {
            setError(err.message || '注册失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
        >
            <div className="ww-surface ww-surface--soft rounded-3xl p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 ww-surface rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl font-black ww-ink">W</span>
                    </div>
                    <h2 className="text-2xl font-black ww-ink mb-2">创建账号</h2>
                    <p className="text-sm ww-muted">加入 Word Warrior 开始学习之旅</p>
                </div>

                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3"
                    >
                        <AlertCircle size={20} className="text-red-500 shrink-0" />
                        <p className="text-sm text-red-500">{error}</p>
                    </motion.div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Username Input */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest dark:text-slate-400 text-slate-600 mb-2">
                            用户名
                        </label>
                        <div className="relative">
                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="ww-input pl-12 pr-4 py-3"
                                placeholder="战士名称"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Email Input */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest dark:text-slate-400 text-slate-600 mb-2">
                            邮箱
                        </label>
                        <div className="relative">
                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="ww-input pl-12 pr-4 py-3"
                                placeholder="your@email.com"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest dark:text-slate-400 text-slate-600 mb-2">
                            密码
                        </label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="ww-input pl-12 pr-4 py-3"
                                placeholder="至少 6 个字符"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Confirm Password Input */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest dark:text-slate-400 text-slate-600 mb-2">
                            确认密码
                        </label>
                        <div className="relative">
                            <CheckCircle size={18} className="absolute left-4 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400" />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="ww-input pl-12 pr-4 py-3"
                                placeholder="再次输入密码"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Register Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 ww-btn ww-btn--accent flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader size={18} className="animate-spin" />
                                注册中...
                            </>
                        ) : (
                            '注册'
                        )}
                    </button>
                </form>

                {/* Switch to Login */}
                <div className="mt-6 text-center">
                    <p className="text-sm ww-muted">
                        已有账号？{' '}
                        <button
                            onClick={onSwitchToLogin}
                            className="ww-link transition-colors"
                            disabled={loading}
                        >
                            立即登录
                        </button>
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default RegisterForm;
