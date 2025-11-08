import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import AuthPage from './components/login';
import ProfileDashboard from './components/profile';

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
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
            <Navigate to="/profile" replace /> : 
            <AuthPage setIsAuthenticated={setIsAuthenticated} />
          } 
        />
        <Route 
          path="/profile" 
          element={
            isAuthenticated ? 
            <ProfileDashboard /> : 
            <Navigate to="/login" replace />
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;