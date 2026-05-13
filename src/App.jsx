import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './lib/supabase.js';
import { useCompanies, logAudit } from './hooks/useEmployees.js';
import { PermissionsProvider } from './lib/permissions.jsx';

import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import NotificationsPanel from './components/NotificationsPanel.jsx';
import Toasts from './components/Toasts.jsx';
import TweaksPanel from './components/TweaksPanel.jsx';
import Icon from './components/Icon.jsx';

import { LoginScreen, InviteScreen, SendInviteModal } from './screens/Auth.jsx';
import Dashboard from './screens/Dashboard.jsx';
import { EmployeesList, EmployeeProfile } from './screens/Employees.jsx';
import DocumentsScreen from './screens/Documents.jsx';
import JusticeScreen from './screens/Justice.jsx';
import { TimeScreen } from './screens/Time.jsx';
import {
  PermissionsScreen, // eslint-disable-line no-unused-vars
  AuditScreen,
  ReportsScreen,
  SettingsScreen,
  WarningsScreen,
  VacationScreen,
  Placeholder,
} from './screens/Other.jsx';

import { useTweaks } from './hooks/useTweaks.js';
import { darken, hexToRgba, isLight } from './lib/color.js';

const TWEAK_DEFAULTS = {
  primary: '#2A5BFF',
  theme: 'light',
  density: 'comfortable',
  radius: 10,
};

export default function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authView, setAuthView] = useState('login');
  const [route, setRoute] = useState('dashboard');
  const [routeParam, setRouteParam] = useState(null);   // ex: employee UUID
  const [routeLabel, setRouteLabel] = useState(null);   // ex: employee name (para breadcrumb)
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null); // null = todas as empresas
  const [inviteOpen, setInviteOpen] = useState(false);
  const { companies } = useCompanies();

  // Supabase auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setAuthLoading(false);
      if (event === 'SIGNED_IN' && s?.user) {
        logAudit(null, 'LOGIN', s.user.email);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', tweaks.theme === 'dark');
  }, [tweaks.theme]);

  // Apply primary color + radius
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--brand', tweaks.primary);
    root.setProperty('--brand-700', darken(tweaks.primary, 0.18));
    root.setProperty('--brand-tint', hexToRgba(tweaks.primary, 0.12));
    root.setProperty('--brand-ink', isLight(tweaks.primary) ? '#0B0D11' : '#FFFFFF');
    root.setProperty('--radius', tweaks.radius + 'px');
    root.setProperty('--radius-lg', tweaks.radius + 4 + 'px');
  }, [tweaks.primary, tweaks.radius]);

  // Cmd/Ctrl+K palette · ESC closes overlays
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
      if (e.key === 'Escape') {
        setCmdOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const addToast = useCallback((t) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { ...t, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3500);
  }, []);

  // ===== LOADING =====
  if (authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="pulse" style={{ fontSize: 14, color: 'var(--muted)' }}>Carregando…</div>
        </div>
      </div>
    );
  }

  // ===== AUTH SCREENS =====
  if (!session) {
    return (
      <>
        {authView === 'login' ? (
          <LoginScreen onLogin={() => {}} />
        ) : (
          <InviteScreen
            onAccept={() => {}}
            onBack={() => setAuthView('login')}
          />
        )}
        <div style={{ position: 'fixed', bottom: 16, left: 16, zIndex: 50 }}>
          <button
            className="btn ghost sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            onClick={() => setAuthView(authView === 'login' ? 'invite' : 'login')}
          >
            <Icon name="mail" size={13} /> Ver tela de{' '}
            {authView === 'login' ? 'convite' : 'login'}
          </button>
        </div>
        <TweaksPanel tweaks={tweaks} setTweak={setTweak} />
      </>
    );
  }

  // ===== ROUTING =====
  const renderScreen = () => {
    if (route === 'dashboard') return <Dashboard setRoute={setRoute} addToast={addToast} activeCompany={activeCompany} />;
    if (route === 'employees') return <EmployeesList setRoute={setRoute} setRouteParam={setRouteParam} setRouteLabel={setRouteLabel} companyId={activeCompany?.id} />;
    if (route === 'employees-profile') return <EmployeeProfile setRoute={setRoute} employeeId={routeParam} />;
    if (route.startsWith('documents'))
      return <DocumentsScreen addToast={addToast} activeCompany={activeCompany} />;
    if (route.startsWith('time')) return <TimeScreen addToast={addToast} activeCompany={activeCompany} />;
    if (route === 'permissions' || route === 'settings-permissions')
      return (
        <SettingsScreen initialTab="permissoes" addToast={addToast} setRoute={setRoute} activeCompany={activeCompany} />
      );
    if (route === 'audit') return <AuditScreen activeCompany={activeCompany} />;
    if (route === 'justice') return <JusticeScreen addToast={addToast} activeCompany={activeCompany} />;
    if (route === 'reports') return <ReportsScreen addToast={addToast} activeCompany={activeCompany} />;
    if (route === 'settings')
      return <SettingsScreen addToast={addToast} setRoute={setRoute} activeCompany={activeCompany} />;
    if (route === 'rh-warn') return <WarningsScreen addToast={addToast} activeCompany={activeCompany} />;
    if (route === 'rh-vacation') return <VacationScreen addToast={addToast} activeCompany={activeCompany} />;
    if (route.startsWith('rh'))
      return (
        <Placeholder
          title="Recursos Humanos"
          desc="Advertências, férias, benefícios, avaliações e holerites."
        />
      );
    return <Dashboard setRoute={setRoute} addToast={addToast} />;
  };

  const isAdmin = session?.user?.app_metadata?.role === 'admin';
  const userName = session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'Usuário';
  const userEmail = session?.user?.email || '';
  const userId = session?.user?.id;
  const ownedCompanyIds = useMemo(
    () => companies.filter(c => c.owner_id === userId).map(c => c.id),
    [companies, userId]
  );

  return (
    <PermissionsProvider userId={userId} activeCompanyId={activeCompany?.id} ownedCompanyIds={ownedCompanyIds}>
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      <Sidebar
        route={route}
        setRoute={setRoute}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        userName={userName}
        userEmail={userEmail}
        isAdmin={isAdmin}
        onLogout={() => supabase.auth.signOut()}
        companies={companies}
        activeCompany={activeCompany}
        setActiveCompany={setActiveCompany}
      />
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: '100%',
        }}
      >
        <Header
          route={route}
          setRoute={setRoute}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          theme={tweaks.theme}
          setTheme={(t) => setTweak('theme', t)}
          openCmd={() => setCmdOpen(true)}
          openNotif={() => setNotifOpen(!notifOpen)}
          userName={userName}
          userEmail={userEmail}
          isAdmin={isAdmin}
          routeLabel={routeLabel}
          onInvite={() => setInviteOpen(true)}
        />
        <div style={{ flex: 1, overflowY: 'auto' }} key={route}>
          {renderScreen()}
        </div>
      </main>

      <CommandPalette
        open={cmdOpen}
        setOpen={setCmdOpen}
        setRoute={(r) => setRoute(r)}
      />
      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />

      <Toasts toasts={toasts} />

      {inviteOpen && (
        <SendInviteModal
          onClose={() => setInviteOpen(false)}
          addToast={addToast}
        />
      )}

      <TweaksPanel
        tweaks={tweaks}
        setTweak={setTweak}
        onLogout={() => supabase.auth.signOut()}
      />
    </div>
    </PermissionsProvider>
  );
}
