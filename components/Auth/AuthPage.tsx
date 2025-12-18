
import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const AuthPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const { signIn, signUp } = useAuth();

    const handleLogin = async (email: string, password: string) => {
        await signIn(email, password);
    };

    const handleRegister = async (email: string, password: string, username: string) => {
        await signUp(email, password, username);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 dark:from-slate-950 dark:via-indigo-950 dark:to-purple-950">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
            </div>

            {/* Auth Form Container */}
            <div className="relative z-10">
                <AnimatePresence mode="wait">
                    {isLogin ? (
                        <LoginForm
                            key="login"
                            onSubmit={handleLogin}
                            onSwitchToRegister={() => setIsLogin(false)}
                        />
                    ) : (
                        <RegisterForm
                            key="register"
                            onSubmit={handleRegister}
                            onSwitchToLogin={() => setIsLogin(true)}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AuthPage;
