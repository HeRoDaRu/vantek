import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import SplashScreen from './pages/Splash/SplashScreen';
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
  </React.StrictMode>
);