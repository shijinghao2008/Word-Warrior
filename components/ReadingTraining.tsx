import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ReadingMaterial } from '../types';
import { readingService } from '../services/readingService';
import ReadingList from './reading/ReadingList';
import ReadingReader from './reading/ReadingReader';

import { BookOpen, Loader } from 'lucide-react';

interface ReadingTrainingProps {
  onSuccess: (exp: number) => void;
}

const ReadingTraining: React.FC<ReadingTrainingProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<ReadingMaterial[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [selectedMaterial, setSelectedMaterial] = useState<ReadingMaterial | null>(null);
  const [mode, setMode] = useState<'list' | 'read'>('list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const [data, completedList] = await Promise.all([
        readingService.getReadingMaterials(),
        user ? readingService.getUserCompletedReadings(user.id) : Promise.resolve([])
      ]);
      setMaterials(data);
      setCompletedIds(new Set(completedList));
    } catch (err) {
      console.error(err);
      setError('Failed to load reading materials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMaterial = (material: ReadingMaterial) => {
    setSelectedMaterial(material);
    setMode('read');
  };



  const handleBackToList = () => {
    setSelectedMaterial(null);
    setMode('list');
  };

  const handleQuizComplete = async (score: number) => {
    if (!selectedMaterial || !user) return;

    try {
      const result = await readingService.completeReading(user.id, selectedMaterial.id, score);

      if (result.success) {
        if (result.xpAwarded > 0) {
          onSuccess(result.xpAwarded);
        }
        // Update local state to reflect completion immediately
        setCompletedIds(prev => new Set(prev).add(selectedMaterial.id));

        // Show alert for feedback (temporary UI)
        alert(result.message);
        // Return to list after successful completion
        handleBackToList();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error completing reading:', error);
      alert('Failed to save progress. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <Loader className="w-10 h-10 animate-spin mb-4" style={{ color: 'var(--ww-accent)' }} />
        <p className="text-white/80 font-black uppercase tracking-widest text-xs">加载阅读材料...</p>
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
                <BookOpen className="w-6 h-6 text-black" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[14px] font-black ww-ink uppercase tracking-widest">阅读试炼</h2>
                <p className="text-[10px] font-black ww-muted uppercase tracking-[0.18em]">阅读文章 → 回答问题 → 领取 EXP</p>
              </div>
            </div>
          </div>
          <ReadingList
            materials={materials}
            onSelect={handleSelectMaterial}
            completedIds={completedIds}
          />
        </>
      )}

      {mode === 'read' && selectedMaterial && (
        <ReadingReader
          material={selectedMaterial}
          onBack={handleBackToList}
          onComplete={handleQuizComplete}
        />
      )}
    </div>
  );
};

export default ReadingTraining;
