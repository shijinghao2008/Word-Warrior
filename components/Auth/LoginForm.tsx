
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, AlertCircle, Loader } from 'lucide-react';

interface LoginFormProps {
    onSubmit: (email: string, password: string) => Promise<void>;
    onSwitchToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, onSwitchToRegister }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('请填写所有字段');
            return;
        }

        setLoading(true);
        try {
            await onSubmit(email, password);
        } catch (err: any) {
            setError(err.message || '登录失败，请检查邮箱和密码');
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
                    <h2 className="text-2xl font-black ww-ink mb-2">欢迎回来</h2>
                    <p className="text-sm ww-muted">登录你的 Word Warrior 账号</p>
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
                                placeholder="••••••••"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 ww-btn ww-btn--accent flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader size={18} className="animate-spin" />
                                登录中...
                            </>
                        ) : (
                            '登录'
                        )}
                    </button>
                </form>

                {/* Switch to Register */}
                <div className="mt-6 text-center">
                    <p className="text-sm ww-muted">
                        还没有账号？{' '}
                        <button
                            onClick={onSwitchToRegister}
                            className="ww-link transition-colors"
                            disabled={loading}
                        >
                            立即注册
                        </button>
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default LoginForm;
