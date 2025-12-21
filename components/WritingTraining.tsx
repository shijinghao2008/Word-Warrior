
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { WritingMaterial } from '../types';
import { writingService } from '../services/writingService';
import WritingList from './writing/WritingList';
import WritingWorkspace from './writing/WritingWorkspace';
import { PenTool, Loader } from 'lucide-react';

interface WritingTrainingProps {
  onSuccess: (exp: number) => void;
}

const WritingTraining: React.FC<WritingTrainingProps> = ({ onSuccess }) => {
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
  };

  const handleBack = () => {
    setSelectedMaterial(null);
    setMode('list');
    // Refresh completed status on back?
    fetchData();
  };

  const handleComplete = (xp: number) => {
    if (xp > 0) {
      onSuccess(xp);
      // Optimistically update completed set
      if (selectedMaterial) {
        setCompletedIds(prev => new Set(prev).add(selectedMaterial.id));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-500">
        <Loader className="w-10 h-10 animate-spin mb-4 text-fuchsia-500" />
        <p>Loading topics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 h-full">
      {/* Use h-full to ensure workspace expands */}
      {mode === 'list' ? (
        <>
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-fuchsia-500/10 rounded-xl">
                <PenTool className="w-6 h-6 text-fuchsia-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold dark:text-white text-slate-900">Writing Center</h2>
                <p className="text-gray-400 text-sm">Choose a topic and improve your writing skills</p>
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

