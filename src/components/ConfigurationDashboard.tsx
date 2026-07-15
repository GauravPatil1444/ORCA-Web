// src/components/ConfigurationDashboard.tsx
import React, { useState, useCallback } from 'react';
import { useStore, type FileItem } from '../store/useStore';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import {
  Upload, Globe, FileText, X, Loader2, Settings2, Link2, Code2
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Props {
  onNavigateToChat: () => Promise<void>;
}

const ConfigurationDashboard = ({ onNavigateToChat }: Props) => {
  const [activeNode, setActiveNode] = useState<'files' | 'scraping'>('files');

  // File Upload States
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [isRegexMode, setIsRegexMode] = useState(false);
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);
  const [regexExpression, setRegexExpression] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Scraping States
  const [targetDomain, setTargetDomain] = useState('');
  const [excludedClasses, setExcludedClasses] = useState('');
  const [isScraping, setIsScraping] = useState(false);

  const { user, addFile, setActiveContextFilters } = useStore();

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setLocalFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const removeFile = (index: number) => {
    setLocalFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async () => {
    if (localFiles.length === 0 || !user) return;
    setIsUploading(true);

    try {
      for (const file of localFiles) {
        const formData = new FormData();
        
        formData.append('user_id', user.uid);
        formData.append('file', file);

        if (isRegexMode) {
          formData.append('pdfoption', 'regex');
          if (regexExpression) formData.append('regex', regexExpression);
        } else {
          formData.append('pdfoption', 'standard');
          formData.append('range_val', chunkSize.toString());
          formData.append('overlap', chunkOverlap.toString());
        }

        const response = await fetch(`${API_BASE_URL}/v2/ingest/files`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error(`Upload failed for ${file.name}`);

        const fileId = `${Date.now()}_${file.name}`;
        const newFile: FileItem = {
          id: fileId,
          name: file.name,
          category: isRegexMode ? 'pdf_regex' : 'pdf_standard',
          uploaded_at: new Date().toISOString(),
        };

        await setDoc(doc(db, "users", user.uid, "Files", fileId), {
          name: newFile.name,
          category: newFile.category,
          uploaded_at: newFile.uploaded_at,
        });

        addFile(newFile);
      }

      setLocalFiles([]);
    } catch (error) {
      console.error('Ingestion error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleScrape = async () => {
    if (!targetDomain.trim() || !user) return;
    setIsScraping(true);

    const classesArray = excludedClasses.split(',').map(c => c.trim()).filter(Boolean);
    const fileId = `owst_${Date.now()}`;

    const newFile: FileItem = {
      id: fileId,
      name: targetDomain,
      category: 'web_page',
      uploaded_at: new Date().toISOString(),
      base_url: targetDomain,
      excluded_css_classes: classesArray,
    };

    try {
      await setDoc(doc(db, "users", user.uid, "Files", fileId), {
        name: newFile.name,
        category: newFile.category,
        uploaded_at: newFile.uploaded_at,
        base_url: newFile.base_url,
        excluded_css_classes: newFile.excluded_css_classes,
      });

      addFile(newFile);
      setTargetDomain('');
      setExcludedClasses('');
      
      setActiveContextFilters([fileId]);
      await onNavigateToChat();

    } catch (error) {
      console.error('Error saving OWST configuration:', error);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-50 relative overflow-hidden">
      {/* Node Tabs - Mobile scrollable, Desktop static */}
      <div className="px-4 md:px-6 bg-white border-b border-slate-200 shrink-0">
        <div className="flex gap-1 md:gap-6 overflow-x-auto scrollbar-hide -mx-4 md:mx-0 px-4 md:px-0">
          <button
            onClick={() => setActiveNode('files')}
            className={`py-3 md:py-4 px-3 md:px-2 border-b-2 transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap touch-manipulation ${
              activeNode === 'files'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload size={16} className="md:w-[18px] md:h-[18px]" />
            <span>File Upload</span>
          </button>
          <button
            onClick={() => setActiveNode('scraping')}
            className={`py-3 md:py-4 px-3 md:px-2 border-b-2 transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap touch-manipulation ${
              activeNode === 'scraping'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe size={16} className="md:w-[18px] md:h-[18px]" />
            <span>Web Scraping</span>
          </button>
        </div>
      </div>

      {/* Content Area - Scrollable with bounded height */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          {activeNode === 'files' ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-5 md:space-y-6">
              
              {/* Header with Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base md:text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <FileText size={18} className="text-blue-600 md:w-5 md:h-5" />
                  Document Ingestion
                </h3>
                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <span className={`text-xs md:text-sm font-medium ${!isRegexMode ? 'text-blue-600' : 'text-slate-400'}`}>Standard</span>
                  <button
                    onClick={() => setIsRegexMode(!isRegexMode)}
                    className={`relative inline-flex h-7 w-12 md:h-6 md:w-11 items-center rounded-full transition-colors touch-manipulation ${
                      isRegexMode ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                    aria-label="Toggle regex mode"
                  >
                    <span
                      className={`inline-block h-5 w-5 md:h-4 md:w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                        isRegexMode ? 'translate-x-6 md:translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-xs md:text-sm font-medium ${isRegexMode ? 'text-blue-600' : 'text-slate-400'}`}>Regex</span>
                </div>
              </div>

              {/* Dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-5 md:p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer touch-manipulation active:bg-blue-50/50"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".pdf,.csv,.json"
                  className="hidden"
                  onChange={(e) => e.target.files && setLocalFiles(prev => [...prev, ...Array.from(e.target.files!)])}
                />
                <Upload size={28} className="mx-auto text-slate-400 mb-2 md:mb-3 md:w-8 md:h-8" />
                <p className="text-sm md:text-sm font-medium text-slate-700">
                  Drop files here or <span className="text-blue-600 underline">browse</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">PDF, CSV, and JSON supported</p>
              </div>

              {/* File List */}
              {localFiles.length > 0 && (
                <div className="space-y-2">
                  {localFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText size={16} className="text-slate-500 shrink-0" />
                        <span className="text-sm text-slate-700 truncate">{file.name}</span>
                      </div>
                      <button 
                        onClick={() => removeFile(index)} 
                        className="text-slate-400 hover:text-red-500 transition-colors shrink-0 p-1.5 -mr-1.5 touch-manipulation active:bg-red-50 rounded-md"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Configuration Options */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Settings2 size={16} />
                  Processing Configuration
                </h4>

                {isRegexMode ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Regular Expression Pattern</label>
                    <input
                      type="text"
                      value={regexExpression}
                      onChange={(e) => setRegexExpression(e.target.value)}
                      placeholder="e.g., \b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b"
                      className="w-full px-3 md:px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base md:text-sm font-mono text-slate-800 touch-manipulation"
                    />
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between mb-3">
                        <label className="text-sm font-medium text-slate-600">Chunk Size</label>
                        <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{chunkSize}</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="4000"
                        step="100"
                        value={chunkSize}
                        onChange={(e) => setChunkSize(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 touch-manipulation"
                      />
                      <div className="flex justify-between mt-1 text-xs text-slate-400">
                        <span>100</span>
                        <span>4000</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-3">
                        <label className="text-sm font-medium text-slate-600">Chunk Overlap</label>
                        <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{chunkOverlap}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        step="50"
                        value={chunkOverlap}
                        onChange={(e) => setChunkOverlap(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 touch-manipulation"
                      />
                      <div className="flex justify-between mt-1 text-xs text-slate-400">
                        <span>0</span>
                        <span>1000</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                onClick={handleFileUpload}
                disabled={localFiles.length === 0 || isUploading}
                className="w-full py-3.5 md:py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm touch-manipulation active:bg-blue-800 text-base md:text-sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Ingest {localFiles.length} File{localFiles.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-5 md:space-y-6">
              <h3 className="text-base md:text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Globe size={18} className="text-emerald-600 md:w-5 md:h-5" />
                Web Scraping Node (OWST)
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                  <Link2 size={14} />
                  Base Domain / Context Link
                </label>
                <input
                  type="url"
                  value={targetDomain}
                  onChange={(e) => setTargetDomain(e.target.value)}
                  placeholder="https://docs.langchain.com"
                  className="w-full px-3 md:px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base md:text-sm text-slate-800 touch-manipulation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                  <Code2 size={14} />
                  Excluded CSS Classes
                  <span className="text-xs text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={excludedClasses}
                  onChange={(e) => setExcludedClasses(e.target.value)}
                  placeholder="sidebar, footer, nav-menu"
                  className="w-full px-3 md:px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base md:text-sm text-slate-800 touch-manipulation"
                />
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Comma-separated class names to strip from the DOM during sandbox rendering.
                </p>
              </div>

              <button
                onClick={handleScrape}
                disabled={!targetDomain.trim() || isScraping}
                className="w-full py-3.5 md:py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm touch-manipulation active:bg-emerald-800 text-base md:text-sm"
              >
                {isScraping ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving Configuration...
                  </>
                ) : (
                  <>
                    <Globe size={18} />
                    Save & Route to Chat
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigurationDashboard;