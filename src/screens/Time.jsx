import { useState, useRef, useEffect } from 'react';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import { useEmployees, useAllTimecards, createTimecard } from '../hooks/useEmployees.js';

// ── helpers ──────────────────────────────────────────────────
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_PT   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function fmtMonth(ym) {
  const [y, m] = ym.split('-');
  return `${MONTHS_PT[+m - 1]} ${y}`;
}

function daysInMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function firstDayOfWeek(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).getDay();
}

// Gera dias fictícios de ponto baseados no mês selecionado
function generateDayStatuses(ym, empId) {
  if (!empId) return {};
  const total = daysInMonth(ym);
  const [y, m] = ym.split('-').map(Number);
  const result = {};
  const today = new Date();
  for (let d = 1; d <= total; d++) {
    const date = new Date(y, m - 1, d);
    if (date > today) continue;
    const dow = date.getDay();
    if (dow === 0 || dow === 6) { result[d] = 'weekend'; continue; }
    const seed = (empId.charCodeAt(0) + d) % 10;
    if (seed === 0) result[d] = 'falta';
    else if (seed === 1) result[d] = 'atraso';
    else result[d] = 'ok';
  }
  return result;
}

const STATUS_COLOR = {
  ok:      { bg: 'var(--ok-bg,#dcfce7)',   color: 'var(--ok)',   label: 'Normal'   },
  falta:   { bg: '#fee2e2',                color: '#dc2626',     label: 'Falta'    },
  atraso:  { bg: '#fef9c3',                color: '#ca8a04',     label: 'Atraso'   },
  weekend: { bg: 'var(--surface-2)',        color: 'var(--muted-2)', label: ''     },
};

// ── Modal base ────────────────────────────────────────────────
function Modal({ title, onClose, children, width = 480 }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        width, background: 'var(--surface)', borderRadius: 14,
        boxShadow: '0 24px 64px rgba(0,0,0,.22)',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{title}</div>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={15} /></button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Modais específicos ────────────────────────────────────────
function FaltaModal({ employees, onClose, onSave }) {
  const [form, setForm] = useState({ employee_id: '', date: new Date().toISOString().slice(0,10), tipo: 'injustificada', motivo: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal title="Registrar falta" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FieldRow label="Funcionário">
          <select className="field" value={form.employee_id} onChange={e => set('employee_id', e.target.value)}>
            <option value="">Selecione…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Data">
          <input type="date" className="field" value={form.date} onChange={e => set('date', e.target.value)} />
        </FieldRow>
        <FieldRow label="Tipo">
          <div style={{ display: 'flex', gap: 8 }}>
            {['justificada','injustificada'].map(t => (
              <button key={t} onClick={() => set('tipo', t)} style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid',
                borderColor: form.tipo === t ? 'var(--brand)' : 'var(--line)',
                background: form.tipo === t ? 'var(--brand-tint)' : 'var(--surface-2)',
                color: form.tipo === t ? 'var(--brand)' : 'var(--muted)',
                fontWeight: form.tipo === t ? 700 : 400, fontSize: 13, cursor: 'pointer',
              }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
        </FieldRow>
        <FieldRow label="Motivo">
          <textarea className="field" rows={3} placeholder="Descreva o motivo…" value={form.motivo}
            onChange={e => set('motivo', e.target.value)} style={{ resize: 'vertical', minHeight: 72 }} />
        </FieldRow>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={() => onSave(form)}>Registrar falta</button>
        </div>
      </div>
    </Modal>
  );
}

function HoraExtraModal({ employees, onClose, onSave }) {
  const [form, setForm] = useState({ employee_id: '', date: new Date().toISOString().slice(0,10), horas: '', motivo: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal title="Lançar hora extra" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FieldRow label="Funcionário">
          <select className="field" value={form.employee_id} onChange={e => set('employee_id', e.target.value)}>
            <option value="">Selecione…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </FieldRow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldRow label="Data">
            <input type="date" className="field" value={form.date} onChange={e => set('date', e.target.value)} />
          </FieldRow>
          <FieldRow label="Quantidade (h)">
            <input type="text" className="field" placeholder="Ex: 2h 30m" value={form.horas} onChange={e => set('horas', e.target.value)} />
          </FieldRow>
        </div>
        <FieldRow label="Justificativa">
          <textarea className="field" rows={3} placeholder="Motivo das horas extras…" value={form.motivo}
            onChange={e => set('motivo', e.target.value)} style={{ resize: 'vertical', minHeight: 72 }} />
        </FieldRow>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={() => onSave(form)}>Lançar</button>
        </div>
      </div>
    </Modal>
  );
}

function AjusteModal({ employees, onClose, onSave }) {
  const [form, setForm] = useState({ employee_id: '', date: new Date().toISOString().slice(0,10), entrada: '', saida: '', motivo: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal title="Ajuste manual de ponto" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FieldRow label="Funcionário">
          <select className="field" value={form.employee_id} onChange={e => set('employee_id', e.target.value)}>
            <option value="">Selecione…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Data">
          <input type="date" className="field" value={form.date} onChange={e => set('date', e.target.value)} />
        </FieldRow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldRow label="Entrada">
            <input type="time" className="field" value={form.entrada} onChange={e => set('entrada', e.target.value)} />
          </FieldRow>
          <FieldRow label="Saída">
            <input type="time" className="field" value={form.saida} onChange={e => set('saida', e.target.value)} />
          </FieldRow>
        </div>
        <FieldRow label="Motivo do ajuste">
          <textarea className="field" rows={2} placeholder="Ex: Esqueceu de registrar saída…" value={form.motivo}
            onChange={e => set('motivo', e.target.value)} style={{ resize: 'vertical' }} />
        </FieldRow>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={() => onSave(form)}>Salvar ajuste</button>
        </div>
      </div>
    </Modal>
  );
}

function EscalaModal({ employees, onClose, onSave }) {
  const [form, setForm] = useState({ nome: '', turno: 'manhã', inicio: '', fim: '', dias: [] });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleDia = (d) => setForm(f => ({
    ...f, dias: f.dias.includes(d) ? f.dias.filter(x => x !== d) : [...f.dias, d]
  }));
  return (
    <Modal title="Criar escala" onClose={onClose} width={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FieldRow label="Nome da escala">
          <input type="text" className="field" placeholder="Ex: Turno manhã — Comercial" value={form.nome} onChange={e => set('nome', e.target.value)} />
        </FieldRow>
        <FieldRow label="Turno">
          <div style={{ display: 'flex', gap: 8 }}>
            {['manhã','tarde','noite','integral'].map(t => (
              <button key={t} onClick={() => set('turno', t)} style={{
                flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid',
                borderColor: form.turno === t ? 'var(--brand)' : 'var(--line)',
                background: form.turno === t ? 'var(--brand-tint)' : 'var(--surface-2)',
                color: form.turno === t ? 'var(--brand)' : 'var(--muted)',
                fontWeight: form.turno === t ? 700 : 400, fontSize: 12, cursor: 'pointer',
                textTransform: 'capitalize',
              }}>{t}</button>
            ))}
          </div>
        </FieldRow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldRow label="Horário entrada">
            <input type="time" className="field" value={form.inicio} onChange={e => set('inicio', e.target.value)} />
          </FieldRow>
          <FieldRow label="Horário saída">
            <input type="time" className="field" value={form.fim} onChange={e => set('fim', e.target.value)} />
          </FieldRow>
        </div>
        <FieldRow label="Dias da semana">
          <div style={{ display: 'flex', gap: 6 }}>
            {DAYS_PT.map((d, i) => (
              <button key={d} onClick={() => toggleDia(i)} style={{
                flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid',
                borderColor: form.dias.includes(i) ? 'var(--brand)' : 'var(--line)',
                background: form.dias.includes(i) ? 'var(--brand-tint)' : 'var(--surface-2)',
                color: form.dias.includes(i) ? 'var(--brand)' : 'var(--muted)',
                fontWeight: form.dias.includes(i) ? 700 : 400, fontSize: 11, cursor: 'pointer',
              }}>{d}</button>
            ))}
          </div>
        </FieldRow>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={() => onSave(form)}>Criar escala</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Calendário mensal ─────────────────────────────────────────
function MonthCalendar({ ym, empId }) {
  const statuses = generateDayStatuses(ym, empId);
  const total    = daysInMonth(ym);
  const offset   = firstDayOfWeek(ym);
  const cells    = Array.from({ length: Math.ceil((offset + total) / 7) * 7 });

  const counts = Object.values(statuses).reduce((a, s) => {
    if (s !== 'weekend') a[s] = (a[s] || 0) + 1;
    return a;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Mini legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[['ok','Normal','var(--ok)'],['atraso','Atraso','#ca8a04'],['falta','Falta','#dc2626']].map(([k,l,c]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: c, opacity: .7 }} />
            {l} <strong style={{ color: 'var(--ink)', marginLeft: 2 }}>{counts[k] || 0}</strong>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {DAYS_PT.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--muted)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {d}
          </div>
        ))}
        {cells.map((_, i) => {
          const day = i - offset + 1;
          const valid = day >= 1 && day <= total;
          if (!valid) return <div key={i} />;
          const s = statuses[day];
          const sc = STATUS_COLOR[s] || {};
          const isToday = (() => {
            const now = new Date();
            const [y, m] = ym.split('-').map(Number);
            return now.getFullYear() === y && now.getMonth() + 1 === m && now.getDate() === day;
          })();
          return (
            <div key={i} style={{
              borderRadius: 8, padding: '8px 4px', textAlign: 'center',
              background: isToday ? 'var(--brand)' : (sc.bg || 'var(--surface-2)'),
              color: isToday ? 'var(--brand-ink,#fff)' : (sc.color || 'var(--muted-2)'),
              border: isToday ? 'none' : '1px solid var(--line)',
              cursor: s && s !== 'weekend' ? 'pointer' : 'default',
              transition: 'opacity .1s',
            }}>
              <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 500 }}>{day}</div>
              {s && s !== 'weekend' && !isToday && (
                <div style={{ fontSize: 9, marginTop: 2, fontWeight: 600, opacity: .8 }}>
                  {s === 'ok' ? '08h00' : s === 'atraso' ? 'Atraso' : 'Falta'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tela principal ────────────────────────────────────────────
const TABS = [
  { id: 'jornada',   label: 'Jornada',       icon: 'clock'     },
  { id: 'extras',    label: 'Horas extras',   icon: 'sparkle'   },
  { id: 'faltas',    label: 'Faltas',         icon: 'alert'     },
  { id: 'banco',     label: 'Banco de horas', icon: 'chart'     },
  { id: 'escalas',   label: 'Escalas',        icon: 'dashboard' },
];

const NEW_ACTIONS = [
  { id: 'falta',    label: 'Registrar falta',      icon: 'alert'   },
  { id: 'extra',    label: 'Lançar hora extra',     icon: 'sparkle' },
  { id: 'ajuste',   label: 'Ajuste manual de ponto',icon: 'edit'    },
  { id: 'escala',   label: 'Criar escala',          icon: 'dashboard'},
];

export function TimeScreen({ addToast }) {
  const { employees, loading: empLoading } = useEmployees();
  const { timecards, loading: tcLoading }  = useAllTimecards();

  const [tab,       setTab]       = useState('jornada');
  const [empId,     setEmpId]     = useState('');
  const [month,     setMonth]     = useState(new Date().toISOString().slice(0, 7));
  const [modal,     setModal]     = useState(null);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const menuRef = useRef();

  const selectedEmp = employees.find(e => e.id === empId);

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // KPIs from timecards of selected employee/month
  const card = timecards.find(tc => tc.employee_id === empId && tc.month_year === month);
  const dayStatuses = generateDayStatuses(month, empId);
  const workDays = Object.values(dayStatuses).filter(s => s !== 'weekend').length;
  const faltas   = Object.values(dayStatuses).filter(s => s === 'falta').length;
  const atrasos  = Object.values(dayStatuses).filter(s => s === 'atraso').length;
  const workedH  = card?.worked_hours || (empId ? `${(workDays - faltas) * 8}h00` : '—');
  const banco    = empId ? `+${atrasos > 0 ? Math.max(0, 4 - atrasos * 0.5).toFixed(0) : '4'}h 30m` : '—';

  const handleSave = async (type, data) => {
    setModal(null);
    // persist via createTimecard for jornada; for others show success toast
    if (type === 'extra' && data.employee_id && data.horas) {
      await createTimecard({ employee_id: data.employee_id, month_year: month, worked_hours: data.horas });
    }
    addToast({ kind: 'ok', msg: 'Registro salvo com sucesso.' });
  };

  // Table data for non-jornada tabs (derived from timecards)
  const tableRows = timecards.filter(tc => !empId || tc.employee_id === empId);

  return (
    <div className="fade-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Controle de ponto</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Jornada, faltas, horas extras, banco e escalas em um único lugar.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn"><Icon name="download" size={14} /> Exportar espelho</button>
          {/* Novo button + dropdown */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button className="btn primary" onClick={() => setMenuOpen(o => !o)}>
              <Icon name="plus" size={14} /> Novo <Icon name="chevron-down" size={12} />
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 6,
                background: 'var(--surface)', border: '1px solid var(--line)',
                borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,.14)',
                minWidth: 220, zIndex: 100, overflow: 'hidden',
              }}>
                {NEW_ACTIONS.map(a => (
                  <button key={a.id} onClick={() => { setMenuOpen(false); setModal(a.id); }} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '11px 14px', border: 'none',
                    background: 'transparent', cursor: 'pointer', fontSize: 13.5, color: 'var(--ink)',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Icon name={a.icon} size={15} style={{ color: 'var(--brand)' }} />
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Filtros: funcionário + mês ── */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap',
        padding: '12px 16px', background: 'var(--surface)',
        border: '1px solid var(--line)', borderRadius: 10,
        alignItems: 'center',
      }}>
        <Icon name="user" size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        <select
          className="field"
          value={empId}
          onChange={e => setEmpId(e.target.value)}
          disabled={empLoading}
          style={{ flex: 1, maxWidth: 280, height: 36, fontSize: 13 }}
        >
          <option value="">Todos os funcionários</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.dept}</option>)}
        </select>

        <div style={{ width: 1, height: 24, background: 'var(--line)', margin: '0 4px' }} />

        <Icon name="history" size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        <input
          type="month"
          className="field"
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{ width: 160, height: 36, fontSize: 13 }}
        />
        {empId && selectedEmp && (
          <>
            <div style={{ width: 1, height: 24, background: 'var(--line)', margin: '0 4px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar name={selectedEmp.name} hue={selectedEmp.hue} size={28} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.1 }}>{selectedEmp.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{selectedEmp.role}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Horas trabalhadas', value: workedH,          icon: 'clock',    color: 'var(--brand)' },
          { label: 'Banco de horas',    value: banco,            icon: 'sparkle',  color: 'var(--ok)'   },
          { label: 'Faltas no mês',     value: empId ? faltas : '—', icon: 'alert', color: faltas > 0 ? '#dc2626' : 'var(--muted)' },
          { label: 'Atrasos no mês',    value: empId ? atrasos : '—', icon: 'history', color: atrasos > 0 ? '#ca8a04' : 'var(--muted)' },
        ].map((k, i) => (
          <div key={i} style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 10, padding: '14px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Icon name={k.icon} size={13} style={{ color: k.color }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {k.label}
              </span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, letterSpacing: -0.5 }}>
              {k.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              {fmtMonth(month)}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab strip ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', gap: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', border: 'none', background: 'transparent',
            fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
            color: tab === t.id ? 'var(--brand)' : 'var(--muted)',
            borderBottom: `2px solid ${tab === t.id ? 'var(--brand)' : 'transparent'}`,
            marginBottom: -1, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            <Icon name={t.icon} size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === 'jornada' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
          {/* Calendar */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
                {fmtMonth(month)}
              </h3>
              {!empId && (
                <span style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--surface-2)', padding: '3px 10px', borderRadius: 20 }}>
                  Selecione um funcionário para ver a jornada
                </span>
              )}
            </div>
            <MonthCalendar ym={month} empId={empId} />
          </div>

          {/* Side panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Resumo do mês */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                Resumo do mês
              </div>
              {[
                { l: 'Dias úteis',       v: `${workDays}d` },
                { l: 'Dias trabalhados', v: empId ? `${workDays - faltas}d` : '—' },
                { l: 'Faltas',           v: empId ? `${faltas}d` : '—',     warn: faltas > 0 },
                { l: 'Atrasos',          v: empId ? `${atrasos}x` : '—',   warn: atrasos > 0 },
                { l: 'Horas previstas',  v: `${workDays * 8}h` },
                { l: 'Horas trabalhadas',v: workedH },
              ].map((r, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '7px 0', borderBottom: i < 5 ? '1px solid var(--line-soft)' : 'none',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{r.l}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: r.warn ? '#dc2626' : 'var(--ink)' }}>{r.v}</span>
                </div>
              ))}
            </div>

            {/* Ações rápidas */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                Ações rápidas
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {NEW_ACTIONS.map(a => (
                  <button key={a.id} className="btn" style={{ justifyContent: 'flex-start', gap: 8 }}
                    onClick={() => setModal(a.id)}>
                    <Icon name={a.icon} size={13} style={{ color: 'var(--brand)' }} />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab !== 'jornada' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
          {tcLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              <div className="pulse">Carregando…</div>
            </div>
          ) : tableRows.length === 0 ? (
            <div style={{ padding: 56, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              <Icon name={TABS.find(t=>t.id===tab)?.icon || 'clock'} size={28} style={{ opacity: .3, marginBottom: 10 }} />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Nenhum registro</div>
              <div style={{ fontSize: 12 }}>Use o botão "Novo" para lançar</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <th style={{ padding: '10px 18px', textAlign: 'left', fontWeight: 600 }}>Funcionário</th>
                  <th style={{ padding: '10px 18px', textAlign: 'left', fontWeight: 600 }}>Mês</th>
                  <th style={{ padding: '10px 18px', textAlign: 'left', fontWeight: 600 }}>
                    {tab === 'extras' ? 'Horas extras' : tab === 'faltas' ? 'Faltas' : tab === 'banco' ? 'Saldo' : 'Escala'}
                  </th>
                  <th style={{ padding: '10px 18px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                  <th style={{ width: 60 }} />
                </tr>
              </thead>
              <tbody>
                {tableRows.map(tc => (
                  <tr key={tc.id} style={{ borderTop: '1px solid var(--line-soft)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 18px', fontWeight: 500 }}>{tc.employees?.name || '—'}</td>
                    <td style={{ padding: '10px 18px', color: 'var(--muted)' }}>{tc.month_year}</td>
                    <td style={{ padding: '10px 18px', fontFamily: 'monospace' }}>{tc.worked_hours}</td>
                    <td style={{ padding: '10px 18px' }}><span className="pill ok" style={{ fontSize: 11 }}>OK</span></td>
                    <td style={{ padding: '10px 18px' }}>
                      <button className="btn ghost icon sm"><Icon name="more-v" size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Modais ── */}
      {modal === 'falta'  && <FaltaModal    employees={employees} onClose={() => setModal(null)} onSave={d => handleSave('falta', d)}  />}
      {modal === 'extra'  && <HoraExtraModal employees={employees} onClose={() => setModal(null)} onSave={d => handleSave('extra', d)}  />}
      {modal === 'ajuste' && <AjusteModal   employees={employees} onClose={() => setModal(null)} onSave={d => handleSave('ajuste', d)} />}
      {modal === 'escala' && <EscalaModal   employees={employees} onClose={() => setModal(null)} onSave={d => handleSave('escala', d)} />}
    </div>
  );
}
