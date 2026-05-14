import { useState } from 'react';
import Icon from './Icon.jsx';
import Avatar from './Avatar.jsx';
import { usePermissions } from '../lib/permissions.jsx';
import logoFullLight from '../assets/logo-full.png';
import logoFullDark  from '../assets/logo-full-dark.png';
import logoIcon      from '../assets/logo-icon.png';
import logoLanding   from '../assets/logo-landing-page.png';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'employees', label: 'Funcionários', icon: 'users' },
  {
    id: 'documents',
    label: 'Documentos',
    icon: 'folder',
  },
  {
    id: 'time',
    label: 'Controle de ponto',
    icon: 'clock',
  },
  { id: 'rh', label: 'RH', icon: 'briefcase' },
  { id: 'reports', label: 'Relatórios', icon: 'chart' },
  { id: 'justice', label: 'Justiça', icon: 'gavel' },
  { id: 'clt',     label: 'CLT & Direitos', icon: 'scale' },
  { id: 'section', label: 'ADMINISTRAÇÃO' },
  { id: 'audit',    label: 'Auditoria',       icon: 'history',  perm: ['Administração', 'logs'] },
  { id: 'settings', label: 'Configurações',   icon: 'settings', perm: ['Administração', 'config'] },
];

function Logo({ collapsed, theme }) {
  if (collapsed) {
    return (
      <img
        src={logoIcon}
        alt="SR Central"
        style={{ width: 44, height: 44, objectFit: 'contain' }}
      />
    );
  }
  return (
    <img
      src={logoLanding}
      alt="SR Gestão de Documentos"
      style={{ height: 200, width: '100%', maxWidth: 230, objectFit: 'contain', objectPosition: 'center center', margin: '-48px 0 -58px' }}
    />
  );
}

export default function Sidebar({ route, setRoute, collapsed, setCollapsed, mobileOpen, setMobileOpen, userName, userEmail, isAdmin, onLogout, companies = [], activeCompany, setActiveCompany, profile, onOpenProfile, theme }) {
  const { can } = usePermissions();
  const [open, setOpen] = useState({
    employees: route.startsWith('employees'),
    documents: route.startsWith('documents'),
    time: route.startsWith('time'),
  });
  const [tip, setTip] = useState(null); // { label, y }

  // No drawer mobile sempre mostra expandido (ícone + label)
  const col = mobileOpen ? false : collapsed;

  const isActive = (id) =>
    route === id || (id !== 'dashboard' && route.startsWith(id));

  return (
    <>
    <aside
      className={`orion-sidebar${mobileOpen ? ' mobile-open' : ''}`}
      style={{
        width: col ? 68 : 248,
        background: 'var(--sidebar)',
        borderRight: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width .18s ease, transform .22s ease',
        flexShrink: 0,
        height: '100%',
      }}
    >
      <div
        style={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <Logo collapsed={col} theme={theme} />
        </div>
        {!col && !mobileOpen && (
          <button
            className="btn ghost icon sm"
            onClick={() => setCollapsed(true)}
            title="Recolher"
          >
            <Icon name="panel-left" size={16} />
          </button>
        )}
      </div>

      {/* Seletor de empresa — visível quando expandido e houver empresas */}
      {!col && companies.length > 0 && (
        <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-2)', letterSpacing: 1, marginBottom: 5, paddingLeft: 2 }}>
            EMPRESA
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={activeCompany?.id || ''}
              onChange={(e) => {
                const found = companies.find(c => c.id === e.target.value);
                setActiveCompany(found || null);
              }}
              style={{
                width: '100%',
                padding: '7px 28px 7px 10px',
                borderRadius: 8,
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
              }}
            >
              <option value="">Todas as empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Icon
              name="chevron-down"
              size={13}
              style={{
                position: 'absolute', right: 9, top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none', color: 'var(--muted)',
              }}
            />
          </div>
        </div>
      )}

      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
        {NAV.map((item, i) => {
          if (item.perm && !can(item.perm[0], item.perm[1])) return null;
          if (item.id === 'section') {
            return col ? (
              <div key={i} style={{ height: 12 }} />
            ) : (
              <div
                key={i}
                style={{
                  fontSize: 10.5,
                  color: 'var(--muted-2)',
                  letterSpacing: 1.2,
                  fontWeight: 700,
                  padding: '16px 10px 6px',
                }}
              >
                {item.label}
              </div>
            );
          }
          const active = isActive(item.id);
          const hasSub = item.sub && !col;
          const expanded = open[item.id];
          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (hasSub) setOpen((o) => ({ ...o, [item.id]: !o[item.id] }));
                  setRoute(item.id);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: col ? '9px 0' : '8px 10px',
                  justifyContent: col ? 'center' : 'flex-start',
                  borderRadius: 8,
                  border: 'none',
                  background: active ? 'var(--brand-tint)' : 'transparent',
                  color: active ? 'var(--nav-ink-active)' : 'var(--nav-ink)',
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                  marginBottom: 2,
                  textAlign: 'left',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'var(--hover)';
                  if (col) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTip({ label: item.label, y: rect.top + rect.height / 2 });
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                  setTip(null);
                }}
              >
                <Icon name={item.icon} size={18} />
                {!col && <span style={{ flex: 1 }}>{item.label}</span>}
                {!col && item.badge != null && (
                  <span className="pill brand" style={{ padding: '1px 7px', fontSize: 10.5 }}>
                    {item.badge}
                  </span>
                )}
                {hasSub && !col && (
                  <Icon
                    name="chevron-down"
                    size={14}
                    style={{
                      transform: expanded ? 'rotate(180deg)' : 'none',
                      transition: 'transform .15s',
                      opacity: 0.6,
                    }}
                  />
                )}
              </button>
              {hasSub && expanded && (
                <div
                  style={{
                    paddingLeft: 28,
                    marginBottom: 6,
                    borderLeft: '1px solid var(--line)',
                    marginLeft: 18,
                  }}
                >
                  {item.sub.map((sub) => {
                    const subActive = route === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setRoute(sub.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: 'none',
                          background: subActive ? 'var(--hover)' : 'transparent',
                          color: subActive ? 'var(--ink)' : 'var(--muted)',
                          fontWeight: subActive ? 600 : 500,
                          fontSize: 12.5,
                          cursor: 'pointer',
                          marginBottom: 1,
                        }}
                      >
                        {sub.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User card / collapse toggle */}
      <div style={{ padding: 10, borderTop: '1px solid var(--line)' }}>
        {col ? (
          <div className="col gap-2" style={{ alignItems: 'center' }}>
            <button
              className="btn ghost icon sm"
              onClick={() => setCollapsed(false)}
              title="Expandir"
            >
              <Icon name="chevron-right" size={16} />
            </button>
            <Avatar name={userName || 'U'} size={30} hue={profile?.avatar_hue ?? 215} url={profile?.avatar_url ?? null} />
          </div>
        ) : (
          <div
            className="row gap-2"
            style={{
              padding: 8,
              borderRadius: 10,
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              cursor: onOpenProfile ? 'pointer' : 'default',
            }}
            onClick={onOpenProfile}
            title={onOpenProfile ? 'Meu perfil' : undefined}
          >
            <Avatar name={userName || 'U'} size={32} hue={profile?.avatar_hue ?? 215} url={profile?.avatar_url ?? null} />
            <div className="grow" style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 12.5, fontWeight: 600,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {userName || 'Usuário'}
                </span>
                {isAdmin && (
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4,
                    background: 'var(--brand)', color: 'var(--brand-ink)',
                    borderRadius: 4, padding: '1px 5px', flexShrink: 0,
                  }}>
                    ADM
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 11, color: 'var(--muted)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {userEmail || ''}
              </div>
            </div>
            <button className="btn ghost icon sm" title="Sair" onClick={onLogout}>
              <Icon name="logout" size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>

      {/* Tooltip fixo — fora do aside para não ser cortado pelo overflow */}
      {tip && (
        <div
          style={{
            position: 'fixed',
            left: 76,
            top: tip.y,
            transform: 'translateY(-50%)',
            background: 'var(--ink)',
            color: 'var(--bg)',
            fontSize: 12,
            fontWeight: 500,
            padding: '5px 10px',
            borderRadius: 6,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 9999,
          }}
        >
          {tip.label}
        </div>
      )}
    </>
  );
}
