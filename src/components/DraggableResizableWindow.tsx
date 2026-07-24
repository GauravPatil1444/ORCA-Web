// src/components/DraggableResizableWindow.tsx
import React, { useState, useRef, useEffect } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface Props {
  url: string;
  title?: string;
  onClose: () => void;
}

const DraggableResizableWindow = ({ url, title = "Live Web Resource", onClose }: Props) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const dragOffset = useRef({ x: 0, y: 0 });
  const prevBounds = useRef({ x: 100, y: 100, width: 800, height: 600 });

  // Responsive listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDownDrag = (e: React.MouseEvent) => {
    if (isMaximized || isMobile) return;
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseDownResize = (e: React.MouseEvent) => {
    if (isMaximized || isMobile) return;
    e.stopPropagation();
    setIsResizing(true);
    dragOffset.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
      } else if (isResizing) {
        const dx = e.clientX - dragOffset.current.x;
        const dy = e.clientY - dragOffset.current.y;
        setSize(prev => ({ width: Math.max(400, prev.width + dx), height: Math.max(300, prev.height + dy) }));
        dragOffset.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing]);

  const toggleMaximize = () => {
    if (isMaximized) {
      setPosition({ x: prevBounds.current.x, y: prevBounds.current.y });
      setSize({ width: prevBounds.current.width, height: prevBounds.current.height });
      setIsMaximized(false);
    } else {
      prevBounds.current = { ...position, ...size };
      setPosition({ x: 0, y: 0 });
      const sidebarWidth = window.innerWidth >= 768 ? 256 : 0; 
      setSize({ width: window.innerWidth - sidebarWidth, height: window.innerHeight - 64 }); 
      setIsMaximized(true);
    }
  };

  // If mobile, ignore position/size styles and rely on Tailwind's `inset-0`
  const containerStyle = isMobile ? {} : {
    left: `${position.x}px`,
    top: `${position.y}px`,
    width: `${size.width}px`,
    height: `${size.height}px`,
    transition: isDragging || isResizing ? 'none' : 'all 0.2s ease-out',
  };

  return (
    <div
      className="fixed inset-0 md:inset-auto bg-white md:rounded-lg shadow-2xl md:border md:border-slate-300 flex flex-col overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200"
      style={containerStyle}
    >
      {/* Header */}
      <div
        className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0 md:cursor-move md:select-none"
        onMouseDown={isMobile ? undefined : handleMouseDownDrag}
      >
        <div className="flex items-center gap-2 text-slate-700 font-medium text-sm truncate">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
          <span className="truncate max-w-[200px] md:max-w-[400px]">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          {!isMobile && (
            <button onClick={toggleMaximize} className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors">
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}
          <button onClick={onClose} className="p-1.5 hover:bg-red-100 hover:text-red-600 rounded text-slate-500 transition-colors">
            <X size={isMobile ? 22 : 16} />
          </button>
        </div>
      </div>

      {/* Native Iframe Content */}
      <div className="flex-1 bg-white relative overflow-hidden">
        <iframe
          src={url}
          className="w-full h-full border-none"
          title={title}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          allow="fullscreen"
        />
        {/* Overlay to prevent iframe from capturing mouse events during desktop drag/resize */}
        {!isMobile && (isDragging || isResizing) && (
          <div className="absolute inset-0 z-10 bg-transparent" />
        )}
      </div>

      {/* Resize Handle (Desktop only) */}
      {!isMobile && !isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-center justify-center text-slate-400 hover:text-slate-600"
          onMouseDown={handleMouseDownResize}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 1V11H1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11 5V11H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </div>
  );
};

export default DraggableResizableWindow;