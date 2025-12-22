import React from 'react';

// ==========================================
// UTILS
// ==========================================
const PIXEL_BORDERS = {
    outset: 'border-t-4 border-l-4 border-r-4 border-b-4 border-t-white/30 border-l-white/30 border-r-black/30 border-b-black/30',
    inset: 'border-t-4 border-l-4 border-r-4 border-b-4 border-t-black/30 border-l-black/30 border-r-white/30 border-b-white/30',
    flat: 'border-4 border-black',
};

// ==========================================
// PIXEL CARD
// ==========================================
interface PixelCardProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'dark' | 'paper';
    className?: string;
    noBorder?: boolean;
}

export const PixelCard: React.FC<PixelCardProps> = ({ children, variant = 'primary', className = '', noBorder = false }) => {
    const bgColors = {
        primary: 'bg-indigo-600',
        secondary: 'bg-slate-200 text-slate-900',
        dark: 'bg-slate-900',
        paper: 'bg-[#fefce8] text-slate-900' // Old paper look
    };

    const baseClass = `relative ${bgColors[variant]} ${className}`;

    // To create a true NES box:
    // We often use box-shadows or pseudo elements for the "missing corner" look
    // But for simple robust CSS, a thick border + internal inset works well for "blocks"

    if (noBorder) return <div className={baseClass}>{children}</div>;

    return (
        <div className={`${baseClass} border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]`}>
            {/* Optional Highlight/Lowlight for 3D Block effect */}
            {variant !== 'paper' && (
                <div className="absolute inset-0 border-t-4 border-l-4 border-white/20 pointer-events-none" />
            )}
            {children}
        </div>
    );
};

// ==========================================
// PIXEL BUTTON
// ==========================================
interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'danger' | 'success' | 'warning' | 'neutral';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
}

export const PixelButton: React.FC<PixelButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    className = '',
    disabled,
    ...props
}) => {
    const variants = {
        primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
        danger: 'bg-red-600 hover:bg-red-500 text-white',
        success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
        warning: 'bg-amber-500 hover:bg-amber-400 text-black',
        neutral: 'bg-slate-200 hover:bg-white text-black'
    };

    const sizes = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base'
    };

    return (
        <button
            disabled={disabled}
            className={`
        relative 
        font-bold 
        uppercase 
        tracking-widest 
        border-4 border-black 
        ${variants[variant]} 
        ${sizes[size]} 
        ${fullWidth ? 'w-full' : ''} 
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'active:translate-y-[4px] active:translate-x-[4px] active:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}
        transition-none
        ${className}
      `}
            {...props}
        >
            {/* Inner Bevel Highlight */}
            {!disabled && <div className="absolute inset-0 border-t-2 border-l-2 border-white/40 pointer-events-none" />}
            <div className="relative z-10 flex items-center justify-center gap-2">
                {children}
            </div>
        </button>
    );
};

// ==========================================
// PIXEL INPUT
// ==========================================
interface PixelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const PixelInput: React.FC<PixelInputProps> = ({ label, className = '', ...props }) => {
    return (
        <div className="space-y-1">
            {label && <label className="block text-xs font-black uppercase tracking-widest text-slate-500">{label}</label>}
            <div className="relative group">
                <input
                    className={`
            w-full 
            bg-[#000] 
            text-[#33ff00] 
            font-mono 
            border-4 border-slate-700 
            focus:border-indigo-500 
            px-4 py-3 
            outline-none 
            placeholder:text-slate-700
            shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.5)]
            transition-colors
            ${className}
          `}
                    {...props}
                />
                {/* Blinking cursor effect (simulated via CSS usually, here just styling) */}
            </div>
        </div>
    );
};

// ==========================================
// PIXEL PROGRESS BAR
// ==========================================
// ==========================================
// PIXEL PROGRESS BAR
// ==========================================
interface PixelProgressProps {
    value: number;
    max: number;
    color?: string;
    label?: string;
    showValue?: boolean;
    height?: string;
    className?: string;
}

export const PixelProgress: React.FC<PixelProgressProps> = ({ value, max, color = 'bg-indigo-500', label, showValue = true, height = 'h-6', className = '' }) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
        <div className={`w-full space-y-1 ${className}`}>
            {(label || showValue) && (
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {label && <span>{label}</span>}
                    {showValue && <span>{Math.floor(value)}/{max}</span>}
                </div>
            )}
            <div className={`${height} w-full bg-slate-900 border-4 border-black relative`}>
                <div
                    className={`h-full ${color} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                >
                    {/* Shine/Reflection on bar */}
                    <div className="w-full h-1/2 bg-white/20" />
                </div>
                {/* Grid lines for segments (optional) */}
                <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzjwqJA4FwTVgzUBhCE8PgBkGStE8/w46AAAAABJRU5ErkJggg==')] opacity-10 pointer-events-none" />
            </div>
        </div>
    );
};

// ==========================================
// PIXEL BADGE
// ==========================================
// ==========================================
// PIXEL BADGE
// ==========================================
interface PixelBadgeProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warning' | 'success' | 'neutral';
    className?: string;
}

export const PixelBadge: React.FC<PixelBadgeProps> = ({ children, variant = 'neutral', className = '' }) => {
    const variants = {
        primary: 'bg-indigo-600 text-white',
        secondary: 'bg-slate-700 text-white',
        outline: 'bg-transparent text-slate-500 border-slate-300',
        ghost: 'bg-transparent text-slate-500 border-transparent shadow-none',
        danger: 'bg-red-500 text-white',
        warning: 'bg-amber-400 text-black',
        success: 'bg-emerald-500 text-white',
        neutral: 'bg-slate-200 text-black'
    };

    return (
        <span className={`
        inline-flex items-center 
        px-2 py-0.5 
        text-[10px] font-bold 
        uppercase tracking-wider 
        border-2 border-black
        shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]
        ${variants[variant]}
        ${className}
    `}>
            {children}
        </span>
    );
};
