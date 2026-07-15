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
  
  const dragOffset = useRef({ x: 0, y: 0 });
  const prevBounds = useRef({ x: 100, y: 100, width: 800, height: 600 });

  const handleMouseDownDrag = (e: React.MouseEvent) => {
    if (isMaximized) return;
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseDownResize = (e: React.MouseEvent) => {
    if (isMaximized) return;
    e.stopPropagation();
    setIsResizing(true);
    dragOffset.current = {
      x: e.clientX,
      y: e.clientY,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        });
      } else if (isResizing) {
        const dx = e.clientX - dragOffset.current.x;
        const dy = e.clientY - dragOffset.current.y;
        
        setSize(prev => ({
          width: Math.max(400, prev.width + dx),
          height: Math.max(300, prev.height + dy),
        }));
        
        dragOffset.current = {
          x: e.clientX,
          y: e.clientY,
        };
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
      // Account for sidebar (256px) and header (64px)
      setSize({ width: window.innerWidth - 256, height: window.innerHeight - 64 }); 
      setIsMaximized(true);
    }
  };

  return (
    <div
      className="fixed bg-white rounded-lg shadow-2xl border border-slate-300 flex flex-col overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        transition: isDragging || isResizing ? 'none' : 'all 0.2s ease-out',
      }}
    >
      {/* Header / Drag Handle */}
      <div
        className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between cursor-move select-none shrink-0"
        onMouseDown={handleMouseDownDrag}
      >
        <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          {/* {title} */}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleMaximize}
            className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors"
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-red-100 hover:text-red-600 rounded text-slate-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-slate-50 relative">
        <iframe
          src={url}
          className="w-full h-full border-none"
          title={title}
          sandbox="allow-scripts allow-same-origin"
        />
        {/* Overlay to prevent iframe from capturing mouse events during drag/resize */}
        {(isDragging || isResizing) && (
          <div className="absolute inset-0 z-10 bg-transparent" />
        )}
      </div>

      {/* Resize Handle (Bottom Right) */}
      {!isMaximized && (
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