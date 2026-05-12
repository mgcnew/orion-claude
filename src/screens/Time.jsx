import { useState, useRef, useEffect, useCallback } from 'react';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import { useEmployees, useMonthEntries, createTimeEntry } from '../hooks/useEmployees.js';

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

function parseTimeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToHM(mins) {
  if (!mins || mins <= 0) return '0h00';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Constrói mapa dia → status a partir das entradas reais
function buildDayStatuses(entries, ym) {
  const total = daysInMonth(ym);
  const [y, mo] = ym.split('-').map(Number);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const entryByDay = {};
  entries.forEach(e => {
    const day = parseInt(e.date.split('-')[2], 10);
    entryByDay[day] = e;
  });

  const result = {};
  for (let d = 1; d <= total; d++) {
    const date = new Date(y, mo - 1, d);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) { result[d] = { status: 'weekend', entry: null }; continue; }
    if (date > today) continue;
    const entry = entryByDay[d];
    if (!entry) {
      result[d] = { status: 'sem_registro', entry: null };
    } else {
      result[d] = { status: entry.status || 'presente', entry };
    }
  }
  return result;
}

const STATUS_COLOR = {
  presente:     { bg: 'var(--ok-bg,#dcfce7)', color: 'var(--ok)',   label: 'Normal'    },
  ok:           { bg: 'var(--ok-bg,#dcfce7)', color: 'var(--ok)',   label: 'Normal'    },
  ajuste:       { bg: 'var(--ok-bg,#dcfce7)', color: 'var(--ok)',   label: 'Ajuste'    },
  falta:        { bg: '#fee2e2',              color: '#dc2626',      label: 'Falta'     },
  atraso:       { bg: '#fef9c3',              color: '#ca8a04',      label: 'Atraso'    },
  hora_extra:   { bg: '#ede9fe',              color: '#7c3aed',      label: 'Extra'     },
  sem_registro: { bg: 'var(--surface-2)',     color: 'var(--muted-2)', label: ''        },
  weekend:      { bg: 'var(--surface-2)',     color: 'var(--muted-2)', label: ''        },
};

// ── Modal base ────────────────────────────────────────────────
function Modal({ title, onClose, children, width = 480 }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(8px, 2vw, 24px)', overflowY: 'auto',
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: width,
        background: 'var(--surface)', borderRadius: 14,
        boxShadow: '0 24px 64px rgba(0,0,0,.22)',
        overflow: 'hidden', maxHeight: 'calc(100vh - 32px)',
        display: 'flex', flexDirection: 'column', margin: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 700, minWidth: 0 }}>{title}</div>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={15} /></button>
        </div>
        <div style={{ padding: 20, overflowY: 'auto', flex: 1, minHeight: 0 }}>{children}</div>
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
  const [form, setForm] = useState({ employee_id: '', date: new Date().toISOString().slice(0,10), tipo: 'injustificada', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.employee_id || !form.date) return;
    setSaving(true);
    const { error } = await createTimeEntry({
      employee_id: form.employee_id,
      date: form.date,
      status: 'falta',
      tipo: form.tipo,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { alert('Erro: ' + error.message); return; }
    onSave();
    onClose();
  };

  return (
    <Modal title="Registrar falta" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FieldRow label="Funcionário *">
          <select className="field" value={form.employee_id} onChange={e => set('employee_id', e.target.value)}>
            <option value="">Selecione…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Data *">
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
          <textarea className="field" rows={3} placeholder="Descreva o motivo…" value={form.notes}
            onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical', minHeight: 72 }} />
        </FieldRow>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={saving || !form.employee_id || !form.date}>
            {saving ? 'Salvando…' : 'Registrar falta'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function HoraExtraModal({ employees, onClose, onSave }) {
  const [form, setForm] = useState({ employee_id: '', date: new Date().toISOString().slice(0,10), extra_hours: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.employee_id || !form.date || !form.extra_hours) return;
    setSaving(true);
    const { error } = await createTimeEntry({
      employee_id: form.employee_id,
      date: form.date,
      status: 'hora_extra',
      extra_hours: form.extra_hours,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { alert('Erro: ' + error.message); return; }
    onSave();
    onClose();
  };

  return (
    <Modal title="Lançar hora extra" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FieldRow label="Funcionário *">
          <select className="field" value={form.employee_id} onChange={e => set('employee_id', e.target.value)}>
            <option value="">Selecione…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </FieldRow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldRow label="Data *">
            <input type="date" className="field" value={form.date} onChange={e => set('date', e.target.value)} />
          </FieldRow>
          <FieldRow label="Quantidade *">
            <input type="text" className="field" placeholder="Ex: 2h30" value={form.extra_hours} onChange={e => set('extra_hours', e.target.value)} />
          </FieldRow>
        </div>
        <FieldRow label="Justificativa">
          <textarea className="field" rows={3} placeholder="Motivo das horas extras…" value={form.notes}
            onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical', minHeight: 72 }} />
        </FieldRow>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={saving || !form.employee_id || !form.date || !form.extra_hours}>
            {saving ? 'Salvando…' : 'Lançar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AjusteModal({ employees, onClose, onSave }) {
  const [form, setForm] = useState({ employee_id: '', date: new Date().toISOString().slice(0,10), time_in: '', time_out: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.employee_id || !form.date) return;
    setSaving(true);
    const { error } = await createTimeEntry({
      employee_id: form.employee_id,
      date: form.date,
      time_in: form.time_in || null,
      time_out: form.time_out || null,
      status: 'ajuste',
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { alert('Erro: ' + error.message); return; }
    onSave();
    onClose();
  };

  return (
    <Modal title="Ajuste manual de ponto" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FieldRow label="Funcionário *">
          <select className="field" value={form.employee_id} onChange={e => set('employee_id', e.target.value)}>
            <option value="">Selecione…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Data *">
          <input type="date" className="field" value={form.date} onChange={e => set('date', e.target.value)} />
        </FieldRow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldRow label="Entrada">
            <input type="time" className="field" value={form.time_in} onChange={e => set('time_in', e.target.value)} />
          </FieldRow>
          <FieldRow label="Saída">
            <input type="time" className="field" value={form.time_out} onChange={e => set('time_out', e.target.value)} />
          </FieldRow>
        </div>
        <FieldRow label="Motivo do ajuste">
          <textarea className="field" rows={2} placeholder="Ex: Esqueceu de registrar saída…" value={form.notes}
            onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
        </FieldRow>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={saving || !form.employee_id || !form.date}>
            {saving ? 'Salvando…' : 'Salvar ajuste'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Calendário mensal ─────────────────────────────────────────
function MonthCalendar({ ym, dayStatuses }) {
  const total  = daysInMonth(ym);
  const offset = firstDayOfWeek(ym);
  const cells  = Array.from({ length: Math.ceil((offset + total) / 7) * 7 });

  const counts = Object.values(dayStatuses).reduce((a, ds) => {
    if (ds.status !== 'weekend' && ds.status !== 'sem_registro') {
      a[ds.status] = (a[ds.status] || 0) + 1;
    }
    return a;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Mini legenda */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[['presente','Normal','var(--ok)'],['atraso','Atraso','#ca8a04'],['falta','Falta','#dc2626'],['hora_extra','Extra','#7c3aed']].map(([k,l,c]) => (
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
          const ds = dayStatuses[day];
          const sc = ds ? STATUS_COLOR[ds.status] || {} : {};
          const isToday = (() => {
            const now = new Date();
            const [y, m] = ym.split('-').map(Number);
            return now.getFullYear() === y && now.getMonth() + 1 === m && now.getDate() === day;
          })();
          const entry = ds?.entry;
          const timeLabel = entry?.time_in
            ? entry.time_in.slice(0,5)
            : ds?.status === 'falta' ? 'Falta'
            : ds?.status === 'atraso' ? 'Atraso'
            : ds?.status === 'hora_extra' ? 'Extra'
            : '';

          return (
            <div key={i} style={{
              borderRadius: 8, padding: '8px 4px', textAlign: 'center',
              background: isToday ? 'var(--brand)' : (sc.bg || 'var(--surface-2)'),
              color: isToday ? 'var(--brand-ink,#fff)' : (sc.color || 'var(--muted-2)'),
              border: isToday ? 'none' : '1px solid var(--line)',
              cursor: ds && ds.status !== 'weekend' && ds.status !== 'sem_registro' ? 'pointer' : 'default',
            }}>
              <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 500 }}>{day}</div>
              {timeLabel && !isToday && (
                <div style={{ fontSize: 9, marginTop: 2, fontWeight: 600, opacity: .8 }}>{timeLabel}</div>
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
  { id: 'jornada', label: 'Jornada',       icon: 'clock'     },
  { id: 'extras',  label: 'Horas extras',  icon: 'sparkle'   },
  { id: 'faltas',  label: 'Faltas',        icon: 'alert'     },
  { id: 'banco',   label: 'Banco de horas',icon: 'chart'     },
];

const NEW_ACTIONS = [
  { id: 'falta',  label: 'Registrar falta',       icon: 'alert'    },
  { id: 'extra',  label: 'Lançar hora extra',      icon: 'sparkle'  },
  { id: 'ajuste', label: 'Ajuste manual de ponto', icon: 'edit'     },
];

const STATUS_LABEL = { presente: 'Presente', ok: 'Presente', ajuste: 'Ajuste', falta: 'Falta', atraso: 'Atraso', hora_extra: 'Extra' };
const STATUS_CLS   = { presente: 'ok', ok: 'ok', ajuste: 'ok', falta: 'bad', atraso: 'warn', hora_extra: 'info' };

export function TimeScreen({ addToast }) {
  const { employees, loading: empLoading } = useEmployees();
  const [tab,      setTab]      = useState('jornada');
  const [empId,    setEmpId]    = useState('');
  const [month,    setMonth]    = useState(new Date().toISOString().slice(0, 7));
  const [modal,    setModal]    = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();

  const { entries, loading: entLoading, refetch } = useMonthEntries(empId || null, month);

  const selectedEmp  = employees.find(e => e.id === empId);
  const dayStatuses  = empId ? buildDayStatuses(entries, month) : {};

  // KPIs (só quando funcionário selecionado)
  const presenteEntries = entries.filter(e => ['presente','ok','ajuste'].includes(e.status) && e.time_in);
  const faltaCount  = entries.filter(e => e.status === 'falta').length;
  const atrasoCount = entries.filter(e => e.status === 'atraso').length;
  const extraCount  = entries.filter(e => e.status === 'hora_extra').length;

  const totalMins = presenteEntries.reduce((sum, e) => {
    const tin  = parseTimeToMinutes(e.time_in);
    const tout = parseTimeToMinutes(e.time_out);
    if (tin !== null && tout !== null && tout > tin) return sum + (tout - tin);
    return sum;
  }, 0);
  const workedH = empId ? (totalMins > 0 ? minutesToHM(totalMins) : '—') : '—';
  const banco   = empId ? `${extraCount > 0 ? '+' : ''}${extraCount * 2}h` : '—';

  const workDays = (() => {
    const total = daysInMonth(month);
    const [y, m] = month.split('-').map(Number);
    let count = 0;
    for (let d = 1; d <= total; d++) {
      const dow = new Date(y, m - 1, d).getDay();
      if (dow !== 0 && dow !== 6) count++;
    }
    return count;
  })();

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSaved = useCallback(() => {
    refetch();
    addToast({ kind: 'ok', msg: 'Registro salvo com sucesso.' });
  }, [refetch, addToast]);

  // Dados para cada tab
  const faltaRows  = entries.filter(e => e.status === 'falta');
  const extraRows  = entries.filter(e => e.status === 'hora_extra');

  // Para banco: agrupa por funcionário
  const bancoMap = entries.reduce((acc, e) => {
    const name = e.employees?.name || e.employee_id;
    if (!acc[name]) acc[name] = { name, presente: 0, falta: 0, extra: 0, mins: 0 };
    if (e.status === 'falta') acc[name].falta++;
    else if (e.status === 'hora_extra') acc[name].extra++;
    else if (e.time_in && e.time_out) {
      const tin  = parseTimeToMinutes(e.time_in);
      const tout = parseTimeToMinutes(e.time_out);
      if (tin !== null && tout !== null && tout > tin) { acc[name].mins += tout - tin; acc[name].presente++; }
    }
    return acc;
  }, {});
  const bancoRows = Object.values(bancoMap);

  return (
    <>
    <div className="fade-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Controle de ponto</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Jornada, faltas, horas extras e banco em um único lugar.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
                    background: 'transparent', cursor: 'pointer', fontSize: 13.5, color: 'var(--ink)', textAlign: 'left',
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

      {/* ── Filtros ── */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap',
        padding: '12px 16px', background: 'var(--surface)',
        border: '1px solid var(--line)', borderRadius: 10, alignItems: 'center',
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
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}{e.dept ? ` — ${e.dept}` : ''}</option>)}
        </select>
        <div style={{ width: 1, height: 24, background: 'var(--line)', margin: '0 4px' }} />
        <Icon name="history" size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        <input
          type="month" className="field" value={month}
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
          { label: 'Horas trabalhadas', value: workedH,                          icon: 'clock',   color: 'var(--brand)'                            },
          { label: 'Banco de horas',    value: banco,                             icon: 'sparkle', color: 'var(--ok)'                               },
          { label: 'Faltas no mês',     value: empId ? faltaCount  : '—',        icon: 'alert',   color: faltaCount  > 0 ? '#dc2626' : 'var(--muted)' },
          { label: 'Atrasos no mês',    value: empId ? atrasoCount : '—',        icon: 'history', color: atrasoCount > 0 ? '#ca8a04' : 'var(--muted)' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Icon name={k.icon} size={13} style={{ color: k.color }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, letterSpacing: -0.5 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{fmtMonth(month)}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', border: 'none', background: 'transparent',
            fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
            color: tab === t.id ? 'var(--brand)' : 'var(--muted)',
            borderBottom: `2px solid ${tab === t.id ? 'var(--brand)' : 'transparent'}`,
            marginBottom: -1, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            <Icon name={t.icon} size={13} />{t.label}
          </button>
        ))}
      </div>

      {/* ── Jornada ── */}
      {tab === 'jornada' && (
        <div style={{ display: 'grid', gridTemplateColumns: empId ? '1fr 340px' : '1fr', gap: 16, alignItems: 'start' }}>
          {empId ? (
            <>
              {/* Calendário */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{fmtMonth(month)}</h3>
                  {entLoading && <span style={{ fontSize: 12, color: 'var(--muted)' }} className="pulse">Carregando…</span>}
                </div>
                <MonthCalendar ym={month} dayStatuses={dayStatuses} />
              </div>
              {/* Painel lateral */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                    Resumo do mês
                  </div>
                  {[
                    { l: 'Dias úteis',        v: `${workDays}d` },
                    { l: 'Dias com registro', v: `${presenteEntries.length}d` },
                    { l: 'Faltas',            v: `${faltaCount}d`,   warn: faltaCount  > 0 },
                    { l: 'Atrasos',           v: `${atrasoCount}x`,  warn: atrasoCount > 0 },
                    { l: 'Horas extras',      v: `${extraCount}x` },
                    { l: 'Horas trabalhadas', v: workedH },
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
                <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                    Ações rápidas
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {NEW_ACTIONS.map(a => (
                      <button key={a.id} className="btn" style={{ justifyContent: 'flex-start', gap: 8 }} onClick={() => setModal(a.id)}>
                        <Icon name={a.icon} size={13} style={{ color: 'var(--brand)' }} />{a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Tabela de todos quando nenhum funcionário selecionado */
            <EntriesTable entries={entries} loading={entLoading} emptyMsg="Selecione um funcionário ou veja todos os registros do mês." showEmployee />
          )}
        </div>
      )}

      {/* ── Faltas ── */}
      {tab === 'faltas' && (
        <EntriesTable entries={faltaRows} loading={entLoading} showEmployee={!empId}
          columns={[
            { key: 'date',  label: 'Data',       render: r => fmtDate(r.date) },
            !empId && { key: 'emp', label: 'Funcionário', render: r => r.employees?.name || '—' },
            { key: 'tipo',  label: 'Tipo',        render: r => r.tipo ? (r.tipo.charAt(0).toUpperCase() + r.tipo.slice(1)) : '—' },
            { key: 'notes', label: 'Motivo',      render: r => r.notes || '—' },
          ].filter(Boolean)}
          emptyMsg="Nenhuma falta registrada neste período."
        />
      )}

      {/* ── Extras ── */}
      {tab === 'extras' && (
        <EntriesTable entries={extraRows} loading={entLoading} showEmployee={!empId}
          columns={[
            { key: 'date',        label: 'Data',         render: r => fmtDate(r.date) },
            !empId && { key: 'emp', label: 'Funcionário', render: r => r.employees?.name || '—' },
            { key: 'extra_hours', label: 'Horas extras', render: r => r.extra_hours || '—' },
            { key: 'notes',       label: 'Justificativa',render: r => r.notes || '—' },
          ].filter(Boolean)}
          emptyMsg="Nenhuma hora extra registrada neste período."
        />
      )}

      {/* ── Banco ── */}
      {tab === 'banco' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
          {entLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}><div className="pulse">Carregando…</div></div>
          ) : bancoRows.length === 0 ? (
            <EmptyState icon="chart" msg="Nenhum registro encontrado para este período." />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <th style={{ padding: '10px 18px', textAlign: 'left', fontWeight: 600 }}>Funcionário</th>
                  <th style={{ padding: '10px 18px', textAlign: 'left', fontWeight: 600 }}>Dias presentes</th>
                  <th style={{ padding: '10px 18px', textAlign: 'left', fontWeight: 600 }}>Horas trabalhadas</th>
                  <th style={{ padding: '10px 18px', textAlign: 'left', fontWeight: 600 }}>Faltas</th>
                  <th style={{ padding: '10px 18px', textAlign: 'left', fontWeight: 600 }}>Horas extras</th>
                </tr>
              </thead>
              <tbody>
                {bancoRows.map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 18px', fontWeight: 500 }}>{r.name}</td>
                    <td style={{ padding: '10px 18px', color: 'var(--muted)' }}>{r.presente}d</td>
                    <td style={{ padding: '10px 18px', fontFamily: 'monospace' }}>{minutesToHM(r.mins)}</td>
                    <td style={{ padding: '10px 18px' }}>
                      {r.falta > 0 ? <span className="pill bad" style={{ fontSize: 11 }}>{r.falta}d</span> : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 18px' }}>
                      {r.extra > 0 ? <span className="pill info" style={{ fontSize: 11 }}>{r.extra}x</span> : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

    </div>

    {modal === 'falta'  && <FaltaModal     employees={employees} onClose={() => setModal(null)} onSave={handleSaved} />}
    {modal === 'extra'  && <HoraExtraModal employees={employees} onClose={() => setModal(null)} onSave={handleSaved} />}
    {modal === 'ajuste' && <AjusteModal    employees={employees} onClose={() => setModal(null)} onSave={handleSaved} />}
    </>
  );
}

// ── Componentes auxiliares ────────────────────────────────────
function EmptyState({ icon, msg }) {
  return (
    <div style={{ padding: 56, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
      <Icon name={icon} size={28} style={{ opacity: .3, marginBottom: 10 }} />
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Nenhum registro</div>
      <div style={{ fontSize: 12 }}>{msg}</div>
    </div>
  );
}

function EntriesTable({ entries, loading, columns, emptyMsg, showEmployee }) {
  const STATUS_LABEL = { presente: 'Presente', ok: 'Presente', ajuste: 'Ajuste', falta: 'Falta', atraso: 'Atraso', hora_extra: 'Extra' };
  const STATUS_CLS   = { presente: 'ok', ok: 'ok', ajuste: 'ok', falta: 'bad', atraso: 'warn', hora_extra: 'info' };

  const cols = columns || [
    showEmployee && { key: 'emp',      label: 'Funcionário', render: r => r.employees?.name || '—' },
    { key: 'date',     label: 'Data',     render: r => fmtDate(r.date) },
    { key: 'time_in',  label: 'Entrada',  render: r => r.time_in ? r.time_in.slice(0,5) : '—' },
    { key: 'time_out', label: 'Saída',    render: r => r.time_out ? r.time_out.slice(0,5) : '—' },
    { key: 'status',   label: 'Status',   render: r => (
      <span className={`pill ${STATUS_CLS[r.status] || 'ok'}`} style={{ fontSize: 11 }}>
        {STATUS_LABEL[r.status] || r.status || 'Presente'}
      </span>
    )},
    { key: 'notes',    label: 'Obs.',     render: r => r.notes ? <span style={{ color: 'var(--muted)', fontSize: 12 }}>{r.notes}</span> : null },
  ].filter(Boolean);

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}><div className="pulse">Carregando…</div></div>
      ) : entries.length === 0 ? (
        <EmptyState icon="clock" msg={emptyMsg || 'Nenhum registro encontrado.'} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 400 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {cols.map(c => <th key={c.key} style={{ padding: '10px 18px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {entries.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--line-soft)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {cols.map(c => (
                    <td key={c.key} style={{ padding: '10px 18px', color: 'var(--ink)' }}>
                      {c.render(r) ?? <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
