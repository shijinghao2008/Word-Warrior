
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ListeningMaterial } from '../types';
import { listeningService } from '../services/listeningService';
import ListeningList from './listening/ListeningList';
import ListeningReader from './listening/ListeningReader';
import { Headphones, Loader } from 'lucide-react';
import XPNotification from './ui/XPNotification';

interface ListeningTrainingProps {
  onSuccess: (exp: number, gold?: number) => void;
  onToggleStatusBar?: (hidden: boolean) => void;
}

const ListeningTraining: React.FC<ListeningTrainingProps> = ({ onSuccess, onToggleStatusBar }) => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<ListeningMaterial[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [selectedMaterial, setSelectedMaterial] = useState<ListeningMaterial | null>(null);
  const [mode, setMode] = useState<'list' | 'read'>('list');
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [showXPNotification, setShowXPNotification] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [goldEarned, setGoldEarned] = useState(0);

  useEffect(() => {
    fetchMaterials();
  }, [user]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const [data, completedList] = await Promise.all([
        listeningService.getListeningMaterials(),
        user ? listeningService.getUserCompletedListening(user.id) : Promise.resolve([])
      ]);
      setMaterials(data);
      setCompletedIds(new Set(completedList));
    } catch (err) {
      console.error(err);
      setError('Failed to load listening materials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMaterial = (material: ListeningMaterial) => {
    setSelectedMaterial(material);
    setMode('read');
    onToggleStatusBar?.(true);
  };

  const handleBackToList = () => {
    setSelectedMaterial(null);
    setMode('list');
    onToggleStatusBar?.(false);
    fetchMaterials(); // Refresh status
  };

  const handleComplete = async (score: number) => {
    if (!selectedMaterial || !user) return;

    try {
      const result = await listeningService.completeListening(user.id, selectedMaterial.id, score);

      if (result.success) {
        if (result.xpAwarded > 0) {
          setXpEarned(result.xpAwarded);
          setGoldEarned(result.goldAwarded || 0);
          setShowXPNotification(true);
          onSuccess(result.xpAwarded, result.goldAwarded);
        }
        // Update local state to reflect completion immediately
        setCompletedIds(prev => new Set(prev).add(selectedMaterial.id));

        // Show alert for feedback (temporary UI)
        // Assuming Reader component handles visual feedback, this might just be a notification
        // Actually the Reader shows green 'Completed'.
        // We can maybe wait a bit or just stay on the page.
        // Based on ReadingReader, we might just stay or let user click back.
        // The user instruction: "在提交之后...显示题目对错...“查看原文”按钮变得可操作"
        // It doesn't say auto-exit. So we just stay on Reader.
        // But we should call the service api to save progress. (Done above)

        // alert(result.message); // Maybe too intrusive? Let's rely on UI feedback in Reader or toast if available.
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error completing listening:', error);
      alert('Failed to save progress. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <Loader className="w-10 h-10 animate-spin mb-4" style={{ color: 'var(--ww-accent)' }} />
        <p className="text-white/80 font-black uppercase tracking-widest text-xs">加载听力材料...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="ww-surface ww-surface--soft rounded-[22px] p-6 text-center">
          <p className="ww-ink font-black">{error}</p>
          <button
            onClick={fetchMaterials}
            className="mt-5 px-6 py-3 ww-btn ww-btn--accent rounded-2xl text-[10px]"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {mode === 'list' && (
        <>
          <div className="mb-4">
            <div className="ww-surface ww-surface--soft rounded-[22px] p-4 flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(252,203,89,0.95)',
                  border: '3px solid var(--ww-stroke)',
                  boxShadow: '0 6px 0 rgba(0,0,0,0.18)',
                }}
              >
                <Headphones className="w-6 h-6 text-black" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[14px] font-black ww-ink uppercase tracking-widest">听力磨炼</h2>
                <p className="text-[10px] font-black ww-muted uppercase tracking-[0.18em]">选择材料 → 听音作答 → 领取 EXP</p>
              </div>
            </div>
          </div>
          <ListeningList
            materials={materials}
            onSelect={handleSelectMaterial}
            completedIds={completedIds}
          />
        </>
      )}

      {mode === 'read' && selectedMaterial && (
        <ListeningReader
          material={selectedMaterial}
          onBack={handleBackToList}
          onComplete={handleComplete}
        />
      )}

      <XPNotification
        amount={xpEarned}
        gold={goldEarned}
        isVisible={showXPNotification}
        onClose={() => setShowXPNotification(false)}
      />
    </div>
  );
};

export default ListeningTraining;
