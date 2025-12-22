import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

export type ThemeColor = 'indigo' | 'blue' | 'cyan' | 'teal' | 'emerald' | 'green' | 'lime' | 'amber' | 'orange' | 'red' | 'fuchsia' | 'violet' | 'purple' | 'pink' | 'rose';

export const THEME_COLORS: { id: ThemeColor; name: string; class: string; hex: string }[] = [
    { id: 'indigo', name: '靛蓝 (Indigo)', class: 'text-indigo-600', hex: '#4f46e5' },
    { id: 'blue', name: '湛蓝 (Blue)', class: 'text-blue-600', hex: '#2563eb' },
    { id: 'cyan', name: '青色 (Cyan)', class: 'text-cyan-600', hex: '#0891b2' },
    { id: 'teal', name: '水鸭青 (Teal)', class: 'text-teal-600', hex: '#0d9488' },
    { id: 'emerald', name: '祖母绿 (Emerald)', class: 'text-emerald-600', hex: '#059669' },
    { id: 'lime', name: '青柠 (Lime)', class: 'text-lime-600', hex: '#65a30d' },
    { id: 'amber', name: '琥珀 (Amber)', class: 'text-amber-600', hex: '#d97706' },
    { id: 'orange', name: '橙黄 (Orange)', class: 'text-orange-600', hex: '#ea580c' },
    { id: 'red', name: '赤红 (Red)', class: 'text-red-600', hex: '#dc2626' },
    { id: 'rose', name: '玫瑰红 (Rose)', class: 'text-rose-600', hex: '#e11d48' },
    { id: 'pink', name: '粉红 (Pink)', class: 'text-pink-600', hex: '#db2777' },
    { id: 'fuchsia', name: '玫红 (Fuchsia)', class: 'text-fuchsia-600', hex: '#c026d3' },
    { id: 'purple', name: '紫色 (Purple)', class: 'text-purple-600', hex: '#9333ea' },
    { id: 'violet', name: '紫罗兰 (Violet)', class: 'text-violet-600', hex: '#7c3aed' },
];

interface ThemeContextType {
    themeMode: 'light' | 'dark' | 'system';
    setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
    isDarkMode: boolean;
    toggleTheme: () => void;
    primaryColor: ThemeColor;
    setPrimaryColor: (color: ThemeColor) => void;
    avatar: string;
    setAvatar: (avatar: string) => void;
    grade: number;
    setGrade: (grade: number) => void;
    getColorClass: (type: 'text' | 'bg' | 'border' | 'from' | 'to' | 'shadow', shade?: number) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Attempt to access auth context safely (in case ThemeProvider is used outside AuthProvider, though not in this app)
    let user: any = null;
    try {
        const auth = useAuth();
        user = auth.user;
    } catch (e) {
        // Ignore error if AuthProvider is missing
    }

    // Support 'system' mode, defaulting to 'system' effectively
    const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('light');

    // Track actual visual state
    const [isDarkMode, setIsDarkMode] = useState(false);

    const [primaryColor, setPrimaryColor] = useState<ThemeColor>(() => {
        return (localStorage.getItem('ww_theme_color') as ThemeColor) || 'indigo';
    });

    const [avatar, setAvatar] = useState<string>(() => {
        return localStorage.getItem('ww_user_avatar') || '🧙‍♂️';
    });

    const [grade, setGrade] = useState<number>(() => {
        const saved = localStorage.getItem('ww_user_grade');
        return saved ? parseInt(saved) : 1;
    });

    // Sync from Cloud (Pull)
    useEffect(() => {
        if (!user) return;

        const syncSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('user_settings')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (data) {
                    // Update local state if different
                    if (data.theme_mode && ['light', 'dark', 'system'].includes(data.theme_mode)) {
                        setThemeMode(data.theme_mode as any);
                    }
                    if (data.theme_color) {
                        setPrimaryColor(data.theme_color as ThemeColor);
                    }
                } else if (error && error.code === 'PGRST116') {
                    // No settings found, create default with current local settings
                    await supabase
                        .from('user_settings')
                        .insert({
                            user_id: user.id,
                            theme_mode: themeMode,
                            theme_color: primaryColor,
                        });
                }
            } catch (err) {
                console.error('Error syncing user settings:', err);
            }
        };

        syncSettings();
    }, [user?.id]); // Only re-run if user changes

    // Sync to Cloud (Push)
    // Use a ref to skip the initial effect run if needed, but since we want to sync changes, 
    // and the "Pull" updates state which triggers this "Push", it just ensures consistency.
    useEffect(() => {
        if (!user) return;

        const pushSettings = async () => {
            try {
                const { error } = await supabase
                    .from('user_settings')
                    .upsert({
                        user_id: user.id,
                        theme_mode: themeMode,
                        theme_color: primaryColor,
                        updated_at: new Date().toISOString()
                    });

                if (error) throw error;
            } catch (err) {
                console.error('Error saving user settings:', err);
            }
        };

        // Debounce could be added here if rapid changes are expected
        pushSettings();

    }, [themeMode, primaryColor, user?.id]);

    useEffect(() => {
        localStorage.setItem('ww_theme_mode', themeMode);
        const root = document.documentElement;

        const applyTheme = (isDark: boolean) => {
            setIsDarkMode(false);
            root.classList.add('light');
            root.classList.remove('dark');
        };

        if (themeMode === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            applyTheme(mediaQuery.matches);

            const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        } else {
            applyTheme(themeMode === 'dark');
        }
    }, [themeMode]);

    useEffect(() => {
        localStorage.setItem('ww_theme_color', primaryColor);
    }, [primaryColor]);

    useEffect(() => {
        localStorage.setItem('ww_user_avatar', avatar);
    }, [avatar]);

    useEffect(() => {
        localStorage.setItem('ww_user_grade', grade.toString());
    }, [grade]);

    const toggleTheme = () => {
        setThemeMode(prev => {
            if (prev === 'system') {
                // If currently system, toggle based on what the system CURRENTLY is
                const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                return isSystemDark ? 'light' : 'dark';
            }
            return prev === 'dark' ? 'light' : 'dark';
        });
    };

    const getColorClass = (type: string, shade: number = 500) => {
        return `${type}-${primaryColor}-${shade}`;
    };

    return (
        <ThemeContext.Provider value={{
            themeMode,
            setThemeMode,
            isDarkMode,
            toggleTheme,
            primaryColor,
            setPrimaryColor,
            avatar,
            setAvatar,
            grade,
            setGrade,
            getColorClass
        }}>
            {children}
        </ThemeContext.Provider>
    );
};
