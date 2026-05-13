import { useState, useEffect } from 'react';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import { supabase } from '../lib/supabase.js';

function Sparkline({ data, color, height = 40, width = 120, fill = true }) {
  const max = Math.max(...data, 1),
    min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (Math.max(data.length - 1, 1))) * width;
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
        cx={points[points.length - 1]?.[0] || 0}
        cy={points[points.length - 1]?.[1] || 0}
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
        const len = total > 0 ? (s.v / total) * c : 0;
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

export function useDashboardData(companyId) {
  const [data, setData] = useState({
    counts: { ativo: 0, férias: 0, afastado: 0, desligado: 0 },
    totalEmployees: 0,
    pendingDocsCount: 0,
    warningsCount: 0,
    activities: [],
    admissionsSeries: new Array(12).fill(0),
    absencesSeries: new Array(12).fill(0),
    upcoming: [],
    alerts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      let empQuery = supabase.from('employees').select('*');
      if (companyId) empQuery = empQuery.eq('company_id', companyId);

      const [
        { data: employees },
        { data: documents },
        { data: warnings },
        { data: vacations },
        { data: activities },
        { data: onboardingPending }
      ] = await Promise.all([
        empQuery,
        supabase.from('documents').select('*'),
        supabase.from('employee_warnings').select('*, employees(name)'),
        supabase.from('employee_vacations').select('*, employees(name)'),
        supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('onboarding_docs').select('id, employee_id').eq('status', 'pending')
      ]);

      const employeeIds = new Set((employees ?? []).map(e => e.id));

      // Calculate employee counts
      const statusCounts = { ativo: 0, férias: 0, afastado: 0, desligado: 0 };
      employees?.forEach(e => {
        if (statusCounts[e.status] !== undefined) {
          statusCounts[e.status]++;
        }
      });
      const totalEmployees = employees?.length || 0;

      // Pending documents (regular + onboarding checklist), filtered by company if needed
      const pendingDocs = (documents ?? []).filter(d =>
        (d.status === 'pendente' || d.status === 'warn') && (!companyId || employeeIds.has(d.employee_id))
      );
      const pendingOnboarding = (onboardingPending ?? []).filter(d =>
        !companyId || employeeIds.has(d.employee_id)
      );
      const pendingDocsCount = pendingDocs.length + pendingOnboarding.length;

      // Warnings this month, filtered by company if needed
      const warningsThisMonth = (warnings ?? []).filter(w => {
        if (companyId && !employeeIds.has(w.employee_id)) return false;
        const d = new Date(w.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      const warningsCount = warningsThisMonth.length;

      // Admissions/Absences Series (last 12 months)
      const admissionsSeries = new Array(12).fill(0);
      const absencesSeries = new Array(12).fill(0);
      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(currentYear, currentMonth - 11 + i, 1);
        const m = monthDate.getMonth();
        const y = monthDate.getFullYear();
        
        employees?.forEach(e => {
          if (e.admission) {
             const d = new Date(e.admission);
             if (d.getMonth() === m && d.getFullYear() === y) {
               admissionsSeries[i]++;
             }
          }
          if (e.status === 'desligado' && e.updated_at) {
             const d = new Date(e.updated_at);
             if (d.getMonth() === m && d.getFullYear() === y) {
               absencesSeries[i]++;
             }
          }
        });
      }

      // Birthdays and Vacations (Upcoming 7 days)
      const upcomingBirthdays = employees?.filter(e => {
        if (!e.birth_date) return false;
        const b = new Date(e.birth_date);
        const bThisYear = new Date(currentYear, b.getMonth(), b.getDate());
        // Handle if birthday already passed this year (check for next year)
        if (bThisYear < today) bThisYear.setFullYear(currentYear + 1);
        const diff = Math.ceil((bThisYear - today) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 30; // 30 days for better visibility
      }).map(e => ({ who: e.name, date: `${new Date(e.birth_date).getDate()} ${['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][new Date(e.birth_date).getMonth()]}`, kind: 'gift', sub: `${e.dept}` })) || [];

      const upcomingVacations = vacations?.filter(v => {
        if (!v.period_start) return false;
        const start = new Date(v.period_start);
        const diff = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 30; // 30 days for better visibility
      }).map(v => ({ who: v.employees?.name, date: `${new Date(v.period_start).getDate()} ${['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][new Date(v.period_start).getMonth()]}`, kind: 'umbrella', sub: 'Férias programadas' })) || [];

      // Alerts
      const alerts = [];
      if (pendingDocsCount > 0) {
        alerts.push({ kind: 'warn', icon: 'doc', title: `${pendingDocsCount} documentos sem assinatura/pendentes`, sub: 'Aguardando ação' });
      }
      if (warningsCount > 0) {
        alerts.push({ kind: 'bad', icon: 'alert', title: `${warningsCount} advertências recentes`, sub: 'Atenção necessária' });
      }
      const vacationsPending = (vacations ?? []).filter(v =>
        v.status === 'pendente' && (!companyId || employeeIds.has(v.employee_id))
      );
      if (vacationsPending.length > 0) {
        alerts.push({ kind: 'info', icon: 'umbrella', title: `${vacationsPending.length} solicitações de férias`, sub: 'Aprovação pendente' });
      }

      setData({
        counts: statusCounts,
        totalEmployees,
        pendingDocsCount,
        warningsCount,
        activities: activities || [],
        admissionsSeries,
        absencesSeries,
        upcoming: [...upcomingBirthdays, ...upcomingVacations].slice(0, 5),
        alerts
      });
      setLoading(false);
    }
    fetchData();
  }, [companyId]);

  return { data, loading };
}

function greeting(name) {
  const h = new Date().getHours();
  const period = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const first = name?.split(' ')[0];
  return first ? `${period}, ${first} 👋` : `${period} 👋`;
}

export default function Dashboard({ setRoute, addToast, activeCompany, userName }) {
  const { data, loading } = useDashboardData(activeCompany?.id);
  const today = new Date();
  
  // Last 12 months array for chart labels
  const currentMonth = today.getMonth();
  const allMonths = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const months = [];
  for (let i = 0; i < 12; i++) {
    months.push(allMonths[(currentMonth - 11 + i + 12) % 12]);
  }

  const activityIcon = {
    upload: 'upload',
    system: 'sparkle',
    clock: 'clock',
    umbrella: 'umbrella',
    alert: 'alert',
    doc: 'doc',
    check: 'check',
    other: 'sparkle'
  };

  if (loading) {
    return (
      <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const actPercent = data.totalEmployees > 0 ? ((data.counts.ativo / data.totalEmployees) * 100).toFixed(1) : '0';
  const ferPercent = data.totalEmployees > 0 ? ((data.counts.férias / data.totalEmployees) * 100).toFixed(1) : '0';
  const afaPercent = data.totalEmployees > 0 ? ((data.counts.afastado / data.totalEmployees) * 100).toFixed(1) : '0';
  const desPercent = data.totalEmployees > 0 ? ((data.counts.desligado / data.totalEmployees) * 100).toFixed(1) : '0';

  return (
    <div className="fade-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page header */}
      <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div className="grow" style={{ minWidth: 240 }}>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500, marginBottom: 4 }}>
            {formatDatePtBR(today)}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, margin: '0 0 4px' }}>
            {greeting(userName)}
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
            Você tem <strong style={{ color: 'var(--ink-soft)' }}>{data.alerts.length} alertas</strong> aguardando ação e{' '}
            <strong style={{ color: 'var(--ink-soft)' }}>{data.pendingDocsCount} documentos</strong> para revisar hoje.
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <StatCard
          icon="users"
          label="Funcionários ativos"
          value={data.counts.ativo}
          delta={``}
          deltaKind="ok"
          series={data.admissionsSeries.length > 0 ? data.admissionsSeries : [0,0,0,0,0,0]}
        />
        <StatCard
          icon="doc"
          label="Documentos pendentes"
          value={data.pendingDocsCount}
          delta={``}
          deltaKind="warn"
          accent="var(--warn)"
          series={[0,0,0,data.pendingDocsCount, data.pendingDocsCount+1, data.pendingDocsCount]}
        />
        <StatCard
          icon="alert"
          label="Advertências (mês)"
          value={data.warningsCount}
          delta={``}
          deltaKind="ok"
          accent="var(--bad)"
          series={[0,0,0,0,0,data.warningsCount]}
        />
        <StatCard
          icon="clock"
          label="Horas extras (mês)"
          value={"--"}
          delta={``}
          deltaKind="info"
          accent="var(--info)"
          series={[0,0,0,0,0,0]}
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
                <span className="pill brand">{today.getFullYear()}</span>
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
            {data.admissionsSeries.map((v, i) => {
              const out = data.absencesSeries[i];
              const max = Math.max(...data.admissionsSeries, ...data.absencesSeries, 1);
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
                { v: data.counts.ativo, color: 'var(--brand)', label: 'Ativos' },
                { v: data.counts.férias, color: 'var(--info)', label: 'Férias' },
                { v: data.counts.afastado, color: 'var(--warn)', label: 'Afastados' },
                { v: data.counts.desligado, color: 'var(--muted-2)', label: 'Desligados' },
              ]}
              total={data.totalEmployees}
            />
            <div className="col gap-2" style={{ flex: 1 }}>
              {[
                { c: 'var(--brand)', l: 'Ativos', v: data.counts.ativo, p: `${actPercent}%` },
                { c: 'var(--info)', l: 'Férias', v: data.counts.férias, p: `${ferPercent}%` },
                { c: 'var(--warn)', l: 'Afastados', v: data.counts.afastado, p: `${afaPercent}%` },
                { c: 'var(--muted-2)', l: 'Desligados', v: data.counts.desligado, p: `${desPercent}%` },
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
            {data.activities.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Nenhuma atividade recente.</div>}
            {data.activities.slice(0, 6).map((a, i) => {
               const date = new Date(a.created_at);
               const timeStr = date.toLocaleDateString() === today.toLocaleDateString() ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString();
               return (
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
                    <Icon name={activityIcon[a.kind] || 'sparkle'} size={14} />
                  </div>
                  <div className="grow" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                    <strong style={{ fontWeight: 600 }}>{a.who}</strong>{' '}
                    <span style={{ color: 'var(--muted)' }}>{a.what}</span>{' '}
                    {a.where_ref && <strong style={{ fontWeight: 600 }}>{a.where_ref}</strong>}
                    <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 2 }}>
                      {timeStr}
                    </div>
                  </div>
                </div>
               );
            })}
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
            Próximos 30 dias
          </div>
          <div className="col gap-2" style={{ marginBottom: 16 }}>
            {data.upcoming.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Sem registros próximos.</div>}
            {data.upcoming.map((it, i) => (
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
            <span className="pill bad">{data.alerts.length}</span>
          </div>
          <div className="col gap-2">
            {data.alerts.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Tudo tranquilo por aqui.</div>}
            {data.alerts.map((a, i) => (
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
              action: () => {
                setRoute('time');
              },
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

