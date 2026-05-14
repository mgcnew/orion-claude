import { Fragment, useState } from 'react';
import Icon from './Icon.jsx';
import SearchBar from './SearchBar.jsx';

function SunSVG({ spin }) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg
      width="19" height="19" viewBox="0 0 24 24" fill="none"
      style={{ animation: spin ? 'sun-spin 0.52s ease forwards' : 'none', display: 'block' }}
    >
      <circle cx="12" cy="12" r="4.2" fill="#f59e0b" />
      {rays.map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={angle}
            x1={(12 + 6.4 * Math.cos(rad)).toFixed(2)}
            y1={(12 + 6.4 * Math.sin(rad)).toFixed(2)}
            x2={(12 + 9.6 * Math.cos(rad)).toFixed(2)}
            y2={(12 + 9.6 * Math.sin(rad)).toFixed(2)}
            stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function MoonSVG({ drop }) {
  return (
    <svg
      width="17" height="17" viewBox="0 0 24 24" fill="none"
      style={{ animation: drop ? 'moon-set 0.48s ease forwards' : 'none', display: 'block' }}
    >
      {/* crescent: full circle minus offset circle via clip */}
      <defs>
        <mask id="moon-mask">
          <rect width="24" height="24" fill="white" />
          <circle cx="16.5" cy="9" r="7" fill="black" />
        </mask>
      </defs>
      <circle cx="12" cy="12" r="8.5" fill="#94a3b8" mask="url(#moon-mask)" />
      {/* subtle glow rim */}
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="#cbd5e1" strokeWidth="0.6" mask="url(#moon-mask)" opacity="0.6" />
    </svg>
  );
}

function ThemeToggle({ theme, setTheme }) {
  const [anim, setAnim] = useState(false);

  const handleClick = () => {
    setAnim(true);
    setTimeout(() => {
      setTheme(t => t === 'dark' ? 'light' : 'dark');
      setAnim(false);
    }, 260);
  };

  return (
    <button
      className="btn ghost icon"
      onClick={handleClick}
      title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
      style={{ overflow: 'visible' }}
    >
      {theme === 'dark' ? <SunSVG spin={anim} /> : <MoonSVG drop={anim} />}
    </button>
  );
}

function buildCrumbs(route, routeLabel) {
  if (route === 'dashboard') return [{ label: 'Dashboard' }];
  if (route.startsWith('employees')) {
    const sub =
      route === 'employees'
        ? 'Todos'
        : route === 'employees-new'
        ? 'Cadastro'
        : route === 'employees-leave'
        ? 'Afastados'
        : route === 'employees-org'
        ? 'Organograma'
        : route === 'employees-profile'
        ? (routeLabel || 'Perfil')
        : 'Lista';
    return [{ label: 'Funcionários', id: 'employees' }, { label: sub }];
  }
  if (route.startsWith('documents')) {
    const sub =
      route === 'documents'
        ? 'Todos'
        : route === 'documents-upload'
        ? 'Upload'
        : route === 'documents-pending'
        ? 'Pendências'
        : 'Documentos';
    return [{ label: 'Documentos', id: 'documents' }, { label: sub }];
  }
  if (route.startsWith('time'))
    return [{ label: 'Controle de ponto', id: 'time' }, { label: 'Jornada' }];
  if (route === 'audit') return [{ label: 'Administração' }, { label: 'Auditoria' }];
  if (route === 'settings') return [{ label: 'Configurações' }];
  if (route === 'settings-permissions')
    return [{ label: 'Configurações', id: 'settings' }, { label: 'Permissões' }];
  if (route === 'clt') return [{ label: 'CLT & Direitos' }];
  if (route === 'reports') return [{ label: 'Relatórios' }];
  if (route === 'justice') return [{ label: 'Justiça' }];
  if (route.startsWith('rh')) {
    const sub = route === 'rh' ? 'Resumo'
      : route === 'rh-warn'     ? 'Advertências'
      : route === 'rh-vacation' ? 'Férias'
      : route === 'rh-benefits' ? 'Benefícios'
      : route === 'rh-eval'     ? 'Avaliações'
      : route === 'rh-payslip'  ? 'Holerites'
      : 'Resumo';
    return [{ label: 'RH', id: 'rh' }, { label: sub }];
  }
  return [{ label: 'Início' }];
}

export default function Header({
  route,
  setRoute,
  setRouteParam,
  setRouteLabel,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  theme,
  setTheme,
  openCmd,
  openNotif,
  notifCount = 0,
  userName,
  userEmail,
  routeLabel,
  isAdmin,
  onInvite,
  profile,
  onOpenProfile,
}) {
  const crumbs = buildCrumbs(route, routeLabel);

  return (
    <header
      style={{
        height: 60,
        padding: '0 16px 0 12px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--header-glass)',
        backdropFilter: 'blur(16px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
        minWidth: 0,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Esquerda: menu + breadcrumbs */}
      <div className="row gap-2" style={{ minWidth: 0 }}>
        <button
          className="btn ghost icon sm"
          onClick={() => {
            if (window.innerWidth < 768) setMobileOpen(o => !o);
            else setCollapsed(c => !c);
          }}
        >
          <Icon name="menu" size={18} />
        </button>
        <div className="row gap-2" style={{ minWidth: 0, flexShrink: 1 }}>
          {crumbs.map((c, i) => (
            <Fragment key={i}>
              {i > 0 && (
                <Icon name="chevron-right" size={13} style={{ color: 'var(--muted-2)' }} />
              )}
              <button
                onClick={() => c.id && setRoute(c.id)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: '4px 6px',
                  borderRadius: 6,
                  fontSize: 13.5,
                  fontWeight: i === crumbs.length - 1 ? 600 : 500,
                  color: i === crumbs.length - 1 ? 'var(--ink)' : 'var(--muted)',
                  cursor: c.id ? 'pointer' : 'default',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.label}
              </button>
            </Fragment>
          ))}
        </div>
      </div>

      {/* Centro: busca global */}
      <SearchBar setRoute={setRoute} setRouteParam={setRouteParam} setRouteLabel={setRouteLabel} />

      {/* Direita: ações */}
      <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
        {isAdmin && onInvite && (
          <button className="btn primary sm" onClick={onInvite} title="Convidar usuário">
            <Icon name="user-plus" size={14} /> Convidar
          </button>
        )}

        <ThemeToggle theme={theme} setTheme={setTheme} />

        <div style={{ position: 'relative' }}>
          <button className="btn ghost icon" onClick={openNotif} title="Notificações">
            <Icon name="bell" size={17} />
            {notifCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 7,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--bad)',
                  border: '2px solid var(--surface)',
                }}
              />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
