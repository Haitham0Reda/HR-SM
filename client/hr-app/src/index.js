import React from 'react';
import ReactDOM from 'react-dom/client';
import './utils/consoleFilter'; // Load console filter FIRST
import './utils/performanceConfig'; // Load performance optimizations
import './index.css';
import './styles/animations.css';
import './components/seasonal/SeasonalEffects.css';
import './config/axios'; // Configure axios globally
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Disable StrictMode in development to reduce performance violations
if (process.env.NODE_ENV === 'development') {
  root.render(<App />);
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
