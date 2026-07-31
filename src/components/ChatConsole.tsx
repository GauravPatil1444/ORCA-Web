// src/components/ChatConsole.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Send, Loader2, AlertCircle, ArrowDown } from 'lucide-react';
import KnowledgeBaseModal from './KnowledgeBaseModal';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ChatConsole = () => {
  const [input, setInput] = useState('');
  // const [showScopingModal, setShowScopingModal] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const {
    user, messages, files, addMessage, updateMessage, updateMessageSources, updateMessageOwstUrl, setStreaming, isStreaming, activeContextFilters, selectedModel
  } = useStore();

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || !user) return;

    const userMessage = { id: `user_${Date.now()}`, role: 'user' as const, content: input.trim() };
    const assistantPlaceholder = { id: `assistant_${Date.now()}`, role: 'assistant' as const, content: '' };

    addMessage(userMessage);
    addMessage(assistantPlaceholder);
    setInput('');
    setStreaming(true);

    const owstContext = activeContextFilters
      .map(id => files.find(f => f.id === id))
      .filter(f => f && f.category === 'web_page' && f.base_url)
      .map(f => ({ source_id: f!.id, base_url: f!.base_url, classes_to_remove: f!.excluded_css_classes || [] }));

    try {
      const response = await fetch(`${API_BASE_URL}/v2/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: user.uid,
          user_id: user.uid,
          model: selectedModel,
          query: userMessage.content,
          scope_filters: activeContextFilters.length > 0 ? activeContextFilters : undefined,
          owst_context: owstContext.length > 0 ? owstContext : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();

      let textContent = data.response || data.content || '';

      const textMatch = textContent.match(/RENDER_OWST:\s*(https?:\/\/[^\s>]+)/);
      if (textMatch) {
        updateMessageOwstUrl(assistantPlaceholder.id, textMatch[1]);
        textContent = textContent.replace(/RENDER_OWST:\s*https?:\/\/[^\s>]+>?/, '').trim();
      }

      updateMessage(assistantPlaceholder.id, textContent);

      if (data.macro && typeof data.macro === 'string') {
        const macroMatch = data.macro.match(/RENDER_OWST:\s*(https?:\/\/[^\s>]+)/);
        if (macroMatch) {
          updateMessageOwstUrl(assistantPlaceholder.id, macroMatch[1]);
        }
      }

      if (data.sources && Array.isArray(data.sources)) {
        const normalizedSources = data.sources.map((s: any) => {
          if (typeof s === 'string') {
            let category = 'pdf_standard';
            if (s.startsWith('http')) category = 'web_page';
            else if (s.endsWith('.csv')) category = 'csv';
            else if (s.endsWith('.json')) category = 'json';
            return { source: s, category };
          }
          return s;
        });
        updateMessageSources(assistantPlaceholder.id, normalizedSources);
      }
    } catch (error) {
      console.error("Chat request failed:", error);
      updateMessage(assistantPlaceholder.id, '⚠️ Error connecting to the agent. Please check your backend connection.');
    } finally {
      setStreaming(false);
    }
  };

  useEffect(() => {
    const handler = (e: CustomEvent) => setShowScrollBtn(e.detail);
    window.addEventListener('orca-scroll-state', handler as EventListener);
    return () => window.removeEventListener('orca-scroll-state', handler as EventListener);
  }, []);

  const scrollToBottom = () => {
    const feed = document.querySelector('[data-orca-feed="true"]');
    if (feed) feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    /*Fully transparent wrapper — no background, no border */
    <div className="relative w-full max-w-3xl mx-auto px-4 pb-2 pt-2">
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/80 dark:border-slate-600/60 shadow-lg rounded-full p-2.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          aria-label="Scroll to bottom"
        >
          <ArrowDown size={20} />
        </button>
      )}


      {/*Floating, lifted glass card */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-end gap-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200/90 dark:border-slate-600/50 rounded-[1.75rem] p-2
          shadow-[0_10px_36px_-10px_rgba(15,23,42,0.22),0_2px_8px_-2px_rgba(15,23,42,0.08)]
          dark:shadow-[0_10px_36px_-10px_rgba(0,0,0,0.65),0_2px_8px_-2px_rgba(0,0,0,0.4)]
          hover:-translate-y-0.5 focus-within:-translate-y-0.5
          focus-within:border-blue-400/70 dark:focus-within:border-blue-500/50
          focus-within:shadow-[0_18px_50px_-12px_rgba(37,99,235,0.30),0_4px_12px_-2px_rgba(15,23,42,0.10)]
          dark:focus-within:shadow-[0_18px_50px_-12px_rgba(37,99,235,0.35),0_4px_12px_-2px_rgba(0,0,0,0.5)]
          transition-all duration-300 ease-out"
      >
        <KnowledgeBaseModal />

        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
          placeholder={isStreaming ?"Thinking...":"Ask ORCA"}
          className="flex-1 resize-none border-none outline-none bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 py-1.5 px-1 text-base leading-relaxed"
          rows={1}
          disabled={isStreaming}
        />

        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-600/25 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/35 disabled:bg-transparent dark:disabled:bg-transparent disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200 mb-0.5 hover:scale-105 active:scale-95"
        >
          {isStreaming ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </form>

      {activeContextFilters.length > 0 && (
        <div className="mt-2.5 flex justify-center">
          <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50/90 dark:bg-blue-900/40 backdrop-blur-md border border-blue-100/80 dark:border-blue-800/50 font-medium flex items-center gap-1.5 px-3 py-1 rounded-full shadow-sm">
            <AlertCircle size={13} />
            Manual Scoping Active: Filtering across {activeContextFilters.length} selected source(s).
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatConsole;