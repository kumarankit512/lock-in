import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './components/login';
import FocusAndHabits from './components/FocusAndHabits';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<AuthPage />} />
        {/* Add other routes here */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;