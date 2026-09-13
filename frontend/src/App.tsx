import { Routes, Route } from 'react-router-dom';
import { Splash } from './pages/splash';
import { Landing } from './pages/landing';
import { Login } from './pages/login';
import { Register } from './pages/register';
import { VerifyEmail } from './pages/verifyEmail';
import { Questionnaire } from './pages/questionnaire';
import { Home } from './pages/home';
import { Schedule } from './pages/schedule';
import { AddSubject } from './pages/addSubject';
import { Profile } from './pages/profile';
import { RequireAuth } from './components/requireAuth';

function App() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<Splash />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Requiere sesión (sin verificación) */}
      <Route element={<RequireAuth blockIfVerified />}>
        <Route path="/verify-email" element={<VerifyEmail />} />
      </Route>

      {/* Requiere sesión + email verificado */}
      <Route element={<RequireAuth requireVerified />}>
        <Route path="/questionnaire" element={<Questionnaire />} />
        <Route path="/home" element={<Home />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/assignments/new" element={<AddSubject />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}

export default App;
