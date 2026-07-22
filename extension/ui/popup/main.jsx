import React from 'react';
import { createRoot } from 'react-dom/client';
import PopupApp from './App.jsx';
import '../../../src/styles/index.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <PopupApp />
    </React.StrictMode>
  );
}
