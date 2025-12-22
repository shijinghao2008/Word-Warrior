import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sword, Scroll, Skull, Trophy, Handshake, Calendar, Loader2 } from 'lucide-react';
// import { PixelCard } from './ui/PixelComponents';
import { getMatchHistory, MatchHistoryItem } from '../services/pvpService';

interface MatchHistoryProps {
    userId: string;
}

const MatchHistory: React.FC<MatchHistoryProps> = ({ userId }) => {
    const [history, setHistory] = useState<MatchHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        // Initial load
        loadHistory(0);
    }, [userId]);

    const loadHistory = async (pageNum: number) => {
        if (pageNum === 0) setLoading(true);
        else setLoadingMore(true);

        const { items, hasMore: moreAvailable } = await getMatchHistory(userId, pageNum);

        if (pageNum === 0) {
            setHistory(items);
        } else {
            setHistory(prev => [...prev, ...items]);
        }

        setHasMore(moreAvailable);
        setPage(pageNum);

        if (pageNum === 0) setLoading(false);
        else setLoadingMore(false);
    };

    const handleLoadMore = () => {
        loadHistory(page + 1);
    };

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
                        <div className={`p-3 relative rounded-xl border border-slate-700/50 ${match.result === 'win' ? 'border-l-4 border-l-emerald-500 bg-emerald-500/5' :
                            match.result === 'loss' ? 'border-l-4 border-l-red-500 bg-red-500/5' :
                                'border-l-4 border-l-slate-500 bg-slate-800/30'
                            } flex items-center justify-between group hover:bg-white/5 transition-colors`}>

                            {/* Left: Mode & Result */}
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 flex items-center justify-center rounded-lg shadow-sm ${match.result === 'win' ? 'bg-emerald-500/20 text-emerald-500' :
                                    match.result === 'loss' ? 'bg-red-500/20 text-red-500' :
                                        'bg-slate-700 text-slate-400'
                                    }`}>
                                    {match.result === 'win' ? <Trophy size={18} /> :
                                        match.result === 'loss' ? <Skull size={18} /> :
                                            <Handshake size={18} />}
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
                                <div className="flex flex-col items-center mt-1">
                                    {match.scoreChange !== undefined && (
                                        <span className={`text-[10px] font-bold ${match.scoreChange > 0 || (match.scoreChange === 0 && match.result !== 'loss') ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {match.scoreChange > 0 ? '+' : (match.scoreChange === 0 && match.result === 'loss' ? '-' : (match.scoreChange === 0 ? '+' : ''))}{Math.abs(match.scoreChange)} Pts
                                        </span>
                                    )}
                                    {match.startRankPoints !== undefined && (
                                        <span className="text-[9px] text-slate-500 font-mono">
                                            Start: {match.startRankPoints}
                                        </span>
                                    )}
                                </div>
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
                        </div>
                    </motion.div>
                ))}

                {/* Load More Button */}
                {hasMore && (
                    <div className="pt-2 pb-4 flex justify-center">
                        <button
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-indigo-500 transition-colors flex items-center gap-2"
                        >
                            {loadingMore ? (
                                <>
                                    <Loader2 size={12} className="animate-spin" /> LOADING...
                                </>
                            ) : (
                                <>
                                    LOAD MORE <Calendar size={12} />
                                </>
                            )}
                        </button>
                    </div>
                )}
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
