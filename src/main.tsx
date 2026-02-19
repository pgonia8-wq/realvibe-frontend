import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';  // ← si tu archivo App se llama App.tsx, déjalo así; si es App.js, cámbialo
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MiniKitProvider>
      <App />
    </MiniKitProvider>
  </React.StrictMode>
);
