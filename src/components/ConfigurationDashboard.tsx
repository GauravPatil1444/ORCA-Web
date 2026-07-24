// src/components/ConfigurationDashboard.tsx
import React, { useState, useCallback } from 'react';
import { useStore, type FileItem } from '../store/useStore';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import {
  Upload, Globe, FileText, X, Loader2, Settings2, Link2, ExternalLink, ArrowRight
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

interface Props {
  onNavigateToChat: () => Promise<void>;
}

const ConfigurationDashboard = ({ onNavigateToChat }: Props) => {
  const [activeNode, setActiveNode] = useState<'files' | 'web'>('files');

  // File Upload States
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [isRegexMode, setIsRegexMode] = useState(false);
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);
  const [regexExpression, setRegexExpression] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Web Resource States (Replaces Scraping)
  const [webUrl, setWebUrl] = useState('');
  const [webTitle, setWebTitle] = useState('');
  const [isSavingWeb, setIsSavingWeb] = useState(false);

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

  //  NEW: Save Web Resource (No scraping, just URL registration)
  const handleSaveWebResource = async () => {
    if (!webUrl.trim() || !user) return;
    setIsSavingWeb(true);

    // Normalize URL (ensure https://)
    let normalizedUrl = webUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Use custom title or derive from URL
    const displayName = webTitle.trim() || new URL(normalizedUrl).hostname.replace('www.', '');
    const fileId = `web_${Date.now()}`;

    const newFile: FileItem = {
      id: fileId,
      name: displayName,
      category: 'web_page',
      uploaded_at: new Date().toISOString(),
      base_url: normalizedUrl,
    };

    try {
      await setDoc(doc(db, "users", user.uid, "Files", fileId), {
        name: newFile.name,
        category: newFile.category,
        uploaded_at: newFile.uploaded_at,
        base_url: newFile.base_url,
      });

      addFile(newFile);
      setWebUrl('');
      setWebTitle('');
      setActiveContextFilters([fileId]);
      await onNavigateToChat();
    } catch (error) {
      console.error('Error saving web resource:', error);
    } finally {
      setIsSavingWeb(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-50 relative overflow-hidden">
      {/* Node Tabs */}
      <div className="px-4 md:px-6 bg-white border-b border-slate-200 shrink-0">
        <div className="flex gap-1 md:gap-6 overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <button
            onClick={() => setActiveNode('files')}
            className={`py-3 md:py-4 px-3 md:px-2 border-b-2 transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap ${
              activeNode === 'files' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload size={16} className="md:w-[18px] md:h-[18px]" />
            <span>File Upload</span>
          </button>
          <button
            onClick={() => setActiveNode('web')}
            className={`py-3 md:py-4 px-3 md:px-2 border-b-2 transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap ${
              activeNode === 'web' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe size={16} className="md:w-[18px] md:h-[18px]" />
            <span>Web Resource</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto">

          {/* ===== FILE UPLOAD NODE (Unchanged) ===== */}
          {activeNode === 'files' ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-5 md:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base md:text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" />
                  Document Ingestion
                </h3>
                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <span className={`text-xs md:text-sm font-medium ${!isRegexMode ? 'text-blue-600' : 'text-slate-400'}`}>Standard</span>
                  <button
                    onClick={() => setIsRegexMode(!isRegexMode)}
                    className={`relative inline-flex h-7 w-12 md:h-6 md:w-11 items-center rounded-full transition-colors ${isRegexMode ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-5 w-5 md:h-4 md:w-4 transform rounded-full bg-white transition-transform shadow-sm ${isRegexMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className={`text-xs md:text-sm font-medium ${isRegexMode ? 'text-blue-600' : 'text-slate-400'}`}>Regex</span>
                </div>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-5 md:p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input id="file-input" type="file" multiple accept=".pdf,.csv,.json" className="hidden"
                  onChange={(e) => e.target.files && setLocalFiles(prev => [...prev, ...Array.from(e.target.files!)])} />
                <Upload size={28} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-700">Drop files here or <span className="text-blue-600 underline">browse</span></p>
                <p className="text-xs text-slate-500 mt-1">PDF, CSV, and JSON supported</p>
              </div>

              {localFiles.length > 0 && (
                <div className="space-y-2">
                  {localFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText size={16} className="text-slate-500 shrink-0" />
                        <span className="text-sm text-slate-700 truncate">{file.name}</span>
                      </div>
                      <button onClick={() => removeFile(index)} className="text-slate-400 hover:text-red-500 transition-colors shrink-0 p-1.5">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Settings2 size={16} /> Processing Configuration
                </h4>
                {isRegexMode ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Regular Expression Pattern</label>
                    <input type="text" value={regexExpression} onChange={(e) => setRegexExpression(e.target.value)}
                      placeholder="e.g., \b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b"
                      className="w-full px-3 md:px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base md:text-sm font-mono text-slate-800" />
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between mb-3">
                        <label className="text-sm font-medium text-slate-600">Chunk Size</label>
                        <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{chunkSize}</span>
                      </div>
                      <input type="range" min="100" max="4000" step="100" value={chunkSize}
                        onChange={(e) => setChunkSize(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                      <div className="flex justify-between mt-1 text-xs text-slate-400"><span>100</span><span>4000</span></div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-3">
                        <label className="text-sm font-medium text-slate-600">Chunk Overlap</label>
                        <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{chunkOverlap}</span>
                      </div>
                      <input type="range" min="0" max="1000" step="50" value={chunkOverlap}
                        onChange={(e) => setChunkOverlap(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                      <div className="flex justify-between mt-1 text-xs text-slate-400"><span>0</span><span>1000</span></div>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleFileUpload} disabled={localFiles.length === 0 || isUploading}
                className="w-full py-3.5 md:py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm text-base md:text-sm">
                {isUploading ? (<><Loader2 size={18} className="animate-spin" />Processing...</>) : (<><Upload size={18} />Ingest {localFiles.length} File{localFiles.length !== 1 ? 's' : ''}</>)}
              </button>
            </div>

          ) : (

            /* ===== WEB RESOURCE NODE (Redesigned — No Scraping) ===== */
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-6">

              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-200">
                  <Globe size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-slate-800">Add Web Resource</h3>
                  <p className="text-xs text-slate-500">Register a live webpage to view directly in the chat workspace.</p>
                </div>
              </div>

              {/* URL Preview Card */}
              {webUrl.trim() && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3 animate-in fade-in duration-200">
                  <div className="w-8 h-8 rounded-full bg-white border border-emerald-200 flex items-center justify-center shrink-0">
                    <ExternalLink size={14} className="text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-emerald-800 truncate">
                      {webTitle.trim() || new URL(webUrl.startsWith('http') ? webUrl : `https://${webUrl}`).hostname.replace('www.', '')}
                    </p>
                    <p className="text-xs text-emerald-600 truncate">
                      {webUrl.startsWith('http') ? webUrl : `https://${webUrl}`}
                    </p>
                  </div>
                </div>
              )}

              {/* URL Input */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                  <Link2 size={14} />
                  Webpage URL
                </label>
                <input
                  type="url"
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                  placeholder="https://docs.langchain.com or example.com"
                  className="w-full px-3 md:px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base md:text-sm text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* Custom Title Input */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Display Name <span className="text-xs text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={webTitle}
                  onChange={(e) => setWebTitle(e.target.value)}
                  placeholder="e.g., LangChain Documentation"
                  className="w-full px-3 md:px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base md:text-sm text-slate-800 placeholder-slate-400"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  If left empty, the domain name will be used automatically.
                </p>
              </div>

              {/* Info Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex gap-3">
                <div className="shrink-0 mt-0.5">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    The webpage will open as a live, interactive webview inside the chat. Some websites may block iframe embedding due to their security policies (X-Frame-Options).
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSaveWebResource}
                disabled={!webUrl.trim() || isSavingWeb}
                className="w-full py-3.5 md:py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm text-base md:text-sm"
              >
                {isSavingWeb ? (
                  <><Loader2 size={18} className="animate-spin" />Saving Resource...</>
                ) : (
                  <><ArrowRight size={18} />Save & Open in Chat</>
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