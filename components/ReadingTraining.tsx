
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle2, AlertCircle, RefreshCcw, Send, Bot, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getExplanation, generateQuiz, askFollowUp } from '../services/geminiService';
import { MOCK_QUESTIONS } from '../constants.tsx';

interface ReadingTrainingProps {
  onSuccess: (exp: number) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const ReadingTraining: React.FC<ReadingTrainingProps> = ({ onSuccess }) => {
  const [currentQ, setCurrentQ] = useState(MOCK_QUESTIONS[0]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Chatbot states
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const fetchNewQuestion = async () => {
    setIsLoading(true);
    setFeedback(null);
    setSelectedOption(null);
    setSubmitted(false);
    setChatHistory([]);
    try {
      const newQ = await generateQuiz('Reading Comprehension');
      setCurrentQ({ ...newQ, id: Date.now().toString(), type: 'reading' });
    } catch (e) {
      console.error("Failed to generate question", e);
      alert("卷轴获取失败，请重试。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOption || submitted) return;
    setSubmitted(true);
    
    if (selectedOption === currentQ.correctAnswer) {
      setFeedback('**洞察正确！** 你已洞悉文章真谛。经验 +15, 语法防御 (DEF) 提升。');
      onSuccess(15);
    } else {
      setIsLoading(true);
      try {
        const explanation = await getExplanation(currentQ.prompt, selectedOption, currentQ.correctAnswer!);
        setFeedback(explanation);
      } catch (err) {
        setFeedback("无法获取解析，请检查网络。");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAskChatbot = async () => {
    if (!chatInput.trim() || isAsking) return;
    
    const userMsg = chatInput.trim();
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setIsAsking(true);

    try {
      const context = `Passage/Question: ${currentQ.prompt}\nCorrect Answer: ${currentQ.correctAnswer}`;
      const reply = await askFollowUp(context, userMsg);
      setChatHistory(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: '抱歉，大贤者暂时无法回答。' }]);
    } finally {
      setIsAsking(false);
    }
  };

  const passage = currentQ.prompt.includes('[Passage]') 
    ? currentQ.prompt.split('[Question]')[0].replace('[Passage]', '').trim() 
    : (currentQ.prompt.includes('[Question]') ? currentQ.prompt.split('[Question]')[0].trim() : currentQ.prompt);
  
  const questionText = currentQ.prompt.includes('[Question]') 
    ? currentQ.prompt.split('[Question]')[1].trim() 
    : '';

  const getOptionStyle = (opt: string) => {
    if (!submitted) {
      return selectedOption === opt 
        ? 'bg-indigo-600/10 border-indigo-500 text-indigo-700 dark:text-white dark:bg-indigo-600/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-slate-600 dark:hover:bg-slate-900 shadow-sm';
    }
    
    // After submission
    if (opt === currentQ.correctAnswer) {
      return 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]';
    }
    if (opt === selectedOption && opt !== currentQ.correctAnswer) {
      return 'bg-red-500/10 dark:bg-red-500/20 border-red-500 text-red-600 dark:text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]';
    }
    return 'bg-slate-50/50 dark:bg-slate-950/50 border-slate-200/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-500 opacity-60';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black rpg-font flex items-center gap-3 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          <BookOpen size={24} /> Reading Trial
        </h3>
        <button 
          onClick={fetchNewQuestion}
          disabled={isLoading}
          className="text-xs font-black text-slate-500 hover:text-indigo-600 dark:hover:text-white transition-all uppercase tracking-widest dark:bg-slate-900 bg-white px-5 py-2.5 rounded-full dark:border-slate-800 border-slate-200 shadow-sm"
        >
          <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} /> 获取新卷轴
        </button>
      </div>

      <div className="dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 p-8 lg:p-12 rounded-[3rem] space-y-10 relative overflow-hidden shadow-2xl">
        {isLoading && !feedback && (
          <div className="absolute inset-0 dark:bg-slate-950/80 bg-white/80 backdrop-blur-md z-20 flex items-center justify-center">
            <div className="flex flex-col items-center gap-6">
               <div className="animate-spin h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full" />
               <p className="text-xs font-black tracking-[0.3em] text-indigo-600 dark:text-indigo-500 uppercase animate-pulse">解析中古代密语 (Decoding Secrets)...</p>
            </div>
          </div>
        )}

        {/* Text Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500">Ancient Manuscript</span>
            <div className="h-px flex-1 dark:bg-slate-800 bg-slate-100" />
          </div>
          <div className="text-lg leading-relaxed dark:text-slate-300 text-slate-700 font-serif italic dark:bg-slate-950/50 bg-slate-50 p-8 rounded-3xl border dark:border-slate-800 border-slate-200/50 markdown-content shadow-inner">
            <ReactMarkdown>{passage}</ReactMarkdown>
          </div>
        </div>

        {/* Question Section */}
        {questionText && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600 dark:text-indigo-400">The Challenge</span>
              <div className="h-px flex-1 dark:bg-slate-800 bg-slate-100" />
            </div>
            <p className="text-xl font-bold dark:text-slate-100 text-slate-900 leading-snug">
              {questionText}
            </p>
          </div>
        )}

        {/* Options */}
        <div className="grid grid-cols-1 gap-4">
          {currentQ.options?.map((opt) => (
            <button
              key={opt}
              onClick={() => setSelectedOption(opt)}
              disabled={submitted}
              className={`p-6 text-left rounded-2xl border-2 transition-all group ${getOptionStyle(opt)}`}
            >
              <span className="font-bold group-hover:pl-2 transition-all">{opt}</span>
            </button>
          ))}
        </div>

        {!submitted && (
          <button 
            disabled={!selectedOption || isLoading}
            onClick={handleSubmit}
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 rounded-2xl font-black tracking-[0.2em] uppercase transition-all shadow-xl shadow-indigo-500/20 text-white transform active:scale-95"
          >
            揭晓你的意志 (Proclaim Insight)
          </button>
        )}

        {/* Feedback Area */}
        <AnimatePresence>
          {feedback && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-10 mt-12 pt-10 border-t dark:border-slate-800 border-slate-100"
            >
              <div className="flex items-start gap-6">
                <div className={`p-4 rounded-2xl ${selectedOption === currentQ.correctAnswer ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' : 'bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'}`}>
                   {selectedOption === currentQ.correctAnswer ? <CheckCircle2 size={32} /> : <Sparkles size={32} />}
                </div>
                <div className="flex-1 space-y-4">
                   <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">
                     {selectedOption === currentQ.correctAnswer ? 'Success Recognized' : 'Ancient Revelation'}
                   </h4>
                   <div className="dark:text-slate-300 text-slate-600 leading-relaxed markdown-content text-base font-medium">
                      <ReactMarkdown>{feedback}</ReactMarkdown>
                   </div>
                </div>
              </div>

              {/* Chatbot Section */}
              <div className="dark:bg-slate-950/50 bg-slate-50 border dark:border-slate-800 border-slate-200 rounded-[2.5rem] p-8 space-y-6 shadow-xl">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400/80 mb-2">
                  <Bot size={22} />
                  <span className="text-[11px] font-black uppercase tracking-widest">Seeker's Assistant</span>
                </div>

                <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-5 pr-3">
                  {chatHistory.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-6">Still confused? Ask the Oracle about the nuances of the text.</p>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-5 rounded-3xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-lg' : 'dark:bg-slate-800/80 bg-white border dark:border-transparent border-slate-200 text-slate-700 dark:text-slate-300 markdown-content'}`}>
                        {msg.role === 'assistant' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                      </div>
                    </div>
                  ))}
                  {isAsking && (
                    <div className="flex justify-start">
                      <div className="dark:bg-slate-800/50 bg-white p-5 rounded-3xl flex gap-1.5 shadow-sm">
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="flex gap-3 dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-full p-2 pl-6 shadow-lg">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAskChatbot()}
                    placeholder="Ask a follow-up question..."
                    className="flex-1 bg-transparent text-sm outline-none py-3 text-slate-700 dark:text-white"
                  />
                  <button 
                    onClick={handleAskChatbot}
                    disabled={!chatInput.trim() || isAsking}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 p-3.5 rounded-full text-white transition-all shadow-md active:scale-95"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ReadingTraining;
