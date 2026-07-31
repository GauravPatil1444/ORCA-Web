// src/components/ConfigurationDashboard.tsx
import React, { useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import { useStore, type FileItem } from '../store/useStore';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import {
  Upload, Globe, FileText, X, Loader2, Settings2, Link2, ExternalLink,
  ArrowRight, ImageIcon, Database, Check, AlertCircle, Sparkles,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* source-type identity — same palette the chat + KB popover use for citations */
const TYPE_META: Record<string, { Icon: any; tint: string; bar: string }> = {
  image:        { Icon: ImageIcon, tint: 'text-fuchsia-500', bar: 'bg-fuchsia-500' },
  csv:          { Icon: Database,  tint: 'text-amber-500',   bar: 'bg-amber-500' },
  json:         { Icon: Database,  tint: 'text-amber-500',   bar: 'bg-amber-500' },
  pdf_standard: { Icon: FileText,  tint: 'text-blue-500',    bar: 'bg-blue-500' },
  pdf_regex:    { Icon: FileText,  tint: 'text-blue-500',    bar: 'bg-blue-500' },
};
const FALLBACK_META = TYPE_META.pdf_standard;

type StoreCategory = 'pdf_standard' | 'pdf_regex' | 'csv' | 'json' | 'web_page' | 'image';
type NodeKey = 'files' | 'web';
type Phase = 'idle' | 'working' | 'done';

/* ambient + micro-interaction keyframes (scoped, reduced-motion aware) */
const ambientCss = `
  @keyframes cfg-grid  { from { background-position: 0 0; } to { background-position: 48px 48px; } }
  @keyframes cfg-drift { 0% { transform: translate(0,0); } 50% { transform: translate(26px,-18px); } 100% { transform: translate(0,0); } }
  @keyframes cfg-rise  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes cfg-bob   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  @keyframes cfg-ping  { 0% { transform: scale(1); opacity: .6; } 70%,100% { transform: scale(2.4); opacity: 0; } }
  .cfg-grid  { background-image: radial-gradient(circle, var(--cfg-dot, rgba(100,116,139,.14)) 1px, transparent 1.4px); background-size: 24px 24px; animation: cfg-grid 30s linear infinite; }
  .cfg-drift { animation: cfg-drift 24s ease-in-out infinite; }
  .cfg-rise  { animation: cfg-rise .5s cubic-bezier(.16,1,.3,1) both; }
  .cfg-bob   { animation: cfg-bob 2.2s ease-in-out infinite; }
  .cfg-ping  { transform-box: fill-box; transform-origin: center; animation: cfg-ping 2.6s ease-out infinite; }
  @media (prefers-reduced-motion: reduce) {
    .cfg-grid, .cfg-drift, .cfg-rise, .cfg-bob, .cfg-ping { animation: none !important; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Measured segmented toggle — the pill tracks the real button box,   */
/*  so unequal labels ("File Upload" vs "Web Resource") align exactly. */
/* ------------------------------------------------------------------ */
const NodeToggle = ({ value, onChange }: { value: NodeKey; onChange: (v: NodeKey) => void }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const filesRef = useRef<HTMLButtonElement>(null);
  const webRef = useRef<HTMLButtonElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      const btn = value === 'files' ? filesRef.current : webRef.current;
      if (!wrap || !btn) return;
      const wrapRect = wrap.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      // wrap uses a ring (box-shadow), not a border, so its border-box left
      // equals the absolute containing-block origin → no offset to compensate.
      setPill({
        left: Math.round(btnRect.left - wrapRect.left),
        width: Math.round(btnRect.width),
      });
    };

    measure();

    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener('resize', measure);
    // re-measure once any webfont that could shift label metrics has loaded
    const ft = window.setTimeout(measure, 140);
    if ((document as any).fonts?.ready) (document as any).fonts.ready.then(measure);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.clearTimeout(ft);
    };
  }, [value]);

  return (
    // ring (not border) keeps the measurement frame clean; shrink-0 so the
    // toggle never compresses when the headline row is tight on small screens.
    <div
      ref={wrapRef}
      className="relative inline-flex shrink-0 items-center rounded-xl bg-white/60 p-1 ring-1 ring-slate-200/70 backdrop-blur-md dark:bg-slate-800/50 dark:ring-slate-700/60"
    >
      {pill.width > 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 bottom-1 rounded-lg bg-white shadow-sm ring-1 ring-slate-200/60 transition-all duration-300 ease-out dark:bg-slate-600 dark:ring-transparent"
          style={{ left: pill.left, width: pill.width }}
        />
      )}
      <button
        ref={filesRef}
        type="button"
        onClick={() => onChange('files')}
        className={`relative z-10 flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          value === 'files'
            ? 'text-blue-600 dark:text-blue-300'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
      >
        <Upload size={15} />
        <span>File Upload</span>
      </button>
      <button
        ref={webRef}
        type="button"
        onClick={() => onChange('web')}
        className={`relative z-10 flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          value === 'web'
            ? 'text-emerald-600 dark:text-emerald-300'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
      >
        <Globe size={15} />
        <span>Web Resource</span>
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------ */
interface Props {
  onNavigateToChat: () => Promise<void>;
}

const ConfigurationDashboard = ({ onNavigateToChat }: Props) => {
  const [activeNode, setActiveNode] = useState<NodeKey>('files');

  // File upload states
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [isRegexMode, setIsRegexMode] = useState(false);
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);
  const [regexExpression, setRegexExpression] = useState('');
  const [uploadPhase, setUploadPhase] = useState<Phase>('idle');
  const [isDragOver, setIsDragOver] = useState(false);

  // Web resource states
  const [webUrl, setWebUrl] = useState('');
  const [webTitle, setWebTitle] = useState('');
  const [webPhase, setWebPhase] = useState<Phase>('idle');

  // transient feedback banner
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const { user, addFile, setActiveContextFilters } = useStore();

  useEffect(() => {
    if (flash?.kind !== 'err') return;
    const t = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(t);
  }, [flash]);

  const getFileCategory = (fileName: string): { backend: string; store: StoreCategory } => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'csv') return { backend: 'csvs', store: 'csv' };
    if (ext === 'json') return { backend: 'jsons', store: 'json' };
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) return { backend: 'images', store: 'image' };
    return { backend: 'pdfs', store: isRegexMode ? 'pdf_regex' : 'pdf_standard' };
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) setLocalFiles((prev) => [...prev, ...dropped]);
  }, []);

  const removeFile = (index: number) => setLocalFiles((prev) => prev.filter((_, i) => i !== index));

  const handleFileUpload = async () => {
    if (localFiles.length === 0 || !user) return;
    setUploadPhase('working');
    setFlash(null);
    let added = 0;

    try {
      for (const file of localFiles) {
        const formData = new FormData();
        formData.append('user_id', user.uid);
        formData.append('file', file);

        const { backend, store } = getFileCategory(file.name);
        formData.append('category', backend);

        if (backend === 'pdfs') {
          if (isRegexMode) {
            formData.append('pdfoption', 'adv');
            if (regexExpression) formData.append('regex', regexExpression);
          } else {
            formData.append('pdfoption', 'standard');
            formData.append('range_val', chunkSize.toString());
            formData.append('overlap', chunkOverlap.toString());
          }
        }

        const response = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData });
        if (!response.ok) throw new Error(`Upload failed for ${file.name}`);

        const fileId = `${Date.now()}_${file.name}`;
        const newFile: FileItem = {
          id: fileId,
          name: file.name,
          category: store,
          uploaded_at: new Date().toISOString(),
        };

        await setDoc(doc(db, 'users', user.uid, 'Files', fileId), {
          name: newFile.name,
          category: newFile.category,
          uploaded_at: newFile.uploaded_at,
        });

        addFile(newFile);
        added += 1;
      }

      setLocalFiles([]);
      setUploadPhase('done');
      setFlash({ kind: 'ok', msg: `Ingested ${added} file${added > 1 ? 's' : ''}. Opening workspace…` });
      setTimeout(() => onNavigateToChat(), 750);
    } catch (error: any) {
      setUploadPhase('idle');
      setFlash({ kind: 'err', msg: error?.message || 'Ingestion failed. Please try again.' });
    }
  };

  const handleSaveWebResource = async () => {
    if (!webUrl.trim() || !user) return;
    setWebPhase('working');
    setFlash(null);

    let normalizedUrl = webUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

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
      await setDoc(doc(db, 'users', user.uid, 'Files', fileId), {
        name: newFile.name,
        category: newFile.category,
        uploaded_at: newFile.uploaded_at,
        base_url: newFile.base_url,
      });

      addFile(newFile);
      setWebUrl('');
      setWebTitle('');
      setActiveContextFilters([fileId]);
      setWebPhase('done');
      setFlash({ kind: 'ok', msg: 'Web resource saved. Opening workspace…' });
      setTimeout(() => onNavigateToChat(), 750);
    } catch (error: any) {
      setWebPhase('idle');
      setFlash({ kind: 'err', msg: error?.message || 'Could not save web resource.' });
    }
  };

  const meta = activeNode === 'files'
    ? { index: '01', kicker: 'INGEST', glow: 'text-blue-500', led: 'bg-blue-500' }
    : { index: '02', kicker: 'LIVE WEB', glow: 'text-emerald-500', led: 'bg-emerald-500' };

  return (
    // pt-20 clears the floating absolute header (64px) + breathing room.
    <div className="relative h-full w-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors pt-20">
      <style>{ambientCss}</style>

      {/* ambient layer */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="cfg-grid absolute inset-0 opacity-60 dark:opacity-40 [--cfg-dot:rgba(100,116,139,0.16)] dark:[--cfg-dot:rgba(148,163,184,0.12)]" />
        <div className="cfg-drift absolute -left-24 top-10 h-80 w-80 rounded-full bg-blue-400/15 blur-3xl dark:bg-blue-600/10" />
        <div className="cfg-drift absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-emerald-400/12 blur-3xl dark:bg-emerald-600/10" style={{ animationDelay: '-12s' }} />
      </div>

      {/*  single control row: numbered headline (left) + toggle (extreme right).
             engine chip removed; eyebrow no longer duplicated inside the card. */}
      <div className="relative z-10 shrink-0 px-4 md:px-6 pt-1 pb-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="cfg-rise flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className={`cfg-ping absolute inline-flex h-full w-full rounded-full ${meta.led}`} />
              <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${meta.led}`} />
            </span>
            <span className="font-['Orbitron'] text-[11px] font-bold tabular-nums text-slate-300 dark:text-slate-600">{meta.index}</span>
            <span className={`font-['Orbitron'] text-[11px] font-semibold uppercase tracking-[0.28em] truncate ${meta.glow}`}>{meta.kicker}</span>
          </div>

          <NodeToggle
            value={activeNode}
            onChange={(v) => { setActiveNode(v); setFlash(null); }}
          />
        </div>
      </div>

      {/* content */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 md:px-6 pb-6">
        <div className="max-w-3xl mx-auto">

          {/* feedback banner */}
          {flash && (
            <div
              className={`cfg-rise mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${
                flash.kind === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/25 dark:text-emerald-300'
                  : 'border-red-200 bg-red-50 text-red-600 dark:border-red-800/60 dark:bg-red-900/25 dark:text-red-300'
              }`}
            >
              {flash.kind === 'ok' ? <Sparkles size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
              <span className="flex-1">{flash.msg}</span>
              {flash.kind === 'err' && (
                <button onClick={() => setFlash(null)} className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100" aria-label="Dismiss">
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* ===== FILE UPLOAD NODE ===== */}
          {activeNode === 'files' ? (
            <div className="cfg-rise bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-900/5 dark:shadow-black/30 p-4 md:p-6 space-y-5 md:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FileText size={18} className="text-blue-600 dark:text-blue-400" />
                  Document Ingestion
                </h3>
                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <span className={`text-xs md:text-sm font-medium transition-colors ${!isRegexMode ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>Standard</span>
                  <button
                    onClick={() => setIsRegexMode(!isRegexMode)}
                    className={`relative inline-flex h-7 w-12 md:h-6 md:w-11 items-center rounded-full transition-colors duration-300 ${isRegexMode ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                    aria-pressed={isRegexMode}
                  >
                    <span className={`inline-block h-5 w-5 md:h-4 md:w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${isRegexMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className={`text-xs md:text-sm font-medium transition-colors ${isRegexMode ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>Regex</span>
                </div>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onClick={() => document.getElementById('file-input')?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-6 md:p-9 text-center cursor-pointer transition-all duration-200 ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/30 scale-[1.01] shadow-lg shadow-blue-500/10'
                    : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/20'
                }`}
              >
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".pdf,.csv,.json,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={(e) => e.target.files && setLocalFiles((prev) => [...prev, ...Array.from(e.target.files!)])}
                />
                <Upload size={30} className={`mx-auto mb-2.5 transition-colors ${isDragOver ? 'text-blue-500 cfg-bob' : 'text-slate-400 dark:text-slate-500'}`} />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {isDragOver ? 'Release to ingest' : <>Drop files here or <span className="text-blue-600 dark:text-blue-400 underline underline-offset-2">browse</span></>}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">PDF, CSV, JSON, and Images (OCR) supported</p>
              </div>

              {localFiles.length > 0 && (
                <div className="space-y-2">
                  {localFiles.map((file, index) => {
                    const { store } = getFileCategory(file.name);
                    const m = TYPE_META[store] || FALLBACK_META;
                    return (
                      <div
                        key={`${file.name}-${index}`}
                        className="cfg-rise group relative flex items-center justify-between pl-4 pr-3 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 gap-3 overflow-hidden transition-all duration-150 hover:translate-x-0.5 hover:border-slate-300 dark:hover:border-slate-600"
                        style={{ animationDelay: `${index * 45}ms` }}
                      >
                        <span className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full ${m.bar}`} />
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white dark:bg-slate-800 ${m.tint} shadow-sm`}>
                            <m.Icon size={15} />
                          </span>
                          <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{file.name}</span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-all shrink-0 p-1.5 -mr-1.5 rounded-md hover:rotate-90 active:bg-red-50 dark:active:bg-red-900/30"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <Settings2 size={16} /> Processing Configuration
                </h4>
                {isRegexMode ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Regular Expression Pattern</label>
                    <input
                      type="text"
                      value={regexExpression}
                      onChange={(e) => setRegexExpression(e.target.value)}
                      placeholder="e.g., \b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b"
                      className="w-full px-3 md:px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base md:text-sm font-mono text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 outline-none transition-all"
                    />
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between mb-3">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Chunk Size</label>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md tabular-nums">{chunkSize}</span>
                      </div>
                      <input
                        type="range" min="100" max="4000" step="100" value={chunkSize}
                        onChange={(e) => setChunkSize(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between mt-1 text-xs text-slate-400 dark:text-slate-500 tabular-nums"><span>100</span><span>4000</span></div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-3">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Chunk Overlap</label>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md tabular-nums">{chunkOverlap}</span>
                      </div>
                      <input
                        type="range" min="0" max="1000" step="50" value={chunkOverlap}
                        onChange={(e) => setChunkOverlap(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between mt-1 text-xs text-slate-400 dark:text-slate-500 tabular-nums"><span>0</span><span>1000</span></div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleFileUpload}
                disabled={localFiles.length === 0 || uploadPhase !== 'idle'}
                className={`w-full py-3.5 md:py-3 font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm text-base md:text-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] disabled:translate-y-0 disabled:cursor-not-allowed ${
                  uploadPhase === 'done'
                    ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                    : 'bg-blue-600 text-white shadow-blue-500/25 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:shadow-none'
                }`}
              >
                {uploadPhase === 'working' ? (
                  <><Loader2 size={18} className="animate-spin" />Processing…</>
                ) : uploadPhase === 'done' ? (
                  <><Check size={18} />Ingested</>
                ) : (
                  <><Upload size={18} />Ingest {localFiles.length} File{localFiles.length !== 1 ? 's' : ''}</>
                )}
              </button>
            </div>
          ) : (
            /* ===== WEB RESOURCE NODE ===== */
            <div className="cfg-rise bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-900/5 dark:shadow-black/30 p-4 md:p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                  <Globe size={20} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100">Add Web Resource</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Register a live webpage to view directly in the chat workspace.</p>
                </div>
              </div>

              {webUrl.trim() && (
                <div className="cfg-rise bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-3">
                  <div className="relative w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                    <ExternalLink size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                      <span className="cfg-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-50 dark:ring-emerald-900/20" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 truncate">
                      {webTitle.trim() || new URL(webUrl.startsWith('http') ? webUrl : `https://${webUrl}`).hostname.replace('www.', '')}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">
                      {webUrl.startsWith('http') ? webUrl : `https://${webUrl}`}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <Link2 size={14} />
                  Webpage URL
                </label>
                <input
                  type="url"
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                  placeholder="https://docs.langchain.com or example.com"
                  className="w-full px-3 md:px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base md:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-900 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                  Display Name <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={webTitle}
                  onChange={(e) => setWebTitle(e.target.value)}
                  placeholder="e.g., LangChain Documentation"
                  className="w-full px-3 md:px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base md:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-900 outline-none transition-all"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  If left empty, the domain name will be used automatically.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 flex gap-3">
                <div className="shrink-0 mt-0.5">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    The webpage will open as a live, interactive webview inside the chat. Some websites may block iframe embedding due to their security policies (X-Frame-Options).
                  </p>
                </div>
              </div>

              <button
                onClick={handleSaveWebResource}
                disabled={!webUrl.trim() || webPhase !== 'idle'}
                className={`w-full py-3.5 md:py-3 font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm text-base md:text-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] disabled:translate-y-0 disabled:cursor-not-allowed ${
                  webPhase === 'done'
                    ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                    : 'bg-emerald-600 text-white shadow-emerald-500/25 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:shadow-none'
                }`}
              >
                {webPhase === 'working' ? (
                  <><Loader2 size={18} className="animate-spin" />Saving Resource…</>
                ) : webPhase === 'done' ? (
                  <><Check size={18} />Saved</>
                ) : (
                  <><ArrowRight size={18} />Save &amp; Open in Chat</>
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