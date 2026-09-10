import { Routes, Route } from 'react-router-dom';
import { Splash } from './pages/splash';
import { Landing } from './pages/landing';
import { Login } from './pages/login';
import { Register } from './pages/register';
import { VerifyEmail } from './pages/verifyEmail';
import { Questionnaire } from './pages/questionnaire';
import { Home } from './pages/home';
import { Schedule } from './pages/schedule';

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
      <Route path="/schedule" element={<Schedule />} />
    </Routes>
  );
}

export default App;
