import { useState } from 'react';
import Icon from './Icon.jsx';
import Avatar from './Avatar.jsx';
import OrionGlyph from './OrionGlyph.jsx';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  {
    id: 'employees',
    label: 'Funcionários',
    icon: 'users',
    badge: 12,
    sub: [
      { id: 'employees', label: 'Todos funcionários' },
      { id: 'employees-new', label: 'Cadastro' },
      { id: 'employees-leave', label: 'Afastados' },
      { id: 'employees-off', label: 'Desligados' },
      { id: 'employees-org', label: 'Organograma' },
    ],
  },
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
  {
    id: 'rh',
    label: 'RH',
    icon: 'briefcase',
    sub: [
      { id: 'rh-warn', label: 'Advertências' },
      { id: 'rh-vacation', label: 'Férias' },
      { id: 'rh-benefits', label: 'Benefícios' },
      { id: 'rh-eval', label: 'Avaliações' },
      { id: 'rh-payslip', label: 'Holerites' },
    ],
  },
  { id: 'reports', label: 'Relatórios', icon: 'chart' },
  { id: 'justice', label: 'Justiça', icon: 'gavel' },
  { id: 'section', label: 'ADMINISTRAÇÃO' },
  { id: 'audit', label: 'Auditoria', icon: 'history' },
  { id: 'settings', label: 'Configurações', icon: 'settings' },
];

function Logo({ collapsed }) {
  return (
    <div className="row gap-2" style={{ alignItems: 'center' }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-700) 100%)',
          position: 'relative',
          flexShrink: 0,
          boxShadow: 'inset 0 -1px 0 rgba(0,0,0,.18), 0 1px 0 rgba(0,0,0,.06)',
        }}
      >
        <div style={{ position: 'absolute', inset: 6 }}>
          <OrionGlyph size={18} />
        </div>
      </div>
      {!collapsed && (
        <div style={{ lineHeight: 1.05 }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>
            Orion{' '}
            <span style={{ fontWeight: 500, color: 'var(--muted)' }}>Gestão</span>
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
            Plataforma corporativa
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ route, setRoute, collapsed, setCollapsed, userName, userEmail, onLogout }) {
  const [open, setOpen] = useState({
    employees: route.startsWith('employees'),
    documents: route.startsWith('documents'),
    time: route.startsWith('time'),
    rh: route.startsWith('rh'),
  });

  const isActive = (id) =>
    route === id || (id !== 'dashboard' && route.startsWith(id));

  return (
    <aside
      className="orion-sidebar"
      style={{
        width: collapsed ? 68 : 248,
        background: 'var(--sidebar)',
        borderRight: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width .18s ease',
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
        <Logo collapsed={collapsed} />
        {!collapsed && (
          <button
            className="btn ghost icon sm"
            onClick={() => setCollapsed(true)}
            title="Recolher"
          >
            <Icon name="panel-left" size={16} />
          </button>
        )}
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
        {NAV.map((item, i) => {
          if (item.id === 'section') {
            return collapsed ? (
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
          const hasSub = item.sub && !collapsed;
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
                  padding: collapsed ? '9px 0' : '8px 10px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 8,
                  border: 'none',
                  background: active ? 'var(--brand-tint)' : 'transparent',
                  color: active ? 'var(--brand)' : 'var(--ink-soft)',
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                  marginBottom: 2,
                  textAlign: 'left',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'var(--hover)';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon name={item.icon} size={18} />
                {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                {!collapsed && item.badge != null && (
                  <span className="pill brand" style={{ padding: '1px 7px', fontSize: 10.5 }}>
                    {item.badge}
                  </span>
                )}
                {hasSub && !collapsed && (
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
        {collapsed ? (
          <div className="col gap-2" style={{ alignItems: 'center' }}>
            <button
              className="btn ghost icon sm"
              onClick={() => setCollapsed(false)}
              title="Expandir"
            >
              <Icon name="chevron-right" size={16} />
            </button>
            <Avatar name={userName || 'U'} size={30} hue={215} />
          </div>
        ) : (
          <div
            className="row gap-2"
            style={{
              padding: 8,
              borderRadius: 10,
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
            }}
          >
            <Avatar name={userName || 'U'} size={32} hue={215} />
            <div className="grow" style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {userName || 'Usuário'}
              </div>
              <div style={{
                fontSize: 11,
                color: 'var(--muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
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
  );
}
