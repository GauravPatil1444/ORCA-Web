// src/components/KnowledgeBaseModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Plus, X, FileText, Globe, Database, ImageIcon, Check, Search, Sparkles,
} from 'lucide-react';

/* source-type identity — same palette the rest of the app uses for citations */
const META: Record<string, { Icon: any; tint: string; dot: string }> = {
  web_page:     { Icon: Globe,     tint: 'text-emerald-500', dot: 'bg-emerald-500' },
  csv:          { Icon: Database,  tint: 'text-amber-500',   dot: 'bg-amber-500' },
  json:         { Icon: Database,  tint: 'text-amber-500',   dot: 'bg-amber-500' },
  image:        { Icon: ImageIcon, tint: 'text-fuchsia-500', dot: 'bg-fuchsia-500' },
  pdf_standard: { Icon: FileText,  tint: 'text-blue-500',    dot: 'bg-blue-500' },
  pdf_regex:    { Icon: FileText,  tint: 'text-blue-500',    dot: 'bg-blue-500' },
};
const FALLBACK = { Icon: FileText, tint: 'text-blue-500', dot: 'bg-blue-500' };
const metaFor = (c: string) => META[c] || FALLBACK;

const KnowledgeBaseModal = () => {
  const { files, activeContextFilters, setActiveContextFilters } = useStore();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const toggle = (id: string) =>
    setActiveContextFilters(
      activeContextFilters.includes(id)
        ? activeContextFilters.filter((x) => x !== id)
        : [...activeContextFilters, id]
    );

  const selectAll = () =>
    setActiveContextFilters(
      activeContextFilters.length === files.length ? [] : files.map((f) => f.id)
    );

  /* click-outside (pointer covers mouse + touch + pen) and Esc to dismiss */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const scoped = activeContextFilters.length;

  return (
    /* wrapper is the positioning context; it sits inline in the chat form */
    <div ref={wrapRef} className="relative mb-0.5 shrink-0">
      {/* trigger — identical footprint to the old + button, alive when open */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Knowledge Base Context"
        className={`p-2.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 ${
          open
            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-200 dark:ring-blue-800'
            : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
        }`}
      >
        <Plus size={20} className={`transition-transform duration-300 ${open ? 'rotate-45' : ''}`} />
      </button>

      {/* live scoping pip on the trigger */}
      {scoped > 0 && !open && (
        <span className="pointer-events-none absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-800">
          {scoped}
        </span>
      )}

      {/* the popover — floats above the input */}
      {open && (
        <div
          role="dialog"
          aria-label="Knowledge base context"
          className="absolute bottom-full left-0 z-50 mb-3 w-80 max-w-[calc(100vw-2rem)]
            flex max-h-[min(72vh,26rem)] flex-col overflow-hidden rounded-2xl
            border border-slate-200 bg-white/95 shadow-2xl shadow-slate-900/15 backdrop-blur-xl
            animate-in fade-in slide-in-from-bottom-2 zoom-in-95 duration-150
            dark:border-slate-700 dark:bg-slate-800/95 dark:shadow-black/50"
        >
          {/* header */}
          <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3.5">
            <div className="min-w-0">
              <p className="font-['Orbitron'] text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                Context
              </p>
              <h3 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                Knowledge Base
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                {scoped}/{files.length}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* search */}
          <div className="px-3 pb-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} /* don't submit the chat form */
                placeholder="Search your sources…"
                autoFocus
                className="w-full rounded-lg border border-transparent bg-slate-100/80 py-2 pl-8 pr-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400/60 focus:bg-white dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
              />
            </div>
          </div>

          {/* select-all row */}
          <div className="flex items-center justify-between border-y border-slate-100 px-4 py-2 dark:border-slate-700/70">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {scoped === files.length && files.length > 0 ? 'Clear all' : 'Select all'}
            </button>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <span className={`h-1.5 w-1.5 rounded-full ${scoped > 0 ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
              {scoped > 0 ? 'Manual scope' : 'Auto route'}
            </span>
          </div>

          {/* list */}
          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {files.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 dark:bg-slate-700/60">
                  <FileText size={20} className="text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No sources yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Upload documents or add a web resource in Configuration.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                Nothing matches “{search}”.
              </p>
            ) : (
              <div className="space-y-0.5">
                {filtered.map((file) => {
                  const on = activeContextFilters.includes(file.id);
                  const { Icon, tint, dot } = metaFor(file.category);
                  return (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => toggle(file.id)}
                      className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150 hover:translate-x-0.5 ${
                        on ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                      }`}
                    >
                      {on && (
                        <span className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-full bg-blue-500" />
                      )}
                      {/* checkbox */}
                      <span
                        className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[6px] border-2 transition-all duration-150 ${
                          on
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-slate-300 group-hover:border-slate-400 dark:border-slate-600'
                        }`}
                      >
                        {on && <Check size={11} className="text-white animate-in zoom-in-90 duration-100" />}
                      </span>
                      {/* type glyph */}
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 dark:bg-slate-700/50 ${tint}`}>
                        <Icon size={15} />
                      </span>
                      {/* label */}
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm font-medium ${on ? 'text-blue-700 dark:text-blue-200' : 'text-slate-700 dark:text-slate-200'}`}>
                          {file.name}
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] capitalize text-slate-400 dark:text-slate-500">
                          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                          {file.category.replace(/_/g, ' ')}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* footer hint */}
          <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 dark:border-slate-700/70 dark:bg-slate-900/40">
            <Sparkles size={13} className="mt-0.5 shrink-0 text-blue-500" />
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {scoped === 0
                ? 'Auto mode — the agent searches every source and decides what to cite.'
                : `Scoped — the agent reads only the ${scoped} selected source${scoped > 1 ? 's' : ''}.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseModal;