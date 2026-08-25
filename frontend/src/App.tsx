import { Routes, Route } from 'react-router-dom';
import { Splash } from './pages/splash';
import { Landing } from './pages/landing';
import { Login } from './pages/login';
import { Register } from './pages/register';
import { VerifyEmail } from './pages/verifyEmail';

function QuestionnairePlaceholder() {
  return (
    <div style={{ padding: 40 }}>
      Cuestionario (placeholder, en construcción)
    </div>
  );
}

function HomePlaceholder() {
  return <div style={{ padding: 40 }}>Home (placeholder, en construcción)</div>;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/questionnaire" element={<QuestionnairePlaceholder />} />
      <Route path="/home" element={<HomePlaceholder />} />
    </Routes>
  );
}

export default App;
