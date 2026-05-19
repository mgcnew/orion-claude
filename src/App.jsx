import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { supabase } from './lib/supabase.js';
import { useCompanies, logAudit, useNotifications, fetchIp } from './hooks/useEmployees.js';
import { PermissionsProvider } from './lib/permissions.jsx';

import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import NotificationsPanel from './components/NotificationsPanel.jsx';
import Toasts from './components/Toasts.jsx';
import TweaksPanel from './components/TweaksPanel.jsx';
import ProfilePanel from './components/ProfilePanel.jsx';
import Icon from './components/Icon.jsx';

// Eager: auth/landing/dashboard (entry points)
import { SendInviteModal, CompleteRegistrationScreen } from './screens/Auth.jsx';
import LandingPage from './screens/Landing.jsx';
import Dashboard from './screens/Dashboard.jsx';

// Lazy: heavy screens loaded on-demand
const EmployeesList     = lazy(() => import('./screens/Employees.jsx').then(m => ({ default: m.EmployeesList })));
const EmployeeProfile   = lazy(() => import('./screens/EmployeeProfile.jsx'));
const DocumentsScreen   = lazy(() => import('./screens/Documents.jsx'));
const JusticeScreen     = lazy(() => import('./screens/Justice.jsx'));
const TimeScreen        = lazy(() => import('./screens/Time.jsx').then(m => ({ default: m.TimeScreen })));
const AuditScreen       = lazy(() => import('./screens/Audit.jsx'));
const ReportsScreen     = lazy(() => import('./screens/Reports.jsx'));
const SettingsScreen    = lazy(() => import('./screens/Settings.jsx'));
const RHScreen          = lazy(() => import('./screens/RH.jsx'));
const CLTScreen         = lazy(() => import('./screens/CLT.jsx'));

import { useTweaks } from './hooks/useTweaks.js';
import { darken, hexToRgba, isLight } from './lib/color.js';

function ScreenFallback() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', width: '100%',
      color: 'var(--muted)', fontSize: 13,
    }}>
      <div className="pulse">Carregando…</div>
    </div>
  );
}

const TWEAK_DEFAULTS = {
  primary:   '#2A5BFF',
  theme:     'light',
  density:   'comfortable',
  radius:    10,
  fontSize:  'md',
  sidebarDefault: 'expanded',
  inactivityLock: 'off',
  blueLight: 'off',
};

export default function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [ipBlocked, setIpBlocked] = useState(false);
  const [isInviteFlow, setIsInviteFlow] = useState(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    return hash.get('type') === 'invite';
  });
  const [route, setRoute] = useState(() => sessionStorage.getItem('orion.route') ?? 'dashboard');
  const [routeParam, setRouteParam] = useState(null);   // ex: employee UUID
  const [routeLabel, setRouteLabel] = useState(null);   // ex: employee name (para breadcrumb)
  const [routeIntent, setRouteIntent] = useState(null); // ex: 'new', 'upload', 'new-warn'
  const [collapsed, setCollapsed] = useState(() => tweaks.sidebarDefault === 'collapsed');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null); // null = todas as empresas
  const [inviteOpen, setInviteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const { companies } = useCompanies();
  const { items: notifItems, loading: notifLoading, refetch: notifRefetch } = useNotifications();

  const navigate = (r, intent = null) => { setRoute(r); setRouteIntent(intent); setMobileOpen(false); };
  useEffect(() => { sessionStorage.setItem('orion.route', route); }, [route]);
  useEffect(() => { const t = setTimeout(() => setRouteIntent(null), 80); return () => clearTimeout(t); }, [route]);

  // Verifica se o IP atual está bloqueado; retorna true se bloqueado
  const checkIpBlocked = async () => {
    const ip = await fetchIp();
    if (!ip) return false;
    const { data } = await supabase.from('blocked_ips').select('id').eq('ip', ip).maybeSingle();
    return !!data;
  };

  // Supabase auth state
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (s?.user) {
        const blocked = await checkIpBlocked();
        if (blocked) {
          setIpBlocked(true);
          await supabase.auth.signOut();
          setAuthLoading(false);
          return;
        }
        setSession(s);
        supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle()
          .then(({ data }) => { if (data) setUserProfile(data); });
      } else {
        setSession(s);
      }
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN' && s?.user) {
        (async () => {
          const blocked = await checkIpBlocked();
          if (blocked) {
            setIpBlocked(true);
            await supabase.auth.signOut();
            return;
          }
          setSession(s);
          setAuthLoading(false);
          setRoute('dashboard');
          logAudit(null, 'LOGIN', s.user.email);
          supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle()
            .then(({ data }) => { if (data) setUserProfile(data); });
        })();
        return;
      }
      setSession(s);
      setAuthLoading(false);
      if (event === 'USER_UPDATED') {
        setIsInviteFlow(false);
        // Limpa o hash da URL após senha definida
        window.history.replaceState(null, '', window.location.pathname);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', tweaks.theme === 'dark');
  }, [tweaks.theme]);

  // Apply primary color, radius & font size
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--brand', tweaks.primary);
    root.setProperty('--brand-700', darken(tweaks.primary, 0.18));
    root.setProperty('--brand-tint', hexToRgba(tweaks.primary, 0.12));
    root.setProperty('--brand-ink', isLight(tweaks.primary) ? '#0B0D11' : '#FFFFFF');
    root.setProperty('--radius', tweaks.radius + 'px');
    root.setProperty('--radius-lg', tweaks.radius + 4 + 'px');
    // zoom escala todos os valores inline px sem precisar refatorar
    const zoomMap = { sm: 0.88, md: 1, lg: 1.12 };
    const zoom = zoomMap[tweaks.fontSize] ?? 1;
    document.body.style.zoom = zoom;
    // CSS var usada no container principal para compensar altura
    root.setProperty('--app-h', `${(100 / zoom).toFixed(4)}vh`);
  }, [tweaks.primary, tweaks.radius, tweaks.fontSize]);

  // Blue light filter overlay
  useEffect(() => {
    const intensityMap = { off: 0, low: 0.06, medium: 0.13, high: 0.22 };
    const opacity = intensityMap[tweaks.blueLight] ?? 0;
    let overlay = document.getElementById('orion-bluelight');
    if (opacity === 0) { if (overlay) overlay.remove(); return; }
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'orion-bluelight';
      overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;background:rgba(255,147,41,VAL);transition:background .3s';
      document.body.appendChild(overlay);
    }
    overlay.style.background = `rgba(255,147,41,${opacity})`;
  }, [tweaks.blueLight]);

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

  // Inactivity lock
  useEffect(() => {
    const minutes = parseInt(tweaks.inactivityLock, 10);
    if (!session || isNaN(minutes)) return;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => supabase.auth.signOut(), minutes * 60 * 1000);
    };
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset));
    reset();
    return () => { clearTimeout(timer); events.forEach(e => window.removeEventListener(e, reset)); };
  }, [tweaks.inactivityLock, session]);

  const addToast = useCallback((t) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { ...t, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3500);
  }, []);

  // Derived from session — safe to compute before early returns (will be null/[] when no session)
  const userId = session?.user?.id ?? null;
  const ownedCompanyIds = useMemo(
    () => companies.filter(c => c.owner_id === userId).map(c => c.id),
    [companies, userId]
  );

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

  // ===== IP BLOQUEADO =====
  if (ipBlocked) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', padding: 24,
      }}>
        <div style={{
          maxWidth: 420, width: '100%', textAlign: 'center',
          background: 'var(--surface)', borderRadius: 16,
          padding: '40px 32px',
          boxShadow: '0 8px 40px rgba(0,0,0,.12)',
          border: '1px solid var(--line)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 20px',
            background: 'color-mix(in srgb, var(--bad) 10%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="shield" size={26} style={{ color: 'var(--bad)' }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: 'var(--ink)' }}>Acesso Bloqueado</h1>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 24px' }}>
            O seu endereço IP foi bloqueado pelo administrador do sistema.
            Entre em contato com o suporte para mais informações.
          </p>
          <button
            className="btn"
            onClick={() => { setIpBlocked(false); }}
            style={{ fontSize: 13 }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // ===== INVITE COMPLETION (usuário acabou de clicar no link do convite) =====
  if (session && isInviteFlow) {
    return (
      <>
        <CompleteRegistrationScreen
          session={session}
          onComplete={() => setIsInviteFlow(false)}
        />
        <TweaksPanel tweaks={tweaks} setTweak={setTweak} />
      </>
    );
  }

  // ===== LANDING / AUTH =====
  if (!session) {
    return (
      <>
        <LandingPage />
        <TweaksPanel tweaks={tweaks} setTweak={setTweak} />
      </>
    );
  }

  // ===== ROUTING =====
  const renderScreen = () => {
    if (route === 'dashboard') return <Dashboard setRoute={setRoute} navigate={navigate} addToast={addToast} activeCompany={activeCompany} userName={userName} />;
    if (route === 'employees') return <EmployeesList setRoute={setRoute} setRouteParam={setRouteParam} setRouteLabel={setRouteLabel} companyId={activeCompany?.id} openModal={routeIntent === 'new'} />;
    if (route === 'employees-profile') return <EmployeeProfile setRoute={setRoute} employeeId={routeParam} />;
    if (route.startsWith('documents'))
      return <DocumentsScreen addToast={addToast} activeCompany={activeCompany} openModal={routeIntent === 'upload'} />;
    if (route.startsWith('time')) return <TimeScreen addToast={addToast} activeCompany={activeCompany} />;
    if (route === 'permissions' || route === 'settings-permissions')
      return (
        <SettingsScreen initialTab="permissoes" addToast={addToast} setRoute={setRoute} activeCompany={activeCompany} tweaks={tweaks} setTweak={setTweak} />
      );
    if (route === 'audit') return <AuditScreen activeCompany={activeCompany} />;
    if (route === 'justice') return <JusticeScreen addToast={addToast} activeCompany={activeCompany} />;
    if (route === 'reports') return <ReportsScreen addToast={addToast} activeCompany={activeCompany} />;
    if (route === 'settings')
      return <SettingsScreen addToast={addToast} setRoute={setRoute} activeCompany={activeCompany} tweaks={tweaks} setTweak={setTweak} />;
    if (route === 'rh' || route.startsWith('rh-'))
      return <RHScreen addToast={addToast} activeCompany={activeCompany} route={route} openModal={routeIntent === 'new-warn'} userName={userName} />;
    if (route === 'clt') return <CLTScreen />;
    return <Dashboard setRoute={setRoute} addToast={addToast} />;
  };

  const isAdmin = session?.user?.app_metadata?.role === 'admin';
  const userName = session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'Usuário';
  const userEmail = session?.user?.email || '';

  return (
    <PermissionsProvider userId={userId} activeCompanyId={activeCompany?.id} ownedCompanyIds={ownedCompanyIds}>
    <div
      style={{
        display: 'flex',
        height: 'var(--app-h, 100vh)',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      {mobileOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <Sidebar
        route={route}
        setRoute={(r) => { setRoute(r); setMobileOpen(false); }}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        userName={userName}
        userEmail={userEmail}
        isAdmin={isAdmin}
        onLogout={() => supabase.auth.signOut()}
        companies={companies}
        activeCompany={activeCompany}
        setActiveCompany={setActiveCompany}
        profile={userProfile}
        onOpenProfile={() => { setProfileOpen(true); setMobileOpen(false); }}
        theme={tweaks.theme}
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
          setRouteParam={setRouteParam}
          setRouteLabel={setRouteLabel}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          theme={tweaks.theme}
          setTheme={(t) => setTweak('theme', t)}
          openCmd={() => setCmdOpen(true)}
          openNotif={() => setNotifOpen(!notifOpen)}
          notifCount={notifItems.length}
          userName={userName}
          userEmail={userEmail}
          isAdmin={isAdmin}
          routeLabel={routeLabel}
          onInvite={() => setInviteOpen(true)}
          profile={userProfile}
          onOpenProfile={() => setProfileOpen(true)}
        />
        <div className="scroll-hidden" style={{ flex: 1, overflowY: 'auto' }} key={route.startsWith('settings') ? 'settings' : route}>
          <Suspense fallback={<ScreenFallback />}>
            {renderScreen()}
          </Suspense>
        </div>
      </main>

      <CommandPalette
        open={cmdOpen}
        setOpen={setCmdOpen}
        setRoute={(r) => setRoute(r)}
      />
      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} items={notifItems} loading={notifLoading} refetch={notifRefetch} />
      <ProfilePanel
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={userProfile}
        onProfileUpdate={(updated) => setUserProfile(updated)}
      />

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
