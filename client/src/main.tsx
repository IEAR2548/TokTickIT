import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
// Icon font for bi-* glyph classes (Login show/hide password eye, ChangePassword
// checklist checkmarks) — installed in package.json but previously never loaded,
// so icon-only controls rendered as empty boxes.
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/theme.css';
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);