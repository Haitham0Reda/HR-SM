import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { PlatformAuthProvider } from './contexts/PlatformAuthContext';
import PlatformRoutes from './routes/PlatformRoutes';
import './App.css';

// Create a theme for the platform admin
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <PlatformAuthProvider>
          <PlatformRoutes />
        </PlatformAuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
