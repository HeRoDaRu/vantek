/**
 * ──────────────────────────────────────────────────────────────────────────────
 * main.tsx — Vite/React entry point and splash gating
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Mounts the React tree into #root. The <Root> wrapper shows the SplashScreen
 *   (which preloads OCR/Tesseract) until it signals ready via onListo, then swaps
 *   in <App>. Toaster is mounted alongside so notifications render globally.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · ./App → main application (router) shown after splash
 *     · ./pages/Splash/SplashScreen → startup screen, calls onListo when ready
 *     · @components/UI/Toaster → global toast notifications portal
 *     · ./index.css → global design system
 *   Used by:
 *     · index.html (<script type="module" src="/src/main.tsx">)
 *
 * INPUTS / OUTPUTS
 *   Input:  the #root DOM node from index.html
 *   Output: rendered React app (StrictMode), splash → App transition + Toaster
 *
 * NOTES
 *   · Wrapped in React.StrictMode (double-invokes effects in development).
 * ──────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import SplashScreen from './pages/Splash/SplashScreen';
import Toaster from '@components/UI/Toaster';
import './index.css';

function Root() {
  const [listo, setListo] = useState(false);

  if (!listo) {
    return <SplashScreen onListo={() => setListo(true)} />;
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
    <Toaster />
  </React.StrictMode>
);