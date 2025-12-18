
import React, { useState } from 'react';
import { PenTool, Send, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { gradeWriting } from '../services/geminiService';

interface WritingTrainingProps {
  onSuccess: (exp: number) => void;
}

const WritingTraining: React.FC<WritingTrainingProps> = ({ onSuccess }) => {
  const [content, setContent] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [topic] = useState("Some people believe that technology has made our lives more complex rather than simpler. To what extent do you agree or disagree?");

  const handleSubmit = async () => {
    if (!content || content.trim().split(/\s+/).length < 20) {
      alert("请至少输入 20 个英文单词以进行有效评分。");
      return;
    }
    setIsGrading(true);
    setFeedback(null);
    try {
      const result = await gradeWriting(topic, content);
      setFeedback(result);
      if (result.score >= 60) {
        onSuccess(Math.floor(result.score / 2));
      }
    } catch (e) {
      console.error("Grading failed", e);
      alert("大贤者断开连接，请重试。");
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <h3 className="text-xl font-black rpg-font flex items-center gap-3 text-fuchsia-600 dark:text-fuchsia-400">
        <PenTool size={24} /> 写作磨炼 (English Writing)
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 p-8 rounded-[2rem] space-y-6 shadow-xl">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-500/50">雅思/托福 模拟命题</span>
              <p className="text-xl font-bold leading-snug dark:text-white text-slate-900">{topic}</p>
            </div>
            
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your response in English... (Target: 150-250 words)"
              className="w-full h-80 dark:bg-slate-950 bg-slate-50 border-2 dark:border-slate-800 border-slate-200 rounded-2xl p-6 focus:border-fuchsia-500 dark:focus:border-fuchsia-400 outline-none transition-all resize-none font-medium leading-relaxed dark:text-white text-slate-800"
            />

            <button 
              disabled={isGrading || !content}
              onClick={handleSubmit}
              className="w-full py-4 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 rounded-2xl font-black tracking-widest uppercase flex items-center justify-center gap-3 transition-all text-white shadow-lg shadow-fuchsia-500/20"
            >
              {isGrading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Send size={18} />
              )}
              {isGrading ? '大贤者批阅中 (Grading...)' : '提交英文作文'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="dark:bg-slate-900/50 bg-white/50 border dark:border-slate-800 border-slate-200 p-8 rounded-[2rem] h-full flex flex-col shadow-inner backdrop-blur-sm">
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
              <Sparkles size={16} /> AI 批改报告
            </h4>
            
            {feedback ? (
              <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">综合得分 (Score)</span>
                   <span className={`text-4xl font-black rpg-font ${feedback.score >= 80 ? 'text-green-500' : 'text-amber-500'}`}>{feedback.score}</span>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-bold text-fuchsia-500 dark:text-fuchsia-400">大贤者寄语：</p>
                  <p className="text-sm dark:text-slate-300 text-slate-600 leading-relaxed italic">"{feedback.feedback}"</p>
                </div>

                {feedback.corrections && feedback.corrections.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">改进建议 (Suggestions)</p>
                    <ul className="space-y-3">
                      {feedback.corrections.map((c: string, i: number) => (
                        <li key={i} className="text-xs dark:bg-slate-800/50 bg-slate-100 p-4 rounded-xl border-l-4 border-fuchsia-500 leading-relaxed dark:text-slate-300 text-slate-700">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                <PenTool size={48} className="mb-4 text-slate-400" />
                <p className="text-xs font-bold leading-loose tracking-wider uppercase text-slate-500">
                  请用英文进行写作<br/>获取 AI 深度纠错与分数预估
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WritingTraining;
