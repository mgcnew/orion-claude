import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import Skeleton from '../components/Skeleton.jsx';
import TutorialBanner from '../components/TutorialBanner.jsx';
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
    <div
      className="card"
      style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, transition: 'transform .15s ease, box-shadow .15s ease', cursor: 'default' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}
    >
      <div className="row gap-2">
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            opacity: 0.92,
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
    extraHoursLabel: '--',
    activities: [],
    admissionsSeries: new Array(12).fill(0),
    absencesSeries: new Array(12).fill(0),
    birthdays: [],
    vacations: [],
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

      const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const monthEnd   = new Date(currentYear, currentMonth + 1, 0).toISOString().slice(0, 10);

      const [
        { data: employees },
        { data: documents },
        { data: warnings },
        { data: vacations },
        { data: activities },
        { data: onboardingPending },
        { data: timecards }
      ] = await Promise.all([
        empQuery,
        supabase.from('documents').select('*'),
        supabase.from('employee_warnings').select('*, employees(name)'),
        supabase.from('employee_vacations').select('*, employees(name)'),
        supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('onboarding_docs').select('id, employee_id').eq('status', 'pending'),
        supabase.from('time_entries').select('employee_id, status, extra_hours, time_in, time_out, periods').gte('date', monthStart).lte('date', monthEnd),
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
             const d = new Date(e.admission + 'T00:00:00');
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

      // Extra hours this month
      const STANDARD_MINS = 480;
      const parseExtra = (str) => {
        if (!str) return 0;
        const s = str.trim().toLowerCase();
        const mh = s.match(/^(\d+)h(\d+)?/);
        if (mh) return parseInt(mh[1]) * 60 + (parseInt(mh[2]) || 0);
        const mm = s.match(/^(\d+)m$/);
        if (mm) return parseInt(mm[1]);
        const mf = parseFloat(s);
        return isNaN(mf) ? 0 : Math.round(mf * 60);
      };
      const entryMins = (e) => {
        if (e.periods && Array.isArray(e.periods) && e.periods.length > 0) {
          return e.periods.reduce((sum, p) => {
            const [ih, im] = (p.in  || '').split(':').map(Number);
            const [oh, om] = (p.out || '').split(':').map(Number);
            if (isNaN(ih) || isNaN(oh)) return sum;
            return sum + (oh * 60 + om) - (ih * 60 + im);
          }, 0);
        }
        if (e.time_in && e.time_out) {
          const [ih, im] = e.time_in.split(':').map(Number);
          const [oh, om] = e.time_out.split(':').map(Number);
          return (oh * 60 + om) - (ih * 60 + im);
        }
        return 0;
      };
      let totalExtraMins = 0;
      (timecards ?? []).forEach(e => {
        if (companyId && !employeeIds.has(e.employee_id)) return;
        if (e.status === 'hora_extra') {
          totalExtraMins += parseExtra(e.extra_hours);
          const w = entryMins(e);
          if (w > 0) totalExtraMins += Math.max(0, w - STANDARD_MINS);
        } else if (e.status === 'presente') {
          const w = entryMins(e);
          if (w > STANDARD_MINS) totalExtraMins += w - STANDARD_MINS;
        }
      });
      const extraH = Math.floor(totalExtraMins / 60);
      const extraM = totalExtraMins % 60;
      const extraHoursLabel = totalExtraMins === 0 ? '0h' : extraM === 0 ? `${extraH}h` : `${extraH}h${String(extraM).padStart(2,'0')}`;

      // Alerts
      const alerts = [];
      if (pendingDocsCount > 0) {
        alerts.push({ kind: 'warn', icon: 'doc', title: `${pendingDocsCount} documentos sem assinatura/pendentes`, sub: 'Aguardando ação', route: 'documents' });
      }
      if (warningsCount > 0) {
        alerts.push({ kind: 'bad', icon: 'alert', title: `${warningsCount} advertências este mês`, sub: 'Atenção necessária', route: 'rh-warn' });
      }
      const vacationsPending = (vacations ?? []).filter(v =>
        v.status === 'pendente' && (!companyId || employeeIds.has(v.employee_id))
      );
      if (vacationsPending.length > 0) {
        alerts.push({ kind: 'info', icon: 'umbrella', title: `${vacationsPending.length} solicitações de férias`, sub: 'Aprovação pendente', route: 'rh-vacation' });
      }

      setData({
        counts: statusCounts,
        totalEmployees,
        pendingDocsCount,
        warningsCount,
        extraHoursLabel,
        activities: activities || [],
        admissionsSeries,
        absencesSeries,
        birthdays: upcomingBirthdays,
        vacations: upcomingVacations.slice(0, 5),
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

function AdmissionsChart({ admissions, dismissals, months, year }) {
  const [tooltip, setTooltip] = useState(null); // { x, y, month, adm, dis }
  const max = Math.max(...admissions, ...dismissals, 1);
  const totalAdm = admissions.reduce((a, b) => a + b, 0);
  const totalDis = dismissals.reduce((a, b) => a + b, 0);

  const CHART_H = 160;
  const Y_AXIS_W = 28;
  const BAR_GAP = 3;
  const BAR_W = 8;
  const GROUP_W = BAR_W * 2 + BAR_GAP;

  const gridSteps = 4;
  const gridValues = Array.from({ length: gridSteps + 1 }, (_, i) =>
    Math.round((max / gridSteps) * (gridSteps - i))
  );

  return (
    <div className="card" style={{ padding: 20 }}>
      {/* Header */}
      <div className="row gap-4" style={{ marginBottom: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Admissões e desligamentos</h3>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Últimos 12 meses</div>
        </div>
        <div className="row gap-3">
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.4 }}>ADMISSÕES</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--brand)', lineHeight: 1.2 }}>{totalAdm}</div>
          </div>
          <div style={{ width: 1, background: 'var(--line)', alignSelf: 'stretch' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, letterSpacing: 0.4 }}>DESLIGAMENTOS</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--bad)', lineHeight: 1.2 }}>{totalDis}</div>
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div style={{ display: 'flex', gap: 0 }}>
        {/* Y-axis labels */}
        <div style={{ width: Y_AXIS_W, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 20, flexShrink: 0 }}>
          {gridValues.map((v, i) => (
            <div key={i} style={{ fontSize: 10, color: 'var(--muted-2)', textAlign: 'right', paddingRight: 6, lineHeight: 1 }}>{v}</div>
          ))}
        </div>

        {/* Bars + grid */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Grid lines */}
          <div style={{ position: 'absolute', inset: 0, bottom: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
            {gridValues.map((_, i) => (
              <div key={i} style={{ borderTop: `1px ${i === gridSteps ? 'solid' : 'dashed'} var(--line)`, opacity: i === gridSteps ? 1 : 0.5 }} />
            ))}
          </div>

          {/* Columns */}
          <div style={{ display: 'flex', alignItems: 'flex-end', height: CHART_H + 20, gap: 0, paddingBottom: 20 }}>
            {admissions.map((adm, i) => {
              const dis = dismissals[i];
              const admH = adm > 0 ? Math.max((adm / max) * CHART_H, 4) : 0;
              const disH = dis > 0 ? Math.max((dis / max) * CHART_H, 4) : 0;
              const isLast = i === admissions.length - 1;
              return (
                <div
                  key={i}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', cursor: (adm > 0 || dis > 0) ? 'default' : 'default', position: 'relative' }}
                  onMouseEnter={(e) => {
                    if (adm === 0 && dis === 0) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 8, month: months[i], adm, dis });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {/* Hover highlight */}
                  <div style={{
                    position: 'absolute', inset: 0, bottom: 0, borderRadius: 4,
                    background: 'transparent',
                    transition: 'background .12s',
                  }}
                    onMouseEnter={e => { if (adm > 0 || dis > 0) e.currentTarget.style.background = 'var(--hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  />
                  {/* Bars */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: BAR_GAP, justifyContent: 'center', paddingBottom: 0, position: 'relative', zIndex: 1 }}>
                    <div style={{ width: BAR_W, height: admH, background: 'var(--brand)', borderRadius: '3px 3px 0 0', transition: 'height .3s ease', opacity: isLast ? 1 : 0.85 }} />
                    <div style={{ width: BAR_W, height: disH, background: 'var(--bad)', borderRadius: '3px 3px 0 0', transition: 'height .3s ease', opacity: 0.75 }} />
                  </div>
                  {/* Month label */}
                  <div style={{ fontSize: 10, color: isLast ? 'var(--ink)' : 'var(--muted-2)', fontWeight: isLast ? 700 : 400, paddingTop: 5, flexShrink: 0 }}>{months[i]}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="row gap-4" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
        <span className="row gap-2" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--brand)', display: 'inline-block' }} /> Admissões
        </span>
        <span className="row gap-2" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--bad)', opacity: 0.75, display: 'inline-block' }} /> Desligamentos
        </span>
      </div>

      {/* Tooltip portal */}
      {tooltip && createPortal(
        <div style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y,
          transform: 'translate(-50%, -100%)',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          padding: '8px 12px',
          pointerEvents: 'none',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,.12)',
          minWidth: 130,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{tooltip.month}</div>
          <div className="row gap-2" style={{ fontSize: 12.5, marginBottom: 3 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--brand)', display: 'inline-block', flexShrink: 0, marginTop: 3 }} />
            <span style={{ flex: 1 }}>Admissões</span>
            <strong>{tooltip.adm}</strong>
          </div>
          <div className="row gap-2" style={{ fontSize: 12.5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--bad)', display: 'inline-block', flexShrink: 0, marginTop: 3, opacity: 0.8 }} />
            <span style={{ flex: 1 }}>Desligamentos</span>
            <strong>{tooltip.dis}</strong>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dash-page" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ minWidth: 240 }}>
        <Skeleton width={120} height={12} style={{ marginBottom: 8 }} />
        <Skeleton width={280} height={24} style={{ marginBottom: 8 }} />
        <Skeleton width={420} height={14} />
      </div>

      {/* KPI grid */}
      <div className="dash-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="row gap-2">
              <Skeleton width={36} height={36} radius={9} />
              <Skeleton height={12} style={{ flex: 1, maxWidth: 140 }} />
            </div>
            <div className="row" style={{ alignItems: 'flex-end', gap: 10 }}>
              <Skeleton width={80} height={28} />
              <Skeleton width={86} height={28} style={{ marginLeft: 'auto' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="dash-grid-main" style={{ gap: 16 }}>
        {/* Chart placeholder */}
        <div className="card" style={{ padding: 20 }}>
          <Skeleton width={180} height={16} style={{ marginBottom: 6 }} />
          <Skeleton width={120} height={11} style={{ marginBottom: 20 }} />
          <Skeleton width="100%" height={200} radius={8} />
        </div>
        {/* Donut placeholder */}
        <div className="card" style={{ padding: 20 }}>
          <Skeleton width={160} height={16} style={{ marginBottom: 6 }} />
          <Skeleton width={120} height={11} style={{ marginBottom: 20 }} />
          <div className="row gap-4" style={{ alignItems: 'center' }}>
            <Skeleton width={130} circle />
            <div className="col gap-2" style={{ flex: 1 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="row gap-2">
                  <Skeleton width={8} height={8} radius={2} />
                  <Skeleton height={11} style={{ flex: 1, maxWidth: 80 }} />
                  <Skeleton width={40} height={11} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lower grid */}
      <div className="dash-grid-lower" style={{ gap: 16 }}>
        {[0, 1, 2].map(j => (
          <div key={j} className="card" style={{ padding: 20 }}>
            <Skeleton width={140} height={15} style={{ marginBottom: 16 }} />
            <div className="col gap-3">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  <Skeleton width={30} height={30} radius={8} />
                  <div className="grow">
                    <Skeleton height={13} style={{ marginBottom: 6, maxWidth: '80%' }} />
                    <Skeleton width={70} height={10} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ setRoute, navigate, addToast, activeCompany, userName }) {
  const nav = navigate ?? setRoute;
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

  if (loading) return <DashboardSkeleton />;

  const actPercent = data.totalEmployees > 0 ? ((data.counts.ativo / data.totalEmployees) * 100).toFixed(1) : '0';
  const ferPercent = data.totalEmployees > 0 ? ((data.counts.férias / data.totalEmployees) * 100).toFixed(1) : '0';
  const afaPercent = data.totalEmployees > 0 ? ((data.counts.afastado / data.totalEmployees) * 100).toFixed(1) : '0';
  const desPercent = data.totalEmployees > 0 ? ((data.counts.desligado / data.totalEmployees) * 100).toFixed(1) : '0';

  return (
    <>
    <style>{`
      .dash-page       { padding: clamp(14px,4vw,24px); display:flex; flex-direction:column; gap:20px; }
      .dash-grid-main  { display:grid; grid-template-columns:1.6fr 1fr; gap:16px; }
      .dash-grid-lower { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }
      .dash-donut-inner{ display:flex; flex-direction:row; align-items:center; gap:16px; }
      @media (max-width:768px) {
        .dash-grid-main  { grid-template-columns:1fr; }
        .dash-grid-lower { grid-template-columns:1fr; }
        .dash-donut-inner{ flex-direction:column; align-items:stretch; }
      }
    `}</style>
    <div className="fade-up dash-page">
      <TutorialBanner screenKey="dashboard" />
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
      <div className="dash-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
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
          value={data.extraHoursLabel}
          delta={``}
          deltaKind="info"
          accent="var(--info)"
          series={[0,0,0,0,0,0]}
        />
      </div>

      {/* Main grid */}
      <div className="dash-grid-main" style={{ gap: 16 }}>
        {/* Admissions chart */}
        <AdmissionsChart
          admissions={data.admissionsSeries}
          dismissals={data.absencesSeries}
          months={months}
          year={today.getFullYear()}
        />

        {/* Composition donut */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>Composição da equipe</h3>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
            Distribuição por situação
          </div>
          <div className="dash-donut-inner">
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
      <div className="dash-grid-lower" style={{ gap: 16 }}>
        {/* Activity timeline */}
        <div className="card" style={{ padding: 20 }}>
          <div className="row" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Atividade recente</h3>
            <span className="grow" />
            <button className="btn ghost sm" onClick={() => setRoute('audit')}>Ver tudo</button>
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

        {/* Birthdays + Vacations (stacked) */}
        <div className="col gap-4">
          {/* Aniversariantes */}
          <div className="card" style={{ padding: 20 }}>
            <div className="row" style={{ marginBottom: 14 }}>
              <Icon name="gift" size={16} style={{ color: 'var(--brand)', marginRight: 6 }} />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Aniversariantes do mês</h3>
              {data.birthdays.length > 0 && (
                <span className="pill brand" style={{ marginLeft: 'auto', fontSize: 11 }}>{data.birthdays.length}</span>
              )}
            </div>
            <div className="col gap-2">
              {data.birthdays.length === 0 && (
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Nenhum aniversariante nos próximos 30 dias.</div>
              )}
              {data.birthdays.map((it, i) => (
                <div
                  key={i}
                  className="row gap-3"
                  style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--surface-2)' }}
                >
                  <Avatar name={it.who} size={30} hue={(i + 2) * 67} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{it.who}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{it.sub}</div>
                  </div>
                  <div className="pill" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
                    <Icon name="gift" size={11} /> {it.date}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Férias próximas */}
          <div className="card" style={{ padding: 20 }}>
            <div className="row" style={{ marginBottom: 14 }}>
              <Icon name="umbrella" size={16} style={{ color: 'var(--info)', marginRight: 6 }} />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Férias próximas</h3>
              {data.vacations.length > 0 && (
                <span className="pill" style={{ marginLeft: 'auto', fontSize: 11, background: 'var(--info-tint, #eff6ff)', color: 'var(--info)' }}>{data.vacations.length}</span>
              )}
            </div>
            <div className="col gap-2" style={{ marginBottom: data.vacations.length > 0 ? 14 : 0 }}>
              {data.vacations.length === 0 && (
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Nenhuma férias nos próximos 30 dias.</div>
              )}
              {data.vacations.map((it, i) => (
                <div
                  key={i}
                  className="row gap-3"
                  style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--surface-2)' }}
                >
                  <Avatar name={it.who} size={30} hue={(i + 1) * 110} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{it.who}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Férias programadas</div>
                  </div>
                  <div className="pill" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
                    <Icon name="umbrella" size={11} /> {it.date}
                  </div>
                </div>
              ))}
            </div>
            {data.vacations.length > 0 && (
              <button className="btn ghost sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setRoute('rh-vacation')}>
                Ver calendário de férias
              </button>
            )}
          </div>
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
                  cursor: a.route ? 'pointer' : 'default',
                }}
                onClick={() => a.route && setRoute(a.route)}
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
          <span className="dash-actions-label" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
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
            { i: 'plus', l: 'Novo funcionário', r: 'employees', intent: 'new' },
            { i: 'upload', l: 'Upload documento', r: 'documents', intent: 'upload' },
            { i: 'alert', l: 'Nova advertência', r: 'rh-warn', intent: 'new-warn' },
            { i: 'clock', l: 'Registrar ponto', r: 'time' },
            { i: 'umbrella', l: 'Aprovar férias', r: 'rh-vacation' },
            { i: 'chart', l: 'Gerar relatório', r: 'reports' },
          ].map((a, i) => (
            <button
              key={i}
              className="btn"
              style={{ height: 64, flexDirection: 'column', gap: 6, justifyContent: 'center' }}
              onClick={() => nav(a.r, a.intent ?? null)}
            >
              <Icon name={a.i} size={17} style={{ color: 'var(--brand)' }} />
              <span style={{ fontSize: 12 }}>{a.l}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}

