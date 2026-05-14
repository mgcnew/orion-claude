import { Fragment } from 'react';
import Icon from './Icon.jsx';
import SearchBar from './SearchBar.jsx';

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
        background: 'var(--surface)',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
        minWidth: 0,
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

        <button
          className="btn ghost icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Modo"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
        </button>

        <div style={{ position: 'relative' }}>
          <button className="btn ghost icon" onClick={openNotif} title="Notificações">
            <Icon name="bell" size={17} />
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
          </button>
        </div>
      </div>
    </header>
  );
}
