// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { useTheme } from './hooks/useTheme';
import { useUserPreferences } from './hooks/useUserPreferences';
// Pages
import SplashScreen from './pages/SplashScreen';
import Authentication from './pages/Authentication';
import Workspace from './pages/Workspace';


const App = () => {
  
  useTheme(); 
  useUserPreferences();


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