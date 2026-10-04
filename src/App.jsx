import './App.css';
import AppRouter from "./Navigators/AppRouter";
import React, { useEffect, useMemo, useState } from 'react';
import './index.css';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from './theme';
import { Provider } from 'react-redux';
import { Store } from './Store';
import { BrowserRouter } from 'react-router-dom';
import './styles/theme.css';
import './styles/chrome.css';
import ChunkErrorBoundary from './Components/ChunkErrorBoundary';

function useHtmlColorMode() {
  const [mode, setMode] = useState(() => (
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  ));

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      setMode(root.classList.contains('dark') ? 'dark' : 'light');
    };
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return mode;
}

function App() {
  const mode = useHtmlColorMode();
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <Provider store={Store}>
        <BrowserRouter>
          <ChunkErrorBoundary>
            <AppRouter />
          </ChunkErrorBoundary>
        </BrowserRouter>
      </Provider>
    </ThemeProvider>
  );
}

export default App;
