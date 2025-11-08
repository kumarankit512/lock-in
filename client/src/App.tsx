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
        <FocusAndHabits showDebug
          onStatusChange={(s) => console.log("status:", s)}
          onPaused={() => console.log("paused")}
          onResume={() => console.log("resume")}
          onEndSession={() => console.log("end session")} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;