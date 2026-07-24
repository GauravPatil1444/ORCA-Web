// src/components/MessageFeed.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useStore, type Message, type Source } from '../store/useStore';
import { Bot, ExternalLink, FileText, Globe, Database, BookOpenText, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DraggableResizableWindow from './DraggableResizableWindow';

const markdownComponents = {
  p: ({ node, ...props }: any) => <p className="mb-3 last:mb-0 leading-relaxed break-words" {...props} />,
  h1: ({ node, ...props }: any) => <h1 className="text-2xl font-bold mt-6 mb-3 text-slate-900 break-words" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="text-xl font-bold mt-5 mb-2 text-slate-900 break-words" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-lg font-semibold mt-4 mb-2 text-slate-900 break-words" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-disc pl-6 mb-3 space-y-1 break-words" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal pl-6 mb-3 space-y-1 break-words" {...props} />,
  li: ({ node, ...props }: any) => <li className="leading-relaxed break-words" {...props} />,
  // break-all is critical for long unbroken URLs in links
  a: ({ node, ...props }: any) => <a className="text-blue-600 hover:underline font-medium break-all" target="_blank" rel="noopener noreferrer" {...props} />,
  blockquote: ({ node, ...props }: any) => <blockquote className="border-l-4 border-slate-300 pl-4 italic text-slate-600 my-3 break-words" {...props} />,
  // max-w-full ensures the code block doesn't push the parent container
  pre: ({ node, ...props }: any) => <pre className="bg-slate-900 text-slate-100 rounded-lg overflow-x-auto my-3 p-4 text-sm font-mono max-w-full" {...props} />,
  code: ({ node, className, children, ...props }: any) => {
    const isInline = !className && !String(children).includes('\n');
    if (isInline) {
      return <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono break-words" {...props}>{children}</code>;
    }
    return <code className={`block max-w-full ${className || ''}`} {...props}>{children}</code>;
  },
  table: ({ node, ...props }: any) => (
    <div className="overflow-x-auto my-3 rounded-lg border border-slate-200 max-w-full">
      <table className="min-w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: ({ node, ...props }: any) => <th className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-left font-semibold text-slate-700" {...props} />,
  td: ({ node, ...props }: any) => <td className="border-b border-slate-100 px-4 py-2 text-slate-600" {...props} />,
  hr: ({ node, ...props }: any) => <hr className="my-6 border-slate-200" {...props} />,
  // Prevent images from breaking the layout
  img: ({ node, ...props }: any) => <img className="max-w-full h-auto rounded-lg my-3" {...props} />,
};

const getSourceIcon = (category: string) => {
  switch (category) {
    case 'web_page': return <Globe size={12} className="text-emerald-500" />;
    case 'csv': case 'json': return <Database size={12} className="text-amber-500" />;
    default: return <FileText size={12} className="text-blue-500" />;
  }
};

const SourcesDropdown = ({ sources }: { sources: Source[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="mt-2 ml-1">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors group">
        <BookOpenText size={12} />
        <span>{sources.length} Source{sources.length > 1 ? 's' : ''}</span>
        <ChevronRight size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : 'rotate-0'}`} />
      </button>
      {isOpen && (
        <div className="mt-2 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {sources.map((src: any, idx) => {
            const sourceName = typeof src === 'string' ? src : (src.source || src.file_name || src.name || src.document || 'Unknown Source');
            const category = typeof src === 'string' ? 'pdf_standard' : (src.category || 'pdf_standard');
            return (
              <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs shadow-sm hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-default" title={sourceName}>
                {getSourceIcon(category)}
                <span className="font-medium text-slate-700 truncate max-w-[250px] min-w-0">{sourceName}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const MessageFeed = () => {
  const { messages } = useStore();
  const [activeOwst, setActiveOwst] = useState<{ url: string; title: string } | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (feedRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
      window.dispatchEvent(new CustomEvent('orca-scroll-state', { detail: isScrolledUp }));
    }
  };

  useEffect(() => {
    if (feedRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
      if (scrollHeight - scrollTop - clientHeight < 100) {
        feedRef.current.scrollTop = feedRef.current.scrollHeight;
      }
    }
  }, [messages]);

  const renderMessageContent = (msg: Message) => {
    // Handle simple OWST URL payload
    if (msg.owst_url) {
      return (
        <div className="space-y-3">
          {msg.content && (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{msg.content}</ReactMarkdown>
          )}
          <button
            onClick={() => setActiveOwst({ url: msg.owst_url!, title: msg.owst_url! })}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <ExternalLink size={14} />
            Open Live Webview
          </button>
        </div>
      );
    }

    // Standard Markdown Rendering
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
            <p className="text-slate-500 max-w-md">Ask questions about your ingested documents, or let the agent autonomously route through your knowledge base.</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={msg.id} className={`flex gap-3 max-w-4xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} ${msg.role === 'user' ? 'max-w-[85%]' : 'max-w-full'}`}>
              <div
                className={`px-4 md:px-5 py-4 rounded-2xl shadow-sm min-w-0 w-full max-w-full overflow-hidden ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="prose-container">{renderMessageContent(msg)}</div>
                )}
              </div>
              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <SourcesDropdown sources={msg.sources} />
              )}
            </div>
          </div>
        ))}
      </div>

      {activeOwst && (
        <DraggableResizableWindow
          url={activeOwst.url}
          title={activeOwst.title}
          onClose={() => setActiveOwst(null)}
        />
      )}
    </>
  );
};

export default MessageFeed;