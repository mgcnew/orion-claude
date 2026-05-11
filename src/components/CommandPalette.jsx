import { useState } from 'react';
import Icon from './Icon.jsx';

const ITEMS = [
  { kind: 'Navegar', label: 'Dashboard', icon: 'dashboard', route: 'dashboard' },
  { kind: 'Navegar', label: 'Funcionários', icon: 'users', route: 'employees' },
  { kind: 'Navegar', label: 'Documentos', icon: 'folder', route: 'documents' },
  { kind: 'Navegar', label: 'Controle de ponto', icon: 'clock', route: 'time' },
  { kind: 'Navegar', label: 'Permissões', icon: 'shield', route: 'settings-permissions' },
  { kind: 'Navegar', label: 'Justiça (PDF / A4)', icon: 'gavel', route: 'justice' },
  { kind: 'Navegar', label: 'Auditoria', icon: 'history', route: 'audit' },
  { kind: 'Ação', label: 'Novo funcionário', icon: 'plus', route: 'employees-new' },
  { kind: 'Ação', label: 'Upload de documento', icon: 'upload', route: 'documents-upload' },
  { kind: 'Funcionário', label: 'Mariana Oliveira', icon: 'user', route: 'employees-profile' },
  { kind: 'Funcionário', label: 'Rafael Carneiro', icon: 'user', route: 'employees-profile' },
  { kind: 'Funcionário', label: 'Beatriz Almeida', icon: 'user', route: 'employees-profile' },
];

export default function CommandPalette({ open, setOpen, setRoute }) {
  const [q, setQ] = useState('');
  if (!open) return null;
  const filtered = q
    ? ITEMS.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()))
    : ITEMS;
  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8,10,14,.45)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        zIndex: 100,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card fade-up"
        style={{
          width: 600,
          maxWidth: 'calc(100% - 32px)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-pop)',
        }}
      >
        <div
          className="row gap-2"
          style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}
        >
          <Icon name="search" size={18} style={{ color: 'var(--muted)' }} />
          <input
            autoFocus
            className="field"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar em todo o sistema…"
            style={{ border: 'none', background: 'transparent', height: 32, padding: 0, fontSize: 15 }}
          />
          <span className="kbd">ESC</span>
        </div>
        <div style={{ maxHeight: 380, overflowY: 'auto', padding: 6 }}>
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Nenhum resultado
            </div>
          )}
          {filtered.map((it, i) => (
            <button
              key={i}
              onClick={() => {
                setRoute(it.route);
                setOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                color: 'var(--ink)',
                cursor: 'pointer',
                fontSize: 13.5,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Icon name={it.icon} size={16} style={{ color: 'var(--muted)' }} />
              <span style={{ flex: 1 }}>{it.label}</span>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                }}
              >
                {it.kind}
              </span>
            </button>
          ))}
        </div>
        <div
          className="row gap-3"
          style={{
            padding: '10px 14px',
            borderTop: '1px solid var(--line)',
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          <span>
            <span className="kbd">↑↓</span> navegar
          </span>
          <span>
            <span className="kbd">↵</span> abrir
          </span>
          <span style={{ marginLeft: 'auto' }}>Orion · busca global</span>
        </div>
      </div>
    </div>
  );
}
