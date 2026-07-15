// src/pages/Workspace.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { LayoutDashboard, MessageSquare, Plus, PanelLeftClose, PanelLeftOpen, History, PanelLeft, X } from 'lucide-react';
import { auth, db } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import ChatConsole from '../components/ChatConsole';
import MessageFeed from '../components/MessageFeed';
import ConfigurationDashboard from '../components/ConfigurationDashboard';
import ConfirmLogoutModal from '../components/ConfirmLogoutModal';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import orcaText from "../assets/text.lottie";


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

  // Close mobile menu when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Real-time listener for Chat History
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "UserData"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title || 'Untitled Chat',
        createdAt: doc.data().createdAt
      }));
      setChatHistory(history);
    });
    return () => unsubscribe();
  }, [user, setChatHistory]);

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

  return (
    <div className="h-dvh bg-slate-50 flex overflow-hidden">
      <ConfirmLogoutModal 
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
      />

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar (Drawer on mobile, Static on desktop) */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 
        bg-white border-r border-slate-200 flex flex-col p-4 
        transition-all duration-300 ease-in-out 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-18' : 'md:w-64'}
        w-72
      `}>
        
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <DotLottieReact
            src={orcaText}
            autoplay
            loop={false}
            speed={1.0}
            className="w-full h-full"
          />
          </div>
          
          {/* Desktop Collapse Toggle */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          {/* Mobile Close Toggle */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <button 
          onClick={handleNewChat}
          className={`w-full flex items-center gap-3 px-3 py-2.5 mb-4 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium border border-blue-100 ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center' : ''}`}
        >
          <Plus size={20} className="shrink-0" />
          <span className={`whitespace-nowrap ${isCollapsed && !isMobileMenuOpen ? 'md:hidden' : ''}`}>New Chat</span>
        </button>

        {!isCollapsed || isMobileMenuOpen ? (
          <div className="mb-4">
            <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <History size={12} /> History
            </h3>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {chatHistory.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => handleLoadChat(chat.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate flex items-center gap-2 ${
                    currentChatId === chat.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <MessageSquare size={14} className="shrink-0" />
                  <span className="truncate flex-1">{chat.title}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-4 flex justify-center">
            <History size={18} className="text-slate-400" />
          </div>
        )}
        
        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => { setActiveTab('chat'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'chat' ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'} ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center' : ''}`}
          >
            <MessageSquare size={20} className="shrink-0" />
            <span className={`whitespace-nowrap ${isCollapsed && !isMobileMenuOpen ? 'md:hidden' : ''}`}>Agent Chat</span>
          </button>
          <button 
            onClick={() => { setActiveTab('config'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'config' ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'} ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center' : ''}`}
          >
            <LayoutDashboard size={20} className="shrink-0" />
            <span className={`whitespace-nowrap ${isCollapsed && !isMobileMenuOpen ? 'md:hidden' : ''}`}>Configuration</span>
          </button>
        </nav>

        <div className="border-t border-slate-200 pt-4 mt-4">
          <div className={`px-2 mb-4 flex items-center gap-3 ${isCollapsed && !isMobileMenuOpen ? 'md:justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-slate-600 font-semibold">
              {user?.profile!==undefined? <img className='rounded-full' src={user.profile} alt="U" />:user?.name?.charAt(0).toUpperCase() || 'U'}
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
        <header className="h-16 bg-white flex items-center px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Top Left Mobile Menu Toggle */}
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
        
        {/* Content Container - strictly bounded height */}
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