import { useState, useEffect, Fragment } from 'react';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import * as D from '../data/mock.js';
import { createEmployee } from '../hooks/useEmployees.js';

// ============================================================
// TIME TRACKING
// ============================================================
function formatDatePtBR(date) {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
}

export function TimeScreen({ addToast }) {
  const [clockedIn, setClockedIn] = useState(true);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="fade-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="grow">
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
            Controle de ponto
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Jornadas, horas extras e banco de horas em tempo real.
          </p>
        </div>
        <div className="row gap-2">
          <button className="btn">
            <Icon name="qr" size={15} /> QR Code de marcação
          </button>
          <button className="btn">
            <Icon name="download" size={15} /> Espelho mensal
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        {/* Clock card */}
        <div
          className="card"
          style={{
            padding: 24,
            background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)',
          }}
        >
          <div className="row">
            <div>
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  fontWeight: 600,
                }}
              >
                Marcação atual
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 56,
                  fontWeight: 700,
                  letterSpacing: -2.5,
                  lineHeight: 1,
                  marginTop: 8,
                }}
              >
                {time}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
                {formatDatePtBR(now)} · São Paulo, SP
              </div>
            </div>
            <span className="grow" />
            <div className="col gap-2" style={{ alignItems: 'flex-end' }}>
              <span className={`pill ${clockedIn ? 'ok' : ''}`}>
                <span className="dot pulse" /> {clockedIn ? 'Em jornada' : 'Fora de jornada'}
              </span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                Início 08:14:22
              </span>
            </div>
          </div>
          <div className="h-line" style={{ margin: '20px 0' }} />
          <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
            <button
              className="btn primary"
              style={{ height: 44, padding: '0 18px' }}
              onClick={() => {
                setClockedIn(!clockedIn);
                addToast({
                  kind: 'ok',
                  msg: clockedIn
                    ? 'Saída registrada às ' + time.slice(0, 5)
                    : 'Entrada registrada às ' + time.slice(0, 5),
                });
              }}
            >
              <Icon name="fingerprint" size={16} />{' '}
              {clockedIn ? 'Registrar saída' : 'Registrar entrada'}
            </button>
            <button className="btn" style={{ height: 44 }}>
              <Icon name="clock" size={15} /> Iniciar pausa
            </button>
            <button className="btn" style={{ height: 44 }}>
              <Icon name="edit" size={15} /> Solicitar ajuste
            </button>
            <span className="grow" />
            <div className="col" style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Hoje</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>
                04h 26m / 08h 00m
              </div>
            </div>
          </div>
        </div>

        {/* Banco de horas */}
        <div className="card" style={{ padding: 22 }}>
          <div className="row">
            <div>
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  fontWeight: 600,
                }}
              >
                Banco de horas
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  letterSpacing: -1,
                  marginTop: 6,
                  color: 'var(--ok)',
                }}
              >
                +12h 30m
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                Saldo do mês de maio · vence em 30/06
              </div>
            </div>
          </div>
          <div className="h-line" style={{ margin: '16px 0' }} />
          <div className="col gap-2">
            {[
              { l: 'Horas extras 100%', v: '08h 30m', c: 'var(--brand)' },
              { l: 'Horas extras 50%', v: '04h 00m', c: 'var(--info)' },
              { l: 'Compensações', v: '—', c: 'var(--muted-2)' },
            ].map((r, i) => (
              <div key={i} className="row">
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: r.c,
                    marginRight: 8,
                  }}
                />
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{r.l}</span>
                <span className="grow" />
                <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
                  {r.v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Week chart */}
      <div className="card" style={{ padding: 22 }}>
        <div className="row" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Jornada da semana</h3>
          <span className="grow" />
          <div className="row gap-3" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            <span className="row gap-2">
              <span style={{ width: 10, height: 10, background: 'var(--brand)', borderRadius: 2 }} />{' '}
              Realizado
            </span>
            <span className="row gap-2">
              <span style={{ width: 10, height: 10, background: 'var(--warn)', borderRadius: 2 }} />{' '}
              Hora extra
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 200 }}>
          {D.hoursWeek.map((d, i) => {
            const max = 10;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                  {(d.a + d.e).toFixed(1)}h
                </div>
                <div
                  style={{
                    width: '100%',
                    maxWidth: 50,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    justifyContent: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      height: `${(d.a / max) * 100}%`,
                      background: 'var(--brand)',
                      borderRadius: '4px 4px 0 0',
                    }}
                  />
                  {d.e > 0 && (
                    <div
                      style={{
                        height: `${(d.e / max) * 100}%`,
                        background: 'var(--warn)',
                        borderRadius: '4px 4px 0 0',
                      }}
                    />
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{d.d}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team status */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Equipe — status agora</h3>
          <span className="grow" />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>atualizado há 12s</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr
              style={{
                background: 'var(--surface-2)',
                color: 'var(--muted)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              }}
            >
              <th style={{ textAlign: 'left', padding: '10px 18px', fontWeight: 600 }}>Funcionário</th>
              <th style={{ textAlign: 'left', padding: '10px 18px', fontWeight: 600 }}>Início</th>
              <th style={{ textAlign: 'left', padding: '10px 18px', fontWeight: 600 }}>Pausa</th>
              <th style={{ textAlign: 'left', padding: '10px 18px', fontWeight: 600 }}>Tempo hoje</th>
              <th style={{ textAlign: 'left', padding: '10px 18px', fontWeight: 600 }}>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {D.employees.slice(0, 6).map((emp, i) => {
              const states = ['Trabalhando', 'Em pausa', 'Trabalhando', 'Trabalhando', 'Não iniciou', 'Trabalhando'];
              const kinds = ['ok', 'warn', 'ok', 'ok', '', 'ok'];
              return (
                <tr key={emp.id} style={{ borderTop: '1px solid var(--line-soft)' }}>
                  <td style={{ padding: '10px 18px' }}>
                    <div className="row gap-2">
                      <Avatar name={emp.name} hue={emp.hue} size={28} />
                      <span style={{ fontWeight: 500 }}>{emp.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 18px' }} className="mono">
                    {['08:14', '07:55', '08:32', '08:01', '—', '09:08'][i]}
                  </td>
                  <td style={{ padding: '10px 18px' }} className="mono">
                    {['—', '12:00 →', '—', '11:48–12:46', '—', '—'][i]}
                  </td>
                  <td style={{ padding: '10px 18px' }} className="mono">
                    {['04h 26m', '04h 02m', '04h 18m', '03h 51m', '00h 00m', '03h 12m'][i]}
                  </td>
                  <td style={{ padding: '10px 18px' }}>
                    <span className={`pill ${kinds[i]}`}>
                      <span className="dot" />
                      {states[i]}
                    </span>
                  </td>
                  <td style={{ padding: '10px 18px' }}>
                    <button className="btn ghost icon sm">
                      <Icon name="more-v" size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// PERMISSIONS
// ============================================================
export function PermissionsScreen({ addToast, embedded }) {
  const [active, setActive] = useState(0);
  const [grants, setGrants] = useState({});
  const user = D.userRoles[active];
  const key = (m, p) => `${active}|${m}|${p}`;
  const isOn = (m, p) => {
    if (grants[key(m, p)] != null) return grants[key(m, p)];
    if (user.role === 'Administrador') return true;
    if (user.role === 'RH') return p !== 'excluir' && m !== 'Administração';
    if (user.role === 'Supervisor')
      return ['ver', 'registrar', 'aprovar h.ext', 'exportar', 'ponto', 'funcionários'].includes(p);
    return ['ver'].includes(p);
  };
  const toggle = (m, p) => setGrants((g) => ({ ...g, [key(m, p)]: !isOn(m, p) }));

  return (
    <div
      className={embedded ? '' : 'fade-up'}
      style={{
        padding: embedded ? 0 : 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {!embedded && (
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="grow">
            <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
              Permissões granulares
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
              Configure exatamente o que cada usuário pode acessar dentro do sistema.
            </p>
          </div>
          <div className="row gap-2">
            <button className="btn">
              <Icon name="download" size={14} /> Exportar matriz
            </button>
            <button
              className="btn primary"
              onClick={() => addToast({ kind: 'ok', msg: 'Permissões salvas' })}
            >
              <Icon name="check" size={14} /> Salvar alterações
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        {/* Users list */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
            <input
              className="field"
              placeholder="Buscar usuário…"
              style={{ height: 34, fontSize: 13 }}
            />
          </div>
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {D.userRoles.map((u, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  padding: '12px 14px',
                  border: 'none',
                  background: i === active ? 'var(--brand-tint)' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--line-soft)',
                }}
              >
                <Avatar name={u.name} size={32} hue={i * 70 + 40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: i === active ? 'var(--brand)' : 'var(--ink)',
                    }}
                  >
                    {u.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    {u.role} · {u.email}
                  </div>
                </div>
                {!u.active && (
                  <span className="pill warn" style={{ fontSize: 10 }}>
                    off
                  </span>
                )}
              </button>
            ))}
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--line)' }}>
            <button className="btn" style={{ width: '100%', justifyContent: 'center' }}>
              <Icon name="plus" size={14} /> Convidar novo usuário
            </button>
          </div>
        </div>

        {/* Permissions grid */}
        <div className="card" style={{ padding: 22 }}>
          <div className="row">
            <div>
              <div className="row gap-2">
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{user.name}</h3>
                <span className="pill brand">{user.role}</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
                Aplicar template:
                <button className="btn ghost sm" style={{ marginLeft: 6 }}>
                  Administrador
                </button>
                <button className="btn ghost sm">RH padrão</button>
                <button className="btn ghost sm">Supervisor</button>
                <button className="btn ghost sm">Somente leitura</button>
              </div>
            </div>
          </div>
          <div className="h-line" style={{ margin: '18px 0' }} />

          <div className="col gap-4">
            {D.permissionsModules.map((mod, mi) => (
              <div key={mi}>
                <div className="row" style={{ marginBottom: 10 }}>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      color: 'var(--muted)',
                    }}
                  >
                    {mod.module}
                  </h4>
                  <span className="grow" />
                  <span style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>
                    {mod.perms.filter((p) => isOn(mod.module, p)).length} / {mod.perms.length}{' '}
                    ativas
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 8,
                  }}
                >
                  {mod.perms.map((p, pi) => {
                    const on = isOn(mod.module, p);
                    return (
                      <button
                        key={pi}
                        onClick={() => toggle(mod.module, p)}
                        className="row gap-2"
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: `1px solid ${on ? 'var(--brand)' : 'var(--line)'}`,
                          background: on ? 'var(--brand-tint)' : 'var(--surface)',
                          color: on ? 'var(--brand)' : 'var(--ink-soft)',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 16,
                            borderRadius: 8,
                            background: on ? 'var(--brand)' : 'var(--line)',
                            position: 'relative',
                            flexShrink: 0,
                            transition: 'background .15s',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              top: 1,
                              left: on ? 15 : 1,
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              background: 'white',
                              transition: 'left .15s',
                              boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                            }}
                          />
                        </div>
                        <span style={{ textTransform: 'capitalize' }}>{p}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AUDIT
// ============================================================
export function AuditScreen() {
  const actionColor = {
    EDITOU: 'info',
    UPLOAD: 'info',
    ACESSOU: '',
    GEROU: 'ok',
    EXPORT: 'warn',
    LOGIN: '',
    EXCLUIU: 'bad',
    ASSINOU: 'ok',
  };

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
          <select className="field" style={{ width: 160, height: 36 }}>
            <option>Últimos 7 dias</option>
            <option>30 dias</option>
            <option>Trimestre</option>
          </select>
          <button className="btn">
            <Icon name="filter" size={14} /> Filtros
          </button>
          <button className="btn">
            <Icon name="download" size={14} /> Exportar log
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
        }}
      >
        {[
          { l: 'Eventos hoje', v: '1.247', k: '' },
          { l: 'Acessos únicos', v: '84', k: '' },
          { l: 'Exportações', v: '12', k: 'warn' },
          { l: 'Exclusões', v: '3', k: 'bad' },
          { l: 'Edições críticas', v: '7', k: 'info' },
          { l: 'Tentativas falhas', v: '2', k: 'warn' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: 14 }}>
            <div
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                fontWeight: 600,
              }}
            >
              {s.l}
            </div>
            <div className="row" style={{ marginTop: 6, alignItems: 'baseline', gap: 8 }}>
              <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>
                {s.v}
              </div>
              {s.k && (
                <span className={`pill ${s.k}`} style={{ fontSize: 10 }}>
                  •
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr
              style={{
                background: 'var(--surface-2)',
                color: 'var(--muted)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              }}
            >
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Quando</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Quem</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Ação</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Alvo</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>IP</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Dispositivo</th>
            </tr>
          </thead>
          <tbody>
            {D.auditLog.map((l, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
                <td style={{ padding: '10px 16px' }} className="mono">
                  {l.when}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <div className="row gap-2">
                    <Avatar name={l.who} size={26} hue={i * 60 + 30} />
                    <span style={{ fontWeight: 500 }}>{l.who}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span
                    className={`pill ${actionColor[l.action] || ''}`}
                    style={{ fontFamily: 'JetBrains Mono', fontSize: 10.5 }}
                  >
                    {l.action}
                  </span>
                </td>
                <td style={{ padding: '10px 16px' }}>{l.target}</td>
                <td style={{ padding: '10px 16px' }} className="mono">
                  <span style={{ color: 'var(--muted)' }}>{l.ip}</span>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>{l.device}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// REPORTS
// ============================================================
export function ReportsScreen({ addToast }) {
  return (
    <div className="fade-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
          Relatórios
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          Modelos prontos e relatórios personalizados — exporte em PDF, Excel ou ZIP.
        </p>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 14,
        }}
      >
        {[
          { i: 'users',   n: 'Funcionários ativos',  d: 'Lista completa com filtros por unidade e cargo',  c: 'var(--brand)' },
          { i: 'doc',     n: 'Documentos pendentes', d: 'Itens sem assinatura ou vencidos',                c: 'var(--warn)' },
          { i: 'clock',   n: 'Espelho de ponto',     d: 'Jornada e horas extras consolidadas',             c: 'var(--info)' },
          { i: 'shield',  n: 'Jurídico',             d: 'Acordos, rescisões e processos abertos',          c: '#7c3aed' },
          { i: 'history', n: 'Auditoria',            d: 'Acessos, edições e exportações',                  c: 'var(--muted)' },
          { i: 'chart',   n: 'Folha consolidada',    d: 'Resumo mensal por centro de custo',               c: 'var(--ok)' },
        ].map((r, i) => (
          <div key={i} className="card" style={{ padding: 18 }}>
            <div className="row gap-2" style={{ marginBottom: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: r.c + '1f',
                  color: r.c,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={r.i} size={17} />
              </div>
              <span className="grow" />
              <span className="pill" style={{ fontSize: 10 }}>
                PDF · XLSX · ZIP
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{r.n}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
              {r.d}
            </div>
            <div className="row gap-2" style={{ marginTop: 14 }}>
              <button className="btn sm grow" style={{ justifyContent: 'center' }}>
                <Icon name="eye" size={13} /> Pré-visualizar
              </button>
              <button
                className="btn sm primary grow"
                style={{ justifyContent: 'center' }}
                onClick={() => addToast({ kind: 'ok', msg: r.n + ' gerado' })}
              >
                <Icon name="download" size={13} /> Gerar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// NEW EMPLOYEE
// ============================================================
export function NewEmployee({ setRoute, addToast }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const steps = ['Dados pessoais', 'Endereço', 'Vínculo', 'Documentos'];

  // Form state
  const [form, setForm] = useState({
    name: '', role: '', dept: 'RH', company: 'Orion Matriz',
    contract: 'CLT', admission: '', salary: '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div
      className="fade-up"
      style={{
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        maxWidth: 920,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <div>
        <button
          onClick={() => setRoute('employees')}
          className="btn ghost sm"
          style={{ marginBottom: 8 }}
        >
          <Icon name="chevron-left" size={13} /> Voltar
        </button>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
          Cadastrar funcionário
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          Preencha em 4 etapas. Os documentos podem ser enviados depois pelo perfil.
        </p>
      </div>

      {/* Stepper */}
      <div
        className="row"
        style={{
          gap: 0,
          padding: '16px 20px',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 12,
        }}
      >
        {steps.map((s, i) => (
          <Fragment key={i}>
            <div className="row gap-3" style={{ flex: 1 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: i <= step ? 'var(--brand)' : 'var(--surface-2)',
                  border: i <= step ? 'none' : '1px solid var(--line)',
                  color: i <= step ? 'white' : 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {i < step ? <Icon name="check" size={14} /> : i + 1}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: i === step ? 600 : 500,
                    color: i <= step ? 'var(--ink)' : 'var(--muted)',
                  }}
                >
                  {s}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>
                  {i < step ? 'concluído' : i === step ? 'em andamento' : 'pendente'}
                </div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: i < step ? 'var(--brand)' : 'var(--line)',
                  margin: '0 8px',
                  maxWidth: 60,
                }}
              />
            )}
          </Fragment>
        ))}
      </div>

      <div className="card" style={{ padding: 24 }}>
        {step === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label">Nome completo *</label>
              <input className="field" placeholder="Nome completo" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Nome social</label>
              <input className="field" placeholder="Opcional" />
            </div>
            <div>
              <label className="label">Data de nascimento</label>
              <input className="field" type="date" />
            </div>
            <div>
              <label className="label">CPF</label>
              <input className="field" placeholder="000.000.000-00" />
            </div>
            <div>
              <label className="label">RG</label>
              <input className="field" placeholder="00.000.000-X" />
            </div>
            <div>
              <label className="label">Estado civil</label>
              <select className="field">
                <option>Solteiro(a)</option>
                <option>Casado(a)</option>
                <option>Divorciado(a)</option>
              </select>
            </div>
            <div>
              <label className="label">E-mail pessoal</label>
              <input className="field" type="email" />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="field" placeholder="+55 11 9 0000-0000" />
            </div>
          </div>
        )}
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Logradouro</label>
              <input className="field" placeholder="Rua, número e complemento" />
            </div>
            <div>
              <label className="label">CEP</label>
              <input className="field" placeholder="00000-000" />
            </div>
            <div>
              <label className="label">Bairro</label>
              <input className="field" />
            </div>
            <div>
              <label className="label">Cidade</label>
              <input className="field" />
            </div>
            <div>
              <label className="label">UF</label>
              <select className="field">
                <option>SP</option>
                <option>RJ</option>
                <option>MG</option>
              </select>
            </div>
          </div>
        )}
        {step === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label">Cargo *</label>
              <input className="field" value={form.role} onChange={(e) => set('role', e.target.value)} />
            </div>
            <div>
              <label className="label">Departamento</label>
              <select className="field" value={form.dept} onChange={(e) => set('dept', e.target.value)}>
                <option>RH</option>
                <option>Financeiro</option>
                <option>Operações</option>
                <option>Tecnologia</option>
                <option>Comercial</option>
                <option>Logística</option>
                <option>Marketing</option>
                <option>Jurídico</option>
                <option>Administrativo</option>
              </select>
            </div>
            <div>
              <label className="label">Empresa</label>
              <select className="field" value={form.company} onChange={(e) => set('company', e.target.value)}>
                <option>Orion Matriz</option>
                <option>Orion Filial SP</option>
                <option>Orion Filial RJ</option>
                <option>Orion Filial MG</option>
              </select>
            </div>
            <div>
              <label className="label">Tipo de contrato</label>
              <select className="field" value={form.contract} onChange={(e) => set('contract', e.target.value)}>
                <option>CLT</option>
                <option>PJ</option>
                <option>Estagiário</option>
              </select>
            </div>
            <div>
              <label className="label">Data de admissão</label>
              <input className="field" type="date" value={form.admission} onChange={(e) => set('admission', e.target.value)} />
            </div>
            <div>
              <label className="label">Salário base</label>
              <input className="field" placeholder="R$ 0,00" value={form.salary} onChange={(e) => set('salary', e.target.value)} />
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="col gap-3">
            <div
              style={{
                padding: 24,
                border: '1.5px dashed var(--line)',
                borderRadius: 12,
                background: 'var(--surface-2)',
                textAlign: 'center',
              }}
            >
              <Icon name="upload" size={28} style={{ color: 'var(--brand)' }} />
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>
                Solte os documentos aqui
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                RG, CPF, comprovante de residência, contrato assinado
              </div>
              <button className="btn primary" style={{ marginTop: 14 }}>
                <Icon name="folder" size={14} /> Selecionar arquivos
              </button>
            </div>
            {['RG_frente.jpg', 'CPF.pdf', 'Contrato_assinado.pdf'].map((n, i) => (
              <div
                key={i}
                className="row gap-3"
                style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 8 }}
              >
                <Icon
                  name={n.endsWith('.pdf') ? 'pdf' : 'image'}
                  size={18}
                  style={{ color: 'var(--brand)' }}
                />
                <div className="grow">
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{n}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }} className="mono">
                    {[820, 180, 420][i]} KB · enviado
                  </div>
                </div>
                <span className="pill ok">
                  <Icon name="check" size={11} /> OK
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="row gap-2">
        <button
          className="btn"
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
          style={{ opacity: step === 0 ? 0.5 : 1 }}
        >
          <Icon name="chevron-left" size={14} /> Voltar
        </button>
        <span className="grow" />
        <button className="btn ghost">Salvar como rascunho</button>
        {step < steps.length - 1 ? (
          <button className="btn primary" onClick={() => setStep(step + 1)}>
            Próxima etapa <Icon name="chevron-right" size={14} />
          </button>
        ) : (
          <button
            className="btn primary"
            disabled={saving}
            onClick={async () => {
              if (!form.name || !form.role) {
                addToast({ kind: 'warn', msg: 'Preencha pelo menos nome e cargo.' });
                return;
              }
              setSaving(true);
              const { error } = await createEmployee({
                name: form.name,
                role: form.role,
                dept: form.dept,
                company: form.company,
                status: 'ativo',
                admission: form.admission || null,
                hue: Math.floor(Math.random() * 360),
              });
              setSaving(false);
              if (error) {
                addToast({ kind: 'warn', msg: 'Erro ao cadastrar: ' + error });
              } else {
                addToast({ kind: 'ok', msg: `${form.name.split(' ')[0]} cadastrado com sucesso!` });
                setRoute('employees');
              }
            }}
          >
            {saving ? <span className="pulse">Salvando…</span> : <><Icon name="check" size={14} /> Concluir cadastro</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS (with Permissions as a tab)
// ============================================================
export function SettingsScreen({ initialTab, addToast, setRoute }) {
  const [tab, setTab] = useState(initialTab || 'geral');
  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  const tabs = [
    { id: 'geral',      l: 'Geral',       i: 'settings' },
    { id: 'aparencia',  l: 'Aparência',   i: 'sparkle' },
    { id: 'seguranca',  l: 'Segurança',   i: 'shield' },
    { id: 'permissoes', l: 'Permissões',  i: 'key' },
    { id: 'integracao', l: 'Integrações', i: 'folder' },
  ];

  return (
    <div
      className="fade-up"
      style={{
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxWidth: 1180,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <div>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
          Configurações
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          Conta, organização, segurança e permissões.
        </p>
      </div>

      {/* Tab strip */}
      <div className="row gap-2" style={{ borderBottom: '1px solid var(--line)' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              if (setRoute)
                setRoute(t.id === 'permissoes' ? 'settings-permissions' : 'settings');
            }}
            className="row gap-2"
            style={{
              padding: '10px 14px',
              border: 'none',
              background: 'transparent',
              color: tab === t.id ? 'var(--brand)' : 'var(--muted)',
              fontSize: 13,
              fontWeight: tab === t.id ? 700 : 500,
              cursor: 'pointer',
              borderBottom: `2px solid ${tab === t.id ? 'var(--brand)' : 'transparent'}`,
              marginBottom: -1,
            }}
          >
            <Icon name={t.i} size={14} /> {t.l}
          </button>
        ))}
      </div>

      {tab === 'geral' && (
        <div className="col gap-4">
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700 }}>Organização</h3>
            <p style={{ margin: '0 0 18px', fontSize: 12.5, color: 'var(--muted)' }}>
              Dados da empresa exibidos em documentos e comunicações.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="label">Razão social</label>
                <input className="field" defaultValue="Orion Gestão LTDA." />
              </div>
              <div>
                <label className="label">CNPJ</label>
                <input className="field" defaultValue="12.345.678/0001-90" />
              </div>
              <div>
                <label className="label">E-mail corporativo</label>
                <input className="field" defaultValue="contato@orion.com.br" />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input className="field" defaultValue="+55 11 4000-0000" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="label">Endereço</label>
                <input className="field" defaultValue="Av. Paulista, 1000 — São Paulo/SP" />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'aparencia' && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700 }}>Aparência</h3>
          <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--muted)' }}>
            Use o painel de <strong>Tweaks</strong> (canto inferior direito) para escolher cor
            primária, modo claro/escuro e densidade.
          </p>
          <div
            className="row gap-3"
            style={{
              padding: 14,
              background: 'var(--surface-2)',
              borderRadius: 10,
              border: '1px solid var(--line-soft)',
            }}
          >
            <Icon name="sparkle" size={18} style={{ color: 'var(--brand)' }} />
            <div className="grow" style={{ fontSize: 13 }}>
              Personalização disponível: cor primária, tema, raio dos cantos e densidade.
            </div>
          </div>
        </div>
      )}

      {tab === 'seguranca' && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Segurança</h3>
          {[
            { l: 'Autenticação em dois fatores (2FA)', s: 'Aplicativo autenticador · ativo', on: true },
            { l: 'Sessões simultâneas', s: 'Limite de 3 dispositivos por usuário', on: true },
            { l: 'Bloqueio por inatividade', s: 'Após 15 minutos sem atividade', on: true },
            { l: 'Notificar acessos suspeitos', s: 'Por e-mail e Slack', on: false },
          ].map((s, i) => (
            <div
              key={i}
              className="row gap-3"
              style={{
                padding: '14px 0',
                borderBottom: i < 3 ? '1px solid var(--line-soft)' : 'none',
              }}
            >
              <div className="grow">
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{s.l}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s.s}</div>
              </div>
              <div
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  background: s.on ? 'var(--brand)' : 'var(--line)',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background .15s',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: s.on ? 18 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                    transition: 'left .15s',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'permissoes' && <PermissionsScreen addToast={addToast} embedded={true} />}

      {tab === 'integracao' && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700 }}>Integrações</h3>
          <p style={{ margin: '0 0 18px', fontSize: 12.5, color: 'var(--muted)' }}>
            Conecte serviços externos para sincronizar dados automaticamente.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 12,
            }}
          >
            {[
              { n: 'Senior Sistemas', s: 'Folha & ponto',        on: true },
              { n: 'TOTVS Protheus',  s: 'ERP',                  on: true },
              { n: 'Gov.br',          s: 'Assinatura digital',   on: true },
              { n: 'DocuSign',        s: 'Assinatura eletrônica',on: false },
              { n: 'Slack',           s: 'Notificações',         on: false },
            ].map((it, i) => (
              <div
                key={i}
                className="row gap-3"
                style={{ padding: 14, border: '1px solid var(--line-soft)', borderRadius: 10 }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--muted)',
                  }}
                >
                  <Icon name="folder" size={15} />
                </div>
                <div className="grow">
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{it.n}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{it.s}</div>
                </div>
                <span className={`pill ${it.on ? 'ok' : ''}`} style={{ fontSize: 10.5 }}>
                  {it.on ? 'Conectado' : 'Conectar'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// RH - WARNINGS (ADVERTÊNCIAS)
// ============================================================
export function WarningsScreen({ addToast }) {
  const [filter, setFilter] = useState('todas');
  const [q, setQ] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newWarn, setNewWarn] = useState({ emp: '', type: 'verbal', reason: '' });

  const typeLabel = { verbal: 'Verbal', escrita: 'Escrita', 'suspensão': 'Suspensão' };
  const typeKind  = { verbal: 'warn', escrita: 'bad', 'suspensão': 'bad' };

  const filtered = D.warnings.filter((w) => {
    if (filter !== 'todas' && w.type !== filter) return false;
    if (q && !(w.emp + ' ' + w.reason).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="fade-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="grow">
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
            Advertências
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Registro formal de advertências verbais, escritas e suspensões.
          </p>
        </div>
        <div className="row gap-2">
          <button className="btn">
            <Icon name="download" size={15} /> Exportar
          </button>
          <button className="btn primary" onClick={() => setShowModal(true)}>
            <Icon name="plus" size={15} /> Nova advertência
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { l: 'Total ativas',  v: D.warnings.filter((w) => w.status === 'ativa').length,    k: 'bad' },
          { l: 'Verbais',       v: D.warnings.filter((w) => w.type === 'verbal').length,     k: 'warn' },
          { l: 'Escritas',      v: D.warnings.filter((w) => w.type === 'escrita').length,    k: 'bad' },
          { l: 'Suspensões',    v: D.warnings.filter((w) => w.type === 'suspensão').length,  k: 'bad' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{s.l}</div>
            <div className="row" style={{ marginTop: 6, alignItems: 'baseline', gap: 8 }}>
              <div className="mono" style={{ fontSize: 26, fontWeight: 700 }}>{s.v}</div>
              {s.k && <span className={`pill ${s.k}`} style={{ fontSize: 10 }}>•</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Filters */}
        <div className="row gap-2" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
          <input
            className="field"
            placeholder="Buscar funcionário ou motivo…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 280, height: 34, fontSize: 13 }}
          />
          <span className="grow" />
          {['todas', 'verbal', 'escrita', 'suspensão'].map((f) => (
            <button
              key={f}
              className={`btn sm ${filter === f ? 'primary' : 'ghost'}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: 'capitalize' }}
            >
              {f === 'todas' ? 'Todas' : typeLabel[f]}
            </button>
          ))}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Funcionário</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Tipo</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Motivo</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Data</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Aplicada por</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  Nenhuma advertência encontrada.
                </td>
              </tr>
            ) : filtered.map((w) => (
              <tr key={w.id} style={{ borderTop: '1px solid var(--line-soft)' }}>
                <td style={{ padding: '11px 16px' }}>
                  <div className="row gap-2">
                    <Avatar name={w.emp} hue={w.hue} size={28} />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{w.emp}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{w.dept}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '11px 16px' }}>
                  <span className={`pill ${typeKind[w.type]}`}>{typeLabel[w.type]}</span>
                </td>
                <td style={{ padding: '11px 16px', color: 'var(--ink-soft)' }}>{w.reason}</td>
                <td style={{ padding: '11px 16px' }} className="mono">{w.date}</td>
                <td style={{ padding: '11px 16px', color: 'var(--muted)' }}>{w.appliedBy}</td>
                <td style={{ padding: '11px 16px' }}>
                  <span className={`pill ${w.status === 'ativa' ? 'bad' : ''}`}>
                    <span className="dot" />{w.status === 'ativa' ? 'Ativa' : 'Expirada'}
                  </span>
                </td>
                <td style={{ padding: '11px 16px' }}>
                  <button className="btn ghost icon sm"><Icon name="more-v" size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New warning modal */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="card"
            style={{ width: 480, padding: 28, position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row" style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Nova advertência</h2>
              <span className="grow" />
              <button className="btn ghost icon sm" onClick={() => setShowModal(false)}>
                <Icon name="x" size={15} />
              </button>
            </div>
            <div className="col gap-3">
              <div>
                <label className="label">Funcionário</label>
                <select className="field" value={newWarn.emp} onChange={(e) => setNewWarn({ ...newWarn, emp: e.target.value })}>
                  <option value="">Selecionar…</option>
                  {D.employees.filter((e) => e.status === 'ativo').map((e) => (
                    <option key={e.id} value={e.name}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="field" value={newWarn.type} onChange={(e) => setNewWarn({ ...newWarn, type: e.target.value })}>
                  <option value="verbal">Verbal</option>
                  <option value="escrita">Escrita</option>
                  <option value="suspensão">Suspensão</option>
                </select>
              </div>
              <div>
                <label className="label">Motivo</label>
                <textarea
                  className="field"
                  rows={3}
                  style={{ resize: 'vertical' }}
                  placeholder="Descreva o motivo da advertência…"
                  value={newWarn.reason}
                  onChange={(e) => setNewWarn({ ...newWarn, reason: e.target.value })}
                />
              </div>
            </div>
            <div className="row gap-2" style={{ marginTop: 20 }}>
              <button className="btn" onClick={() => setShowModal(false)}>Cancelar</button>
              <span className="grow" />
              <button
                className="btn primary"
                disabled={!newWarn.emp || !newWarn.reason}
                onClick={() => {
                  setShowModal(false);
                  addToast({ kind: 'ok', msg: `Advertência registrada para ${newWarn.emp.split(' ')[0]}` });
                  setNewWarn({ emp: '', type: 'verbal', reason: '' });
                }}
              >
                <Icon name="check" size={14} /> Registrar advertência
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// RH - VACATIONS (FÉRIAS)
// ============================================================
export function VacationScreen({ addToast }) {
  const [filter, setFilter] = useState('todas');
  const [vacations, setVacations] = useState(D.vacations);

  const approve = (id) => {
    setVacations((vs) => vs.map((v) => v.id === id ? { ...v, status: 'aprovado', approvedBy: 'Mariana Oliveira' } : v));
    addToast({ kind: 'ok', msg: 'Férias aprovadas' });
  };
  const reject = (id) => {
    setVacations((vs) => vs.map((v) => v.id === id ? { ...v, status: 'recusado' } : v));
    addToast({ kind: 'warn', msg: 'Férias recusadas' });
  };

  const statusKind = { aprovado: 'ok', pendente: 'warn', concluído: 'info', recusado: 'bad' };
  const statusLabel = { aprovado: 'Aprovado', pendente: 'Pendente', concluído: 'Concluído', recusado: 'Recusado' };

  const filtered = filter === 'todas' ? vacations : vacations.filter((v) => v.status === filter);

  return (
    <div className="fade-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="grow">
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Férias</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Solicitações, aprovações e programação anual de férias.
          </p>
        </div>
        <div className="row gap-2">
          <button className="btn"><Icon name="download" size={15} /> Exportar</button>
          <button className="btn primary" onClick={() => addToast({ kind: 'ok', msg: 'Formulário de solicitação aberto' })}>
            <Icon name="plus" size={15} /> Nova solicitação
          </button>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { l: 'Pendentes',  v: D.vacations.filter((v) => v.status === 'pendente').length,  k: 'warn' },
          { l: 'Aprovadas',  v: D.vacations.filter((v) => v.status === 'aprovado').length,  k: 'ok' },
          { l: 'Concluídas', v: D.vacations.filter((v) => v.status === 'concluído').length, k: 'info' },
          { l: 'Total dias (ano)', v: D.vacations.reduce((a, v) => a + v.days, 0), k: '' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{s.l}</div>
            <div className="row" style={{ marginTop: 6, alignItems: 'baseline', gap: 8 }}>
              <div className="mono" style={{ fontSize: 26, fontWeight: 700 }}>{s.v}</div>
              {s.k && <span className={`pill ${s.k}`} style={{ fontSize: 10 }}>•</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="row gap-2" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Solicitações</span>
          <span className="grow" />
          {['todas', 'pendente', 'aprovado', 'concluído'].map((f) => (
            <button
              key={f}
              className={`btn sm ${filter === f ? 'primary' : 'ghost'}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: 'capitalize' }}
            >
              {f === 'todas' ? 'Todas' : statusLabel[f]}
            </button>
          ))}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Funcionário</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Período</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Dias</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Solicitado em</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Aprovado por</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  Nenhuma solicitação encontrada.
                </td>
              </tr>
            ) : filtered.map((v) => (
              <tr key={v.id} style={{ borderTop: '1px solid var(--line-soft)' }}>
                <td style={{ padding: '11px 16px' }}>
                  <div className="row gap-2">
                    <Avatar name={v.emp} hue={v.hue} size={28} />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{v.emp}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{v.dept}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '11px 16px', fontSize: 12.5 }}>
                  <span className="mono">{v.start}</span>
                  <span style={{ color: 'var(--muted)', margin: '0 4px' }}>→</span>
                  <span className="mono">{v.end}</span>
                </td>
                <td style={{ padding: '11px 16px' }}>
                  <span className="pill">{v.days}d</span>
                </td>
                <td style={{ padding: '11px 16px', color: 'var(--muted)' }} className="mono">{v.requestedAt}</td>
                <td style={{ padding: '11px 16px', color: 'var(--muted)', fontSize: 12.5 }}>
                  {v.approvedBy || <span style={{ color: 'var(--muted-2)' }}>—</span>}
                </td>
                <td style={{ padding: '11px 16px' }}>
                  <span className={`pill ${statusKind[v.status] || ''}`}>
                    <span className="dot" />{statusLabel[v.status]}
                  </span>
                </td>
                <td style={{ padding: '11px 16px' }}>
                  {v.status === 'pendente' ? (
                    <div className="row gap-1">
                      <button className="btn sm" style={{ color: 'var(--ok)', borderColor: 'var(--ok)' }} onClick={() => approve(v.id)}>
                        <Icon name="check" size={12} /> Aprovar
                      </button>
                      <button className="btn sm ghost" onClick={() => reject(v.id)}>
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                  ) : (
                    <button className="btn ghost icon sm"><Icon name="more-v" size={13} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// ORGANOGRAM
// ============================================================
function OrgNode({ node, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      {/* Node card */}
      <div style={{ position: 'relative' }}>
        <div
          style={{
            background: 'var(--surface)',
            border: `2px solid ${depth === 0 ? 'var(--brand)' : 'var(--line)'}`,
            borderRadius: 10,
            padding: '10px 14px',
            minWidth: 160,
            maxWidth: 200,
            boxShadow: depth === 0 ? '0 0 0 3px var(--brand-tint)' : 'var(--shadow-card)',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            <Avatar name={node.name} hue={node.hue} size={36} />
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.3 }}>{node.name}</div>
          <div style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 600, marginTop: 2 }}>{node.role}</div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 1 }}>{node.dept}</div>
          {hasChildren && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                position: 'absolute',
                bottom: -12,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 22,
                height: 22,
                borderRadius: '50%',
                border: '2px solid var(--line)',
                background: 'var(--surface)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <Icon name={collapsed ? 'plus' : 'minus'} size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && !collapsed && (
        <>
          {/* Vertical line down */}
          <div style={{ width: 2, height: 28, background: 'var(--line)' }} />
          {node.children.length > 1 && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>
              {/* Horizontal bar */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: `calc(100% - 160px)`,
                  height: 2,
                  background: 'var(--line)',
                }}
              />
              <div style={{ display: 'flex', gap: 24 }}>
                {node.children.map((child, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 2, height: 20, background: 'var(--line)' }} />
                    <OrgNode node={child} depth={depth + 1} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {node.children.length === 1 && (
            <OrgNode node={node.children[0]} depth={depth + 1} />
          )}
        </>
      )}
    </div>
  );
}

export function OrgChartScreen() {
  const [zoom, setZoom] = useState(1);
  return (
    <div className="fade-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="grow">
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Organograma</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Estrutura hierárquica da equipe por departamento e supervisão.
          </p>
        </div>
        <div className="row gap-2">
          <button className="btn ghost icon" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} title="Reduzir">
            <Icon name="minus" size={15} />
          </button>
          <span className="mono" style={{ fontSize: 12, color: 'var(--muted)', minWidth: 36, textAlign: 'center', lineHeight: '36px' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button className="btn ghost icon" onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))} title="Ampliar">
            <Icon name="plus" size={15} />
          </button>
          <button className="btn" onClick={() => setZoom(1)}>
            <Icon name="sparkle" size={14} /> Ajustar
          </button>
          <button className="btn"><Icon name="download" size={15} /> Exportar</button>
        </div>
      </div>

      <div
        className="card"
        style={{
          flex: 1,
          padding: 32,
          overflowX: 'auto',
          overflowY: 'auto',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
      >
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform .2s' }}>
          <OrgNode node={D.orgChart} depth={0} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PLACEHOLDER
// ============================================================
export function Placeholder({ title, desc }) {
  return (
    <div className="fade-up" style={{ padding: 24 }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>{title}</h1>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{desc}</p>
      <div className="card" style={{ marginTop: 16, padding: 56, textAlign: 'center' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 14,
            background: 'var(--brand-tint)',
            color: 'var(--brand)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <Icon name="folder" size={26} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Em breve</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          Esta seção segue o mesmo padrão visual e está pronta para receber dados reais.
        </div>
      </div>
    </div>
  );
}
