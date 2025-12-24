
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { WritingMaterial } from '../types';
import { writingService } from '../services/writingService';
import WritingList from './writing/WritingList';
import WritingWorkspace from './writing/WritingWorkspace';
import { PenTool, Loader } from 'lucide-react';

interface WritingTrainingProps {
  onSuccess: (exp: number, gold?: number) => void;
  onToggleStatusBar?: (hidden: boolean) => void;
}

const WritingTraining: React.FC<WritingTrainingProps> = ({ onSuccess, onToggleStatusBar }) => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<WritingMaterial[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [selectedMaterial, setSelectedMaterial] = useState<WritingMaterial | null>(null);
  const [mode, setMode] = useState<'list' | 'write'>('list');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [mats, completed] = await Promise.all([
        writingService.getWritingMaterials(),
        writingService.getUserCompletedWritings(user.id)
      ]);
      setMaterials(mats);
      setCompletedIds(new Set(completed));
    } catch (e) {
      console.error('Failed to load writing data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (material: WritingMaterial) => {
    setSelectedMaterial(material);
    setMode('write');
    onToggleStatusBar?.(true);
  };

  const handleBack = () => {
    setSelectedMaterial(null);
    setMode('list');
    onToggleStatusBar?.(false);
    // Refresh completed status on back?
    fetchData();
  };

  const handleComplete = (xp: number, gold?: number) => {
    if (xp > 0) {
      onSuccess(xp, gold);
      // Optimistically update completed set
      if (selectedMaterial) {
        setCompletedIds(prev => new Set(prev).add(selectedMaterial.id));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <Loader className="w-10 h-10 animate-spin mb-4" style={{ color: 'var(--ww-accent)' }} />
        <p className="text-white/80 font-black uppercase tracking-widest text-xs">加载写作题目...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 h-full">
      {/* Use h-full to ensure workspace expands */}
      {mode === 'list' ? (
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
                <PenTool className="w-6 h-6 text-black" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[14px] font-black ww-ink uppercase tracking-widest">写作工坊</h2>
                <p className="text-[10px] font-black ww-muted uppercase tracking-[0.18em]">选择题目 → 写作提交 → 领取 EXP</p>
              </div>
            </div>
          </div>
          <WritingList
            materials={materials}
            onSelect={handleSelect}
            completedIds={completedIds}
          />
        </>
      ) : (
        selectedMaterial && (
          <WritingWorkspace
            material={selectedMaterial}
            onBack={handleBack}
            onComplete={handleComplete}
          />
        )
      )}
    </div>
  );
};

export default WritingTraining;

