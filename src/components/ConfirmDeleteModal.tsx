// src/components/ConfirmDeleteModal.tsx
import React from 'react';
import { X, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm }: Props) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-6 relative animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <Trash2 size={28} className="text-red-500 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Delete Chat</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Are you sure you want to delete this chat? This action cannot be undone and the history will be permanently lost.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm shadow-red-500/20"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;