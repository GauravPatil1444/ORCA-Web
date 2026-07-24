// src/pages/Workspace.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
  LayoutDashboard, MessageSquare, Plus, PanelLeftClose, PanelLeftOpen, 
  History, PanelLeft, X, MoreVertical, Pin, Pencil, Trash2, Check 
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
  
  // Chat Management States
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

  // Close mobile menu when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  // Real-time listener for Chat History (Sorted in memory to avoid Firebase composite index issues)
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
      
      // Sort: Pinned first, then by createdAt descending
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

  // Auto-save on tab close / hide
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

  // --- Chat Management Actions ---
    // Opens the modal and stores the ID
  const handleDeleteChat = (chatId: string) => {
    setChatToDelete(chatId);
    setIsDeleteModalOpen(true);
    setOpenMenuId(null); // Close the three-dots dropdown menu
  };

  // Executes the deletion when "Delete" is clicked in the modal
  const handleConfirmDelete = async () => {
    if (!user || !chatToDelete) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "UserData", chatToDelete));
      // If the user deleted the chat they were currently viewing, clear the screen
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

  return (
    <div className="h-dvh bg-slate-50 flex overflow-hidden">
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

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 
        bg-white border-r border-slate-200 flex flex-col p-4 h-full
        transition-all duration-300 ease-in-out 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-18' : 'md:w-64'}
        w-72
      `}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-2 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden h-8">
            <DotLottieReact src={orcaText} autoplay loop={false} speed={1.0} className="w-full h-full" />
          </div>
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            <PanelLeftClose size={22} />
          </button>
        </div>

        {/* New Chat */}
        <button 
          onClick={handleNewChat}
          className={`w-full flex items-center gap-3 px-3 py-2.5 mb-4 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium border border-blue-100 shrink-0 ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center' : ''}`}
        >
          <Plus size={20} className="shrink-0" />
          <span className={`whitespace-nowrap ${isCollapsed && !isMobileMenuOpen ? 'md:hidden' : ''}`}>New Chat</span>
        </button>

        {/* Nav */}
        <nav className="flex-col space-y-2 shrink-0">
          <button 
            onClick={() => { setActiveTab('chat'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'chat' ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'} ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center' : ''}`}
          >
            <MessageSquare size={20} className="shrink-0" />
            <span className={`whitespace-nowrap ${isCollapsed && !isMobileMenuOpen ? 'md:hidden' : ''}`}>Chat</span>
          </button>
          <button 
            onClick={() => { setActiveTab('config'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'config' ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'} ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center' : ''}`}
          >
            <LayoutDashboard size={20} className="shrink-0" />
            <span className={`whitespace-nowrap ${isCollapsed && !isMobileMenuOpen ? 'md:hidden' : ''}`}>Configuration</span>
          </button>
        </nav>

        {/* History Section (Takes up all remaining vertical space) */}
        {(!isCollapsed || isMobileMenuOpen) ? (
          <div className="flex-1 min-h-0 flex flex-col mt-4 mb-4">
            <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2 shrink-0">
              <History size={12} /> History
            </h3>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
              {chatHistory.map((chat) => (
                <div key={chat.id} className="relative group">
                  {renamingId === chat.id ? (
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRename(chat.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        onBlur={() => handleConfirmRename(chat.id)}
                        className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-slate-800"
                        autoFocus
                      />
                      <button onClick={() => handleConfirmRename(chat.id)} className="text-blue-600 hover:text-blue-800"><Check size={14} /></button>
                      <button onClick={() => setRenamingId(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                    </div>
                  ) : (
                    <div
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                        currentChatId === chat.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <button 
                        className="flex items-center gap-2 flex-1 min-w-0"
                        onClick={() => handleLoadChat(chat.id)}
                      >
                        {chat.pinned && <Pin size={12} className="shrink-0 text-blue-500 fill-blue-500" />}
                        <MessageSquare size={14} className="shrink-0" />
                        <span className="truncate">{chat.title}</span>
                      </button>
                      
                      {/* Three Dots Menu */}
                      <div className="relative shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === chat.id ? null : chat.id);
                          }}
                          className={`p-1 rounded hover:bg-slate-200 transition-opacity ${
                            openMenuId === chat.id || currentChatId === chat.id ? 'opacity-100' : 'opacity-100 group-hover:opacity-100'
                          }`}
                        >
                          <MoreVertical size={14} />
                        </button>

                        {openMenuId === chat.id && (
                          <div 
                            className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 animate-in fade-in zoom-in-95 duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleTogglePin(chat.id, chat.pinned || false)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <Pin size={14} className={chat.pinned ? "fill-blue-500 text-blue-500" : ""} />
                              {chat.pinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button
                              onClick={() => handleStartRename(chat.id, chat.title)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <Pencil size={14} />
                              Rename
                            </button>
                            <button
                              onClick={() => handleDeleteChat(chat.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
             <div className="hover:bg-slate-50 p-2 rounded cursor-pointer" onClick={()=>setIsCollapsed(false)}>
               <History size={18} className="text-slate-400" />
             </div>
          </div>
        )}

        {/* Profile & Logout (Permanently anchored to the bottom) */}
        <div className="border-t border-slate-200 pt-4 shrink-0">
          <div className={`px-2 mb-4 flex items-center gap-3 ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-slate-600 font-semibold overflow-hidden">
              {user?.profile ? (
                <img className='w-full h-full object-cover rounded-full' src={user.profile} alt="U" referrerPolicy="no-referrer" />
              ) : (
                user?.name?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div className={`overflow-hidden ${isCollapsed && !isMobileMenuOpen ? 'md:hidden' : ''}`}>
              <p className="text-sm font-medium text-slate-800 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || ''}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center' : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            <span className={`text-sm font-medium whitespace-nowrap ${isCollapsed && !isMobileMenuOpen ? 'md:hidden' : ''}`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-16 bg-white flex items-center px-4 md:px-6 shrink-0 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
              title="Open Menu"
            >
              <PanelLeft size={22} />
            </button>
            <h2 className="text-lg font-semibold text-slate-800 truncate">
              {activeTab === 'chat' ? 'ORCA' : 'Ingestion Configuration'}
            </h2>
          </div>
        </header>
        
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeTab === 'chat' ? (
            <>
              <MessageFeed />
              <ChatConsole />
            </>
          ) : (
            <ConfigurationDashboard onNavigateToChat={handleNewChat} />
          )}
        </div>
      </main>
    </div>
  );
};

export default Workspace;