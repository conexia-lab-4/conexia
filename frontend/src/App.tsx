import { Routes, Route } from 'react-router-dom';
import { Splash } from './pages/splash';
import { Landing } from './pages/landing';
import { Login } from './pages/login';
import { Register } from './pages/register';
import { VerifyEmail } from './pages/verifyEmail';
import { Questionnaire } from './pages/questionnaire';

function HomePlaceholder() {
  return <div style={{ padding: 40 }}>Home (placeholder, en construcción)</div>;
}

function SchedulePlaceholder() {
  return (
    <div style={{ padding: 40 }}>
      Cargar horarios (placeholder, en construcción)
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/questionnaire" element={<Questionnaire />} />
      <Route path="/home" element={<HomePlaceholder />} />
      <Route path="/schedule" element={<SchedulePlaceholder />} />
    </Routes>
  );
}

export default App;
