import { Routes, Route } from 'react-router-dom';
import { Splash } from './pages/splash';
import { Landing } from './pages/landing';
import { Login } from './pages/login';
import { Register } from './pages/register';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}

export default App;
