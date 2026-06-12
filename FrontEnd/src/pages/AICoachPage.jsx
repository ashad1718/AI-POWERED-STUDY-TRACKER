import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Sparkles, AlertCircle, Bot, User, Trash2,
  Brain, HelpCircle, ArrowRight, BookOpen
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { geminiAPI } from '../services/geminiApi';
import { useGeminiAnalysis } from '../hooks/useGeminiAnalysis';
import AICoachCard from '../components/AICoachCard';
import GlassCard from '../components/GlassCard';

const AICoachPage = ({ user }) => {
  const containerRef = useRef(null);
  const chatEndRef = useRef(null);

  // Gemini Analysis Hook for left panel
  const {
    analyze,
    data: aiData,
    loading: aiLoading,
    error: aiError,
    hasAnalysed,
    cooldownRemaining,
  } = useGeminiAnalysis();

  // Chat State
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('ai_coach_messages');
    return saved ? JSON.parse(saved) : [
      {
        id: 'initial',
        sender: 'ai',
        text: `Hello ${user?.name || 'Scholar'}! 👋 I am your interactive AI Study Coach. I can analyze your study sessions and help you optimize your focus. Ask me anything, or try one of the quick suggestions below!`,
        timestamp: new Date().toISOString()
      }
    ];
  });
  const [inputText, setInputText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');

  // Persist messages
  useEffect(() => {
    localStorage.setItem('ai_coach_messages', JSON.stringify(messages));
  }, [messages]);

  // Trigger initial analysis if not already done
  useEffect(() => {
    if (!hasAnalysed) {
      analyze();
    }
  }, [hasAnalysed, analyze]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  // GSAP entrance animation
  useGSAP(() => {
    gsap.fromTo('.ai-coach-stagger',
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
    );
  }, { scope: containerRef });

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim() || chatLoading) return;

    if (!textToSend) setInputText('');
    setChatError('');

    // Add user message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const res = await geminiAPI.chat(text.trim());
      const replyText = res.data.data.response;

      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: replyText,
        timestamp: res.data.data.timestamp || new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setChatError(
        err.response?.data?.error?.message || 
        err.message || 
        'Could not get response from AI Coach. Please try again.'
      );
    } finally {
      setChatLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear your conversation history?')) {
      const initial = [
        {
          id: 'initial',
          sender: 'ai',
          text: `Hello ${user?.name || 'Scholar'}! 👋 I am your interactive AI Study Coach. I can analyze your study sessions and help you optimize your focus. Ask me anything, or try one of the quick suggestions below!`,
          timestamp: new Date().toISOString()
        }
      ];
      setMessages(initial);
      localStorage.setItem('ai_coach_messages', JSON.stringify(initial));
    }
  };

  const suggestions = [
    { label: '🎯 Which subject should I focus on?', query: 'Based on my logs, which subject should I focus on next and why?' },
    { label: '📈 Analyze my study consistency', query: 'Analyze my study consistency and tell me how I can improve my daily habit.' },
    { label: '🔥 Tips to prevent study burnout', query: 'Give me three practical tips to avoid study burnout based on my session history.' },
    { label: '📅 revision schedule help', query: 'Help me draft a simple weekly revision schedule for my active subjects.' }
  ];

  return (
    <div ref={containerRef} className="space-y-6 pb-12 text-white min-h-screen bg-[#11072F]">
      
      {/* Page Header */}
      <div className="ai-coach-stagger flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3 font-sans">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#7B4DFF] to-[#00D4C7] shadow-lg">
              <Brain className="w-4 h-4 text-[#11072F]" />
            </span>
            AI Coach <span className="text-[#00D4C7] font-mono">Advisor</span>
          </h1>
          <p className="text-sm text-white/60 mt-1.5 font-light font-sans">
            Get intelligent insights, syllabus focus recommendations, and chat directly with your cognitive coach.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Summary & Insights (takes 5 cols) */}
        <div className="lg:col-span-5 space-y-6 ai-coach-stagger">
          <div className="relative">
            <div className="absolute inset-0 bg-[#7B4DFF]/5 blur-3xl pointer-events-none rounded-2xl" />
            <AICoachCard
              data={aiData}
              loading={aiLoading}
              error={aiError}
              hasAnalysed={hasAnalysed}
              onAnalyze={analyze}
              hideFooterLink={true}
              cooldownRemaining={cooldownRemaining}
            />
          </div>
        </div>

        {/* Right Side: Interactive Chat (takes 7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-[680px] relative ai-coach-stagger">
          <div className="absolute inset-0 bg-[#00D4C7]/5 blur-3xl pointer-events-none rounded-2xl" />
          
          <GlassCard className="flex flex-col h-full border-white/10 bg-white/5 relative z-10 p-0 overflow-hidden" hoverEffect={false}>
            
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-[#11072F]/50">
              <div className="flex items-center space-x-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00D4C7] animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-white">Interactive Advisor</h3>
                  <p className="text-[10px] text-white/50 font-mono">Cognitive Chat Session</p>
                </div>
              </div>
              
              {messages.length > 1 && (
                <button
                  onClick={clearChat}
                  title="Clear chat history"
                  className="p-1.5 rounded-lg border border-white/10 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start gap-3.5 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      
                      {/* Avatar */}
                      <div className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center shrink-0 ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-tr from-[#7B4DFF] to-[#5B2EFF] text-white font-bold text-xs shadow-md border border-white/10'
                          : 'bg-gradient-to-tr from-[#00D4C7]/20 to-[#7B4DFF]/20 text-[#00D4C7] border border-[#00D4C7]/30'
                      }`}>
                        {msg.sender === 'user' ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>

                      {/* Bubble content */}
                      <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-br from-[#7B4DFF] to-[#5B2EFF] text-white rounded-tr-none shadow-[0_4px_15px_rgba(91,46,255,0.25)] border border-white/10'
                          : 'bg-white/5 border border-white/5 text-white/90 rounded-tl-none shadow-sm'
                      }`}>
                        <p className="whitespace-pre-line font-light">{msg.text}</p>
                        <span className={`block text-[9px] mt-2.5 text-right font-mono ${
                          msg.sender === 'user' ? 'text-white/60' : 'text-white/30'
                        }`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                    </div>
                  </motion.div>
                ))}

                {chatLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-8.5 h-8.5 rounded-lg flex items-center justify-center bg-gradient-to-tr from-[#00D4C7]/20 to-[#7B4DFF]/20 text-[#00D4C7] border border-[#00D4C7]/30 shrink-0">
                        <Bot className="w-4 h-4 animate-bounce" />
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5 rounded-tl-none flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 bg-[#00D4C7] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-[#00D4C7] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-[#00D4C7] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {chatError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{chatError}</p>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Quick Suggestions list */}
            <div className="px-6 py-4 border-t border-white/10 bg-[#11072F]/30">
              <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider block mb-2.5">Quick suggestions:</span>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(sug.query)}
                    disabled={chatLoading}
                    className="px-3.5 py-2 rounded-xl border border-white/5 hover:border-[#00D4C7] bg-white/5 hover:bg-[#00D4C7]/5 text-[11px] text-white/80 hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <span>{sug.label}</span>
                    <ArrowRight className="w-3 h-3 text-white/40" />
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Input Field */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="p-4 border-t border-white/10 bg-[#11072F]/50 flex gap-3"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask AI Coach about your studies, schedules, or improvements..."
                disabled={chatLoading}
                className="flex-1 bg-white/5 border border-white/5 focus:border-[#00D4C7] focus:outline-none rounded-xl px-4 py-3.5 text-xs text-white placeholder-white/30 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || chatLoading}
                className="p-3.5 bg-gradient-to-tr from-[#5B2EFF] to-[#7B4DFF] hover:opacity-90 disabled:opacity-50 rounded-xl flex items-center justify-center shadow-lg cursor-pointer transition-all duration-300 shrink-0 text-white"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>

          </GlassCard>
        </div>

      </div>
    </div>
  );
};

export default AICoachPage;
