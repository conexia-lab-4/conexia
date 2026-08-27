import { Routes, Route } from 'react-router-dom';
import { Splash } from './pages/splash';
import { Landing } from './pages/landing';
import { Login } from './pages/login';
import { Register } from './pages/register';
import { VerifyEmail } from './pages/verifyEmail';
import { useState } from 'react';
import { SelectableCard } from './components/selectablecard';
import { Questionnaire } from './pages/questionnaire';

function SelectableCardTest() {
  const [selected, setSelected] = useState('ua');

  return (
    <div
      style={{
        padding: 40,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        maxWidth: 400,
      }}
    >
      <SelectableCard
        badge="UA"
        colorVariant="blue"
        title="Universidad Austral"
        subtitle="Pilar"
        selected={selected === 'ua'}
        onClick={() => setSelected('ua')}
      />
      <SelectableCard
        badge="DT"
        colorVariant="green"
        title="Universidad Torcuato Di Tella"
        subtitle="Belgrano"
        selected={selected === 'dt'}
        onClick={() => setSelected('dt')}
      />
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
      <Route path="/questionnaire" element={<Questionnaire />} />
      <Route path="/home" element={<HomePlaceholder />} />
      <Route path="/test-card" element={<SelectableCardTest />} />
    </Routes>
  );
}

export default App;
