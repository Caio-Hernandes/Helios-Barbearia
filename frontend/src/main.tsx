import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Estilos globais primeiro: os CSS modules dos componentes vêm depois e podem sobrescrevê-los
import './styles/global.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
