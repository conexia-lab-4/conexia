import { Routes, Route } from 'react-router-dom';
import { Splash } from './pages/splash';
import { Landing } from './pages/landing';
import { Login } from './pages/login';
import { Register } from './pages/register';
import { VerifyEmail } from './pages/verifyEmail';
import { Questionnaire } from './pages/questionnaire';
import { Home } from './pages/home';
import { AddSubject } from './pages/addSubject';

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
      <Route path="/home" element={<Home />} />
      <Route path="/schedule" element={<SchedulePlaceholder />} />
      <Route path="/assignments/new" element={<AddSubject />} />
    </Routes>
  );
}

export default App;
