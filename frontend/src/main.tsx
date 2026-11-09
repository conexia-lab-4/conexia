import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './context/AuthProvider';
import { NotificationsProvider } from './context/NotificationsProvider';
import { PushProvider } from './context/PushProvider';
import { PushMessageHandler } from './components/pushmessagehandler';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
          <PushProvider>
            <PushMessageHandler />
            <App />
          </PushProvider>
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
