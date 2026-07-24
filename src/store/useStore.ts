// src/store/useStore.ts
import { create } from 'zustand';

export interface Source {
  source?: string;
  file_name?: string;
  name?: string;
  document?: string;
  category: string; 
  snippet?: string; 
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Source[];
  owst_url?: string; // Simple raw URL
}

export interface FileItem {
  id: string;
  name: string;
  category: 'pdf_standard' | 'pdf_regex' | 'csv' | 'json' | 'web_page';
  uploaded_at: string;
  base_url?: string;
  excluded_css_classes?: string[];
}

export interface User {
  uid: string;
  name: string;
  email: string;
  profile?: string|undefined; 
}

export interface ChatHistoryItem {
  id: string;
  title: string;
  createdAt: any;
  pinned?: boolean; 
}

interface AppState {
  user: User | null;
  files: FileItem[];
  messages: Message[];
  isStreaming: boolean;
  activeContextFilters: string[]; 
  chatHistory: ChatHistoryItem[];
  currentChatId: string | null;
  
  setUser: (user: User | null) => void;
  setFiles: (files: FileItem[]) => void;
  addFile: (file: FileItem) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, content: string) => void;
  updateMessageSources: (id: string, sources: Source[]) => void;
  updateMessageOwstUrl: (id: string, url: string) => void;
  setStreaming: (streaming: boolean) => void;
  setActiveContextFilters: (filters: string[]) => void;
  clearChat: () => void;
  setChatHistory: (history: ChatHistoryItem[]) => void;
  setCurrentChatId: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  files: [],
  messages: [],
  isStreaming: false,
  activeContextFilters: [],
  chatHistory: [],
  currentChatId: null,
  
  setUser: (user) => set({ user }),
  setFiles: (files) => set({ files }),
  addFile: (file) => set((state) => ({ files: [...state.files, file] })),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, content) => set((state) => ({
    messages: state.messages.map(m => m.id === id ? { ...m, content } : m)
  })),
  updateMessageSources: (id, sources) => set((state) => ({
    messages: state.messages.map(m => m.id === id ? { ...m, sources } : m)
  })),
  updateMessageOwstUrl: (id, url) => set((state) => ({
    messages: state.messages.map(m => m.id === id ? { ...m, owst_url: url } : m)
  })),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setActiveContextFilters: (filters) => set({ activeContextFilters: filters }),
  clearChat: () => set({ messages: [], currentChatId: null }),
  setChatHistory: (history) => set({ chatHistory: history }),
  setCurrentChatId: (id) => set({ currentChatId: id }),
  setMessages: (messages) => set({ messages }),
}));