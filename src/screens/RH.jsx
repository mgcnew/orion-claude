import { useState, useEffect, useRef } from 'react';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import {
  useAllWarnings, useAllVacations, useAllDocuments, useAllBenefits,
  useEmployees, createWarning, createVacation, updateVacationStatus,
  createBenefit, updateBenefitStatus, deleteBenefit,
  logAudit,
} from '../hooks/useEmployees.js';
import { supabase } from '../lib/supabase.js';
import { usePermissions } from '../lib/permissions.jsx';

const TABS = [
  { id: 'resumo',       label: 'Resumo',      icon: 'dashboard' },
  { id: 'advertencias', label: 'Advertências', icon: 'alert' },
  { id: 'ferias',       label: 'Férias',       icon: 'umbrella' },
  { id: 'beneficios',   label: 'Benefícios',   icon: 'gift' },
  { id: 'avaliacoes',   label: 'Avaliações',   icon: 'chart' },
  { id: 'holerites',    label: 'Holerites',    icon: 'pdf' },
];

const ROUTE_TO_TAB = {
  'rh':          'resumo',
  'rh-warn':     'advertencias',
  'rh-vacation': 'ferias',
  'rh-benefits': 'beneficios',
  'rh-eval':     'avaliacoes',
  'rh-payslip':  'holerites',
};

// ============================================================
// MAIN SCREEN
// ============================================================
export default function RHScreen({ addToast, activeCompany, route, openModal }) {
  const [tab, setTab] = useState(() => ROUTE_TO_TAB[route] ?? 'resumo');
  const { can } = usePermissions();

  useEffect(() => {
    const t = ROUTE_TO_TAB[route];
    if (t) setTab(t);
  }, [route]);

  const companyId = activeCompany?.id ?? null;
  const { employees } = useEmployees({ companyId });
  const { warnings, loading: warnLoading, refetch: refetchWarnings } = useAllWarnings(companyId);
  const { vacations, loading: vacLoading, refetch: refetchVacations } = useAllVacations(companyId);
  const { documents: allDocs, refetch: refetchDocs } = useAllDocuments(companyId);
  const { benefits, loading: benLoading, refetch: refetchBenefits } = useAllBenefits(companyId);

  const activeEmployees = employees.filter(e => e.status === 'ativo');
  const payslips = allDocs.filter(d => d.category === 'holerites');

  const shared = { addToast, activeCompany, companyId, employees, activeEmployees, can };

  return (
    <div
      className="fade-up rh-screen"
      style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 0, height: '100%', boxSizing: 'border-box' }}
    >
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Recursos Humanos</h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Advertências, férias, benefícios, avaliações e holerites da equipe.</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', flexShrink: 0, marginBottom: 20, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            title={t.label}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', border: 'none', background: 'transparent',
              fontSize: 13, fontWeight: tab === t.id ? 600 : 500,
              color: tab === t.id ? 'var(--ink)' : 'var(--muted)',
              borderBottom: `2px solid ${tab === t.id ? 'var(--brand)' : 'transparent'}`,
              cursor: 'pointer', transition: 'color .12s', marginBottom: -1, whiteSpace: 'nowrap',
            }}
          >
            <Icon name={t.icon} size={13} />
            <span className="rh-tab-label">{t.label}</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {tab === 'resumo' && (
          <ResumoTab warnings={warnings} vacations={vacations} payslips={payslips} setTab={setTab} />
        )}
        {tab === 'advertencias' && (
          <AdvertenciasTab {...shared} warnings={warnings} loading={warnLoading} refetch={refetchWarnings} openModal={openModal} />
        )}
        {tab === 'ferias' && (
          <FeriasTab {...shared} vacations={vacations} loading={vacLoading} refetch={refetchVacations} />
        )}
        {tab === 'beneficios' && <BeneficiosTab {...shared} benefits={benefits} loading={benLoading} refetch={refetchBenefits} />}
        {tab === 'avaliacoes' && <AvaliacoesTab {...shared} />}
        {tab === 'holerites' && (
          <HoleritesTab {...shared} payslips={payslips} refetch={refetchDocs} />
        )}
      </div>
    </div>
  );
}

// ============================================================
// ABA — RESUMO
// ============================================================
function ResumoTab({ warnings, vacations, payslips, setTab }) {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const pendingVac   = vacations.filter(v => v.status === 'pendente').length;
  const upcomingVac  = vacations.filter(v => {
    if (v.status !== 'aprovado') return false;
    return new Date((v.period_start || '') + 'T00:00:00') > now;
  }).length;
  const thisMonthPay = payslips.filter(d => (d.doc_date || d.created_at?.slice(0, 10) || '').startsWith(thisMonth)).length;

  const cards = [
    {
      id: 'advertencias', icon: 'alert', color: '#C2412C', label: 'Advertências',
      value: warnings.length,
      sub: `${warnings.filter(w => w.severity === 'verbal').length} verbais · ${warnings.filter(w => w.severity === 'suspensao').length} suspensões`,
    },
    {
      id: 'ferias', icon: 'umbrella', color: '#0891b2', label: 'Férias pendentes',
      value: pendingVac,
      sub: `${upcomingVac} aprovadas e agendadas`,
    },
    {
      id: 'beneficios', icon: 'gift', color: '#1F8A5B', label: 'Benefícios',
      value: '—', sub: 'Em breve',
    },
    {
      id: 'avaliacoes', icon: 'chart', color: '#C58A1B', label: 'Avaliações',
      value: '—', sub: 'Em breve',
    },
    {
      id: 'holerites', icon: 'pdf', color: '#2A5BFF', label: 'Holerites',
      value: thisMonthPay, sub: 'enviados este mês',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
        {cards.map(c => (
          <button
            key={c.id}
            onClick={() => setTab(c.id)}
            style={{
              textAlign: 'left', background: 'var(--surface)',
              border: '1px solid var(--line-soft)', borderRadius: 'var(--radius-lg)',
              padding: 16, cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = c.color + '55'; e.currentTarget.style.boxShadow = `0 2px 12px ${c.color}18`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-soft)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: c.color + '18', color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={c.icon} size={16} />
              </div>
              <Icon name="chevron-right" size={13} style={{ color: 'var(--muted-2)' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>{c.label}</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{c.value}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{c.sub}</div>
          </button>
        ))}
      </div>

      {warnings.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="alert" size={13} style={{ color: 'var(--bad)' }} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>Advertências recentes</span>
            <span className="grow" />
            <button className="btn ghost sm" style={{ fontSize: 12 }} onClick={() => setTab('advertencias')}>
              Ver todas <Icon name="chevron-right" size={12} />
            </button>
          </div>
          {warnings.slice(0, 4).map(w => (
            <div key={w.id} style={{ padding: '10px 16px', borderTop: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={w.employees?.name || '?'} size={28} hue={w.employees?.hue || 0} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{w.employees?.name || '—'}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.description}</div>
              </div>
              <span className={`pill ${w.severity === 'verbal' ? 'warn' : 'bad'}`} style={{ fontSize: 11, flexShrink: 0 }}>
                {w.severity === 'verbal' ? 'Verbal' : w.severity === 'escrita' ? 'Escrita' : 'Suspensão'}
              </span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted-2)', flexShrink: 0 }}>
                {w.date ? new Date(w.date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {pendingVac > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="umbrella" size={13} style={{ color: '#0891b2' }} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>Férias aguardando aprovação</span>
            <span className="pill warn" style={{ fontSize: 11, marginLeft: 4 }}>{pendingVac}</span>
            <span className="grow" />
            <button className="btn ghost sm" style={{ fontSize: 12 }} onClick={() => setTab('ferias')}>
              Ver todas <Icon name="chevron-right" size={12} />
            </button>
          </div>
          {vacations.filter(v => v.status === 'pendente').slice(0, 3).map(v => (
            <div key={v.id} style={{ padding: '10px 16px', borderTop: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={v.employees?.name || '?'} size={28} hue={v.employees?.hue || 0} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{v.employees?.name || '—'}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  {v.period_start ? new Date(v.period_start + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                  {' → '}
                  {v.period_end ? new Date(v.period_end + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                  {' · '}{v.days_count || v.days || 0} dias
                </div>
              </div>
              <span className="pill warn" style={{ fontSize: 11 }}><span className="dot" />Pendente</span>
            </div>
          ))}
        </div>
      )}

      {warnings.length === 0 && pendingVac === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--ok-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Icon name="check" size={22} style={{ color: 'var(--ok)' }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Tudo em ordem</div>
          <div style={{ fontSize: 13 }}>Nenhuma advertência ou solicitação de férias pendente.</div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ABA — ADVERTÊNCIAS
// ============================================================
function AdvertenciasTab({ addToast, companyId, activeEmployees, can, warnings, loading, refetch, openModal }) {
  const [filter, setFilter] = useState('todas');
  const [q, setQ] = useState('');
  const [showModal, setShowModal] = useState(!!openModal);
  const [newWarn, setNewWarn] = useState({ employee_id: '', severity: 'verbal', description: '' });
  const [saving, setSaving] = useState(false);

  const TYPE_LABEL = { verbal: 'Verbal', escrita: 'Escrita', suspensao: 'Suspensão' };
  const TYPE_KIND  = { verbal: 'warn', escrita: 'bad', suspensao: 'bad' };
  const TYPE_NAME  = { verbal: 'Advertência verbal', escrita: 'Advertência escrita', suspensao: 'Suspensão' };

  const filtered = warnings.filter(w => {
    if (filter !== 'todas' && (w.severity || 'verbal') !== filter) return false;
    const str = ((w.employees?.name || '') + ' ' + (w.description || '')).toLowerCase();
    return !q || str.includes(q.toLowerCase());
  });

  const count = s => warnings.filter(w => (w.severity || 'verbal') === s).length;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await createWarning({
      employee_id:  newWarn.employee_id,
      type:         TYPE_NAME[newWarn.severity],
      severity:     newWarn.severity,
      description:  newWarn.description,
      date:         new Date().toISOString().slice(0, 10),
      applied_by:   'Usuário atual',
    });
    setSaving(false);
    if (error) { addToast({ kind: 'warn', msg: 'Erro: ' + error.message }); return; }
    const emp = activeEmployees.find(e => e.id === newWarn.employee_id);
    logAudit(companyId, 'CRIOU', `Advertência: ${emp?.name || newWarn.employee_id}`);
    setShowModal(false);
    setNewWarn({ employee_id: '', severity: 'verbal', description: '' });
    addToast({ kind: 'ok', msg: 'Advertência registrada.' });
    refetch();
  };

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', flex: 1 }}>
          Registro formal de advertências verbais, escritas e suspensões.
        </p>
        <div className="row gap-2">
          <button className="btn"><Icon name="download" size={14} /> Exportar</button>
          {can('RH', 'advertir') && (
            <button className="btn primary" onClick={() => setShowModal(true)}>
              <Icon name="plus" size={14} /> Nova advertência
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        {[
          { l: 'Total',      v: warnings.length, k: '' },
          { l: 'Verbais',    v: count('verbal'),  k: 'warn' },
          { l: 'Escritas',   v: count('escrita'), k: 'bad' },
          { l: 'Suspensões', v: count('suspensao'), k: 'bad' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{s.l}</div>
            <div className="row" style={{ marginTop: 4, alignItems: 'baseline', gap: 6 }}>
              <div className="mono" style={{ fontSize: 24, fontWeight: 700 }}>{s.v}</div>
              {s.k && <span className={`pill ${s.k}`} style={{ fontSize: 10 }}>•</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="row gap-2" style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={13} style={{ position: 'absolute', left: 9, top: 10, color: 'var(--muted)', pointerEvents: 'none' }} />
            <input
              className="field"
              placeholder="Buscar funcionário ou motivo…"
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ paddingLeft: 30, width: 'min(260px, 100%)', height: 34, fontSize: 13 }}
            />
          </div>
          <span className="grow" />
          {['todas', 'verbal', 'escrita', 'suspensao'].map(f => (
            <button key={f} className={`btn sm ${filter === f ? 'primary' : 'ghost'}`} onClick={() => setFilter(f)}>
              {f === 'todas' ? 'Todas' : TYPE_LABEL[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}><div className="pulse">Carregando…</div></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            <Icon name="alert" size={28} style={{ opacity: 0.2, marginBottom: 10 }} />
            <div>Nenhuma advertência encontrada.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                <th style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Funcionário</th>
                <th className="rh-warn-col-desc" style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Motivo</th>
                <th className="rh-warn-col-date" style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Data</th>
                <th className="rh-warn-col-by"   style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Aplicada por</th>
                <th style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Severidade</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => (
                <tr key={w.id} style={{ borderTop: '1px solid var(--line-soft)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '11px 16px' }}>
                    <div className="row gap-2">
                      <Avatar name={w.employees?.name || '?'} hue={w.employees?.hue || 0} size={28} />
                      <div>
                        <div style={{ fontWeight: 500 }}>{w.employees?.name || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{w.employees?.dept || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="rh-warn-col-desc" style={{ padding: '11px 16px', color: 'var(--ink-soft)', maxWidth: 280 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.description}</div>
                  </td>
                  <td className="rh-warn-col-date mono" style={{ padding: '11px 16px', fontSize: 12.5, color: 'var(--muted)' }}>
                    {w.date ? new Date(w.date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="rh-warn-col-by" style={{ padding: '11px 16px', color: 'var(--muted)', fontSize: 12.5 }}>{w.applied_by || '—'}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span className={`pill ${TYPE_KIND[w.severity] || 'warn'}`}>
                      <span className="dot" />{TYPE_LABEL[w.severity] || w.severity}
                    </span>
                  </td>
                  <td style={{ padding: '11px 12px' }}>
                    <button className="btn ghost icon sm"><Icon name="more-v" size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>

    {showModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(3px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        onClick={() => setShowModal(false)}
      >
        <div className="card" style={{ width: '100%', maxWidth: 460, padding: 24, maxHeight: 'calc(100vh - 48px)', overflowY: 'auto' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="row" style={{ marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Nova advertência</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Registre uma advertência formal</div>
            </div>
            <span className="grow" />
            <button className="btn ghost icon sm" onClick={() => setShowModal(false)}><Icon name="x" size={15} /></button>
          </div>

          <div className="col gap-3">
            <div>
              <label className="label">Funcionário *</label>
              <select className="field" value={newWarn.employee_id} onChange={e => setNewWarn(w => ({ ...w, employee_id: e.target.value }))}>
                <option value="">Selecionar…</option>
                {activeEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Severidade *</label>
              <select className="field" value={newWarn.severity} onChange={e => setNewWarn(w => ({ ...w, severity: e.target.value }))}>
                <option value="verbal">Verbal</option>
                <option value="escrita">Escrita</option>
                <option value="suspensao">Suspensão</option>
              </select>
            </div>
            <div>
              <label className="label">Motivo *</label>
              <textarea
                className="field" rows={4} style={{ resize: 'vertical', paddingTop: 8, paddingBottom: 8 }}
                placeholder="Descreva o motivo detalhadamente…"
                value={newWarn.description}
                onChange={e => setNewWarn(w => ({ ...w, description: e.target.value }))}
              />
            </div>
          </div>

          <div className="row gap-2" style={{ marginTop: 20 }}>
            <button className="btn" onClick={() => setShowModal(false)}>Cancelar</button>
            <span className="grow" />
            <button className="btn primary" disabled={!newWarn.employee_id || !newWarn.description.trim() || saving} onClick={handleSave}>
              {saving ? <span className="pulse">Salvando…</span> : <><Icon name="check" size={14} /> Registrar</>}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ============================================================
// ABA — FÉRIAS
// ============================================================
function FeriasTab({ addToast, companyId, activeEmployees, can, vacations, loading, refetch }) {
  const [filter, setFilter] = useState('todas');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employee_id: '', period_start: '', period_end: '', days: 30 });

  const STATUS_KIND  = { aprovado: 'ok', pendente: 'warn', concluído: 'info', concluido: 'info', recusado: 'bad' };
  const STATUS_LABEL = { aprovado: 'Aprovado', pendente: 'Pendente', concluído: 'Concluído', concluido: 'Concluído', recusado: 'Recusado' };

  const filtered = filter === 'todas' ? vacations : vacations.filter(v => v.status === filter);
  const countBy  = s => vacations.filter(v => v.status === s).length;
  const totalDays = vacations.reduce((a, v) => a + (v.days_count || v.days || 0), 0);
  const fmt = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

  const approve = async (id) => {
    const name = vacations.find(v => v.id === id)?.employees?.name || id;
    const { error } = await updateVacationStatus(id, 'aprovado');
    if (error) addToast({ kind: 'warn', msg: 'Erro: ' + error.message });
    else { logAudit(companyId, 'EDITOU', `Férias aprovadas: ${name}`); addToast({ kind: 'ok', msg: 'Férias aprovadas.' }); refetch(); }
  };

  const reject = async (id) => {
    const name = vacations.find(v => v.id === id)?.employees?.name || id;
    const { error } = await updateVacationStatus(id, 'recusado');
    if (error) addToast({ kind: 'warn', msg: 'Erro: ' + error.message });
    else { logAudit(companyId, 'EDITOU', `Férias recusadas: ${name}`); addToast({ kind: 'warn', msg: 'Férias recusadas.' }); refetch(); }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await createVacation({
      employee_id:  form.employee_id,
      period_start: form.period_start,
      period_end:   form.period_end || form.period_start,
      days_count:   form.days,
      days:         form.days,
      status:       'pendente',
    });
    setSaving(false);
    if (error) { addToast({ kind: 'warn', msg: 'Erro: ' + error.message }); return; }
    const emp = activeEmployees.find(e => e.id === form.employee_id);
    logAudit(companyId, 'CRIOU', `Férias: ${emp?.name || form.employee_id}`);
    setShowModal(false);
    setForm({ employee_id: '', period_start: '', period_end: '', days: 30 });
    addToast({ kind: 'ok', msg: 'Solicitação registrada.' });
    refetch();
  };

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', flex: 1 }}>
          Solicitações, aprovações e programação anual de férias.
        </p>
        <div className="row gap-2">
          <button className="btn"><Icon name="download" size={14} /> Exportar</button>
          {can('RH', 'férias') && (
            <button className="btn primary" onClick={() => setShowModal(true)}>
              <Icon name="plus" size={14} /> Nova solicitação
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        {[
          { l: 'Pendentes',        v: countBy('pendente'),  k: 'warn' },
          { l: 'Aprovadas',        v: countBy('aprovado'),  k: 'ok' },
          { l: 'Concluídas',       v: countBy('concluído') + countBy('concluido'), k: 'info' },
          { l: 'Total dias (ano)', v: totalDays, k: '' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{s.l}</div>
            <div className="row" style={{ marginTop: 4, alignItems: 'baseline', gap: 6 }}>
              <div className="mono" style={{ fontSize: 24, fontWeight: 700 }}>{s.v}</div>
              {s.k && <span className={`pill ${s.k}`} style={{ fontSize: 10 }}>•</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="row gap-2" style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>Solicitações</span>
          <span className="grow" />
          {['todas', 'pendente', 'aprovado', 'concluído', 'recusado'].map(f => (
            <button key={f} className={`btn sm ${filter === f ? 'primary' : 'ghost'}`} onClick={() => setFilter(f)}>
              {f === 'todas' ? 'Todas' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}><div className="pulse">Carregando…</div></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            <Icon name="umbrella" size={28} style={{ opacity: 0.2, marginBottom: 10 }} />
            <div>Nenhuma solicitação encontrada.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                <th style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Funcionário</th>
                <th style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Período</th>
                <th className="rh-vac-col-days" style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Dias</th>
                <th className="rh-vac-col-req"  style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Solicitado em</th>
                <th className="rh-vac-col-by"   style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Aprovado por</th>
                <th style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ width: 120 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id} style={{ borderTop: '1px solid var(--line-soft)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '11px 16px' }}>
                    <div className="row gap-2">
                      <Avatar name={v.employees?.name || '?'} hue={v.employees?.hue || 0} size={28} />
                      <div>
                        <div style={{ fontWeight: 500 }}>{v.employees?.name || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{v.employees?.dept || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 12.5 }}>
                    <span className="mono">{fmt(v.period_start)}</span>
                    <span style={{ color: 'var(--muted)', margin: '0 4px' }}>→</span>
                    <span className="mono">{fmt(v.period_end)}</span>
                  </td>
                  <td className="rh-vac-col-days" style={{ padding: '11px 16px' }}>
                    <span className="pill">{v.days_count || v.days || 0}d</span>
                  </td>
                  <td className="rh-vac-col-req mono" style={{ padding: '11px 16px', fontSize: 12, color: 'var(--muted)' }}>
                    {v.created_at ? new Date(v.created_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="rh-vac-col-by" style={{ padding: '11px 16px', color: 'var(--muted)', fontSize: 12.5 }}>
                    {v.approved_by || <span style={{ color: 'var(--muted-2)' }}>—</span>}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span className={`pill ${STATUS_KIND[v.status] || ''}`}>
                      <span className="dot" />{STATUS_LABEL[v.status] || v.status}
                    </span>
                  </td>
                  <td style={{ padding: '11px 12px' }}>
                    {v.status === 'pendente' && can('RH', 'férias') ? (
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
        )}
      </div>
    </div>

    {showModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(3px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        onClick={() => setShowModal(false)}
      >
        <div className="card" style={{ width: '100%', maxWidth: 480, padding: 24, maxHeight: 'calc(100vh - 48px)', overflowY: 'auto' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="row" style={{ marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Nova solicitação de férias</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Preencha o período solicitado</div>
            </div>
            <span className="grow" />
            <button className="btn ghost icon sm" onClick={() => setShowModal(false)}><Icon name="x" size={15} /></button>
          </div>

          <div className="col gap-3">
            <div>
              <label className="label">Funcionário *</label>
              <select className="field" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}>
                <option value="">Selecionar…</option>
                {activeEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                <label className="label">Início *</label>
                <input type="date" className="field" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
              </div>
              <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                <label className="label">Fim</label>
                <input type="date" className="field" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Dias solicitados</label>
              <input type="number" className="field" min={1} max={365} value={form.days}
                onChange={e => setForm(f => ({ ...f, days: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>

          <div className="row gap-2" style={{ marginTop: 20 }}>
            <button className="btn" onClick={() => setShowModal(false)}>Cancelar</button>
            <span className="grow" />
            <button className="btn primary" disabled={!form.employee_id || !form.period_start || saving} onClick={handleSave}>
              {saving ? <span className="pulse">Enviando…</span> : <><Icon name="check" size={14} /> Solicitar</>}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ============================================================
// ABA — BENEFÍCIOS
// ============================================================
const BENEFIT_TYPES = ['Plano de saúde', 'Vale-alimentação', 'Vale-refeição', 'Vale-transporte', 'Auxílio home office', 'Seguro de vida', 'Outro'];

const STATUS_LABELS = { ativo: 'Ativo', suspenso: 'Suspenso', encerrado: 'Encerrado' };
const STATUS_CLASS  = { ativo: 'good', suspenso: 'warn', encerrado: 'bad' };

function BeneficiosTab({ addToast, companyId, activeEmployees, can, benefits, loading, refetch }) {
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState('todos');
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employee_id: '', type: BENEFIT_TYPES[0], value: '', start_date: '', end_date: '', notes: '',
  });

  const filtered = benefits.filter(b => {
    if (filterType !== 'todos' && b.type !== filterType) return false;
    if (q && !b.employees?.name?.toLowerCase().includes(q.toLowerCase()) && !b.type.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const kpis = BENEFIT_TYPES.map(t => ({
    label: t,
    count: benefits.filter(b => b.type === t && b.status === 'ativo').length,
  })).filter(k => k.count > 0);

  const totalAtivos = benefits.filter(b => b.status === 'ativo').length;
  const totalValor  = benefits.filter(b => b.status === 'ativo' && b.value).reduce((s, b) => s + Number(b.value), 0);

  async function handleSave() {
    if (!form.employee_id || !form.type) {
      addToast('Preencha funcionário e tipo.', 'warn'); return;
    }
    setSaving(true);
    const { error } = await createBenefit({
      company_id:  companyId,
      employee_id: form.employee_id,
      type:        form.type,
      value:       form.value ? Number(form.value) : null,
      start_date:  form.start_date || null,
      end_date:    form.end_date   || null,
      notes:       form.notes      || null,
    });
    setSaving(false);
    if (error) { addToast('Erro ao salvar: ' + error.message, 'error'); return; }
    addToast('Benefício cadastrado.', 'success');
    setShowModal(false);
    setForm({ employee_id: '', type: BENEFIT_TYPES[0], value: '', start_date: '', end_date: '', notes: '' });
    refetch();
  }

  async function handleStatus(id, status) {
    const { error } = await updateBenefitStatus(id, status);
    if (error) { addToast('Erro ao atualizar.', 'error'); return; }
    refetch();
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover este benefício?')) return;
    const { error } = await deleteBenefit(id);
    if (error) { addToast('Erro ao remover.', 'error'); return; }
    addToast('Benefício removido.', 'success');
    refetch();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            className="input"
            placeholder="Buscar funcionário ou tipo…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ maxWidth: 280 }}
          />
        </div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {['todos', ...BENEFIT_TYPES].map(t => (
            <button
              key={t}
              className={`btn sm${filterType === t ? ' primary' : ''}`}
              onClick={() => setFilterType(t)}
              style={{ fontSize: 11.5 }}
            >
              {t === 'todos' ? 'Todos' : t}
            </button>
          ))}
        </div>
        {can('RH', 'benefícios') && (
          <button className="btn primary" onClick={() => setShowModal(true)}>
            <Icon name="plus" size={14} /> Adicionar benefício
          </button>
        )}
      </div>

      {/* KPI summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <div className="card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>Benefícios ativos</div>
          <div className="mono" style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{totalAtivos}</div>
        </div>
        <div className="card" style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>Custo mensal</div>
          <div className="mono" style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>
            {totalValor > 0 ? `R$${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—'}
          </div>
        </div>
        {kpis.slice(0, 4).map(k => (
          <div key={k.label} className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{k.label}</div>
            <div className="mono" style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{k.count}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>funcionários</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>Benefícios por funcionário</span>
          <span className="pill" style={{ background: 'var(--surface-2)' }}>{filtered.length}</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              <th style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Funcionário</th>
              <th style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Tipo</th>
              <th style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Valor/mês</th>
              <th style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Início</th>
              <th style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '9px 16px' }} />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)' }}>Carregando…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  <Icon name="gift" size={28} style={{ opacity: 0.2, display: 'block', margin: '0 auto 10px' }} />
                  Nenhum benefício cadastrado ainda.
                </td>
              </tr>
            )}
            {filtered.map(b => (
              <tr key={b.id} style={{ borderTop: '1px solid var(--line)' }}>
                <td style={{ padding: '10px 16px' }}>
                  <div className="row gap-2">
                    <Avatar name={b.employees?.name || '?'} size={28} hue={b.employees?.hue ?? 215} />
                    <span style={{ fontWeight: 500 }}>{b.employees?.name || '—'}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 16px' }}>{b.type}</td>
                <td style={{ padding: '10px 16px' }} className="mono">
                  {b.value != null ? `R$ ${Number(b.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  {b.start_date ? new Date(b.start_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span className={`pill ${STATUS_CLASS[b.status] ?? ''}`}>{STATUS_LABELS[b.status] ?? b.status}</span>
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  <div className="row gap-1" style={{ justifyContent: 'flex-end' }}>
                    {b.status === 'ativo' && (
                      <button className="btn ghost icon sm" title="Suspender" onClick={() => handleStatus(b.id, 'suspenso')}>
                        <Icon name="minus" size={14} />
                      </button>
                    )}
                    {b.status === 'suspenso' && (
                      <button className="btn ghost icon sm" title="Reativar" onClick={() => handleStatus(b.id, 'ativo')}>
                        <Icon name="check" size={14} />
                      </button>
                    )}
                    {b.status !== 'encerrado' && (
                      <button className="btn ghost icon sm" title="Encerrar" onClick={() => handleStatus(b.id, 'encerrado')}>
                        <Icon name="x" size={14} />
                      </button>
                    )}
                    <button className="btn ghost icon sm" title="Remover" onClick={() => handleDelete(b.id)}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 480, padding: 24, position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="row" style={{ marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Adicionar benefício</h3>
              <span className="grow" />
              <button className="btn ghost icon sm" onClick={() => setShowModal(false)}><Icon name="x" size={15} /></button>
            </div>

            <div className="col gap-3">
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Funcionário *</label>
                <select
                  className="input"
                  value={form.employee_id}
                  onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                  style={{ width: '100%' }}
                >
                  <option value="">Selecionar…</option>
                  {activeEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo *</label>
                <select
                  className="input"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  style={{ width: '100%' }}
                >
                  {BENEFIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Valor mensal (R$)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="row gap-3">
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Data início</label>
                  <input
                    className="input"
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Data fim</label>
                  <input
                    className="input"
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Observações</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Detalhes opcionais…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="row gap-2" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ABA — AVALIAÇÕES (shell)
// ============================================================
function AvaliacoesTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', flex: 1 }}>
          Avaliações de desempenho e ciclos de feedback.
        </p>
        <button className="btn primary" disabled title="Em breve">
          <Icon name="plus" size={14} /> Nova avaliação
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        {['Em andamento', 'Concluídas', 'Média geral', 'Próximo ciclo'].map(l => (
          <div key={l} className="card" style={{ padding: '12px 16px', opacity: 0.5 }}>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{l}</div>
            <div className="mono" style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>—</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>Ciclos de avaliação</span>
          <span style={{ fontSize: 11.5, background: 'var(--info-bg)', color: 'var(--info)', borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>Em desenvolvimento</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, opacity: 0.45 }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              <th style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Funcionário</th>
              <th style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Avaliador</th>
              <th style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Período</th>
              <th style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Pontuação</th>
              <th style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                <Icon name="chart" size={28} style={{ opacity: 0.2, display: 'block', margin: '0 auto 10px' }} />
                Nenhuma avaliação cadastrada ainda.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// ABA — HOLERITES (funcional via documentos)
// ============================================================
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function HoleritesTab({ addToast, companyId, activeEmployees, can, payslips, refetch }) {
  const [showModal, setShowModal] = useState(false);
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employee_id: '', mes_ref: '', ano_ref: String(new Date().getFullYear()), file: null });
  const fileRef = useRef();

  const parsed = payslips.map(d => {
    let notes = {};
    try { notes = JSON.parse(d.notes || '{}'); } catch { /* noop */ }
    return {
      id: d.id,
      name: d.name,
      who: d.employees?.name || 'Empresa',
      whoId: d.employee_id,
      mes: notes.mes_ref || '—',
      ano: notes.ano_ref || '—',
      date: d.doc_date ? new Date(d.doc_date + 'T00:00:00').toLocaleDateString('pt-BR')
                       : d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR') : '—',
      file_url: d.file_url,
      size: d.size,
    };
  });

  const filtered = parsed.filter(d => {
    if (!q) return true;
    return (d.who + ' ' + d.mes + ' ' + d.ano).toLowerCase().includes(q.toLowerCase());
  });

  const handleSave = async () => {
    if (!form.employee_id || !form.mes_ref) return;
    setSaving(true);
    const file = form.file;
    let file_url = null;

    if (file) {
      const ext  = file.name.split('.').pop();
      const path = `${form.employee_id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('employee-documents').upload(path, file, { upsert: false });
      if (upErr) { addToast({ kind: 'bad', msg: 'Erro no upload: ' + upErr.message }); setSaving(false); return; }
      const { data: { publicUrl } } = supabase.storage.from('employee-documents').getPublicUrl(path);
      file_url = publicUrl;
    }

    const { error } = await supabase.from('documents').insert({
      employee_id:  form.employee_id,
      company_id:   companyId,
      name:         `Holerite ${form.mes_ref} ${form.ano_ref}`,
      category:     'holerites',
      doc_date:     null,
      notes:        JSON.stringify({ mes_ref: form.mes_ref, ano_ref: form.ano_ref }),
      file_url,
      size: file ? `${(file.size / 1024).toFixed(0)} KB` : null,
      type: 'pdf',
      status: 'ok',
    });

    setSaving(false);
    if (error) { addToast({ kind: 'bad', msg: 'Erro: ' + error.message }); return; }
    logAudit(companyId, 'UPLOAD', `Holerite ${form.mes_ref}/${form.ano_ref}`);
    setShowModal(false);
    setForm({ employee_id: '', mes_ref: '', ano_ref: String(new Date().getFullYear()), file: null });
    addToast({ kind: 'ok', msg: 'Holerite adicionado.' });
    refetch();
  };

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', flex: 1 }}>
          Holerites mensais vinculados aos funcionários.
        </p>
        <div className="row gap-2">
          {can('Documentos', 'upload') && (
            <button className="btn primary" onClick={() => setShowModal(true)}>
              <Icon name="plus" size={14} /> Adicionar holerite
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="row gap-2" style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={13} style={{ position: 'absolute', left: 9, top: 10, color: 'var(--muted)', pointerEvents: 'none' }} />
            <input
              className="field"
              placeholder="Buscar funcionário, mês ou ano…"
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ paddingLeft: 30, width: 'min(260px, 100%)', height: 34, fontSize: 13 }}
            />
          </div>
          <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center', marginLeft: 4 }}>
            {filtered.length} {filtered.length === 1 ? 'holerite' : 'holerites'}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            <Icon name="pdf" size={32} style={{ opacity: 0.2, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Nenhum holerite</div>
            <div style={{ fontSize: 12 }}>{q ? 'Tente ajustar a busca' : 'Clique em "Adicionar holerite" para começar'}</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                <th style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Funcionário</th>
                <th style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Mês / Ano</th>
                <th className="rh-pay-col-date" style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Enviado em</th>
                <th className="rh-pay-col-size" style={{ textAlign: 'left', padding: '9px 16px', fontWeight: 600 }}>Tamanho</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} style={{ borderTop: '1px solid var(--line-soft)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '11px 16px' }}>
                    <div className="row gap-2">
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: '#2A5BFF18', color: '#2A5BFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name="pdf" size={13} />
                      </div>
                      <span style={{ fontWeight: 500 }}>{d.who}</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span className="pill" style={{ fontSize: 12 }}>{d.mes !== '—' ? `${d.mes} ${d.ano}` : d.name}</span>
                  </td>
                  <td className="rh-pay-col-date mono" style={{ padding: '11px 16px', fontSize: 12, color: 'var(--muted)' }}>{d.date}</td>
                  <td className="rh-pay-col-size" style={{ padding: '11px 16px', color: 'var(--muted)', fontSize: 12 }}>{d.size ?? '—'}</td>
                  <td style={{ padding: '11px 12px' }}>
                    <div className="row gap-1" style={{ justifyContent: 'flex-end' }}>
                      {d.file_url && (
                        <button className="btn ghost icon sm" title="Visualizar" onClick={() => window.open(d.file_url, '_blank')}>
                          <Icon name="eye" size={13} />
                        </button>
                      )}
                      {d.file_url && (
                        <button className="btn ghost icon sm" title="Baixar" onClick={() => window.open(d.file_url, '_blank')}>
                          <Icon name="download" size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>

    {showModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(3px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        onClick={() => setShowModal(false)}
      >
        <div className="card" style={{ width: '100%', maxWidth: 440, padding: 24 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="row" style={{ marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Adicionar holerite</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Vincule o arquivo ao funcionário e ao mês</div>
            </div>
            <span className="grow" />
            <button className="btn ghost icon sm" onClick={() => setShowModal(false)}><Icon name="x" size={15} /></button>
          </div>

          <div className="col gap-3">
            <div>
              <label className="label">Funcionário *</label>
              <select className="field" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}>
                <option value="">Selecionar…</option>
                {activeEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="row gap-3">
              <div style={{ flex: 2 }}>
                <label className="label">Mês de referência *</label>
                <select className="field" value={form.mes_ref} onChange={e => setForm(f => ({ ...f, mes_ref: e.target.value }))}>
                  <option value="">Selecionar…</option>
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Ano</label>
                <input className="field" value={form.ano_ref} onChange={e => setForm(f => ({ ...f, ano_ref: e.target.value }))} placeholder="2025" />
              </div>
            </div>
            <div>
              <label className="label">Arquivo (PDF)</label>
              <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }}
                onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))} />
              <div
                style={{ border: '1.5px dashed var(--line)', borderRadius: 8, padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: form.file ? 'var(--brand-tint)' : 'transparent' }}
                onClick={() => fileRef.current?.click()}
              >
                <Icon name={form.file ? 'check' : 'upload'} size={15} style={{ color: form.file ? 'var(--brand)' : 'var(--muted)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: form.file ? 'var(--ink)' : 'var(--muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {form.file ? form.file.name : 'Clique para selecionar o PDF'}
                </span>
                {form.file && <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{(form.file.size / 1024).toFixed(0)} KB</span>}
              </div>
            </div>
          </div>

          <div className="row gap-2" style={{ marginTop: 20 }}>
            <button className="btn" onClick={() => setShowModal(false)}>Cancelar</button>
            <span className="grow" />
            <button className="btn primary" disabled={!form.employee_id || !form.mes_ref || saving} onClick={handleSave}>
              {saving ? <span className="pulse">Enviando…</span> : <><Icon name="check" size={14} /> Salvar</>}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
