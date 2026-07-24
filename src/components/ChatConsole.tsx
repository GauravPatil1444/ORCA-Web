// src/components/ChatConsole.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Send, Plus, Loader2, AlertCircle, ArrowDown } from 'lucide-react';
import KnowledgeBaseModal from './KnowledgeBaseModal';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const ChatConsole = () => {
  const [input, setInput] = useState('');
  const [showScopingModal, setShowScopingModal] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  
  const { 
    user, messages, files, addMessage, updateMessage, updateMessageSources, updateMessageOwstUrl, setStreaming, isStreaming, activeContextFilters 
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
          query: userMessage.content,
          scope_filters: activeContextFilters.length > 0 ? activeContextFilters : undefined,
          owst_context: owstContext.length > 0 ? owstContext : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      // Standard JSON parsing (No more SSE stream reading)
      const data = await response.json();

      // 1. Handle Text Content
      let textContent = data.response || data.content || '';
      
      // Fallback: Check if macro is accidentally embedded in the raw text string
      const textMatch = textContent.match(/RENDER_OWST:\s*(https?:\/\/[^\s>]+)/);
      if (textMatch) {
        updateMessageOwstUrl(assistantPlaceholder.id, textMatch[1]);
        textContent = textContent.replace(/RENDER_OWST:\s*https?:\/\/[^\s>]+>?/, '').trim();
      }
      
      updateMessage(assistantPlaceholder.id, textContent);

      // 2. Handle Explicit "macro" Key (Triggers the Open Live Webview Button)
      if (data.macro && typeof data.macro === 'string') {
        const macroMatch = data.macro.match(/RENDER_OWST:\s*(https?:\/\/[^\s>]+)/);
        if (macroMatch) {
          updateMessageOwstUrl(assistantPlaceholder.id, macroMatch[1]);
        }
      }

      // 3. Handle Sources Payload (Populates the Citations Dropdown)
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
    <div className="relative w-full max-w-4xl mx-auto px-4 pb-6 pt-2 bg-slate-50 border-slate-200">
      {showScrollBtn && (
        <button onClick={scrollToBottom} className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 bg-white/50 border border-slate-200 shadow-lg rounded-full p-2.5 text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:shadow-xl transition-all duration-200" aria-label="Scroll to bottom">
          <ArrowDown size={20} />
        </button>
      )}

      {showScopingModal && <KnowledgeBaseModal onClose={() => setShowScopingModal(false)} />}

      <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-white border border-slate-300 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all p-2">
        <button type="button" onClick={() => setShowScopingModal(true)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mb-0.5" title="Knowledge Base Context">
          <Plus size={20} />
        </button>

        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
          placeholder="Ask ORCA"
          className="flex-1 resize-none border-none outline-none text-slate-800 placeholder-slate-400 py-1 px-1 text-base leading-relaxed"
          rows={1}
          disabled={isStreaming}
        />

        <button type="submit" disabled={!input.trim() || isStreaming} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors mb-0.5 shadow-sm">
          {isStreaming ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </form>
      
      {activeContextFilters.length > 0 && (
        <div className="mt-2 text-xs text-blue-600 font-medium flex items-center gap-1 px-2">
          <AlertCircle size={14} />
          Manual Scoping Active: Filtering across {activeContextFilters.length} selected source(s).
        </div>
      )}
    </div>
  );
};

export default ChatConsole;