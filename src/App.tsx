// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthListener } from './hooks/useAuthListener';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import SplashScreen from './pages/SplashScreen';
import Authentication from './pages/Authentication';
import Workspace from './pages/Workspace';

const App = () => {
  const { isAuthReady } = useAuthListener();

  // Global initialization loader while Firebase resolves the auth state
  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-medium tracking-wide">Initializing Secure Workspace...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Root route handles initial splash/intro logic */}
        <Route path="/" element={<SplashScreen />} />
        
        {/* Authentication routes */}
        <Route path="/auth" element={<Authentication />} />
        
        {/* Protected Application Routes */}
        <Route 
          path="/workspace" 
          element={
            <ProtectedRoute>
              <Workspace />
            </ProtectedRoute>
          } 
        />
        
        {/* Fallback for undefined routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;