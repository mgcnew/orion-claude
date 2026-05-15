import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import { useAuditLog } from '../hooks/useEmployees.js';

const ACTION_COLOR = {
  EDITOU: 'info', UPLOAD: 'info', ACESSOU: '', GEROU: 'ok',
  EXPORT: 'warn', LOGIN: '', EXCLUIU: 'bad', ASSINOU: 'ok', CRIOU: 'ok',
};

const DAYS_OPTIONS = [
  { label: 'Hoje',           value: 1 },
  { label: 'Últimos 7 dias', value: 7 },
  { label: '30 dias',        value: 30 },
  { label: 'Trimestre',      value: 90 },
];

export default function AuditScreen({ activeCompany }) {
  const [days, setDays] = useState(30);
  const [q, setQ]       = useState('');
  const { logs, loading, refetch } = useAuditLog({ companyId: activeCompany?.id, days });

  const today = new Date().toDateString();
  const filtered = q
    ? logs.filter(l => [l.who, l.action, l.target].join(' ').toLowerCase().includes(q.toLowerCase()))
    : logs;

  const todayCount   = logs.filter(l => new Date(l.created_at).toDateString() === today).length;
  const uniqueActors = new Set(logs.map(l => l.who)).size;
  const exportCount  = logs.filter(l => l.action === 'EXPORT').length;
  const deleteCount  = logs.filter(l => l.action === 'EXCLUIU').length;

  const kpis = [
    { l: 'Eventos no período', v: logs.length,    k: '' },
    { l: 'Eventos hoje',       v: todayCount,      k: '' },
    { l: 'Atores únicos',      v: uniqueActors,    k: '' },
    { l: 'Exportações',        v: exportCount,     k: exportCount > 0 ? 'warn' : '' },
    { l: 'Exclusões',          v: deleteCount,     k: deleteCount > 0 ? 'bad'  : '' },
  ];

  return (
    <div className="fade-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="grow">
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
            Auditoria
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Trilha completa de acessos, edições e exportações — imutável.
          </p>
        </div>
        <div className="row gap-2">
          <input
            className="field"
            style={{ width: 200, height: 36 }}
            placeholder="Buscar por usuário, ação…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <select
            className="field"
            style={{ width: 160, height: 36 }}
            value={days}
            onChange={e => { setDays(Number(e.target.value)); }}
          >
            {DAYS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button className="btn" onClick={refetch}>
            <Icon name="refresh" size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {kpis.map((s, i) => (
          <div key={i} className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>
              {s.l}
            </div>
            <div className="row" style={{ marginTop: 6, alignItems: 'baseline', gap: 8 }}>
              <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>
                {loading ? '—' : s.v}
              </div>
              {s.k && <span className={`pill ${s.k}`} style={{ fontSize: 10 }}>•</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            {q ? 'Nenhum evento encontrado para essa busca.' : 'Nenhum evento de auditoria no período.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, whiteSpace: 'nowrap' }}>Quando</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Quem</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Ação</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Alvo</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>IP</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Dispositivo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={l.id} style={{ borderTop: '1px solid var(--line-soft)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap', color: 'var(--muted)' }}>
                      {new Date(l.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div className="row gap-2">
                        <Avatar name={l.who || '?'} size={26} hue={i * 60 + 30} />
                        <span style={{ fontWeight: 500 }}>{l.who || '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span className={`pill ${ACTION_COLOR[l.action] || ''}`} style={{ fontFamily: 'monospace', fontSize: 10.5 }}>
                        {l.action}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--ink-soft)' }}>{l.target || '—'}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12 }}>
                      <span style={{ color: 'var(--muted)' }}>{l.ip || '—'}</span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>{l.device || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
