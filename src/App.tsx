// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthListener } from './hooks/useAuthListener';
import ProtectedRoute from './components/ProtectedRoute';
import { useTheme } from './hooks/useTheme';
// Pages
import SplashScreen from './pages/SplashScreen';
import Authentication from './pages/Authentication';
import Workspace from './pages/Workspace';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import orcaText from './assets/text.lottie'

const App = () => {
  const { isAuthReady } = useAuthListener();
  useTheme(); 

  // Global initialization loader while Firebase resolves the auth state
  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <DotLottieReact
            src={orcaText}
            autoplay
            loop={false}
            speed={1.0}
            className="w-full h-full"
          />
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