import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import * as D from '../data/mock.js';

function Sparkline({ data, color, height = 40, width = 120, fill = true }) {
  const max = Math.max(...data),
    min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
    .join(' ');
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {fill && <path d={area} fill={color} opacity=".12" />}
      <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r="2.8"
        fill={color}
      />
    </svg>
  );
}

function StatCard({ icon, label, value, delta, deltaKind = 'ok', series, accent = 'var(--brand)' }) {
  return (
    <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="row gap-2">
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: 'var(--surface-2)',
            border: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
          }}
        >
          <Icon name={icon} size={17} />
        </div>
        <div className="grow" style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500 }}>
          {label}
        </div>
        <button className="btn ghost icon sm">
          <Icon name="more-h" size={14} />
        </button>
      </div>
      <div className="row" style={{ alignItems: 'flex-end', gap: 10 }}>
        <div className="mono" style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, lineHeight: 1 }}>
          {value}
        </div>
        {delta && (
          <span className={`pill ${deltaKind}`} style={{ fontSize: 11 }}>
            {delta}
          </span>
        )}
        <span className="grow" />
        {series && <Sparkline data={series} color={accent} width={86} height={28} />}
      </div>
    </div>
  );
}

function DonutChart({ segments, total, size = 140 }) {
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      {segments.map((s, i) => {
        const len = (s.v / total) * c;
        const off = -acc;
        acc += len;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={off}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            strokeLinecap="butt"
          />
        );
      })}
      <text x="50%" y="48%" textAnchor="middle" style={{ fontSize: 24, fontWeight: 700, fill: 'var(--ink)' }}>
        {total}
      </text>
      <text x="50%" y="62%" textAnchor="middle" style={{ fontSize: 10, fill: 'var(--muted)' }}>
        funcionários
      </text>
    </svg>
  );
}

function formatDatePtBR(date) {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
}

export default function Dashboard({ setRoute, addToast }) {
  const today = new Date();
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const activityIcon = {
    upload: 'upload',
    system: 'sparkle',
    clock: 'clock',
    umbrella: 'umbrella',
    alert: 'alert',
    doc: 'doc',
    check: 'check',
  };

  return (
    <div className="fade-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page header */}
      <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div className="grow" style={{ minWidth: 240 }}>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500, marginBottom: 4 }}>
            {formatDatePtBR(today)}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, margin: '0 0 4px' }}>
            Bom dia, Mariana 👋
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
            Você tem <strong style={{ color: 'var(--ink-soft)' }}>4 itens</strong> aguardando ação e{' '}
            <strong style={{ color: 'var(--ink-soft)' }}>12 documentos</strong> para revisar hoje.
          </p>
        </div>
        <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
          <button className="btn">
            <Icon name="download" size={15} /> Exportar
          </button>
          <button className="btn" onClick={() => setRoute('reports')}>
            <Icon name="chart" size={15} /> Relatórios
          </button>
          <button className="btn primary" onClick={() => setRoute('employees-new')}>
            <Icon name="plus" size={15} /> Novo funcionário
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <StatCard
          icon="users"
          label="Funcionários ativos"
          value="248"
          delta="+12 este mês"
          deltaKind="ok"
          series={[230, 232, 235, 238, 240, 242, 244, 245, 246, 247, 248, 248]}
        />
        <StatCard
          icon="doc"
          label="Documentos pendentes"
          value="34"
          delta="+8 hoje"
          deltaKind="warn"
          accent="var(--warn)"
          series={[20, 22, 21, 25, 28, 26, 30, 29, 32, 31, 34, 34]}
        />
        <StatCard
          icon="alert"
          label="Advertências (mês)"
          value="07"
          delta="-2 vs abril"
          deltaKind="ok"
          accent="var(--bad)"
          series={[12, 11, 10, 9, 9, 8, 8, 7, 7, 7, 7, 7]}
        />
        <StatCard
          icon="clock"
          label="Horas extras (mês)"
          value="412h"
          delta="+18%"
          deltaKind="info"
          accent="var(--info)"
          series={[280, 290, 310, 320, 340, 360, 370, 380, 395, 400, 408, 412]}
        />
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        {/* Admissions chart */}
        <div className="card" style={{ padding: 20 }}>
          <div className="row" style={{ marginBottom: 16 }}>
            <div>
              <div className="row gap-2">
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                  Admissões e desligamentos
                </h3>
                <span className="pill brand">2026</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                Comparativo dos últimos 12 meses
              </div>
            </div>
            <span className="grow" />
            <div className="row gap-3" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              <span className="row gap-2">
                <span style={{ width: 10, height: 10, background: 'var(--brand)', borderRadius: 2 }} />{' '}
                Admissões
              </span>
              <span className="row gap-2">
                <span
                  style={{
                    width: 10,
                    height: 10,
                    background: 'var(--bad)',
                    borderRadius: 2,
                    opacity: 0.7,
                  }}
                />{' '}
                Desligamentos
              </span>
            </div>
          </div>
          <div style={{ height: 220, display: 'flex', alignItems: 'flex-end', gap: 10, padding: '0 4px' }}>
            {D.admissionsSeries.map((v, i) => {
              const out = D.absencesSeries[i];
              const max = Math.max(...D.admissionsSeries, ...D.absencesSeries);
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 3,
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: `${(v / max) * 100}%`,
                        background: 'var(--brand)',
                        borderRadius: 2,
                      }}
                      title={`Admissões: ${v}`}
                    />
                    <div
                      style={{
                        width: 10,
                        height: `${(out / max) * 100}%`,
                        background: 'var(--bad)',
                        opacity: 0.65,
                        borderRadius: 2,
                      }}
                      title={`Saídas: ${out}`}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{months[i]}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Composition donut */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Composição da equipe</h3>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
            Distribuição por situação
          </div>
          <div className="row gap-4" style={{ alignItems: 'center' }}>
            <DonutChart
              segments={[
                { v: 218, color: 'var(--brand)', label: 'Ativos' },
                { v: 14, color: 'var(--info)', label: 'Férias' },
                { v: 8, color: 'var(--warn)', label: 'Afastados' },
                { v: 8, color: 'var(--muted-2)', label: 'Desligados (90d)' },
              ]}
              total={248}
            />
            <div className="col gap-2" style={{ flex: 1 }}>
              {[
                { c: 'var(--brand)', l: 'Ativos', v: 218, p: '87,9%' },
                { c: 'var(--info)', l: 'Férias', v: 14, p: '5,6%' },
                { c: 'var(--warn)', l: 'Afastados', v: 8, p: '3,2%' },
                { c: 'var(--muted-2)', l: 'Desligados', v: 8, p: '3,2%' },
              ].map((s, i) => (
                <div key={i} className="row gap-2" style={{ fontSize: 12.5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c }} />
                  <span style={{ flex: 1 }}>{s.l}</span>
                  <span className="mono" style={{ color: 'var(--muted)' }}>
                    {s.v}
                  </span>
                  <span
                    className="mono"
                    style={{ color: 'var(--muted-2)', width: 44, textAlign: 'right' }}
                  >
                    {s.p}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lower grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Activity timeline */}
        <div className="card" style={{ padding: 20 }}>
          <div className="row" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Atividade recente</h3>
            <span className="grow" />
            <button className="btn ghost sm">Ver tudo</button>
          </div>
          <div className="col gap-3">
            {D.activities.slice(0, 6).map((a, i) => (
              <div key={i} className="row gap-3" style={{ alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--muted)',
                    flexShrink: 0,
                  }}
                >
                  <Icon name={activityIcon[a.kind]} size={14} />
                </div>
                <div className="grow" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                  <strong style={{ fontWeight: 600 }}>{a.who}</strong>{' '}
                  <span style={{ color: 'var(--muted)' }}>{a.what}</span>{' '}
                  <strong style={{ fontWeight: 600 }}>{a.where}</strong>
                  <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 2 }}>
                    {a.when}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Birthdays / vacations */}
        <div className="card" style={{ padding: 20 }}>
          <div className="row" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Aniversariantes & férias</h3>
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Próximos 7 dias
          </div>
          <div className="col gap-2" style={{ marginBottom: 16 }}>
            {[
              { who: 'Beatriz Almeida', date: '12 mai', kind: 'gift', sub: '33 anos · Operações' },
              { who: 'Henrique Tavares', date: '14 mai', kind: 'gift', sub: '29 anos · Tecnologia' },
              { who: 'Camila Rocha', date: '15–28 mai', kind: 'umbrella', sub: 'Férias programadas' },
            ].map((it, i) => (
              <div
                key={i}
                className="row gap-3"
                style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--surface-2)' }}
              >
                <Avatar name={it.who} size={30} hue={(i + 1) * 80} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{it.who}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{it.sub}</div>
                </div>
                <div
                  className="pill"
                  style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
                >
                  <Icon name={it.kind} size={11} /> {it.date}
                </div>
              </div>
            ))}
          </div>
          <button className="btn" style={{ width: '100%', justifyContent: 'center' }}>
            Ver calendário completo
          </button>
        </div>

        {/* Pending alerts */}
        <div className="card" style={{ padding: 20 }}>
          <div className="row" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Alertas importantes</h3>
            <span className="grow" />
            <span className="pill bad">4</span>
          </div>
          <div className="col gap-2">
            {[
              { kind: 'bad', icon: 'alert', title: '4 contratos vencem em 7 dias', sub: 'Henrique Tavares + 3 outros' },
              { kind: 'warn', icon: 'clock', title: 'Banco de horas excedido', sub: 'Diego Pacheco · 38h acumuladas' },
              { kind: 'info', icon: 'umbrella', title: 'Período de férias bloqueado', sub: 'Beatriz A. — aprovação pendente' },
              { kind: 'warn', icon: 'doc', title: '12 documentos sem assinatura', sub: 'Aguardando RH' },
            ].map((a, i) => (
              <div
                key={i}
                className="row gap-3"
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  className={`pill ${a.kind}`}
                  style={{
                    width: 28,
                    height: 28,
                    padding: 0,
                    borderRadius: 8,
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon name={a.icon} size={14} />
                </div>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.sub}</div>
                </div>
                <Icon name="chevron-right" size={14} style={{ color: 'var(--muted-2)' }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card" style={{ padding: 16 }}>
        <div className="row" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Ações rápidas</h3>
          <span className="grow" />
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            Atalhos para fluxos do dia a dia
          </span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 8,
          }}
        >
          {[
            { i: 'plus', l: 'Novo funcionário', r: 'employees-new' },
            { i: 'upload', l: 'Upload documento', r: 'documents-upload' },
            { i: 'alert', l: 'Nova advertência', r: 'rh-warn' },
            {
              i: 'clock',
              l: 'Registrar ponto',
              r: 'time',
              action: () => addToast({ kind: 'ok', msg: 'Ponto registrado às 09:42' }),
            },
            { i: 'umbrella', l: 'Aprovar férias', r: 'rh-vacation' },
            { i: 'chart', l: 'Gerar relatório', r: 'reports' },
          ].map((a, i) => (
            <button
              key={i}
              className="btn"
              style={{ height: 64, flexDirection: 'column', gap: 6, justifyContent: 'center' }}
              onClick={() => (a.action ? a.action() : setRoute(a.r))}
            >
              <Icon name={a.i} size={17} style={{ color: 'var(--brand)' }} />
              <span style={{ fontSize: 12 }}>{a.l}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
