import { useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useAppStore } from './store';
import { Home } from './Home';
import { Onboarding } from './onboarding/Onboarding';
import { SessionFlow } from './session/SessionFlow';
import { Dashboard } from './dashboard/Dashboard';
import { Settings } from './settings/Settings';
import { PlayGame } from './session/PlayGame';

export function App() {
  const { ready, settings, init } = useAppStore();

  useEffect(() => {
    void init();
  }, [init]);

  if (!ready) {
    return (
      <div className="app center">
        <p className="dim" style={{ marginTop: 80 }}>
          Cargando Fluidez…
        </p>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="app">
        <Routes>
          <Route
            path="/"
            element={settings.onboarded ? <Home /> : <Navigate to="/inicio" replace />}
          />
          <Route path="/inicio" element={<Onboarding />} />
          <Route path="/sesion" element={<SessionFlow />} />
          <Route path="/jugar/:game" element={<PlayGame />} />
          <Route path="/progreso" element={<Dashboard />} />
          <Route path="/ajustes" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {settings.onboarded && <BottomNav />}
    </HashRouter>
  );
}

function BottomNav() {
  return (
    <nav className="nav">
      <NavLink to="/" end>
        <span className="ico">🏠</span>Hoy
      </NavLink>
      <NavLink to="/progreso">
        <span className="ico">📊</span>Progreso
      </NavLink>
      <NavLink to="/ajustes">
        <span className="ico">⚙️</span>Ajustes
      </NavLink>
    </nav>
  );
}
