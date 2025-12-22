import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sword, Scroll, Skull, Trophy, Handshake, Calendar, Loader2 } from 'lucide-react';
import { PixelCard } from './ui/PixelComponents';
import { getMatchHistory, MatchHistoryItem } from '../services/pvpService';

interface MatchHistoryProps {
    userId: string;
}

const MatchHistory: React.FC<MatchHistoryProps> = ({ userId }) => {
    const [history, setHistory] = useState<MatchHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            const data = await getMatchHistory(userId);
            setHistory(data);
            setLoading(false);
        };
        fetchHistory();
    }, [userId]);

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="animate-spin text-indigo-500" size={24} />
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="text-center py-8 opacity-50">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">NO BATTLE RECORDS FOUND</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 pl-2 border-l-4 border-indigo-500">
                Battle History
            </h3>

            <div className="max-h-[400px] overflow-y-auto px-1 space-y-2 custom-scrollbar">
                {history.map((match, idx) => (
                    <motion.div
                        key={match.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                    >
                        <PixelCard noBorder variant="dark" className={`p-3 border-l-4 ${match.result === 'win' ? 'border-l-emerald-500 bg-emerald-500/5' :
                            match.result === 'loss' ? 'border-l-red-500 bg-red-500/5' :
                                'border-l-slate-500'
                            } flex items-center justify-between group hover:bg-white/5 transition-colors`}>

                            {/* Left: Mode & Result */}
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 flex items-center justify-center border-2 border-black shadow-[2px_2px_0_0_#000] ${match.result === 'win' ? 'bg-emerald-500' :
                                    match.result === 'loss' ? 'bg-red-500' :
                                        'bg-slate-600'
                                    }`}>
                                    {match.result === 'win' ? <Trophy size={18} className="text-white" /> :
                                        match.result === 'loss' ? <Skull size={18} className="text-white" /> :
                                            <Handshake size={18} className="text-white" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-xs font-black uppercase tracking-wider ${match.result === 'win' ? 'text-emerald-400' :
                                        match.result === 'loss' ? 'text-red-400' :
                                            'text-slate-400'
                                        }`}>
                                        {match.result === 'win' ? 'VICTORY' : match.result === 'loss' ? 'DEFEAT' : 'DRAW'}
                                    </span>
                                    {match.isResignation && (
                                        <span className="text-[8px] text-amber-500 font-bold uppercase tracking-tight -mt-0.5">
                                            {match.result === 'win' ? '(OPP. RESIGNED)' : '(RESIGNED)'}
                                        </span>
                                    )}
                                    <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold uppercase">
                                        {match.mode === 'blitz' ? <Sword size={10} /> : <Scroll size={10} />}
                                        {match.mode === 'blitz' ? 'Blitz' : 'Tactics'}
                                    </div>
                                </div>
                            </div>

                            {/* Middle: Score */}
                            <div className="flex flex-col items-center">
                                <span className="text-lg font-black italic text-slate-200">{match.score}</span>
                            </div>

                            {/* Right: Opponent & Time */}
                            <div className="flex flex-col items-end text-right">
                                <span className="text-xs font-bold text-slate-300 max-w-[100px] truncate">
                                    VS {match.opponentName}
                                </span>
                                <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                                    {tryFormatTime(match.createdAt)}
                                </span>
                            </div>
                        </PixelCard>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

const tryFormatTime = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return `${Math.floor(diffInSeconds / 86400)} days ago`;
    } catch (e) {
        return 'Unknown';
    }
};

export default MatchHistory;
