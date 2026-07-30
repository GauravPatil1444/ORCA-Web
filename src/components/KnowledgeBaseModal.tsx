// src/components/KnowledgeBaseModal.tsx
import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { X, FileText, Globe, Database, ImageIcon, Check, Search } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const KnowledgeBaseModal = ({ onClose }: Props) => {
  const { files, activeContextFilters, setActiveContextFilters } = useStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggle = (fileId: string) => {
    if (activeContextFilters.includes(fileId)) {
      setActiveContextFilters(activeContextFilters.filter(id => id !== fileId));
    } else {
      setActiveContextFilters([...activeContextFilters, fileId]);
    }
  };

  const handleSelectAll = () => {
    if (activeContextFilters.length === files.length) {
      setActiveContextFilters([]);
    } else {
      setActiveContextFilters(files.map(f => f.id));
    }
  };

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'web_page': return <Globe size={16} className="text-emerald-500" />;
      case 'csv':
      case 'json': return <Database size={16} className="text-amber-500" />;
      case 'image': return <ImageIcon size={16} className="text-purple-500" />;
      default: return <FileText size={16} className="text-blue-500" />;
    }
  };

  return (
    // FIX: Added onClick={onClose} to the backdrop to close on outside click
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* FIX: Added onClick={(e) => e.stopPropagation()} to prevent inner clicks from closing the modal */}
      <div 
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full relative animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Knowledge Base Context</h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Controls */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3 shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              {activeContextFilters.length === files.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {activeContextFilters.length} of {files.length} selected
            </span>
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText size={32} className="text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {files.length === 0 ? 'No files uploaded yet' : 'No files match your search'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFiles.map((file) => {
                const isSelected = activeContextFilters.includes(file.id);
                return (
                  <button
                    key={file.id}
                    onClick={() => handleToggle(file.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      isSelected 
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                    {getFileIcon(file.category)}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'
                      }`}>
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {file.category.replace('_', ' ')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
            <Globe size={14} className="shrink-0 text-blue-500" />
            <p>
              {activeContextFilters.length === 0 
                ? 'Auto Mode: The agent will search across all your knowledge bases.'
                : `Manual Scoping: The agent will only search within the ${activeContextFilters.length} selected source(s).`
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseModal;