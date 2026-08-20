import { Routes, Route } from 'react-router-dom';
import { Splash } from './pages/splash';
import { Landing } from './pages/landing';

function LoginPlaceholder() {
  return (
    <div style={{ padding: 40 }}>Login (placeholder, en construcción)</div>
  );
}

function RegisterPlaceholder() {
  return (
    <div style={{ padding: 40 }}>Registro (placeholder, en construcción)</div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<LoginPlaceholder />} />
      <Route path="/register" element={<RegisterPlaceholder />} />
    </Routes>
  );
}

export default App;
