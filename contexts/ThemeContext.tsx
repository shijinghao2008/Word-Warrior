import React, { createContext, useContext, useState, useEffect } from 'react';

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
    themeMode: 'light' | 'dark';
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
    // Default to Light mode as requested
    const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
        return (localStorage.getItem('ww_theme_mode') as 'light' | 'dark') || 'light';
    });

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

    useEffect(() => {
        localStorage.setItem('ww_theme_mode', themeMode);
        const root = document.documentElement;
        if (themeMode === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
        } else {
            root.classList.add('light');
            root.classList.remove('dark');
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
        setThemeMode(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const getColorClass = (type: string, shade: number = 500) => {
        return `${type}-${primaryColor}-${shade}`;
    };

    return (
        <ThemeContext.Provider value={{
            themeMode,
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
