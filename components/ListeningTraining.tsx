
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ListeningMaterial } from '../types';
import { listeningService } from '../services/listeningService';
import ListeningList from './listening/ListeningList';
import ListeningReader from './listening/ListeningReader';
import { Headphones, Loader } from 'lucide-react';

interface ListeningTrainingProps {
  onSuccess: (exp: number) => void;
}

const ListeningTraining: React.FC<ListeningTrainingProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<ListeningMaterial[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [selectedMaterial, setSelectedMaterial] = useState<ListeningMaterial | null>(null);
  const [mode, setMode] = useState<'list' | 'read'>('list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  };

  const handleBackToList = () => {
    setSelectedMaterial(null);
    setMode('list');
    fetchMaterials(); // Refresh status
  };

  const handleComplete = async (score: number) => {
    if (!selectedMaterial || !user) return;

    try {
      const result = await listeningService.completeListening(user.id, selectedMaterial.id, score);

      if (result.success) {
        if (result.xpAwarded > 0) {
          onSuccess(result.xpAwarded);
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
      <div className="flex flex-col items-center justify-center p-20 text-gray-500">
        <Loader className="w-10 h-10 animate-spin mb-4 text-cyan-500" />
        <p>Tuning into frequency...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-12 text-red-400">
        <p>{error}</p>
        <button
          onClick={fetchMaterials}
          className="mt-4 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {mode === 'list' && (
        <>
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-cyan-500/10 rounded-xl">
                <Headphones className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Listening Training</h2>
                <p className="text-gray-400 text-sm">Tune your ears and improve your comprehension</p>
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
    </div>
  );
};

export default ListeningTraining;
