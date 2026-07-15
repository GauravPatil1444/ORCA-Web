// src/components/MessageFeed.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useStore, type Message, type Source } from '../store/useStore';
import { Bot, ExternalLink, FileText, Globe, Database, BookOpenText, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DraggableResizableWindow from './DraggableResizableWindow';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const OWST_REGEX = /RENDER_OWST:\s*(https?:\/\/[^\s&]+)(?:&classes_to_remove=([^\s]+))?/;

// Custom Tailwind v4 component mapping for Markdown elements
const markdownComponents = {
  p: ({ node, ...props }: any) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
  h1: ({ node, ...props }: any) => <h1 className="text-2xl font-bold mt-6 mb-3 text-slate-900" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="text-xl font-bold mt-5 mb-2 text-slate-900" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-lg font-semibold mt-4 mb-2 text-slate-900" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-disc pl-6 mb-3 space-y-1" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal pl-6 mb-3 space-y-1" {...props} />,
  li: ({ node, ...props }: any) => <li className="leading-relaxed" {...props} />,
  a: ({ node, ...props }: any) => <a className="text-blue-600 hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
  blockquote: ({ node, ...props }: any) => <blockquote className="border-l-4 border-slate-300 pl-4 italic text-slate-600 my-3" {...props} />,
  pre: ({ node, ...props }: any) => <pre className="bg-slate-900 text-slate-100 rounded-lg overflow-x-auto my-3 p-4 text-sm font-mono" {...props} />,
  code: ({ node, className, children, ...props }: any) => {
    const isInline = !className && !String(children).includes('\n');
    if (isInline) {
      return <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>;
    }
    return <code className={`block ${className || ''}`} {...props}>{children}</code>;
  },
  table: ({ node, ...props }: any) => (
    <div className="overflow-x-auto my-3 rounded-lg border border-slate-200">
      <table className="min-w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: ({ node, ...props }: any) => <th className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-left font-semibold text-slate-700" {...props} />,
  td: ({ node, ...props }: any) => <td className="border-b border-slate-100 px-4 py-2 text-slate-600" {...props} />,
  hr: ({ node, ...props }: any) => <hr className="my-6 border-slate-200" {...props} />,
};

const getSourceIcon = (category: string) => {
  switch (category) {
    case 'web_page': return <Globe size={12} className="text-emerald-500" />;
    case 'csv':
    case 'json': return <Database size={12} className="text-amber-500" />;
    default: return <FileText size={12} className="text-blue-500" />;
  }
};

const SourcesDropdown = ({ sources }: { sources: Source[] }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-2 ml-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors group"
      >
        <BookOpenText size={12} />
        <span>{sources.length} Source{sources.length > 1 ? 's' : ''}</span>
        <ChevronRight
          size={12}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : 'rotate-0'}`}
        />
      </button>

      {isOpen && (
        <div className="mt-2 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {sources.map((src: any, idx) => {
            // Defensively handle both raw strings and objects
            const sourceName = typeof src === 'string'
              ? src
              : (src.source || src.file_name || src.name || src.document || 'Unknown Source');

            const category = typeof src === 'string' ? 'pdf_standard' : (src.category || 'pdf_standard');

            return (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs shadow-sm hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-default"
                title={sourceName}
              >
                {getSourceIcon(category)}
                <span className="font-medium text-slate-700 truncate max-w-62.5 min-w-0">
                  {sourceName}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const MessageFeed = () => {
  const { messages, files } = useStore();
  const [activeOwst, setActiveOwst] = useState<{ url?: string; html?: string; title: string } | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  
  // const [showScrollBtn, setShowScrollBtn] = useState(false);


  const handleScroll = () => {
    if (feedRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
      // Show button if scrolled up by more than 100px from the bottom
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
      window.dispatchEvent(new CustomEvent('orca-scroll-state', { detail: isScrolledUp }));
      // setShowScrollBtn(isScrolledUp);
    }
  };

  // const scrollToBottom = () => {
  //   if (feedRef.current) {
  //     feedRef.current.scrollTo({
  //       top: feedRef.current.scrollHeight,
  //       behavior: 'smooth'
  //     });
  //   }
  // };

  useEffect(() => {
    if (feedRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isNearBottom) {
        feedRef.current.scrollTop = feedRef.current.scrollHeight;
      }
    }
  }, [messages]);

  // useEffect(() => {
  //   if (feedRef.current) {
  //     feedRef.current.scrollTop = feedRef.current.scrollHeight;
  //   }
  // }, [messages]);

  const renderMessageContent = (msg: Message, index: number) => {
    // Handle explicit renderOwst object
   if (msg.html_response) {
    return (
      <div className="space-y-3">
        {msg.content && (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {msg.content}
          </ReactMarkdown>
        )}
        <button
          onClick={() => setActiveOwst({ html: msg.html_response!, title: 'Live Web Resource' })}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <ExternalLink size={14} />
          Open Live Webview
        </button>
      </div>
    );
  }

    // 2. Handle explicit renderOwst object (Legacy/Fallback)
    if (msg.renderOwst) {
      return (
        <div className="space-y-3">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {msg.content}
          </ReactMarkdown>
          <button
            onClick={() => setActiveOwst({ url: msg.renderOwst!.target_url, title: msg.renderOwst!.target_url })}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <ExternalLink size={14} />
            Open Live Webview
          </button>
        </div>
      );
    }

    // 3. Handle backend macro string (Legacy/Fallback)
    const match = msg.content.match(OWST_REGEX);
    if (match) {
      const cleanText = msg.content.replace(OWST_REGEX, '').trim();
      const precedingUserMsg = messages.slice(0, index).reverse().find(m => m.role === 'user');
      const userQuery = precedingUserMsg ? precedingUserMsg.content : '';
      const owstFile = files.find(f => f.category === 'web_page' && f.base_url);
      
      let iframeUrl = match[1]; 
      if (owstFile && userQuery) {
        const params = new URLSearchParams({
          link: owstFile.base_url!,
          query: userQuery,
          classes_to_remove: (owstFile.excluded_css_classes || []).join(',')
        });
        iframeUrl = `${API_BASE_URL}/owst?${params.toString()}`;
      }

      return (
        <div className="space-y-3">
          {cleanText && (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {cleanText}
            </ReactMarkdown>
          )}
          <button
            onClick={() => setActiveOwst({ url: iframeUrl, title: owstFile?.name || 'Live Web Resource' })}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <ExternalLink size={14} />
            Open Live Webview
          </button>
        </div>
      );
    }

    // 4. Standard Markdown Rendering
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {msg.content || (msg.role === 'assistant' ? '...' : '')}
      </ReactMarkdown>
    );
  };

  return (
    <>
      <div ref={feedRef} data-orca-feed="true" onScroll={handleScroll} className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-6 bg-slate-50">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Bot size={32} className="text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Start a Conversation</h3>
            <p className="text-slate-500 max-w-md">
              Ask questions about your ingested documents, or let the agent autonomously route through your knowledge base.
            </p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-6xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1">
                <Bot size={18} className="text-white" />
              </div>
            )} */}

            {/* Flex column wrapper to stack the bubble and the sources dropdown */}
            <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} ${msg.role === 'user' ? 'max-w-[85%]' : 'max-w-full'}`}>

              {/* Message Bubble */}
              <div
                className={`px-5 py-4 rounded-2xl shadow-sm ${msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="prose-container">
                    {renderMessageContent(msg, index)}
                  </div>
                )}
              </div>

              {/* Sources Dropdown (Rendered outside the white container) */}
              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <SourcesDropdown sources={msg.sources} />
              )}
            </div>

            {/* {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-1">
                <User size={18} className="text-slate-600" />
              </div>
            )} */}
          </div>
        ))}
      </div>

      {/* {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white border border-slate-200 shadow-lg rounded-full p-2.5 text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:shadow-xl transition-all duration-200"
          aria-label="Scroll to bottom"
        >
          <ArrowDown size={20} />
        </button>
      )} */}
      {activeOwst && (
        <DraggableResizableWindow
          url={activeOwst.url||''}
          htmlContent={activeOwst.html} 
          title={activeOwst.title}
          onClose={() => setActiveOwst(null)}
        />
      )}
    </>
  );
};

export default MessageFeed;