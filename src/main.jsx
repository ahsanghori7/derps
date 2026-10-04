import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { isChunkLoadError, recoverFromChunkError } from './Utils/lazyWithRetry';

const recoverIfChunkError = (error) => {
  if (!isChunkLoadError(error)) return false;
  recoverFromChunkError();
  return true;
};

window.addEventListener('unhandledrejection', (event) => {
  if (recoverIfChunkError(event.reason)) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  if (recoverIfChunkError(event.error || event.message)) {
    event.preventDefault();
  }
});

const container = document.getElementById('root');
const root = createRoot(container);

root.render(<App />);
