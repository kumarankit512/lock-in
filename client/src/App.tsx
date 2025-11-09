import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import AuthPage from './components/login.js';
import ProfileDashboard from './components/profile.js';
import StudySessionPage from "./components/StudySessionPage.js";
import PresetsPage from "./components/PresetsPage.js";




function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already logged in when app loads
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root path to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Login route — after successful login/signup go to /presets */}
        {/* Add other routes here */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
            <Navigate to="/presets" replace /> : 
            <AuthPage setIsAuthenticated={setIsAuthenticated} />
          } 
        />

        {/* Profile page — only accessible when logged in */}
        <Route 
          path="/profile" 
          element={
            isAuthenticated ? 
            <ProfileDashboard /> : 
            <Navigate to="/login" replace />
          } 
        />

        {/* Presets page — only accessible when logged in */}
        <Route 
          path="/presets" 
          element={
            isAuthenticated ? 
            <PresetsPage /> : 
            <Navigate to="/login" replace />
          } 
        />

        {/* Study session page — only accessible when logged in */}
        <Route 
          path="/session" 
          element={
            isAuthenticated ? 
            <StudySessionPage /> : 
            <Navigate to="/login" replace />
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;