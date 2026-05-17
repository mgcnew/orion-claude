import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase.js';
import Icon from './Icon.jsx';

const ROUTES = [
  { label: 'Dashboard',          icon: 'dashboard', route: 'dashboard' },
  { label: 'Funcionários',       icon: 'users',     route: 'employees' },
  { label: 'Documentos',         icon: 'folder',    route: 'documents' },
  { label: 'Controle de ponto',  icon: 'clock',     route: 'time' },
  { label: 'RH',                 icon: 'briefcase', route: 'rh' },
  { label: 'Relatórios',         icon: 'chart',     route: 'reports' },
  { label: 'Justiça',            icon: 'gavel',     route: 'justice' },
  { label: 'CLT & Direitos',     icon: 'scale',     route: 'clt' },
  { label: 'Auditoria',          icon: 'history',   route: 'audit' },
  { label: 'Configurações',      icon: 'settings',  route: 'settings' },
];

function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth <= 767
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setMobile(mq.matches);
    const h = (e) => setMobile(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return mobile;
}

export default function SearchBar({ setRoute, setRouteParam, setRouteLabel }) {
  const [query, setQuery]         = useState('');
  const [open, setOpen]           = useState(false);
  const [overlayOpen, setOverlay] = useState(false);
  const [employees, setEmps]      = useState([]);
  const [documents, setDocs]      = useState([]);
  const [loading, setLoading]     = useState(false);
  const [cursor, setCursor]       = useState(-1);
  const inputRef   = useRef(null);
  const wrapRef    = useRef(null);
  const isMobile   = useIsMobile();

  const q = query.trim();

  const filteredRoutes = q
    ? ROUTES.filter(r => r.label.toLowerCase().includes(q.toLowerCase()))
    : [];

  useEffect(() => {
    if (!q) { setEmps([]); setDocs([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const [{ data: empData }, { data: docData }] = await Promise.all([
        supabase.from('employees').select('id, name, role').ilike('name', `%${q}%`).limit(5),
        supabase.from('documents').select('id, name, type').ilike('name', `%${q}%`).limit(5),
      ]);
      setEmps(empData ?? []);
      setDocs(docData ?? []);
      setLoading(false);
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  // Close desktop dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close overlay on ESC
  useEffect(() => {
    if (!overlayOpen) return;
    const handler = (e) => { if (e.key === 'Escape') closeOverlay(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [overlayOpen]);

  // Auto-focus when overlay opens
  useEffect(() => {
    if (overlayOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [overlayOpen]);

  useEffect(() => { setCursor(-1); }, [employees, documents, filteredRoutes]);

  const hasResults = filteredRoutes.length > 0 || employees.length > 0 || documents.length > 0;

  const flatItems = [
    ...filteredRoutes.map(r => ({ type: 'route', ...r })),
    ...employees.map(e => ({ type: 'employee', ...e })),
    ...documents.map(d => ({ type: 'document', ...d })),
  ];

  const closeOverlay = () => {
    setOverlay(false);
    setQuery('');
    setOpen(false);
  };

  const go = useCallback((item) => {
    if (item.type === 'route') {
      setRoute(item.route);
    } else if (item.type === 'employee') {
      setRouteParam(item.id);
      setRouteLabel(item.name);
      setRoute('employees-profile');
    } else if (item.type === 'document') {
      setRoute('documents');
    }
    setQuery('');
    setOpen(false);
    setOverlay(false);
  }, [setRoute, setRouteParam, setRouteLabel]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, flatItems.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter' && cursor >= 0) { e.preventDefault(); go(flatItems[cursor]); }
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  };

  const showDropdown = open && q.length > 0;

  // ── Mobile: icon trigger + full-screen overlay ──────────────────────────
  if (isMobile) {
    return (
      <>
        <button
          className="btn ghost icon"
          onClick={() => setOverlay(true)}
          title="Buscar"
        >
          <Icon name="search" size={17} />
        </button>

        {overlayOpen && createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
            {/* Backdrop */}
            <div
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
              onClick={closeOverlay}
            />

            {/* Panel */}
            <div style={{
              position: 'relative',
              background: 'var(--surface)',
              borderRadius: '0 0 16px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              padding: '12px 12px 0',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Input row */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: showDropdown ? 8 : 12 }}>
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                  height: 40, padding: '0 12px',
                  border: `1px solid ${open ? 'var(--brand)' : 'var(--line)'}`,
                  borderRadius: 8, background: 'var(--surface-2)',
                  boxShadow: open ? '0 0 0 3px var(--brand-tint)' : 'none',
                  transition: 'border-color .12s, box-shadow .12s',
                }}>
                  <Icon name="search" size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    placeholder="Buscar funcionários, documentos…"
                    style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: 'var(--ink)', minWidth: 0 }}
                  />
                  {query && (
                    <button
                      onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--muted-2)', display: 'flex', alignItems: 'center' }}
                    >
                      <Icon name="x" size={14} />
                    </button>
                  )}
                </div>
                <button
                  onClick={closeOverlay}
                  style={{ background: 'none', border: 'none', padding: '0 4px', cursor: 'pointer', fontSize: 13.5, fontWeight: 500, color: 'var(--brand)', whiteSpace: 'nowrap' }}
                >
                  Cancelar
                </button>
              </div>

              {/* Dropdown results */}
              {showDropdown && (
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {loading && (
                    <div style={{ padding: '12px 14px', fontSize: 12.5, color: 'var(--muted)' }}>Buscando…</div>
                  )}
                  {!loading && !hasResults && (
                    <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
                      Nenhum resultado para "{q}"
                    </div>
                  )}
                  {filteredRoutes.length > 0 && (
                    <Section label="Telas">
                      {filteredRoutes.map((r, i) => (
                        <ResultRow key={r.route} icon={r.icon} label={r.label} sub={null}
                          active={cursor === i} onMouseEnter={() => setCursor(i)}
                          onClick={() => go({ type: 'route', ...r })} />
                      ))}
                    </Section>
                  )}
                  {employees.length > 0 && (
                    <Section label="Funcionários">
                      {employees.map((e, i) => {
                        const idx = filteredRoutes.length + i;
                        return (
                          <ResultRow key={e.id} icon="user" label={e.name} sub={e.role}
                            active={cursor === idx} onMouseEnter={() => setCursor(idx)}
                            onClick={() => go({ type: 'employee', ...e })} />
                        );
                      })}
                    </Section>
                  )}
                  {documents.length > 0 && (
                    <Section label="Documentos">
                      {documents.map((d, i) => {
                        const idx = filteredRoutes.length + employees.length + i;
                        return (
                          <ResultRow key={d.id} icon="doc" label={d.name} sub={d.type}
                            active={cursor === idx} onMouseEnter={() => setCursor(idx)}
                            onClick={() => go({ type: 'document', ...d })} />
                        );
                      })}
                    </Section>
                  )}
                  {hasResults && (
                    <div style={{ padding: '8px 14px', borderTop: '1px solid var(--line)', fontSize: 11, color: 'var(--muted-2)', display: 'flex', gap: 12 }}>
                      <span><span className="kbd">↑↓</span> navegar</span>
                      <span><span className="kbd">↵</span> abrir</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{ height: 12 }} />
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  // ── Desktop: inline input ────────────────────────────────────────────────
  return (
    <div ref={wrapRef} style={{ position: 'relative', flexShrink: 1, minWidth: 0, width: 'clamp(180px, 30vw, 400px)' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 36, padding: '0 12px',
          border: `1px solid ${open ? 'var(--brand)' : 'var(--line)'}`,
          borderRadius: 8,
          background: 'var(--surface-2)',
          boxShadow: open ? '0 0 0 3px var(--brand-tint)' : 'none',
          transition: 'border-color .12s, box-shadow .12s',
          width: '100%',
        }}
      >
        <Icon name="search" size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Buscar funcionários, documentos…"
          style={{
            flex: 1, border: 'none', background: 'transparent', outline: 'none',
            fontSize: 13, color: 'var(--ink)', minWidth: 0,
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus(); }}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--muted-2)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          >
            <Icon name="x" size={13} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 10, boxShadow: 'var(--shadow-pop)',
            zIndex: 500, overflow: 'hidden',
            minWidth: 'min(calc(100vw - 24px), 360px)',
          }}
        >
          {loading && (
            <div style={{ padding: '12px 14px', fontSize: 12.5, color: 'var(--muted)' }}>Buscando…</div>
          )}
          {!loading && !hasResults && (
            <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              Nenhum resultado para "{q}"
            </div>
          )}
          {filteredRoutes.length > 0 && (
            <Section label="Telas">
              {filteredRoutes.map((r, i) => (
                <ResultRow key={r.route} icon={r.icon} label={r.label} sub={null}
                  active={cursor === i} onMouseEnter={() => setCursor(i)}
                  onClick={() => go({ type: 'route', ...r })} />
              ))}
            </Section>
          )}
          {employees.length > 0 && (
            <Section label="Funcionários">
              {employees.map((e, i) => {
                const idx = filteredRoutes.length + i;
                return (
                  <ResultRow key={e.id} icon="user" label={e.name} sub={e.role}
                    active={cursor === idx} onMouseEnter={() => setCursor(idx)}
                    onClick={() => go({ type: 'employee', ...e })} />
                );
              })}
            </Section>
          )}
          {documents.length > 0 && (
            <Section label="Documentos">
              {documents.map((d, i) => {
                const idx = filteredRoutes.length + employees.length + i;
                return (
                  <ResultRow key={d.id} icon="doc" label={d.name} sub={d.type}
                    active={cursor === idx} onMouseEnter={() => setCursor(idx)}
                    onClick={() => go({ type: 'document', ...d })} />
                );
              })}
            </Section>
          )}
          {hasResults && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--line)', fontSize: 11, color: 'var(--muted-2)', display: 'flex', gap: 12 }}>
              <span><span className="kbd">↑↓</span> navegar</span>
              <span><span className="kbd">↵</span> abrir</span>
              <span><span className="kbd">ESC</span> fechar</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <div style={{ padding: '8px 14px 4px', fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: 'var(--muted-2)', textTransform: 'uppercase' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function ResultRow({ icon, label, sub, active, onMouseEnter, onClick }) {
  return (
    <button
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', border: 'none', textAlign: 'left', cursor: 'pointer',
        background: active ? 'var(--hover)' : 'transparent',
        transition: 'background .08s',
      }}
    >
      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={14} style={{ color: 'var(--muted)' }} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{sub}</div>}
      </div>
      <Icon name="chevron-right" size={13} style={{ color: 'var(--muted-2)', flexShrink: 0 }} />
    </button>
  );
}
