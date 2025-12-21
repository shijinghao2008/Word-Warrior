
import React, { useState, useEffect } from 'react';
import { ListeningMaterial } from '../../types';
import { listeningService } from '../../services/listeningService';
import ListeningEditor from './ListeningEditor';
import { Plus, Trash2, Edit2, Headphones, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ListeningManager: React.FC = () => {
    // View State
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [materials, setMaterials] = useState<ListeningMaterial[]>([]);
    const [selectedMaterial, setSelectedMaterial] = useState<ListeningMaterial | undefined>(undefined);

    // UI State
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null); // ID to delete for modal

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            setLoading(true);
            const data = await listeningService.getListeningMaterials(true); // Fetch ALL materials for admin
            setMaterials(data);
        } catch (error) {
            console.error('Failed to fetch materials:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedMaterial(undefined);
        setView('editor');
    };

    const handleEdit = (material: ListeningMaterial) => {
        setSelectedMaterial(material);
        setView('editor');
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;

        const material = materials.find(m => m.id === deleteId);
        if (!material) return;

        try {
            await listeningService.deleteListeningMaterial(deleteId, material.audio_url);
            fetchMaterials(); // Refresh list
        } catch (error) {
            console.error('Failed to delete material:', error);
            alert('Failed to delete material');
        } finally {
            setDeleteId(null);
        }
    };

    const handleSave = () => {
        setView('list');
        fetchMaterials();
    };

    if (view === 'editor') {
        return (
            <ListeningEditor
                material={selectedMaterial}
                onSave={handleSave}
                onCancel={() => setView('list')}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Headphones size={20} className="text-indigo-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase text-slate-700 dark:text-slate-200">Listening Materials</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{materials.length} Sets Available</p>
                    </div>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/30"
                >
                    <Plus size={16} /> New Set
                </button>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
                ) : materials.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <Headphones size={32} className="mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-bold">No listening materials found.</p>
                        <p className="text-xs mt-1 opacity-70">create a new set to get started.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <th className="px-6 py-4">Title</th>
                                <th className="px-6 py-4">Level</th>
                                <th className="px-6 py-4">Questions</th>
                                <th className="px-6 py-4">Audio</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {materials.map(m => (
                                <tr key={m.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{m.title}</div>
                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[200px]">{m.id}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${m.level === 'Primary' ? 'bg-green-500/10 text-green-500' :
                                            m.level === 'Middle' ? 'bg-amber-500/10 text-amber-500' :
                                                'bg-red-500/10 text-red-500'
                                            }`}>
                                            {m.level || 'Primary'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-bold text-slate-500">{m.questions?.length || 0} Questions</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {m.audio_url ? (
                                            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded-md">Present</span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Missing</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(m)}
                                                className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(m.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800"
                        >
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 mx-auto">
                                <AlertTriangle className="text-red-500" size={24} />
                            </div>

                            <h3 className="text-lg font-bold text-center text-slate-800 dark:text-white mb-2">Delete Confirmation</h3>

                            <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">
                                你确认要删除“{materials.find(m => m.id === deleteId)?.title}”听力吗？
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ListeningManager;
