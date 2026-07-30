// src/pages/Workspace.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import {
  LayoutDashboard, MessageSquare, Plus, PanelLeftClose, PanelLeftOpen,
  History, PanelLeft, X, MoreVertical, Pin, Pencil, Trash2, Check, Sun, Moon, Monitor,
  ChevronDown, Search
} from 'lucide-react';
import { auth, db } from '../../firebaseConfig';
import {
  collection, addDoc, serverTimestamp, query, onSnapshot, doc,
  getDoc, setDoc, deleteDoc, updateDoc
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import ChatConsole from '../components/ChatConsole';
import MessageFeed from '../components/MessageFeed';
import ConfigurationDashboard from '../components/ConfigurationDashboard';
import ConfirmLogoutModal from '../components/ConfirmLogoutModal';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import orcaText from "../assets/text.lottie";
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

/* ------------------------------------------------------------------ */
/*  Model registry — `id` is the exact string sent in the payload      */
/* ------------------------------------------------------------------ */
interface ModelDef {
  id: string;
  provider: string;
  name: string;
  tag: string;
  tone: 'emerald' | 'sky' | 'fuchsia' | 'indigo';
}

const MODELS: ModelDef[] = [
  { id: 'openai/gpt-oss-20b',            provider: 'OpenAI',  name: 'gpt-oss-20b',            tag: 'Efficient',  tone: 'emerald' },
  { id: 'openai/gpt-oss-120b',           provider: 'OpenAI',  name: 'gpt-oss-120b',           tag: 'Powerful',   tone: 'emerald' },
  { id: 'openai/gpt-oss-safeguard-20b',  provider: 'OpenAI',  name: 'gpt-oss-safeguard-20b',  tag: 'Guarded',    tone: 'emerald' },
  { id: 'qwen/qwen3.6-27b',              provider: 'Qwen',    name: 'qwen3.6-27b',            tag: 'Reasoning',  tone: 'sky' },
  { id: 'minimaxai/minimax-m2.7',        provider: 'MiniMax', name: 'minimax-m2.7',           tag: 'Multimodal', tone: 'fuchsia' },
  { id: 'llama-3.3-70b-versatile',       provider: 'Meta',    name: 'llama-3.3-70b-versatile', tag: 'Versatile',  tone: 'indigo' },
  { id: 'llama-3.1-8b-instant',          provider: 'Meta',    name: 'llama-3.1-8b-instant',    tag: 'Instant',    tone: 'indigo' },
];

/* Static class maps per tone (kept literal so Tailwind never purges them) */
const TONE: Record<ModelDef['tone'], { dot: string; bar: string; sel: string; chip: string }> = {
  emerald: { dot: 'bg-emerald-500', bar: 'bg-emerald-500', sel: 'bg-emerald-50 dark:bg-emerald-500/10',  chip: 'text-emerald-600 dark:text-emerald-400' },
  sky:     { dot: 'bg-sky-500',     bar: 'bg-sky-500',     sel: 'bg-sky-50 dark:bg-sky-500/10',          chip: 'text-sky-600 dark:text-sky-400' },
  fuchsia: { dot: 'bg-fuchsia-500', bar: 'bg-fuchsia-500', sel: 'bg-fuchsia-50 dark:bg-fuchsia-500/10',  chip: 'text-fuchsia-600 dark:text-fuchsia-400' },
  indigo:  { dot: 'bg-indigo-500',  bar: 'bg-indigo-500',  sel: 'bg-indigo-50 dark:bg-indigo-500/10',    chip: 'text-indigo-600 dark:text-indigo-400' },
};

/* ------------------------------------------------------------------ */
/*  Model selector (header center)                                     */
/* ------------------------------------------------------------------ */
const ModelSelector = () => {
  const selectedModel = useStore((s) => s.selectedModel);
  const setSelectedModel = useStore((s) => s.setSelectedModel);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const current = MODELS.find((m) => m.id === selectedModel) || MODELS[0];
  const tone = TONE[current.tone];

  const filtered = MODELS.filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.provider.toLowerCase().includes(q) ||
      m.tag.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (id: string) => {
    setSelectedModel(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger pill */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="group relative flex items-center gap-2 max-w-[46vw] md:max-w-[220px] px-2.5 md:px-3 py-1.5 rounded-xl
          border border-slate-200/70 dark:border-slate-600/50
          bg-white/60 dark:bg-slate-700/40 backdrop-blur-md
          hover:bg-white/90 dark:hover:bg-slate-700/70 hover:-translate-y-0.5 hover:shadow-md
          active:scale-[0.97] transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
      >
        {/* Live status dot */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span className={`absolute inline-flex h-full w-full rounded-full ${tone.dot} opacity-40 animate-ping`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${tone.dot}`} />
        </span>

        <span className="flex flex-col items-start min-w-0 leading-none">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 hidden sm:block">
            {current.provider}
          </span>
          <span className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-100 truncate max-w-[34vw] md:max-w-[150px]">
            {current.name}
          </span>
        </span>

        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className="absolute left-full -translate-x-1/2 top-full mt-2 w-72 max-w-[88vw] z-50
            bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl
            border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/40
            overflow-hidden animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-150"
        >
          {/* Search */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-700/70">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search models…"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-slate-100/80 dark:bg-slate-900/60
                  border border-transparent focus:border-blue-400/60 focus:bg-white dark:focus:bg-slate-900
                  text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500
                  outline-none transition-colors"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-slate-400 dark:text-slate-500">No models match “{query}”.</p>
            ) : (
              filtered.map((m) => {
                const t = TONE[m.tone];
                const active = m.id === selectedModel;
                return (
                  <button
                    key={m.id}
                    role="option"
                    aria-selected={active}
                    onClick={() => pick(m.id)}
                    className={`group relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left
                      transition-all duration-150 hover:translate-x-0.5
                      ${active ? t.sel : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}
                  >
                    {active && (
                      <span className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full ${t.bar}`} />
                    )}
                    <span className={`h-2 w-2 rounded-full shrink-0 ${t.dot} ${active ? '' : 'opacity-70 group-hover:opacity-100'} transition-opacity`} />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{m.name}</span>
                      <span className="block truncate text-[11px] text-slate-400 dark:text-slate-500">
                        {m.provider} <span className="opacity-50">·</span> <span className={t.chip}>{m.tag}</span>
                      </span>
                    </span>
                    {active && (
                      <Check size={15} className={`shrink-0 ${t.chip} animate-in zoom-in-90 duration-100`} />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer hint */}
          <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700/70 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
            <span>{MODELS.length} models available</span>
            <span className="hidden sm:inline">Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Workspace                                                          */
/* ------------------------------------------------------------------ */
const Workspace = () => {
  const user = useStore((state) => state.user);
  const clearChat = useStore((state) => state.clearChat);
  const setMessages = useStore((state) => state.setMessages);
  const setCurrentChatId = useStore((state) => state.setCurrentChatId);
  const setChatHistory = useStore((state) => state.setChatHistory);
  const chatHistory = useStore((state) => state.chatHistory);
  const currentChatId = useStore((state) => state.currentChatId);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'chat' | 'config'>('chat');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "UserData"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let history = snapshot.docs.map(d => ({
        id: d.id,
        title: d.data().title || 'Untitled Chat',
        createdAt: d.data().createdAt,
        pinned: d.data().pinned || false
      }));
      history.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setChatHistory(history);
    });
    return () => unsubscribe();
  }, [user, setChatHistory]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveCurrentChat();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      saveCurrentChat();
    };
  }, []);

  const saveCurrentChat = async () => {
    const { messages, currentChatId, user } = useStore.getState();
    if (messages.length === 0 || !user) return null;
    try {
      const firstUserMsg = messages.find(m => m.role === 'user');
      const title = firstUserMsg ? firstUserMsg.content.substring(0, 40) + (firstUserMsg.content.length > 40 ? '...' : '') : 'Untitled Chat';
      if (currentChatId) {
        await setDoc(doc(db, "users", user.uid, "UserData", currentChatId), { title, messages, updatedAt: serverTimestamp() }, { merge: true });
        return currentChatId;
      } else {
        const docRef = await addDoc(collection(db, "users", user.uid, "UserData"), { title, messages, createdAt: serverTimestamp() });
        return docRef.id;
      }
    } catch (error) {
      console.error("Error saving chat:", error);
      return null;
    }
  };

  const handleNewChat = async () => {
    await saveCurrentChat();
    clearChat();
    setActiveTab('chat');
    setIsMobileMenuOpen(false);
  };

  const handleLoadChat = async (chatId: string) => {
    if (chatId === currentChatId || !user) return;
    await saveCurrentChat();
    try {
      const chatDoc = await getDoc(doc(db, "users", user.uid, "UserData", chatId));
      if (chatDoc.exists()) {
        setMessages(chatDoc.data().messages || []);
        setCurrentChatId(chatId);
        setActiveTab('chat');
        setIsMobileMenuOpen(false);
      }
    } catch (error) {
      console.error("Error loading chat:", error);
    }
  };

  const handleLogoutConfirm = async () => {
    setIsLogoutModalOpen(false);
    await saveCurrentChat();
    await auth.signOut();
    navigate('/auth');
  };

  const handleDeleteChat = (chatId: string) => {
    setChatToDelete(chatId);
    setIsDeleteModalOpen(true);
    setOpenMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!user || !chatToDelete) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "UserData", chatToDelete));
      if (currentChatId === chatToDelete) clearChat();
    } catch (error) {
      console.error("Error deleting chat:", error);
    } finally {
      setIsDeleteModalOpen(false);
      setChatToDelete(null);
    }
  };

  const handleTogglePin = async (chatId: string, currentPinned: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "UserData", chatId), { pinned: !currentPinned });
    } catch (error) {
      console.error("Error pinning chat:", error);
    }
    setOpenMenuId(null);
  };

  const handleStartRename = (chatId: string, currentTitle: string) => {
    setRenamingId(chatId);
    setRenameValue(currentTitle);
    setOpenMenuId(null);
  };

  const handleConfirmRename = async (chatId: string) => {
    if (!user || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await updateDoc(doc(db, "users", user.uid, "UserData", chatId), { title: renameValue.trim() });
    } catch (error) {
      console.error("Error renaming chat:", error);
    }
    setRenamingId(null);
  };

  const handleHeaderPanelToggle = () => {
    if (window.innerWidth < 768) {
      setIsMobileMenuOpen(true);
    } else {
      setIsCollapsed(prev => !prev);
    }
  };

  return (
    <div className="h-dvh bg-slate-50 dark:bg-slate-900 flex overflow-hidden transition-colors">
      <ConfirmLogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setChatToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <aside className={`fixed md:relative inset-y-0 left-0 z-50 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col p-4 h-full transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${isCollapsed ? 'md:w-18' : 'md:w-64'} w-72`}>
        <div className="flex items-center justify-between mb-4 px-2 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden h-8">
            <DotLottieReact src={orcaText} autoplay loop={false} speed={1.0} className="w-full h-full" />
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            <PanelLeftClose size={22} />
          </button>
        </div>
        <button
          onClick={handleNewChat}
          className={`w-full flex items-center gap-3 px-3 py-2.5 mb-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors font-medium border border-blue-100 dark:border-blue-800 shrink-0 ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center' : ''}`}
        >
          <Plus size={20} className="shrink-0" />
          <span className={`whitespace-nowrap ${isCollapsed && !isMobileMenuOpen ? 'md:hidden' : ''}`}>New Chat</span>
        </button>
        <nav className="flex-col space-y-2 shrink-0">
          <button
            onClick={() => { setActiveTab('chat'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'chat' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'} ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center' : ''}`}
          >
            <MessageSquare size={20} className="shrink-0" />
            <span className={`whitespace-nowrap ${isCollapsed && !isMobileMenuOpen ? 'md:hidden' : ''}`}>Chat</span>
          </button>
          <button
            onClick={() => { setActiveTab('config'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'config' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'} ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center' : ''}`}
          >
            <LayoutDashboard size={20} className="shrink-0" />
            <span className={`whitespace-nowrap ${isCollapsed && !isMobileMenuOpen ? 'md:hidden' : ''}`}>Configuration</span>
          </button>
        </nav>
        {(!isCollapsed || isMobileMenuOpen) ? (
          <div className="flex-1 min-h-0 flex flex-col mt-4 mb-4">
            <h3 className="px-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2 shrink-0">
              <History size={12} /> History
            </h3>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
              {chatHistory.map((chat) => (
                <div key={chat.id} className="relative group">
                  {renamingId === chat.id ? (
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRename(chat.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        onBlur={() => handleConfirmRename(chat.id)}
                        className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-slate-800 dark:text-slate-100"
                        autoFocus
                      />
                      <button onClick={() => handleConfirmRename(chat.id)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"><Check size={14} /></button>
                      <button onClick={() => setRenamingId(null)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"><X size={14} /></button>
                    </div>
                  ) : (
                    <div
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${currentChatId === chat.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                    >
                      <button
                        className="flex items-center gap-2 flex-1 min-w-0"
                        onClick={() => handleLoadChat(chat.id)}
                      >
                        {chat.pinned && <Pin size={12} className="shrink-0 text-blue-500 dark:text-blue-400 fill-blue-500 dark:fill-blue-400" />}
                        <MessageSquare size={14} className="shrink-0" />
                        <span className="truncate">{chat.title}</span>
                      </button>
                      <div className="relative shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === chat.id ? null : chat.id);
                          }}
                          className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-opacity ${openMenuId === chat.id || currentChatId === chat.id ? 'opacity-100' : 'opacity-100 group-hover:opacity-100'}`}
                        >
                          <MoreVertical size={14} />
                        </button>
                        {openMenuId === chat.id && (
                          <div
                            className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 py-1 animate-in fade-in zoom-in-95 duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleTogglePin(chat.id, chat.pinned || false)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              <Pin size={14} className={chat.pinned ? "fill-blue-500 text-blue-500 dark:fill-blue-400 dark:text-blue-400" : ""} />
                              {chat.pinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button
                              onClick={() => handleStartRename(chat.id, chat.title)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              <Pencil size={14} />
                              Rename
                            </button>
                            <button
                              onClick={() => handleDeleteChat(chat.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex items-start justify-center mt-4 mb-4">
            <div className="hover:bg-slate-50 dark:hover:bg-slate-700 p-2 rounded cursor-pointer" onClick={() => setIsCollapsed(false)}>
              <History size={18} className="text-slate-400 dark:text-slate-500" />
            </div>
          </div>
        )}
        <div className={`px-2 mb-4 shrink-0 ${isCollapsed && !isMobileMenuOpen ? 'md:flex md:justify-center' : ''}`}>
          <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1 gap-1">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-colors ${theme === 'light' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              title="Light"
            >
              <Sun size={16} />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-colors ${theme === 'dark' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              title="Dark"
            >
              <Moon size={16} />
            </button>
            <button
              onClick={() => setTheme('auto')}
              className={`flex-1 flex items-center justify-center py-1.5 rounded-md transition-colors ${theme === 'auto' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              title="System"
            >
              <Monitor size={16} />
            </button>
          </div>
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 shrink-0">
          <div className={`px-2 mb-4 flex items-center gap-3 ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-200 font-semibold overflow-hidden">
              {user?.profile ? (
                <img className='w-full h-full object-cover rounded-full' src={user.profile} alt="U" referrerPolicy="no-referrer" />
              ) : (
                user?.name?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div className={`overflow-hidden ${isCollapsed && !isMobileMenuOpen ? 'md:hidden' : ''}`}>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center' : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
            <span className={`text-sm font-medium whitespace-nowrap ${isCollapsed && !isMobileMenuOpen ? 'md:hidden' : ''}`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-16 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 shrink-0 z-30 absolute top-0 w-full">
          {/* Left: panel toggle + logo */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={handleHeaderPanelToggle}
              className="p-2 -ml-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-500/10 rounded-lg transition-all duration-200 active:scale-95"
              title="Toggle Side Panel"
            >
              {isCollapsed ? <PanelLeftOpen size={22} /> : <PanelLeft size={22} />}
            </button>
            {/* <div className="flex items-center overflow-hidden h-8 w-20 sm:w-28">
              <DotLottieReact src={orcaText} autoplay loop={false} speed={1.0} className="w-full h-full" />
            </div> */}
          </div>

          {/* Center: model selector (replaces the ORCA title) */}
          <div className="flex-1 flex min-w-0 px-2">
            <ModelSelector />
          </div>

          {/* Right: new chat */}
          <button
            onClick={handleNewChat}
            className="group p-1.5 bg-transparent text-blue-600 dark:text-blue-300 border border-blue-400/30 dark:border-blue-400/25 rounded-lg shadow-md hover:bg-blue-500/25 dark:hover:bg-blue-400/25 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200"
            title="New Chat"
          >
            <Plus size={20} className="transition-transform duration-300 ease-out group-hover:rotate-90" />
          </button>
        </header>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeTab === 'chat' ? (
            <div className="flex-1 flex flex-col min-h-0 relative">
              <MessageFeed />
              <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none">
                <div className="pointer-events-auto">
                  <ChatConsole />
                </div>
              </div>
            </div>
          ) : (
            <ConfigurationDashboard onNavigateToChat={handleNewChat} />
          )}
        </div>
      </main>
    </div>
  );
};

export default Workspace;