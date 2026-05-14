import { useState, useRef, useEffect } from 'react';
import Icon from './Icon.jsx';
import Avatar from './Avatar.jsx';
import { usePermissions } from '../lib/permissions.jsx';
import logoLanding  from '../assets/logo-landing-page.png';
import logoNight    from '../assets/logo noturna.png';
import logoIcon     from '../assets/icone novo.png';

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

function CompanyInitial({ name }) {
  const letters = name
    ? name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
    : '?';
  const hue = name
    ? [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
    : 200;
  return (
    <div style={{
      width: 26, height: 26, borderRadius: 6, flexShrink: 0,
      background: `hsl(${hue},55%,50%)`,
      color: '#fff', fontSize: 10.5, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      letterSpacing: 0.3,
    }}>
      {letters}
    </div>
  );
}

function CompanyPicker({ companies, activeCompany, setActiveCompany }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const label = activeCompany?.name || 'Todas as empresas';
  const all = [{ id: '', name: 'Todas as empresas' }, ...companies];

  return (
    <div ref={ref} style={{ padding: '8px 10px', borderBottom: '1px solid var(--line)', position: 'relative' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-2)', letterSpacing: 1, marginBottom: 5, paddingLeft: 2 }}>
        EMPRESA
      </div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 8px 7px 8px', borderRadius: 8,
          border: `1px solid ${open ? 'var(--brand)' : 'var(--line)'}`,
          background: open ? 'var(--brand-tint)' : 'var(--surface)',
          color: 'var(--ink)', cursor: 'pointer',
          transition: 'border-color .15s, background .15s',
          boxShadow: open ? '0 0 0 2px var(--brand-tint)' : 'none',
        }}
      >
        {activeCompany
          ? <CompanyInitial name={activeCompany.name} />
          : <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="building" size={13} style={{ color: 'var(--muted)' }} />
            </div>
        }
        <span style={{ flex: 1, textAlign: 'left', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </span>
        <Icon name="chevron-down" size={13} style={{ color: 'var(--muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', left: 10, right: 10, top: 'calc(100% - 4px)',
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 10, zIndex: 50, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.06)',
        }}>
          {all.map((c) => {
            const isActive = (c.id === '' && !activeCompany) || c.id === activeCompany?.id;
            return (
              <button
                key={c.id}
                onClick={() => { setActiveCompany(c.id ? c : null); setOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', border: 'none', textAlign: 'left',
                  background: isActive ? 'var(--brand-tint)' : 'transparent',
                  color: isActive ? 'var(--brand)' : 'var(--ink)',
                  cursor: 'pointer', fontSize: 12.5, fontWeight: isActive ? 600 : 500,
                  transition: 'background .1s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--hover)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                {c.id
                  ? <CompanyInitial name={c.name} />
                  : <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name="building" size={13} style={{ color: 'var(--muted)' }} />
                    </div>
                }
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                {isActive && <Icon name="check" size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Logo({ collapsed, theme }) {
  return (
    <div style={{ position: 'relative', width: collapsed ? 72 : '100%', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width .18s ease' }}>
      <img
        src={logoIcon}
        alt="SR Central"
        style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          width: 72, height: 72, objectFit: 'contain', display: 'block',
          opacity: collapsed ? 1 : 0,
          transition: 'opacity .18s ease',
          pointerEvents: 'none',
        }}
      />
      <img
        src={theme === 'dark' ? logoNight : logoLanding}
        alt="SR Gestão de Documentos"
        style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          height: 170, width: '100%', maxWidth: 200, objectFit: 'contain', objectPosition: 'center center',
          opacity: collapsed ? 0 : 1,
          transition: 'opacity .18s ease',
          pointerEvents: 'none',
        }}
      />
    </div>
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
          padding: col ? 0 : '0 14px',
          borderBottom: '1px solid var(--line)',
          overflow: 'visible',
        }}
      >
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'visible' }}>
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
        <CompanyPicker
          companies={companies}
          activeCompany={activeCompany}
          setActiveCompany={setActiveCompany}
        />
      )}

      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
        {NAV.map((item, i) => {
          if (item.perm && !can(item.perm[0], item.perm[1])) return null;
          if (item.id === 'section') {
            return col ? (
              <div key={i} style={{ height: 14, margin: '8px 12px 0', borderTop: '1px solid var(--line)' }} />
            ) : (
              <div
                key={i}
                style={{
                  fontSize: 10,
                  color: 'var(--muted-2)',
                  letterSpacing: 1.6,
                  fontWeight: 700,
                  padding: '14px 10px 6px',
                  marginTop: 8,
                  borderTop: '1px solid var(--line)',
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
                  transition: 'transform .15s ease, background .15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'var(--hover)';
                    if (!col) e.currentTarget.style.transform = 'translateX(2px)';
                  }
                  if (col) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTip({ label: item.label, y: rect.top + rect.height / 2 });
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'none';
                  }
                  setTip(null);
                }}
              >
                {active && !col && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: -8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: 20,
                      borderRadius: '0 3px 3px 0',
                      background: 'var(--brand)',
                    }}
                  />
                )}
                <Icon name={item.icon} size={18} style={{ opacity: active ? 1 : 0.78 }} />
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
