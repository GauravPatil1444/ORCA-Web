// src/components/KnowledgeBaseModal.tsx
import React, { useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { X, Check, FileText, Globe, Database, Sparkles } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const KnowledgeBaseModal = ({ onClose }: Props) => {
  const { files, activeContextFilters, setActiveContextFilters } = useStore();
  const modalRef = useRef<HTMLDivElement>(null);

  const isAutoMode = activeContextFilters.length === 0;

  // Close on click outside logic
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    // Delay adding the listener to prevent the click that opened the modal from immediately closing it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const toggleFileSelection = (sourceId: string) => {
    if (activeContextFilters.includes(sourceId)) {
      setActiveContextFilters(activeContextFilters.filter(id => id !== sourceId));
    } else {
      setActiveContextFilters([...activeContextFilters, sourceId]);
    }
  };

  const getIcon = (category: string) => {
    switch (category) {
      case 'web_page': return <Globe size={16} className="text-emerald-500" />;
      case 'csv':
      case 'json': return <Database size={16} className="text-amber-500" />;
      default: return <FileText size={16} className="text-blue-500" />;
    }
  };

  return (
    <div 
      ref={modalRef}
      className="absolute bottom-full left-0 mb-3 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
        <h3 className="font-semibold text-slate-800 text-sm">Context Scoping</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="p-3 max-h-80 overflow-y-auto">
        {/* Auto Mode Option */}
        <button
          onClick={() => setActiveContextFilters([])}
          className={`w-full flex items-center gap-3 p-3 rounded-lg mb-2 transition-colors text-left ${
            isAutoMode ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'
          }`}
        >
          <Sparkles size={18} className={isAutoMode ? 'text-blue-600' : 'text-slate-400'} />
          <div className="flex-1">
            <p className={`text-sm font-medium ${isAutoMode ? 'text-blue-700' : 'text-slate-700'}`}>Auto Mode</p>
            <p className="text-xs text-slate-500">Agent autonomously searches all documents</p>
          </div>
          {isAutoMode && <Check size={16} className="text-blue-600" />}
        </button>

        <div className="px-2 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Manual Scoping
        </div>

        {/* File List */}
        <div className="space-y-1">
          {files.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No files ingested yet.</p>
          ) : (
            files.map((file) => {
              const isSelected = activeContextFilters.includes(file.id);
              return (
                <button
                  key={file.id}
                  onClick={() => toggleFileSelection(file.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left ${
                    isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  {getIcon(file.category)}
                  <span className={`flex-1 text-sm truncate ${isSelected ? 'text-blue-700 font-medium' : 'text-slate-700'}`}>
                    {file.name}
                  </span>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                  }`}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseModal;