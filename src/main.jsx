import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { DadosProvider } from './context/DadosContext.jsx';
import './styles/tokens.css';
import './styles/global.css';
import './styles/admin.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DadosProvider>
      <App />
    </DadosProvider>
  </React.StrictMode>
);
