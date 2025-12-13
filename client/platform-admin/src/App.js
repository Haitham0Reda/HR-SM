import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from './contexts/ThemeContext';
import { PlatformAuthProvider } from './contexts/PlatformAuthContext';
import PlatformRoutes from './routes/PlatformRoutes';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <CssBaseline enableColorScheme />
      <BrowserRouter>
        <PlatformAuthProvider>
          <PlatformRoutes />
        </PlatformAuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
