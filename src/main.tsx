import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

document.title = 'SyllabusOS';
try {
  const titleEl = document.querySelector('title');
  if (titleEl) {
    new MutationObserver(() => {
      if (document.title !== 'SyllabusOS') {
        document.title = 'SyllabusOS';
      }
    }).observe(titleEl, { childList: true, characterData: true, subtree: true });
  }
} catch {
  // Ignore in environments where MutationObserver or title is not available
}

createRoot(document.getElementById('root')!).render(<App />);

// Register Service Worker for PWA Web Share Target & Offline Resilience
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      // Ignore if running without sw in some environments
    });
  });
}
