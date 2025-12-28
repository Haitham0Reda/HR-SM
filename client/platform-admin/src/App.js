import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from './contexts/ThemeContext';
import { store, persistor } from './store';
import { ReduxPlatformAuthProvider } from './store/providers/ReduxPlatformAuthProvider';
import PlatformRoutes from './routes/PlatformRoutes';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
        <ThemeProvider>
          <CssBaseline enableColorScheme />
          <BrowserRouter>
            <ReduxPlatformAuthProvider>
              <PlatformRoutes />
            </ReduxPlatformAuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
