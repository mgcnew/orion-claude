import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import Pagination from '../components/Pagination.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { useEmployees, useMonthEntries, createTimeEntry } from '../hooks/useEmployees.js';
import TutorialBanner from '../components/TutorialBanner.jsx';

// ── QuickEntry ───────────────────────────────────────────────
const QUICK_TYPES = [
  { id: 'presente',   label: 'Presença',   icon: 'check'    },
  { id: 'falta',      label: 'Falta',      icon: 'x'        },
  { id: 'hora_extra', label: 'H. Extra',   icon: 'sparkle'  },
  { id: 'atestado',   label: 'Atestado',   icon: 'file'     },
];

const QE_LS_KEY = 'orion.time.quickentry.open';

function QuickEntry({ employees, defaultEmpId, onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const [empId,  setEmpId]  = useState(defaultEmpId || '');
  const [date,   setDate]   = useState(today);
  const [type,   setType]   = useState('presente');
  const [timeIn, setTimeIn] = useState('08:00');
  const [timeOut,setTimeOut]= useState('17:00');
  const [extra,  setExtra]  = useState('');
  const [notes,  setNotes]  = useState('');
  const [saving, setSaving] = useState(false);
  const [ok,     setOk]     = useState(false);
  const [open,   setOpen]   = useState(() => {
    try { return localStorage.getItem(QE_LS_KEY) === '1'; } catch { return false; }
  });
  const toggleOpen = () => {
    setOpen(v => {
      const next = !v;
      try { localStorage.setItem(QE_LS_KEY, next ? '1' : '0'); } catch (_) { /* ignore */ }
      return next;
    });
  };

  useEffect(() => { if (defaultEmpId) setEmpId(defaultEmpId); }, [defaultEmpId]);

  const canSave = empId && date && (
    type === 'presente'   ? (timeIn && timeOut) :
    type === 'hora_extra' ? extra :
    true
  );

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const base = { employee_id: empId, date, notes: notes || null };
    const payload =
      type === 'presente'   ? { ...base, status: 'presente',   time_in: timeIn, time_out: timeOut } :
      type === 'falta'      ? { ...base, status: 'falta',      tipo: 'injustificada' } :
      type === 'hora_extra' ? { ...base, status: 'hora_extra', extra_hours: extra } :
                              { ...base, status: 'atestado',   tipo: 'atestado' };
    await createTimeEntry(payload);
    setSaving(false);
    setOk(true);
    setTimeout(() => setOk(false), 1800);
    setTimeIn('08:00'); setTimeOut('17:00'); setExtra(''); setNotes('');
    onSaved?.();
  };

  const field = {
    height: 34, padding: '0 10px', borderRadius: 7,
    border: '1px solid var(--line)', background: 'var(--surface-2)',
    color: 'var(--ink)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
  };

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: open ? '12px 14px' : '0' }}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: open ? '0 0 10px' : '10px 14px',
          fontSize: 11, fontWeight: 700, color: 'var(--muted)',
          textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'left',
        }}
      >
        <Icon name="bolt" size={12} style={{ color: 'var(--brand)' }} />
        <span style={{ flex: 1 }}>Lançamento rápido</span>
        {!open && (
          <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'none', letterSpacing: 0 }}>
            clique para expandir
          </span>
        )}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={12} />
      </button>
      {open && (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>

        {/* Funcionário */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 180px', minWidth: 150 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Funcionário</span>
          <EmpDropdown employees={employees} value={empId} onChange={setEmpId} placeholder="Selecionar…" />
        </div>

        {/* Data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Data</span>
          <DateDropdown value={date} onChange={setDate} />
        </div>

        {/* Tipo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Tipo</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {QUICK_TYPES.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px', height: 34,
                  borderRadius: 7, border: `1px solid ${type === t.id ? 'var(--brand)' : 'var(--line)'}`,
                  background: type === t.id ? 'var(--brand-tint)' : 'var(--surface-2)',
                  color: type === t.id ? 'var(--brand)' : 'var(--muted)',
                  fontSize: 12.5, fontWeight: type === t.id ? 700 : 500, cursor: 'pointer',
                  transition: 'all .12s',
                }}
              >
                <Icon name={t.icon} size={12} />{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Campos condicionais */}
        {type === 'presente' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Entrada</span>
              <input type="time" value={timeIn}  onChange={e => setTimeIn(e.target.value)}  style={{ ...field, width: 100 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Saída</span>
              <input type="time" value={timeOut} onChange={e => setTimeOut(e.target.value)} style={{ ...field, width: 100 }} />
            </div>
          </>
        )}
        {type === 'hora_extra' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Horas extras</span>
            <input type="text" placeholder="ex: 2h30" value={extra} onChange={e => setExtra(e.target.value)} style={{ ...field, width: 100 }} />
          </div>
        )}
        {(type === 'falta' || type === 'atestado') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 160px' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Observação</span>
            <input type="text" placeholder="Motivo (opcional)" value={notes} onChange={e => setNotes(e.target.value)} style={{ ...field, width: '100%' }} />
          </div>
        )}

        {/* Botão */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          style={{
            height: 34, padding: '0 18px', borderRadius: 7, border: 'none',
            background: ok ? 'var(--ok, #16a34a)' : 'var(--brand)',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: canSave ? 'pointer' : 'not-allowed',
            opacity: canSave ? 1 : 0.5,
            display: 'flex', alignItems: 'center', gap: 7,
            transition: 'background .2s',
            alignSelf: 'flex-end',
          }}
        >
          <Icon name={ok ? 'check' : saving ? 'loader' : 'save'} size={14} />
          {ok ? 'Salvo!' : saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
      )}
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_PT   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const STANDARD_MINS = 8 * 60; // 8h padrão

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

// ── Input de horário 24h ──────────────────────────────────────
// Aceita: "8" → 08:00 | "800" → 08:00 | "0800" → 08:00 | "13" → 13:00 | "1830" → 18:30
function TimeInput24h({ value, onChange, placeholder = 'ex: 0800', style }) {
  const [text, setText] = useState(value || '');

  useEffect(() => { setText(value || ''); }, [value]);

  const toHHMM = (raw) => {
    const d = raw.replace(/\D/g, '');
    if (!d) return '';
    let h, m;
    if (d.length <= 2) { h = parseInt(d); m = 0; }
    else { h = parseInt(d.slice(0, d.length - 2)); m = parseInt(d.slice(-2)); }
    if (isNaN(h) || isNaN(m) || h > 23 || m > 59) return '';
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^\d:]/g, '').slice(0, 5);
    setText(raw);
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 4) {
      const fmt = toHHMM(digits);
      if (fmt) { setText(fmt); onChange(fmt); return; }
    }
    if (!raw) onChange('');
  };

  const handleBlur = () => {
    if (!text.trim()) { onChange(''); return; }
    const fmt = toHHMM(text);
    setText(fmt || '');
    onChange(fmt || '');
  };

  return (
    <input
      type="text"
      className="field"
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      maxLength={5}
      inputMode="numeric"
      style={{ fontFamily: 'monospace', letterSpacing: 1.5, textAlign: 'center', ...style }}
    />
  );
}

// Deriva o label do período pelo horário de entrada
function getPeriodLabel(inTime, index) {
  if (!inTime) return index === 0 ? 'Manhã' : index === 1 ? 'Tarde' : `Extra ${index - 1}`;
  const h = parseInt(inTime.split(':')[0]);
  if (h < 12) return 'Manhã';
  if (h < 18) return 'Tarde';
  return 'Noturno / Extra';
}

// Extrai minutos de strings como "2h30", "2h", "2.5", "150m"
function parseExtraHoursToMins(str) {
  if (!str) return 0;
  const s = str.trim().toLowerCase();
  const mh = s.match(/^(\d+)h(\d+)?/);
  if (mh) return parseInt(mh[1]) * 60 + (parseInt(mh[2]) || 0);
  const mm = s.match(/^(\d+)m$/);
  if (mm) return parseInt(mm[1]);
  const mf = parseFloat(s);
  if (!isNaN(mf)) return Math.round(mf * 60);
  return 0;
}

// Calcula quantas horas foram trabalhadas em uma entrada (em minutos)
// Se tiver periods JSONB, soma cada período individualmente (descontando intervalos)
function entryWorkedMins(e) {
  if (e.periods && Array.isArray(e.periods) && e.periods.length > 0) {
    return e.periods.reduce((sum, p) => {
      const tin  = parseTimeToMinutes(p.in);
      const tout = parseTimeToMinutes(p.out);
      if (tin === null || tout === null || tout <= tin) return sum;
      return sum + (tout - tin);
    }, 0);
  }
  const tin  = parseTimeToMinutes(e.time_in);
  const tout = parseTimeToMinutes(e.time_out);
  if (tin === null || tout === null || tout <= tin) return 0;
  return tout - tin;
}

// Calcula o total de minutos de um array de períodos { in, out }
function periodsWorkedMins(periods) {
  return (periods || []).reduce((sum, p) => {
    const tin  = parseTimeToMinutes(p.in);
    const tout = parseTimeToMinutes(p.out);
    if (tin === null || tout === null || tout <= tin) return sum;
    return sum + (tout - tin);
  }, 0);
}

// Computa todas as estatísticas de um array de time_entries
function computeStats(entries) {
  let workedMins   = 0;
  let extraMins    = 0;
  let faltaCount   = 0;
  let atrasoCount  = 0;
  let presenteCount = 0;
  let ajusteCount  = 0;

  entries.forEach(e => {
    if (e.status === 'falta') {
      faltaCount++;
    } else if (e.status === 'atraso') {
      atrasoCount++;
      const w = entryWorkedMins(e);
      if (w > 0) workedMins += w;
    } else if (e.status === 'hora_extra') {
      // Lançamento explícito de hora extra
      extraMins += parseExtraHoursToMins(e.extra_hours);
      // Se também tem batida de ponto, soma horas trabalhadas
      const w = entryWorkedMins(e);
      if (w > 0) { workedMins += w; extraMins += Math.max(0, w - STANDARD_MINS); }
    } else {
      // presente / ajuste / ok
      if (e.status === 'ajuste') ajusteCount++;
      presenteCount++;
      const w = entryWorkedMins(e);
      if (w > 0) {
        workedMins += w;
        if (w > STANDARD_MINS) extraMins += w - STANDARD_MINS;
      }
    }
  });

  return { workedMins, extraMins, faltaCount, atrasoCount, presenteCount, ajusteCount };
}

// Constrói mapa dia → { status, entry } a partir das entradas reais
function buildDayStatuses(entries, ym) {
  const total = daysInMonth(ym);
  const [y, mo] = ym.split('-').map(Number);
  const today = new Date(); today.setHours(23,59,59,999);
  const byDay = {};
  entries.forEach(e => { const d = parseInt(e.date.split('-')[2], 10); byDay[d] = e; });
  const result = {};
  for (let d = 1; d <= total; d++) {
    const date = new Date(y, mo - 1, d);
    const dow  = date.getDay();
    if (dow === 0 || dow === 6) { result[d] = { status: 'weekend', entry: null }; continue; }
    const e = byDay[d];
    // Dias futuros só aparecem se tiverem compromisso marcado
    if (date > today) {
      if (e?.status === 'compromisso') result[d] = { status: 'compromisso', entry: e };
      continue;
    }
    result[d] = e ? { status: e.status || 'presente', entry: e } : { status: 'sem_registro', entry: null };
  }
  return result;
}

const STATUS_COLOR = {
  presente:      { bg: 'var(--ok-bg,#dcfce7)', color: 'var(--ok)',      label: 'Presente'     },
  ok:            { bg: 'var(--ok-bg,#dcfce7)', color: 'var(--ok)',      label: 'Presente'     },
  ajuste:        { bg: '#dbeafe',              color: '#2563eb',         label: 'Ajuste'       },
  falta:         { bg: '#fee2e2',              color: '#dc2626',         label: 'Falta'        },
  atraso:        { bg: '#fef9c3',              color: '#ca8a04',         label: 'Atraso'       },
  hora_extra:    { bg: '#ede9fe',              color: '#7c3aed',         label: 'Extra'        },
  compromisso:   { bg: '#fff7ed',              color: '#ea580c',         label: 'Compromisso'  },
  sem_registro:  { bg: 'var(--surface-2)',     color: 'var(--muted-2)',  label: ''             },
  weekend:       { bg: 'var(--surface-2)',     color: 'var(--muted-2)',  label: ''             },
};

const COMPROMISSO_TIPOS = [
  { id: 'consulta',   label: 'Consulta médica',    icon: 'health'    },
  { id: 'viagem',     label: 'Viagem',             icon: 'map-pin'   },
  { id: 'juridico',   label: 'Compromisso jurídico',icon: 'gavel'    },
  { id: 'pessoal',    label: 'Compromisso pessoal', icon: 'user'     },
  { id: 'outro',      label: 'Outro',              icon: 'calendar'  },
];

function ComprometimentoModal({ date, empId, employees, onClose, onSave }) {
  const [selEmpId, setSelEmpId] = useState(empId || '');
  const [tipo,     setTipo]     = useState('consulta');
  const [hora,     setHora]     = useState('');
  const [notes,    setNotes]    = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const handleSave = async () => {
    if (!selEmpId) return;
    setSaving(true);
    const tipoLabel = COMPROMISSO_TIPOS.find(t => t.id === tipo)?.label || tipo;
    await createTimeEntry({
      employee_id: selEmpId,
      date,
      status: 'compromisso',
      tipo,
      notes: [tipoLabel, hora ? `às ${hora}` : '', notes].filter(Boolean).join(' — '),
      time_in: hora || null,
    });
    setSaving(false);
    onSave();
    onClose();
  };

  const [y, m, d] = date.split('-').map(Number);
  const dateLabel = new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', borderRadius: 14, boxShadow: '0 24px 64px rgba(0,0,0,.22)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="calendar" size={15} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Marcar compromisso</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1, textTransform: 'capitalize' }}>{dateLabel}</div>
          </div>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Funcionário */}
          {!empId && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Funcionário *</label>
              <select className="field" value={selEmpId} onChange={e => setSelEmpId(e.target.value)}>
                <option value="">Selecione…</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          )}

          {/* Tipo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Tipo de compromisso</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {COMPROMISSO_TIPOS.map(t => (
                <button key={t.id} type="button" onClick={() => setTipo(t.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7,
                  border: `1px solid ${tipo === t.id ? '#ea580c' : 'var(--line)'}`,
                  background: tipo === t.id ? '#fff7ed' : 'var(--surface-2)',
                  color: tipo === t.id ? '#ea580c' : 'var(--muted)',
                  fontSize: 12.5, fontWeight: tipo === t.id ? 700 : 500, cursor: 'pointer',
                }}>
                  <Icon name={t.icon} size={12} />{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hora estimada + Descrição */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Hora estimada</label>
              <input type="time" className="field" value={hora} onChange={e => setHora(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Descrição</label>
              <input type="text" className="field" placeholder="Detalhes opcionais…" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button onClick={handleSave} disabled={saving || !selEmpId} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', height: 36, borderRadius: 8, border: 'none', background: '#ea580c', color: '#fff', fontSize: 13, fontWeight: 700, cursor: selEmpId ? 'pointer' : 'not-allowed', opacity: selEmpId ? 1 : 0.5 }}>
            <Icon name="calendar" size={13} /> {saving ? 'Salvando…' : 'Marcar compromisso'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Cartão de Ponto ─────────────────────────────────────
const DEFAULT_PERIODS = [
  { in: '', out: '' },
  { in: '', out: '' },
];

function nextWorkday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
  return d.toISOString().slice(0, 10);
}

function CartaoModal({ employees, onClose, onSave }) {
  const [empId,      setEmpId]      = useState('');
  const [date,       setDate]       = useState(new Date().toISOString().slice(0,10));
  const [periods,    setPeriods]    = useState(DEFAULT_PERIODS.map(p => ({ ...p })));
  const [saving,     setSaving]     = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [flash,      setFlash]      = useState(false);

  const updatePeriod = (i, field, val) =>
    setPeriods(ps => ps.map((p, idx) => idx === i ? { ...p, [field]: val } : p));

  const addPeriod = () => setPeriods(ps => [...ps, { in: '', out: '' }]);
  const removePeriod = (i) => setPeriods(ps => ps.filter((_, idx) => idx !== i));

  const validPeriods = periods.filter(p => p.in && p.out);
  const totalMins    = periodsWorkedMins(validPeriods);
  const extraMins    = Math.max(0, totalMins - STANDARD_MINS);
  const hasRequired  = empId && date && validPeriods.length > 0;

  const doSave = async () => {
    const firstIn = validPeriods[0]?.in || null;
    const lastOut = validPeriods[validPeriods.length - 1]?.out || null;
    const { error } = await createTimeEntry({
      employee_id: empId, date,
      time_in: firstIn, time_out: lastOut,
      status: 'presente', periods: validPeriods,
      extra_hours: extraMins > 0 ? minutesToHM(extraMins) : null,
    });
    if (error) { alert('Erro: ' + error.message); return false; }
    onSave();
    return true;
  };

  const handleSave = async () => {
    if (!hasRequired) return;
    setSaving(true);
    const ok = await doSave();
    setSaving(false);
    if (ok) onClose();
  };

  const handleSaveAndContinue = async () => {
    if (!hasRequired) return;
    setSaving(true);
    const ok = await doSave();
    setSaving(false);
    if (!ok) return;
    setSavedCount(c => c + 1);
    setFlash(true);
    setTimeout(() => setFlash(false), 900);
    setDate(nextWorkday(date));
    setPeriods(DEFAULT_PERIODS.map(p => ({ ...p })));
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'clamp(8px,2vw,24px)', overflowY:'auto' }} onClick={onClose}>
      <div style={{ width:'100%', maxWidth:500, background:'var(--surface)', borderRadius:16, boxShadow:'0 32px 80px rgba(0,0,0,.25)', overflow:'hidden', display:'flex', flexDirection:'column', maxHeight:'calc(100vh - 32px)', margin:'auto' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--line)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'var(--brand-tint)', color:'var(--brand)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="clock" size={16} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:15, fontWeight:700 }}>Lançar cartão de ponto</span>
              {savedCount > 0 && (
                <span style={{ fontSize:11, fontWeight:700, background:'var(--ok,#16a34a)', color:'#fff', borderRadius:20, padding:'1px 8px' }}>
                  {savedCount} salvo{savedCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:1 }}>Registre os períodos trabalhados do dia</div>
          </div>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={15} /></button>
        </div>

        <div style={{ overflowY:'auto', flex:1, minHeight:0, padding:20, display:'flex', flexDirection:'column', gap:16 }}>
          {/* Funcionário + Data */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.6 }}>Funcionário *</label>
              <select className="field" value={empId} onChange={e => setEmpId(e.target.value)}>
                <option value="">Selecione…</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.6 }}>Data *</label>
              <input type="date" className="field" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          {/* Períodos */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.6 }}>
              Horários <span style={{ fontSize:10, fontWeight:400, textTransform:'none', letterSpacing:0 }}>— digite no formato 24h (ex: 0800, 1300, 1830)</span>
            </span>

            {periods.map((p, i) => {
              const isExtra = i >= 2;
              const label   = getPeriodLabel(p.in, i);
              const pMins   = periodsWorkedMins([p]);
              const accent  = isExtra ? '#7c3aed' : 'var(--brand)';
              return (
                <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Cabeçalho da linha */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: accent, flex: 1 }}>{label}</span>
                    {pMins > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--line)' }}>
                        {minutesToHM(pMins)}
                      </span>
                    )}
                    {isExtra && (
                      <button className="btn ghost icon sm" onClick={() => removePeriod(i)} title="Remover" style={{ width: 24, height: 24, padding: 0 }}>
                        <Icon name="x" size={11} />
                      </button>
                    )}
                  </div>
                  {/* Inputs de horário */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>Entrada</span>
                      <TimeInput24h
                        value={p.in}
                        onChange={v => updatePeriod(i, 'in', v)}
                        style={{ height: 40, fontSize: 15, fontWeight: 700 }}
                      />
                    </div>
                    <Icon name="chevron-right" size={14} style={{ color: 'var(--muted)', marginTop: 18 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>Saída</span>
                      <TimeInput24h
                        value={p.out}
                        onChange={v => updatePeriod(i, 'out', v)}
                        style={{ height: 40, fontSize: 15, fontWeight: 700 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              className="btn ghost sm"
              onClick={addPeriod}
              style={{ alignSelf:'flex-start', color:'#7c3aed', borderColor:'#7c3aed', marginTop:2 }}
            >
              <Icon name="plus" size={12} /> Período extra
            </button>
          </div>

          {/* Totalizador */}
          {totalMins > 0 && (
            <div style={{ background:'var(--surface-2)', border:'1px solid var(--line)', borderRadius:10, padding:'12px 16px', display:'flex', gap:16, flexWrap:'wrap' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                <span style={{ fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.5 }}>Total trabalhado</span>
                <span style={{ fontSize:18, fontWeight:800, color:'var(--brand)' }}>{minutesToHM(totalMins)}</span>
              </div>
              {extraMins > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.5 }}>Horas extras</span>
                  <span style={{ fontSize:18, fontWeight:800, color:'#7c3aed' }}>+{minutesToHM(extraMins)}</span>
                </div>
              )}
              {totalMins < STANDARD_MINS && (
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.5 }}>Déficit</span>
                  <span style={{ fontSize:18, fontWeight:800, color:'#dc2626' }}>-{minutesToHM(STANDARD_MINS - totalMins)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 20px', borderTop:'1px solid var(--line)', display:'flex', gap:8, justifyContent:'flex-end', alignItems:'center' }}>
          {flash && (
            <span style={{ fontSize:12, color:'var(--ok,#16a34a)', fontWeight:600, marginRight:'auto', display:'flex', alignItems:'center', gap:5 }}>
              <Icon name="check" size={13} /> Salvo! Próximo dia carregado.
            </span>
          )}
          <button className="btn ghost" onClick={onClose}>{savedCount > 0 ? 'Fechar' : 'Cancelar'}</button>
          <button className="btn" onClick={handleSaveAndContinue} disabled={saving || !hasRequired} title="Salva e avança para o próximo dia útil">
            <Icon name="save" size={13} /> Salvar e continuar
          </button>
          <button className="btn primary" onClick={handleSave} disabled={saving || !hasRequired}>
            <Icon name="check" size={13} /> {saving ? 'Salvando…' : 'Lançar e fechar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal base ────────────────────────────────────────────────
function Modal({ title, onClose, children, width = 480 }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,.45)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'clamp(8px,2vw,24px)', overflowY:'auto' }} onClick={onClose}>
      <div style={{ width:'100%', maxWidth:width, background:'var(--surface)', borderRadius:14, boxShadow:'0 24px 64px rgba(0,0,0,.22)', overflow:'hidden', maxHeight:'calc(100vh - 32px)', display:'flex', flexDirection:'column', margin:'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--line)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ flex:1, fontSize:15, fontWeight:700 }}>{title}</div>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={15} /></button>
        </div>
        <div style={{ padding:20, overflowY:'auto', flex:1, minHeight:0 }}>{children}</div>
      </div>
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:11.5, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.5 }}>{label}</label>
      {children}
    </div>
  );
}

// ── Modais ────────────────────────────────────────────────────
function FaltaModal({ employees, onClose, onSave }) {
  const [form, setForm] = useState({ employee_id:'', date:new Date().toISOString().slice(0,10), tipo:'injustificada', notes:'' });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));
  const handleSave = async () => {
    if (!form.employee_id || !form.date) return;
    setSaving(true);
    const { error } = await createTimeEntry({ employee_id:form.employee_id, date:form.date, status:'falta', tipo:form.tipo, notes:form.notes||null });
    setSaving(false);
    if (error) { alert('Erro: '+error.message); return; }
    onSave(); onClose();
  };
  return (
    <Modal title="Registrar falta" onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <FieldRow label="Funcionário *">
          <select className="field" value={form.employee_id} onChange={e => set('employee_id', e.target.value)}>
            <option value="">Selecione…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Data *"><input type="date" className="field" value={form.date} onChange={e => set('date', e.target.value)} /></FieldRow>
        <FieldRow label="Tipo">
          <div style={{ display:'flex', gap:8 }}>
            {['justificada','injustificada'].map(t => (
              <button key={t} onClick={() => set('tipo', t)} style={{ flex:1, padding:'8px 0', borderRadius:8, border:'1px solid', borderColor:form.tipo===t?'var(--brand)':'var(--line)', background:form.tipo===t?'var(--brand-tint)':'var(--surface-2)', color:form.tipo===t?'var(--brand)':'var(--muted)', fontWeight:form.tipo===t?700:400, fontSize:13, cursor:'pointer' }}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
            ))}
          </div>
        </FieldRow>
        <FieldRow label="Motivo"><textarea className="field" rows={3} value={form.notes} onChange={e => set('notes',e.target.value)} placeholder="Descreva o motivo…" style={{ resize:'vertical', minHeight:72 }} /></FieldRow>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={saving||!form.employee_id||!form.date}>{saving?'Salvando…':'Registrar falta'}</button>
        </div>
      </div>
    </Modal>
  );
}

function HoraExtraModal({ employees, onClose, onSave }) {
  const [form, setForm] = useState({ employee_id:'', date:new Date().toISOString().slice(0,10), extra_hours:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));
  const handleSave = async () => {
    if (!form.employee_id||!form.date||!form.extra_hours) return;
    setSaving(true);
    const { error } = await createTimeEntry({ employee_id:form.employee_id, date:form.date, status:'hora_extra', extra_hours:form.extra_hours, notes:form.notes||null });
    setSaving(false);
    if (error) { alert('Erro: '+error.message); return; }
    onSave(); onClose();
  };
  return (
    <Modal title="Lançar hora extra" onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <FieldRow label="Funcionário *">
          <select className="field" value={form.employee_id} onChange={e => set('employee_id', e.target.value)}>
            <option value="">Selecione…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </FieldRow>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <FieldRow label="Data *"><input type="date" className="field" value={form.date} onChange={e => set('date',e.target.value)} /></FieldRow>
          <FieldRow label="Quantidade *"><input type="text" className="field" placeholder="Ex: 2h30" value={form.extra_hours} onChange={e => set('extra_hours',e.target.value)} /></FieldRow>
        </div>
        <FieldRow label="Justificativa"><textarea className="field" rows={3} value={form.notes} onChange={e => set('notes',e.target.value)} placeholder="Motivo das horas extras…" style={{ resize:'vertical', minHeight:72 }} /></FieldRow>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={saving||!form.employee_id||!form.date||!form.extra_hours}>{saving?'Salvando…':'Lançar'}</button>
        </div>
      </div>
    </Modal>
  );
}

function AjusteModal({ employees, onClose, onSave }) {
  const [form, setForm] = useState({ employee_id:'', date:new Date().toISOString().slice(0,10), time_in:'', time_out:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));
  const handleSave = async () => {
    if (!form.employee_id||!form.date) return;
    setSaving(true);
    const { error } = await createTimeEntry({ employee_id:form.employee_id, date:form.date, time_in:form.time_in||null, time_out:form.time_out||null, status:'ajuste', notes:form.notes||null });
    setSaving(false);
    if (error) { alert('Erro: '+error.message); return; }
    onSave(); onClose();
  };
  return (
    <Modal title="Ajuste manual de ponto" onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <FieldRow label="Funcionário *">
          <select className="field" value={form.employee_id} onChange={e => set('employee_id', e.target.value)}>
            <option value="">Selecione…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Data *"><input type="date" className="field" value={form.date} onChange={e => set('date',e.target.value)} /></FieldRow>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <FieldRow label="Entrada"><TimeInput24h value={form.time_in}  onChange={v => set('time_in',  v)} /></FieldRow>
          <FieldRow label="Saída">  <TimeInput24h value={form.time_out} onChange={v => set('time_out', v)} /></FieldRow>
        </div>
        <FieldRow label="Motivo"><textarea className="field" rows={2} value={form.notes} onChange={e => set('notes',e.target.value)} placeholder="Ex: Esqueceu de registrar saída…" style={{ resize:'vertical' }} /></FieldRow>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={saving||!form.employee_id||!form.date}>{saving?'Salvando…':'Salvar ajuste'}</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Calendário ────────────────────────────────────────────────
function MonthCalendar({ ym, dayStatuses, onDayClick }) {
  const total  = daysInMonth(ym);
  const offset = firstDayOfWeek(ym);
  const cells  = Array.from({ length: Math.ceil((offset + total) / 7) * 7 });
  const [y, mo] = ym.split('-').map(Number);
  const todayDate = new Date(); todayDate.setHours(0,0,0,0);
  const [tooltip, setTooltip] = useState(null); // { lines:[], x, y }

  const counts = Object.values(dayStatuses).reduce((a, ds) => {
    const s = ds.status;
    if (s !== 'weekend' && s !== 'sem_registro') a[s] = (a[s]||0) + 1;
    return a;
  }, {});

  const buildTooltip = (ds, day) => {
    if (!ds || ds.status === 'weekend' || ds.status === 'sem_registro') return null;
    const sc = STATUS_COLOR[ds.status] || {};
    const e  = ds.entry;
    const lines = [];
    lines.push({ text: sc.label || ds.status, bold: true, color: sc.color });
    if (e?.time_in)     lines.push({ text: `Entrada: ${e.time_in.slice(0,5)}` });
    if (e?.time_out)    lines.push({ text: `Saída: ${e.time_out.slice(0,5)}` });
    if (e?.extra_hours) lines.push({ text: `H. extra: ${e.extra_hours}`, color: '#7c3aed' });
    if (e?.notes)       lines.push({ text: e.notes });
    return lines;
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
        {[['presente','Normal','var(--ok)'],['atraso','Atraso','#ca8a04'],['falta','Falta','#dc2626'],['hora_extra','Extra','#7c3aed'],['ajuste','Ajuste','#2563eb'],['compromisso','Compromisso','#ea580c']].map(([k,l,c]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--muted)' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:c, flexShrink:0 }} />
            {l} <strong style={{ color:'var(--ink)', marginLeft:2 }}>{counts[k]||0}</strong>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
        {DAYS_PT.map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:700, color:'var(--muted)', padding:'4px 0', textTransform:'uppercase', letterSpacing:0.5 }}>{d}</div>
        ))}

        {cells.map((_, i) => {
          const day = i - offset + 1;
          if (day < 1 || day > total) return <div key={i} />;

          const ds        = dayStatuses[day];
          const sc        = ds ? (STATUS_COLOR[ds.status] || {}) : {};
          const cellDate  = new Date(y, mo - 1, day); cellDate.setHours(0,0,0,0);
          const isToday   = cellDate.getTime() === todayDate.getTime();
          const isFuture  = cellDate > todayDate;
          const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
          const hasEvent  = ds && ds.status !== 'weekend' && ds.status !== 'sem_registro';
          const dotColor  = sc.color || null;
          const dateStr   = `${y}-${String(mo).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

          return (
            <div
              key={i}
              onClick={() => !isWeekend && onDayClick?.(dateStr)}
              onMouseEnter={(ev) => {
                if (isWeekend) return;
                if (!isToday) ev.currentTarget.style.background = 'var(--hover)';
                const lines = buildTooltip(ds, day);
                if (!lines) return;
                setTooltip({ lines, x: ev.clientX, y: ev.clientY });
              }}
              onMouseMove={(ev) => {
                if (tooltip) setTooltip(t => t ? { ...t, x: ev.clientX, y: ev.clientY } : null);
              }}
              onMouseLeave={(ev) => {
                if (!isToday) ev.currentTarget.style.background = sc.bg || 'var(--surface-2)';
                setTooltip(null);
              }}
              style={{
                borderRadius: 8,
                padding: '8px 4px 6px',
                textAlign: 'center',
                position: 'relative',
                background: isToday ? 'var(--brand)' : (sc.bg || 'var(--surface-2)'),
                color: isToday ? 'var(--brand-ink,#fff)' : (sc.color || 'var(--muted-2)'),
                border: isToday ? 'none' : '1px solid var(--line)',
                cursor: isWeekend ? 'default' : 'pointer',
                transition: 'background .12s',
                minHeight: 48,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 500 }}>{day}</span>
              {/* Dot */}
              {hasEvent && !isToday && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, display: 'block', flexShrink: 0 }} />
              )}
              {/* Espaço vazio para dias sem evento (mantém altura consistente) */}
              {!hasEvent && !isToday && <span style={{ width: 6, height: 6 }} />}
            </div>
          );
        })}
      </div>

      {/* Tooltip — portal direto no body para evitar interferência de transform/zoom */}
      {tooltip && createPortal(
        <div style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y - 14,
          transform: 'translate(-50%, -100%)',
          background: 'var(--surface)',
          color: 'var(--ink)',
          fontSize: 12,
          borderRadius: 8,
          padding: '8px 12px',
          pointerEvents: 'none',
          zIndex: 9999,
          whiteSpace: 'nowrap',
          boxShadow: 'var(--shadow-pop, 0 4px 24px rgba(0,0,0,.18))',
          border: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          minWidth: 120,
        }}>
          {tooltip.lines.map((l, i) => (
            <span key={i} style={{ fontWeight: l.bold ? 700 : 400, color: l.color || 'var(--ink)', fontSize: l.bold ? 12.5 : 11.5 }}>
              {l.text}
            </span>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Exportar Resumo A4 ────────────────────────────────────────
function exportResumo(title, rows, isEmployee) {
  const cols = isEmployee
    ? ['Data','Entrada','Saída','H. Trabalhadas','H. Extras','Status','Obs']
    : ['Funcionário','Presentes','Faltas','Atrasos','H. Trabalhadas','H. Extras','Ajustes'];

  const trs = rows.map(r => {
    const cells = isEmployee
      ? [fmtDate(r.date), r.time_in?.slice(0,5)||'—', r.time_out?.slice(0,5)||'—', minutesToHM(entryWorkedMins(r)), minutesToHM(Math.max(0,entryWorkedMins(r)-STANDARD_MINS)), STATUS_COLOR[r.status]?.label||r.status||'Presente', r.notes||'—']
      : [r.name, r.presenteCount, r.faltaCount, r.atrasoCount, minutesToHM(r.workedMins), minutesToHM(r.extraMins), r.ajusteCount];
    return `<tr>${cells.map(c=>`<td>${c}</td>`).join('')}</tr>`;
  }).join('');

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:12px;padding:28px;color:#111}
    h2{font-size:16px;margin-bottom:4px}
    p{font-size:11px;color:#666;margin-bottom:20px}
    table{width:100%;border-collapse:collapse}
    th{background:#f3f4f6;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;padding:8px 10px;text-align:left;border-bottom:2px solid #e5e7eb}
    td{padding:7px 10px;border-bottom:1px solid #f3f4f6;vertical-align:top}
    tr:last-child td{border-bottom:none}
    @media print{body{padding:12px}}
  </style></head><body>
  <h2>${title}</h2>
  <p>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</p>
  <table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${trs}</tbody></table>
  <script>window.onload=()=>{window.print()}<\/script>
  </body></html>`);
  win.document.close();
}

// ── Cálculo de fechamento — altere APENAS esta função para mudar a lógica ──
// Parâmetros:
//   salary         — salário base mensal (R$)
//   extraMins      — total de minutos extras no período
//   overtimePercent — adicional sobre o valor da hora (ex: 50 = 50%)
//   workloadHours  — divisor mensal para obter valor/hora (CLT padrão = 220h)
//   discounts      — array de { label, value } com descontos manuais
function calcFechamento({ salary, extraMins, overtimePercent, workloadHours = 220, discounts = [] }) {
  const hourlyRate   = salary / workloadHours;
  const extraHours   = extraMins / 60;
  const extraValue   = hourlyRate * extraHours * (1 + overtimePercent / 100);
  const totalDisc    = discounts.reduce((s, d) => s + (Number(d.value) || 0), 0);
  return { hourlyRate, extraValue, totalDisc, total: salary + extraValue - totalDisc };
}

// ── Tela principal ────────────────────────────────────────────
const TABS = [
  { id:'jornada',    label:'Jornada',       icon:'clock'     },
  { id:'extras',     label:'Horas extras',  icon:'sparkle'   },
  { id:'faltas',     label:'Faltas',        icon:'alert'     },
  { id:'banco',      label:'Banco de horas',icon:'chart'     },
  { id:'resumo',     label:'Resumo',        icon:'dashboard' },
  { id:'fechamento', label:'Fechamento',    icon:'doc'       },
];

const NEW_ACTIONS = [
  { id:'cartao', label:'Lançar cartão de ponto', icon:'clock'   },
  { id:'falta',  label:'Registrar falta',        icon:'alert'   },
  { id:'extra',  label:'Lançar hora extra',       icon:'sparkle' },
  { id:'ajuste', label:'Ajuste manual de ponto',  icon:'edit'    },
];

// ── EmpDropdown ───────────────────────────────────────────────
function EmpDropdown({ employees, value, onChange, loading, placeholder = 'Todos os funcionários' }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const triggerRef = useRef();
  const panelRef   = useRef();
  const selected   = employees.find(e => e.id === value);

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (!panelRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target))
        setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => { if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect()); };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [open]);

  const handleToggle = () => {
    if (!open) setRect(triggerRef.current?.getBoundingClientRect());
    setOpen(o => !o);
  };

  const pick = (id) => { onChange(id); setOpen(false); };

  const trigBtn = {
    display: 'flex', alignItems: 'center', gap: 8,
    height: 36, padding: '0 12px', borderRadius: 8,
    border: '1px solid var(--line)', background: 'var(--surface-2)',
    color: 'var(--ink)', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', minWidth: 180, maxWidth: 280,
    transition: 'border-color .12s, background .12s',
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        disabled={loading}
        style={{ ...trigBtn, borderColor: open ? 'var(--brand)' : 'var(--line)' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = 'var(--muted-2)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = 'var(--line)'; }}
      >
        {selected
          ? <Avatar name={selected.name} hue={selected.hue ?? 215} size={22} />
          : <Icon name="user" size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        }
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.name : placeholder}
        </span>
        <Icon name="chevron-down" size={12} style={{ color: 'var(--muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {open && rect && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed', top: rect.bottom + 4, left: rect.left,
            minWidth: Math.max(rect.width, 240), maxWidth: 320,
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,.16)',
            zIndex: 1200, overflow: 'hidden',
          }}
        >
          {/* "Todos" option */}
          <button
            onClick={() => pick('')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '10px 14px', border: 'none',
              background: !value ? 'var(--brand-tint)' : 'transparent',
              color: !value ? 'var(--brand)' : 'var(--ink)',
              fontSize: 13, fontWeight: !value ? 700 : 500, cursor: 'pointer', textAlign: 'left',
            }}
            onMouseEnter={e => { if (value) e.currentTarget.style.background = 'var(--hover)'; }}
            onMouseLeave={e => { if (value) e.currentTarget.style.background = 'transparent'; }}
          >
            <Icon name="user" size={15} style={{ color: !value ? 'var(--brand)' : 'var(--muted)', flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{placeholder}</span>
            {!value && <Icon name="check" size={13} style={{ color: 'var(--brand)' }} />}
          </button>

          {employees.length > 0 && <div style={{ height: 1, background: 'var(--line)', margin: '2px 0' }} />}

          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {employees.map(emp => {
              const active = value === emp.id;
              return (
                <button
                  key={emp.id}
                  onClick={() => pick(emp.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '8px 14px', border: 'none',
                    background: active ? 'var(--brand-tint)' : 'transparent',
                    color: 'var(--ink)', fontSize: 13, cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--hover)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Avatar name={emp.name} hue={emp.hue ?? 215} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: active ? 700 : 500, fontSize: 13, color: active ? 'var(--brand)' : 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                    {emp.dept && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{emp.dept}</div>}
                  </div>
                  {active && <Icon name="check" size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── DateDropdown ──────────────────────────────────────────────
function DateDropdown({ value, onChange }) {
  const [open, setOpen]       = useState(false);
  const [rect, setRect]       = useState(null);
  const [viewYM, setViewYM]   = useState(() => value.slice(0, 7));
  const triggerRef = useRef();
  const panelRef   = useRef();

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (!panelRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target))
        setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => { if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect()); };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [open]);

  const handleToggle = () => {
    if (!open) {
      setRect(triggerRef.current?.getBoundingClientRect());
      setViewYM(value.slice(0, 7));
    }
    setOpen(o => !o);
  };

  const prevMonth = () => {
    const [y, m] = viewYM.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setViewYM(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const [y, m] = viewYM.split('-').map(Number);
    const d = new Date(y, m, 1);
    setViewYM(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const pick = (day) => {
    onChange(`${viewYM}-${String(day).padStart(2, '0')}`);
    setOpen(false);
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const [vy, vm] = viewYM.split('-').map(Number);
  const totalDays = new Date(vy, vm, 0).getDate();
  const firstDow  = new Date(vy, vm - 1, 1).getDay();

  const fmtDateShort = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const trigBtn = {
    display: 'flex', alignItems: 'center', gap: 8,
    height: 34, padding: '0 10px', borderRadius: 7,
    border: '1px solid var(--line)', background: 'var(--surface-2)',
    color: 'var(--ink)', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', whiteSpace: 'nowrap', width: 140,
    transition: 'border-color .12s',
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        style={{ ...trigBtn, borderColor: open ? 'var(--brand)' : 'var(--line)' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = 'var(--muted-2)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = 'var(--line)'; }}
      >
        <Icon name="calendar" size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: 'left' }}>{fmtDateShort(value)}</span>
        <Icon name="chevron-down" size={11} style={{ color: 'var(--muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {open && rect && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed', top: rect.bottom + 4, left: rect.left,
            width: 248,
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,.16)',
            zIndex: 1200, padding: '12px 12px 10px',
          }}
        >
          {/* Month/year header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button onClick={prevMonth} style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', color: 'var(--muted)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Icon name="chevron-left" size={13} />
            </button>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
              {MONTHS_PT[vm - 1]} {vy}
            </span>
            <button onClick={nextMonth} style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', color: 'var(--muted)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Icon name="chevron-right" size={13} />
            </button>
          </div>

          {/* Day-of-week labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
            {DAYS_PT.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', padding: '2px 0' }}>{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
              const iso = `${viewYM}-${String(day).padStart(2, '0')}`;
              const isSelected = iso === value;
              const isToday    = iso === todayStr;
              return (
                <button
                  key={day}
                  onClick={() => pick(day)}
                  style={{
                    height: 30, borderRadius: 6, border: 'none',
                    background: isSelected ? 'var(--brand)' : 'transparent',
                    color: isSelected ? '#fff' : isToday ? 'var(--brand)' : 'var(--ink)',
                    fontWeight: isSelected || isToday ? 700 : 400,
                    fontSize: 12.5, cursor: 'pointer',
                    outline: isToday && !isSelected ? '2px solid var(--brand)' : 'none',
                    outlineOffset: -2,
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--hover)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── MonthDropdown ─────────────────────────────────────────────
function MonthDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const [viewYear, setViewYear] = useState(() => parseInt(value.split('-')[0]));
  const triggerRef = useRef();
  const panelRef   = useRef();

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (!panelRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target))
        setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => { if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect()); };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [open]);

  const handleToggle = () => {
    if (!open) {
      setRect(triggerRef.current?.getBoundingClientRect());
      setViewYear(parseInt(value.split('-')[0]));
    }
    setOpen(o => !o);
  };

  const pick = (monthIdx) => {
    onChange(`${viewYear}-${String(monthIdx + 1).padStart(2, '0')}`);
    setOpen(false);
  };

  const [selYear, selMonth] = value.split('-').map(Number);

  const trigBtn = {
    display: 'flex', alignItems: 'center', gap: 8,
    height: 36, padding: '0 12px', borderRadius: 8,
    border: '1px solid var(--line)', background: 'var(--surface-2)',
    color: 'var(--ink)', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', whiteSpace: 'nowrap',
    transition: 'border-color .12s, background .12s',
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        style={{ ...trigBtn, borderColor: open ? 'var(--brand)' : 'var(--line)' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = 'var(--muted-2)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = 'var(--line)'; }}
      >
        <Icon name="history" size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        <span>{fmtMonth(value)}</span>
        <Icon name="chevron-down" size={12} style={{ color: 'var(--muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {open && rect && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed', top: rect.bottom + 4, left: rect.left,
            width: 240,
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,.16)',
            zIndex: 1200, padding: '12px 14px',
          }}
        >
          {/* Year navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button
              onClick={() => setViewYear(y => y - 1)}
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', color: 'var(--muted)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Icon name="chevron-left" size={14} />
            </button>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{viewYear}</span>
            <button
              onClick={() => setViewYear(y => y + 1)}
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer', color: 'var(--muted)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Icon name="chevron-right" size={14} />
            </button>
          </div>

          {/* Month grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            {MONTHS_PT.map((m, i) => {
              const isSelected = viewYear === selYear && i + 1 === selMonth;
              return (
                <button
                  key={m}
                  onClick={() => pick(i)}
                  style={{
                    padding: '7px 4px', borderRadius: 7, border: 'none',
                    background: isSelected ? 'var(--brand)' : 'transparent',
                    color: isSelected ? '#fff' : 'var(--ink)',
                    fontSize: 12.5, fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer', textAlign: 'center',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--hover)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {m.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export function TimeScreen({ addToast, activeCompany }) {
  const { employees, loading:empLoading } = useEmployees({ companyId: activeCompany?.id });
  const [tab,     setTab]     = useState('jornada');
  const [empId,   setEmpId]   = useState('');
  const [month,   setMonth]   = useState(new Date().toISOString().slice(0,7));
  const [modal,        setModal]        = useState(null);
  const [comprDate,    setComprDate]    = useState(null);
  const [menuOpen,setMenuOpen]= useState(false);
  const menuRef = useRef();

  const { entries, loading:entLoading, refetch } = useMonthEntries(empId||null, month);
  const selectedEmp  = employees.find(e => e.id === empId);
  const dayStatuses  = empId ? buildDayStatuses(entries, month) : {};
  const stats        = computeStats(entries);

  // Dias úteis do mês
  const workDays = (() => {
    const total = daysInMonth(month);
    const [y,m] = month.split('-').map(Number);
    let c = 0;
    for (let d=1; d<=total; d++) { const dow = new Date(y,m-1,d).getDay(); if(dow!==0&&dow!==6) c++; }
    return c;
  })();

  useEffect(() => {
    const h = (e) => { if(menuRef.current&&!menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSaved = useCallback(() => { refetch(); addToast({ kind:'ok', msg:'Registro salvo com sucesso.' }); }, [refetch, addToast]);

  // Dados por tab
  const faltaRows = entries.filter(e => e.status==='falta');
  const extraRows = entries.filter(e => e.status==='hora_extra' || (entryWorkedMins(e) > STANDARD_MINS));

  // Banco: agrupa por funcionário
  const bancoRows = useMemo(() => {
    const empMap = {};
    entries.forEach(e => {
      const key  = e.employee_id;
      const name = e.employees?.name || key;
      if (!empMap[key]) empMap[key] = { name, employee_id:key, hue:e.employees?.hue, entries:[] };
      empMap[key].entries.push(e);
    });
    return Object.values(empMap).map(r => ({ ...r, ...computeStats(r.entries) }));
  }, [entries]);

  // Resumo: por funcionário ou por dia se funcionário selecionado
  const resumoIsEmployee = !!empId;
  const resumoRows = resumoIsEmployee
    ? entries
    : bancoRows;

  return (
    <>
    <style>{`
      .time-tabs { display:flex; overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; border-bottom:1px solid var(--line); }
      .time-tabs::-webkit-scrollbar { display:none; }
      .time-kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
      .time-ent-table { display:block; }
      .time-ent-cards { display:none; flex-direction:column; gap:10px; padding:12px; }
      .time-card { background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:12px 14px; }
      .time-card-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid var(--line-soft); flex-wrap:wrap; }
      .time-card-title { font-size:13.5px; font-weight:600; color:var(--ink); }
      .time-card-date { font-size:12px; color:var(--muted); font-family:monospace; }
      .time-card-row { display:flex; justify-content:space-between; align-items:center; padding:3px 0; gap:8px; }
      .time-card-lbl { font-size:11.5px; color:var(--muted); }
      .time-card-val { font-size:12.5px; color:var(--ink-soft); text-align:right; }
      @media (max-width:768px) {
        .time-kpi-grid { grid-template-columns:repeat(2,1fr); gap:10px; }
        .time-ent-table { display:none !important; }
        .time-ent-cards { display:flex; }
      }
    `}</style>
    <div className="fade-up" style={{ padding:24, display:'flex', flexDirection:'column', gap:18 }}>
      <TutorialBanner screenKey="time" />
      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
        <div style={{ flex:1 }}>
          <h1 style={{ margin:'0 0 4px', fontSize:22, fontWeight:700, letterSpacing:-0.4 }}>Controle de ponto</h1>
          <p style={{ margin:0, fontSize:13, color:'var(--muted)' }}>Jornada, faltas, horas extras e banco em um único lugar.</p>
        </div>
        <div ref={menuRef} style={{ position:'relative' }}>
          <button className="btn primary" onClick={() => setMenuOpen(o=>!o)}>
            <Icon name="plus" size={14} /> Novo <Icon name="chevron-down" size={12} />
          </button>
          {menuOpen && (
            <div style={{ position:'absolute', top:'100%', right:0, marginTop:6, background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,.14)', minWidth:220, zIndex:100, overflow:'hidden' }}>
              {NEW_ACTIONS.map(a => (
                <button key={a.id} onClick={() => { setMenuOpen(false); setModal(a.id); }} style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'11px 14px', border:'none', background:'transparent', cursor:'pointer', fontSize:13.5, color:'var(--ink)', textAlign:'left' }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--hover)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <Icon name={a.icon} size={15} style={{ color:'var(--brand)' }} />{a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Filtros ── */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', padding:'12px 16px', background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, alignItems:'center' }}>
        <EmpDropdown employees={employees} value={empId} onChange={setEmpId} loading={empLoading} />
        <div style={{ width:1, height:24, background:'var(--line)', margin:'0 2px' }} />
        <MonthDropdown value={month} onChange={setMonth} />
        {empId && selectedEmp && (
          <>
            <div style={{ width:1, height:24, background:'var(--line)', margin:'0 2px' }} />
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Avatar name={selectedEmp.name} hue={selectedEmp.hue} size={28} />
              <div>
                <div style={{ fontSize:13, fontWeight:600, lineHeight:1.1 }}>{selectedEmp.name}</div>
                <div style={{ fontSize:11, color:'var(--muted)' }}>{selectedEmp.role}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── KPIs ── */}
      <div className="time-kpi-grid">
        {[
          { label:'Horas trabalhadas', value:minutesToHM(stats.workedMins),  icon:'clock',   color:'var(--brand)'                                  },
          { label:'Horas extras',      value:minutesToHM(stats.extraMins),   icon:'sparkle', color:stats.extraMins>0  ? '#7c3aed' : 'var(--muted)' },
          { label:'Faltas no mês',     value:stats.faltaCount,               icon:'alert',   color:stats.faltaCount>0 ? '#dc2626' : 'var(--muted)' },
          { label:'Atrasos no mês',    value:stats.atrasoCount,              icon:'history', color:stats.atrasoCount>0? '#ca8a04' : 'var(--muted)' },
        ].map((k,i) => (
          <div key={i} style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:'14px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
              <Icon name={k.icon} size={13} style={{ color:k.color }} />
              <span style={{ fontSize:11, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.5 }}>{k.label}</span>
            </div>
            <div style={{ fontSize:22, fontWeight:800, color:k.color, letterSpacing:-0.5 }}>{k.value}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{fmtMonth(month)}</div>
          </div>
        ))}
      </div>

      {/* ── Lançamento rápido ── */}
      <QuickEntry employees={employees} defaultEmpId={empId} onSaved={refetch} />

      {/* ── Tabs ── */}
      <div className="time-tabs">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', border:'none', background:'transparent', fontSize:13, fontWeight:tab===t.id?700:500, color:tab===t.id?'var(--brand)':'var(--muted)', borderBottom:`2px solid ${tab===t.id?'var(--brand)':'transparent'}`, marginBottom:-1, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
            <Icon name={t.icon} size={13} />{t.label}
          </button>
        ))}
      </div>

      {/* ── Jornada ── */}
      {tab==='jornada' && (
        <div style={{ display:'grid', gridTemplateColumns:empId?'1fr 340px':'1fr', gap:16, alignItems:'start' }}>
          {empId ? (
            <>
              <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <h3 style={{ margin:0, fontSize:14, fontWeight:700 }}>{fmtMonth(month)}</h3>
                  {entLoading && <span style={{ fontSize:12, color:'var(--muted)' }} className="pulse">Carregando…</span>}
                </div>
                <MonthCalendar ym={month} dayStatuses={dayStatuses} onDayClick={d => setComprDate(d)} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>Resumo do mês</div>
                  {[
                    { l:'Dias úteis',          v:`${workDays}d` },
                    { l:'Dias com registro',   v:`${stats.presenteCount}d` },
                    { l:'Faltas',              v:`${stats.faltaCount}d`,    warn:stats.faltaCount>0  },
                    { l:'Atrasos',             v:`${stats.atrasoCount}x`,   warn:stats.atrasoCount>0 },
                    { l:'Horas trabalhadas',   v:minutesToHM(stats.workedMins) },
                    { l:'Horas extras (auto)', v:minutesToHM(stats.extraMins), hi:stats.extraMins>0  },
                    { l:'Ajustes manuais',     v:`${stats.ajusteCount}x` },
                  ].map((r,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:i<6?'1px solid var(--line-soft)':'none' }}>
                      <span style={{ fontSize:13, color:'var(--muted)' }}>{r.l}</span>
                      <span style={{ fontSize:13, fontWeight:600, color:r.warn?'#dc2626':r.hi?'#7c3aed':'var(--ink)' }}>{r.v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>Ações rápidas</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {NEW_ACTIONS.map(a => (
                      <button key={a.id} className="btn" style={{ justifyContent:'flex-start', gap:8, ...(a.id==='cartao'?{background:'var(--brand-tint)',color:'var(--brand)',borderColor:'var(--brand)'}:{}) }} onClick={() => setModal(a.id)}>
                        <Icon name={a.icon} size={13} style={{ color: a.id==='cartao' ? 'var(--brand)' : 'var(--brand)' }} />{a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <EntriesTable entries={entries} loading={entLoading} showEmployee emptyMsg="Selecione um funcionário ou veja todos os registros do mês." />
          )}
        </div>
      )}

      {/* ── Faltas ── */}
      {tab==='faltas' && (
        <EntriesTable entries={faltaRows} loading={entLoading} showEmployee={!empId}
          columns={[
            !empId && { key:'emp',   label:'Funcionário', render:r => r.employees?.name||'—' },
            { key:'date',  label:'Data',       render:r => fmtDate(r.date) },
            { key:'tipo',  label:'Tipo',        render:r => r.tipo ? r.tipo.charAt(0).toUpperCase()+r.tipo.slice(1) : '—' },
            { key:'notes', label:'Motivo',      render:r => r.notes||'—' },
          ].filter(Boolean)}
          emptyMsg="Nenhuma falta registrada neste período."
        />
      )}

      {/* ── Horas extras ── */}
      {tab==='extras' && (
        <EntriesTable entries={extraRows} loading={entLoading} showEmployee={!empId}
          columns={[
            !empId && { key:'emp',         label:'Funcionário',  render:r => r.employees?.name||'—' },
            { key:'date',        label:'Data',          render:r => fmtDate(r.date) },
            { key:'time_range',  label:'Batidas',       render:r => r.time_in ? `${r.time_in.slice(0,5)} → ${r.time_out?.slice(0,5)||'?'}` : '—' },
            { key:'extra_calc',  label:'H. extras (auto)', render:r => {
              const w = entryWorkedMins(r);
              const ex = r.status==='hora_extra' ? parseExtraHoursToMins(r.extra_hours) : Math.max(0, w - STANDARD_MINS);
              return ex > 0 ? <span style={{ color:'#7c3aed', fontWeight:600 }}>{minutesToHM(ex)}</span> : '—';
            }},
            { key:'notes',       label:'Justificativa', render:r => r.notes||'—' },
          ].filter(Boolean)}
          emptyMsg="Nenhuma hora extra neste período."
        />
      )}

      {/* ── Banco de horas ── */}
      {tab==='banco' && (
        <BancoTable rows={bancoRows} loading={entLoading} />
      )}

      {/* ── Resumo (exportável) ── */}
      {tab==='resumo' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Toolbar do resumo */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:13, color:'var(--muted)' }}>
                {resumoIsEmployee
                  ? `${entries.length} registros para ${selectedEmp?.name} em ${fmtMonth(month)}`
                  : `${bancoRows.length} funcionários com registros em ${fmtMonth(month)}`}
              </span>
            </div>
            <button
              className="btn"
              onClick={() => exportResumo(`Resumo de Ponto — ${fmtMonth(month)}${selectedEmp ? ' — '+selectedEmp.name : ''}`, resumoRows, resumoIsEmployee)}
              disabled={resumoRows.length===0}
            >
              <Icon name="download" size={13} /> Exportar A4
            </button>
          </div>

          {/* Cards resumo geral (só quando sem funcionário selecionado) */}
          {!empId && bancoRows.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10 }}>
              {[
                { l:'Total presentes',    v:bancoRows.reduce((s,r)=>s+r.presenteCount,0)+'d',    color:'var(--ok)'    },
                { l:'Total faltas',       v:bancoRows.reduce((s,r)=>s+r.faltaCount,0)+'d',       color:'#dc2626'      },
                { l:'Total h. extras',    v:minutesToHM(bancoRows.reduce((s,r)=>s+r.extraMins,0)), color:'#7c3aed'   },
                { l:'Total h. trabalhadas',v:minutesToHM(bancoRows.reduce((s,r)=>s+r.workedMins,0)), color:'var(--brand)' },
              ].map((c,i) => (
                <div key={i} style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, padding:'12px 16px' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>{c.l}</div>
                  <div style={{ fontSize:20, fontWeight:800, color:c.color }}>{c.v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tabela resumo */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, overflow:'hidden' }}>
            {entLoading ? (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:500 }}>
                  <thead>
                    <tr style={{ background:'var(--surface-2)', color:'var(--muted)', fontSize:11, textTransform:'uppercase', letterSpacing:0.5 }}>
                      {(resumoIsEmployee
                        ? ['Data','Entrada','Saída','H. Trabalhadas','H. Extras','Status','Obs']
                        : ['Funcionário','Presentes','Faltas','Atrasos','H. Trabalhadas','H. Extras','Ajustes']
                      ).map(h => (
                        <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 6 }, (_, i) => (
                      <tr key={i} style={{ borderTop:'1px solid var(--line-soft)' }}>
                        {Array.from({ length: 7 }, (__, j) => (
                          <td key={j} style={{ padding:'10px 18px' }}>
                            <Skeleton height={11} style={{ maxWidth: j === 0 ? 110 : 70 }} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
            : resumoRows.length===0 ? <EmptyState icon="dashboard" msg="Nenhum registro encontrado para este período." />
            : resumoIsEmployee ? (
              /* Detalhe dia a dia para funcionário selecionado */
              <>
                <div className="time-ent-table" style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:500 }}>
                    <thead>
                      <tr style={{ background:'var(--surface-2)', color:'var(--muted)', fontSize:11, textTransform:'uppercase', letterSpacing:0.5 }}>
                        {['Data','Entrada','Saída','H. Trabalhadas','H. Extras','Status','Obs'].map(h => (
                          <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resumoRows.map(r => {
                        const w  = entryWorkedMins(r);
                        const ex = r.status==='hora_extra' ? parseExtraHoursToMins(r.extra_hours) : Math.max(0, w - STANDARD_MINS);
                        const sc = STATUS_COLOR[r.status] || STATUS_COLOR.presente;
                        return (
                          <tr key={r.id} style={{ borderTop:'1px solid var(--line-soft)' }}
                            onMouseEnter={e => e.currentTarget.style.background='var(--hover)'}
                            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                            <td style={{ padding:'10px 18px', fontWeight:500 }}>{fmtDate(r.date)}</td>
                            <td style={{ padding:'10px 18px', fontFamily:'monospace', color:'var(--muted)' }}>{r.time_in?.slice(0,5)||'—'}</td>
                            <td style={{ padding:'10px 18px', fontFamily:'monospace', color:'var(--muted)' }}>{r.time_out?.slice(0,5)||'—'}</td>
                            <td style={{ padding:'10px 18px', fontFamily:'monospace' }}>{w>0?minutesToHM(w):'—'}</td>
                            <td style={{ padding:'10px 18px' }}>{ex>0?<span style={{ color:'#7c3aed', fontWeight:600 }}>{minutesToHM(ex)}</span>:'—'}</td>
                            <td style={{ padding:'10px 18px' }}><span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color:sc.color, background:sc.bg, padding:'2px 8px', borderRadius:20 }}>{sc.label||r.status}</span></td>
                            <td style={{ padding:'10px 18px', color:'var(--muted)', fontSize:12 }}>{r.notes||'—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="time-ent-cards">
                  {resumoRows.map(r => {
                    const w  = entryWorkedMins(r);
                    const ex = r.status==='hora_extra' ? parseExtraHoursToMins(r.extra_hours) : Math.max(0, w - STANDARD_MINS);
                    const sc = STATUS_COLOR[r.status] || STATUS_COLOR.presente;
                    return (
                      <div key={r.id} className="time-card">
                        <div className="time-card-head">
                          <span className="time-card-title">{fmtDate(r.date)}</span>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color:sc.color, background:sc.bg, padding:'2px 8px', borderRadius:20 }}>{sc.label||r.status}</span>
                        </div>
                        <div className="time-card-row">
                          <span className="time-card-lbl">Entrada / Saída</span>
                          <span className="time-card-val" style={{ fontFamily:'monospace' }}>{r.time_in?.slice(0,5)||'—'} → {r.time_out?.slice(0,5)||'—'}</span>
                        </div>
                        <div className="time-card-row">
                          <span className="time-card-lbl">H. Trabalhadas</span>
                          <span className="time-card-val" style={{ fontFamily:'monospace' }}>{w>0?minutesToHM(w):'—'}</span>
                        </div>
                        {ex>0 && (
                          <div className="time-card-row">
                            <span className="time-card-lbl">H. Extras</span>
                            <span className="time-card-val" style={{ color:'#7c3aed', fontWeight:600 }}>{minutesToHM(ex)}</span>
                          </div>
                        )}
                        {r.notes && (
                          <div className="time-card-row">
                            <span className="time-card-lbl">Obs.</span>
                            <span className="time-card-val">{r.notes}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Resumo por funcionário */
              <>
                <div className="time-ent-table" style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:500 }}>
                    <thead>
                      <tr style={{ background:'var(--surface-2)', color:'var(--muted)', fontSize:11, textTransform:'uppercase', letterSpacing:0.5 }}>
                        {['Funcionário','Presentes','Faltas','Atrasos','H. Trabalhadas','H. Extras','Ajustes'].map(h => (
                          <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resumoRows.map((r,i) => (
                        <tr key={i} style={{ borderTop:'1px solid var(--line-soft)' }}
                          onMouseEnter={e => e.currentTarget.style.background='var(--hover)'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <td style={{ padding:'10px 18px', fontWeight:500 }}>{r.name}</td>
                          <td style={{ padding:'10px 18px', color:'var(--muted)' }}>{r.presenteCount}d</td>
                          <td style={{ padding:'10px 18px' }}>{r.faltaCount>0?<span className="pill bad" style={{ fontSize:11 }}>{r.faltaCount}d</span>:<span style={{ color:'var(--muted)' }}>—</span>}</td>
                          <td style={{ padding:'10px 18px' }}>{r.atrasoCount>0?<span className="pill warn" style={{ fontSize:11 }}>{r.atrasoCount}x</span>:<span style={{ color:'var(--muted)' }}>—</span>}</td>
                          <td style={{ padding:'10px 18px', fontFamily:'monospace' }}>{minutesToHM(r.workedMins)}</td>
                          <td style={{ padding:'10px 18px' }}>{r.extraMins>0?<span style={{ color:'#7c3aed', fontWeight:600 }}>{minutesToHM(r.extraMins)}</span>:<span style={{ color:'var(--muted)' }}>—</span>}</td>
                          <td style={{ padding:'10px 18px', color:'var(--muted)' }}>{r.ajusteCount>0?r.ajusteCount:'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="time-ent-cards">
                  {resumoRows.map((r,i) => (
                    <div key={i} className="time-card">
                      <div className="time-card-head">
                        <span className="time-card-title">{r.name}</span>
                        <span style={{ fontSize:11, color:'var(--muted)' }}>{r.presenteCount}d presentes</span>
                      </div>
                      <div className="time-card-row">
                        <span className="time-card-lbl">Faltas</span>
                        <span className="time-card-val">{r.faltaCount>0?<span className="pill bad" style={{ fontSize:11 }}>{r.faltaCount}d</span>:'—'}</span>
                      </div>
                      <div className="time-card-row">
                        <span className="time-card-lbl">Atrasos</span>
                        <span className="time-card-val">{r.atrasoCount>0?<span className="pill warn" style={{ fontSize:11 }}>{r.atrasoCount}x</span>:'—'}</span>
                      </div>
                      <div className="time-card-row">
                        <span className="time-card-lbl">H. Trabalhadas</span>
                        <span className="time-card-val" style={{ fontFamily:'monospace' }}>{minutesToHM(r.workedMins)}</span>
                      </div>
                      <div className="time-card-row">
                        <span className="time-card-lbl">H. Extras</span>
                        <span className="time-card-val">{r.extraMins>0?<span style={{ color:'#7c3aed', fontWeight:600 }}>{minutesToHM(r.extraMins)}</span>:'—'}</span>
                      </div>
                      {r.ajusteCount>0 && (
                        <div className="time-card-row">
                          <span className="time-card-lbl">Ajustes</span>
                          <span className="time-card-val">{r.ajusteCount}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Fechamento ── */}
      {tab==='fechamento' && (
        <FechamentoTab
          selectedEmp={selectedEmp}
          employees={employees}
          empId={empId}
          setEmpId={setEmpId}
          month={month}
          setMonth={setMonth}
          extraMins={stats.extraMins}
          workDays={workDays}
        />
      )}

    </div>

    {modal==='cartao' && <CartaoModal    employees={employees} onClose={() => setModal(null)} onSave={handleSaved} />}
    {modal==='falta'  && <FaltaModal     employees={employees} onClose={() => setModal(null)} onSave={handleSaved} />}
    {modal==='extra'  && <HoraExtraModal employees={employees} onClose={() => setModal(null)} onSave={handleSaved} />}
    {modal==='ajuste' && <AjusteModal    employees={employees} onClose={() => setModal(null)} onSave={handleSaved} />}
    {comprDate && (
      <ComprometimentoModal
        date={comprDate}
        empId={empId}
        employees={employees}
        onClose={() => setComprDate(null)}
        onSave={handleSaved}
      />
    )}
    </>
  );
}

// ── Calculadora de Fechamento ─────────────────────────────────
function FechamentoTab({ selectedEmp, employees, empId, setEmpId, month, setMonth, extraMins, workDays }) {
  const [overtimePercent, setOvertimePercent] = useState(50);
  const [workloadHours,   setWorkloadHours]   = useState(220);
  const [discounts,       setDiscounts]       = useState([]);
  const [discLabel,       setDiscLabel]       = useState('');
  const [discValue,       setDiscValue]       = useState('');

  const salary = selectedEmp?.salary ? Number(selectedEmp.salary) : null;
  const result = salary != null ? calcFechamento({ salary, extraMins, overtimePercent, workloadHours, discounts }) : null;

  function addDiscount() {
    if (!discLabel.trim() || !discValue) return;
    setDiscounts(d => [...d, { id: Date.now(), label: discLabel.trim(), value: Number(discValue) }]);
    setDiscLabel(''); setDiscValue('');
  }

  function removeDiscount(id) {
    setDiscounts(d => d.filter(x => x.id !== id));
  }

  function exportPDF() {
    if (!result || !selectedEmp) return;
    const brl = v => v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
    const bonus = result.extraValue + (result.total - salary - result.extraValue + result.totalDisc > 0 ? 0 : 0);
    const bonusTotal = result.extraValue - result.totalDisc;
    const mesAno = fmtMonth(month);
    const empresa = selectedEmp.company || 'Empresa';
    const emitidoEm = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="utf-8">
<title>Reconhecimento — ${selectedEmp.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 210mm; min-height: 297mm; background: #fff; }
  body {
    font-family: 'Inter', Arial, sans-serif;
    color: #1a1a2e;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 0;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  /* Barra de topo */
  .top-bar {
    background: linear-gradient(135deg, #1e40af 0%, #3b82f6 60%, #06b6d4 100%);
    height: 10px;
    width: 100%;
  }

  /* Decoração geométrica fundo */
  .bg-circle-1 {
    position: absolute;
    width: 420px; height: 420px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%);
    top: -80px; right: -80px;
    pointer-events: none;
  }
  .bg-circle-2 {
    position: absolute;
    width: 300px; height: 300px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%);
    bottom: 60px; left: -60px;
    pointer-events: none;
  }

  .content {
    flex: 1;
    padding: 48px 56px 40px;
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
    z-index: 1;
  }

  /* Cabeçalho */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 40px;
  }
  .header-company {
    font-size: 13px;
    font-weight: 700;
    color: #1e40af;
    letter-spacing: 1.2px;
    text-transform: uppercase;
  }
  .header-ref {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 3px;
  }
  .badge {
    background: linear-gradient(135deg, #1e40af, #3b82f6);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 5px 14px;
    border-radius: 20px;
  }

  /* Estrela / ícone central */
  .icon-wrap {
    display: flex;
    justify-content: center;
    margin-bottom: 28px;
  }
  .icon-star {
    width: 64px; height: 64px;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    border-radius: 20px;
    display: flex; align-items: center; justify-content: center;
    font-size: 32px;
    box-shadow: 0 8px 24px rgba(251,191,36,.35);
  }

  /* Título */
  .title-block { text-align: center; margin-bottom: 32px; }
  .title-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 8px;
  }
  .title-main {
    font-size: 32px;
    font-weight: 800;
    color: #1a1a2e;
    line-height: 1.1;
    letter-spacing: -0.5px;
  }
  .title-main span { color: #2563eb; }

  /* Texto de congratulações */
  .congrats {
    background: linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%);
    border: 1px solid #bfdbfe;
    border-radius: 14px;
    padding: 24px 28px;
    text-align: center;
    margin-bottom: 32px;
  }
  .congrats p {
    font-size: 14.5px;
    line-height: 1.75;
    color: #334155;
  }
  .congrats strong { color: #1e40af; font-weight: 700; }

  /* Card de valor */
  .value-card {
    background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%);
    border-radius: 16px;
    padding: 28px 36px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 36px;
    box-shadow: 0 12px 32px rgba(37,99,235,.25);
    color: #fff;
  }
  .value-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    opacity: .75;
    margin-bottom: 6px;
  }
  .value-name {
    font-size: 18px;
    font-weight: 700;
    line-height: 1.2;
  }
  .value-role {
    font-size: 12px;
    opacity: .7;
    margin-top: 3px;
  }
  .value-amount {
    text-align: right;
  }
  .value-amount .amount {
    font-size: 34px;
    font-weight: 800;
    letter-spacing: -1px;
    line-height: 1;
  }
  .value-amount .period {
    font-size: 11px;
    opacity: .65;
    margin-top: 4px;
  }

  /* Linha divisória decorativa */
  .divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 36px;
    color: #cbd5e1;
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .divider::before, .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
  }

  /* Assinatura */
  .signature-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin-top: auto;
    padding-top: 8px;
  }
  .sig-box { }
  .sig-line {
    border-top: 1.5px solid #94a3b8;
    margin-bottom: 8px;
    padding-top: 8px;
  }
  .sig-label {
    font-size: 11px;
    color: #64748b;
    font-weight: 500;
  }
  .sig-name {
    font-size: 12px;
    color: #1a1a2e;
    font-weight: 600;
    margin-top: 2px;
  }
  .sig-role {
    font-size: 10.5px;
    color: #94a3b8;
    margin-top: 1px;
  }

  /* Rodapé */
  .footer {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .footer-left { font-size: 10px; color: #94a3b8; }
  .footer-right { font-size: 10px; color: #94a3b8; text-align: right; }

  @media print {
    html, body { width: 210mm; height: 297mm; }
    .page { page-break-after: avoid; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="top-bar"></div>
  <div class="bg-circle-1"></div>
  <div class="bg-circle-2"></div>

  <div class="content">
    <!-- Cabeçalho -->
    <div class="header">
      <div>
        <div class="header-company">${empresa}</div>
        <div class="header-ref">Ref.: ${mesAno}</div>
      </div>
      <div class="badge">✦ Reconhecimento</div>
    </div>

    <!-- Ícone -->
    <div class="icon-wrap">
      <div class="icon-star">⭐</div>
    </div>

    <!-- Título -->
    <div class="title-block">
      <div class="title-label">Certificado de</div>
      <div class="title-main">Bom <span>Desempenho</span></div>
    </div>

    <!-- Parabéns -->
    <div class="congrats">
      <p>
        É com grande satisfação que reconhecemos e parabenizamos
        <strong>${selectedEmp.name}</strong> pelo excelente desempenho
        apresentado em <strong>${mesAno}</strong>.<br><br>
        Sua dedicação, comprometimento e contribuição são fundamentais
        para o crescimento da nossa equipe. Este reconhecimento é uma
        forma de expressar nossa gratidão pelo seu esforço e entrega.
      </p>
    </div>

    <!-- Card de valor -->
    <div class="value-card">
      <div>
        <div class="value-label">Colaborador</div>
        <div class="value-name">${selectedEmp.name}</div>
        <div class="value-role">${[selectedEmp.role, selectedEmp.dept].filter(Boolean).join(' · ') || 'Equipe'}</div>
      </div>
      <div class="value-amount">
        <div class="value-label">Bônus de desempenho</div>
        <div class="amount">${brl(bonusTotal)}</div>
        <div class="period">${mesAno}</div>
      </div>
    </div>

    <div class="divider">Assinaturas</div>

    <!-- Assinaturas -->
    <div class="signature-section">
      <div class="sig-box">
        <div style="height:48px"></div>
        <div class="sig-line"></div>
        <div class="sig-label">Assinatura do colaborador</div>
        <div class="sig-name">${selectedEmp.name}</div>
        <div class="sig-role">${selectedEmp.role || ''}</div>
      </div>
      <div class="sig-box">
        <div style="height:48px"></div>
        <div class="sig-line"></div>
        <div class="sig-label">Responsável / RH</div>
        <div class="sig-name">${empresa}</div>
        <div class="sig-role">Recursos Humanos</div>
      </div>
    </div>

    <!-- Rodapé -->
    <div class="footer">
      <div class="footer-left">
        Documento gerado em ${emitidoEm}<br>
        Este documento tem validade mediante assinatura das partes.
      </div>
      <div class="footer-right">
        ${empresa}<br>
        Gestão de Pessoas
      </div>
    </div>
  </div>
</div>
<script>window.onload = () => window.print()<\/script>
</body></html>`);
    win.document.close();
  }

  const brl = v => v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:680 }}>

      {/* Aviso se não houver funcionário */}
      {!empId && (
        <div style={{ padding:'20px 24px', background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, display:'flex', alignItems:'center', gap:12 }}>
          <Icon name="user" size={18} style={{ color:'var(--muted)', flexShrink:0 }} />
          <div>
            <div style={{ fontWeight:600, fontSize:13.5, marginBottom:2 }}>Selecione um funcionário</div>
            <div style={{ fontSize:12.5, color:'var(--muted)' }}>Use o filtro acima para escolher o funcionário que deseja calcular o fechamento.</div>
          </div>
        </div>
      )}

      {empId && (
        <>
          {/* Card do funcionário */}
          <div style={{ padding:'16px 20px', background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <Avatar name={selectedEmp?.name || ''} hue={selectedEmp?.hue ?? 215} size={40} />
              <div>
                <div style={{ fontWeight:700, fontSize:15 }}>{selectedEmp?.name}</div>
                <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:2 }}>
                  {[selectedEmp?.role, selectedEmp?.dept, selectedEmp?.contract].filter(Boolean).join(' · ')}
                </div>
              </div>
              {salary == null && (
                <span className="pill warn" style={{ marginLeft:'auto', fontSize:11 }}>Salário não cadastrado</span>
              )}
            </div>
          </div>

          {salary == null ? (
            <div style={{ padding:'24px', textAlign:'center', color:'var(--muted)', fontSize:13, background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10 }}>
              Cadastre o salário do funcionário na tela de Funcionários para usar a calculadora.
            </div>
          ) : (
            <>
              {/* Parâmetros do cálculo */}
              <div style={{ padding:'16px 20px', background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.6, marginBottom:12 }}>Parâmetros do cálculo</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>
                      Adicional hora extra (%)
                      <span style={{ fontSize:11, color:'var(--muted)', fontWeight:400, marginLeft:4 }}>CLT padrão: 50%</span>
                    </label>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <input
                        type="number" min={0} max={200} step={5}
                        className="field"
                        value={overtimePercent}
                        onChange={e => setOvertimePercent(Number(e.target.value))}
                        style={{ width:90 }}
                      />
                      <div style={{ display:'flex', gap:4 }}>
                        {[50, 75, 100].map(p => (
                          <button key={p} className={`btn sm${overtimePercent===p?' primary':''}`} onClick={() => setOvertimePercent(p)}>{p}%</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, display:'block', marginBottom:4 }}>
                      Horas mensais (divisor)
                      <span style={{ fontSize:11, color:'var(--muted)', fontWeight:400, marginLeft:4 }}>CLT: 220h</span>
                    </label>
                    <input
                      type="number" min={1} max={300}
                      className="field"
                      value={workloadHours}
                      onChange={e => setWorkloadHours(Number(e.target.value))}
                      style={{ width:90 }}
                    />
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, overflow:'hidden' }}>
                <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--line)', fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:0.6 }}>
                  Composição do fechamento — {fmtMonth(month)}
                </div>
                <div style={{ padding:'0 0 4px' }}>
                  {/* Salário base */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 20px', borderBottom:'1px solid var(--line-soft)' }}>
                    <div>
                      <div style={{ fontWeight:500, fontSize:13.5 }}>Salário base</div>
                      <div style={{ fontSize:11.5, color:'var(--muted)', marginTop:1 }}>
                        Valor/hora: {brl(result.hourlyRate)} (÷ {workloadHours}h mensais)
                      </div>
                    </div>
                    <span style={{ fontWeight:700, fontSize:15 }}>{brl(salary)}</span>
                  </div>

                  {/* Horas extras */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 20px', borderBottom:'1px solid var(--line-soft)' }}>
                    <div>
                      <div style={{ fontWeight:500, fontSize:13.5 }}>
                        Horas extras
                        {extraMins > 0 && <span style={{ marginLeft:8, fontSize:11.5, color:'#7c3aed', fontWeight:600 }}>{minutesToHM(extraMins)}</span>}
                      </div>
                      <div style={{ fontSize:11.5, color:'var(--muted)', marginTop:1 }}>
                        {extraMins > 0
                          ? `${brl(result.hourlyRate)} × ${(extraMins/60).toFixed(2)}h × ${100 + overtimePercent}%`
                          : 'Nenhuma hora extra registrada neste período'}
                      </div>
                    </div>
                    <span style={{ fontWeight:700, fontSize:15, color: result.extraValue > 0 ? '#7c3aed' : 'var(--muted)' }}>
                      {result.extraValue > 0 ? `+ ${brl(result.extraValue)}` : '—'}
                    </span>
                  </div>

                  {/* Descontos */}
                  {discounts.map(d => (
                    <div key={d.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 20px', borderBottom:'1px solid var(--line-soft)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontWeight:500, fontSize:13.5, color:'#dc2626' }}>{d.label}</span>
                        <button className="btn ghost icon sm" onClick={() => removeDiscount(d.id)} title="Remover">
                          <Icon name="x" size={12} />
                        </button>
                      </div>
                      <span style={{ fontWeight:700, fontSize:15, color:'#dc2626' }}>− {brl(Number(d.value))}</span>
                    </div>
                  ))}

                  {/* Adicionar desconto */}
                  <div style={{ display:'flex', gap:8, padding:'10px 20px', borderBottom:'1px solid var(--line-soft)', alignItems:'center' }}>
                    <Icon name="minus" size={13} style={{ color:'var(--muted)', flexShrink:0 }} />
                    <input
                      className="field"
                      placeholder="Descrição do desconto"
                      value={discLabel}
                      onChange={e => setDiscLabel(e.target.value)}
                      style={{ flex:1, height:32, fontSize:12.5 }}
                      onKeyDown={e => e.key==='Enter' && addDiscount()}
                    />
                    <input
                      className="field"
                      type="number" min={0} step={0.01}
                      placeholder="R$ 0,00"
                      value={discValue}
                      onChange={e => setDiscValue(e.target.value)}
                      style={{ width:110, height:32, fontSize:12.5 }}
                      onKeyDown={e => e.key==='Enter' && addDiscount()}
                    />
                    <button className="btn sm" onClick={addDiscount} disabled={!discLabel.trim()||!discValue}>
                      <Icon name="plus" size={12} /> Adicionar
                    </button>
                  </div>

                  {/* Total bônus */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', background:'var(--surface-2)' }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15, textTransform:'uppercase', letterSpacing:0.3 }}>Bônus de desempenho</div>
                      <div style={{ fontSize:11.5, color:'var(--muted)', marginTop:2 }}>Valor a ser pago ao colaborador</div>
                    </div>
                    <span style={{ fontWeight:800, fontSize:22, letterSpacing:-0.5, color: result.extraValue - result.totalDisc > 0 ? '#7c3aed' : 'var(--muted)' }}>
                      {result.extraValue - result.totalDisc > 0 ? brl(result.extraValue - result.totalDisc) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Exportar */}
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                <button className="btn" onClick={exportPDF}>
                  <Icon name="download" size={14} /> Exportar PDF
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Helpers visuais ───────────────────────────────────────────
function EmptyState({ icon, msg }) {
  return (
    <div style={{ padding:56, textAlign:'center', color:'var(--muted)', fontSize:13 }}>
      <Icon name={icon} size={28} style={{ opacity:.3, marginBottom:10 }} />
      <div style={{ fontWeight:600, marginBottom:4 }}>Nenhum registro</div>
      <div style={{ fontSize:12 }}>{msg}</div>
    </div>
  );
}

// ── BancoTable ────────────────────────────────────────────────
function BancoTable({ rows, loading }) {
  const [page,    setPage]    = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => { setPage(1); }, [rows]);

  const paged = rows.slice((page - 1) * perPage, page * perPage);

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, overflow:'hidden' }}>
      {loading
        ? (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:500 }}>
                <thead>
                  <tr style={{ background:'var(--surface-2)', color:'var(--muted)', fontSize:11, textTransform:'uppercase', letterSpacing:0.5 }}>
                    {['Funcionário','Presentes','Faltas','Atrasos','H. Trabalhadas','H. Extras (auto)','Ajustes'].map(h => (
                      <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }, (_, i) => (
                    <tr key={i} style={{ borderTop:'1px solid var(--line-soft)' }}>
                      <td style={{ padding:'10px 18px' }}><Skeleton height={12} style={{ maxWidth: 140 }} /></td>
                      <td style={{ padding:'10px 18px' }}><Skeleton width={36} height={11} /></td>
                      <td style={{ padding:'10px 18px' }}><Skeleton width={40} height={18} radius={20} /></td>
                      <td style={{ padding:'10px 18px' }}><Skeleton width={40} height={18} radius={20} /></td>
                      <td style={{ padding:'10px 18px' }}><Skeleton width={60} height={11} /></td>
                      <td style={{ padding:'10px 18px' }}><Skeleton width={50} height={11} /></td>
                      <td style={{ padding:'10px 18px' }}><Skeleton width={20} height={11} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        : rows.length===0
          ? <EmptyState icon="chart" msg="Nenhum registro neste período." />
          : (
            <>
              <div className="time-ent-table" style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:500 }}>
                  <thead>
                    <tr style={{ background:'var(--surface-2)', color:'var(--muted)', fontSize:11, textTransform:'uppercase', letterSpacing:0.5 }}>
                      {['Funcionário','Presentes','Faltas','Atrasos','H. Trabalhadas','H. Extras (auto)','Ajustes'].map(h => (
                        <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((r,i) => (
                      <tr key={i} style={{ borderTop:'1px solid var(--line-soft)' }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--hover)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={{ padding:'10px 18px', fontWeight:500 }}>{r.name}</td>
                        <td style={{ padding:'10px 18px', color:'var(--muted)' }}>{r.presenteCount}d</td>
                        <td style={{ padding:'10px 18px' }}>{r.faltaCount>0 ? <span className="pill bad" style={{ fontSize:11 }}>{r.faltaCount}d</span> : <span style={{ color:'var(--muted)' }}>—</span>}</td>
                        <td style={{ padding:'10px 18px' }}>{r.atrasoCount>0 ? <span className="pill warn" style={{ fontSize:11 }}>{r.atrasoCount}x</span> : <span style={{ color:'var(--muted)' }}>—</span>}</td>
                        <td style={{ padding:'10px 18px', fontFamily:'monospace' }}>{minutesToHM(r.workedMins)}</td>
                        <td style={{ padding:'10px 18px' }}>{r.extraMins>0 ? <span style={{ color:'#7c3aed', fontWeight:600 }}>{minutesToHM(r.extraMins)}</span> : <span style={{ color:'var(--muted)' }}>—</span>}</td>
                        <td style={{ padding:'10px 18px', color:'var(--muted)' }}>{r.ajusteCount>0?r.ajusteCount:'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards — visíveis apenas no mobile */}
              <div className="time-ent-cards">
                {paged.map((r,i) => (
                  <div key={i} className="time-card">
                    <div className="time-card-head">
                      <span className="time-card-title">{r.name}</span>
                      <span style={{ fontSize:11, color:'var(--muted)' }}>{r.presenteCount}d presentes</span>
                    </div>
                    <div className="time-card-row">
                      <span className="time-card-lbl">Faltas</span>
                      <span className="time-card-val">{r.faltaCount>0?<span className="pill bad" style={{ fontSize:11 }}>{r.faltaCount}d</span>:'—'}</span>
                    </div>
                    <div className="time-card-row">
                      <span className="time-card-lbl">Atrasos</span>
                      <span className="time-card-val">{r.atrasoCount>0?<span className="pill warn" style={{ fontSize:11 }}>{r.atrasoCount}x</span>:'—'}</span>
                    </div>
                    <div className="time-card-row">
                      <span className="time-card-lbl">H. Trabalhadas</span>
                      <span className="time-card-val" style={{ fontFamily:'monospace' }}>{minutesToHM(r.workedMins)}</span>
                    </div>
                    <div className="time-card-row">
                      <span className="time-card-lbl">H. Extras</span>
                      <span className="time-card-val">{r.extraMins>0?<span style={{ color:'#7c3aed', fontWeight:600 }}>{minutesToHM(r.extraMins)}</span>:'—'}</span>
                    </div>
                    {r.ajusteCount>0 && (
                      <div className="time-card-row">
                        <span className="time-card-lbl">Ajustes</span>
                        <span className="time-card-val">{r.ajusteCount}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Pagination total={rows.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
            </>
          )
      }
    </div>
  );
}

function EntriesTable({ entries, loading, columns, emptyMsg, showEmployee }) {
  const ST_CLS   = { presente:'ok', ok:'ok', ajuste:'ok', falta:'bad', atraso:'warn', hora_extra:'info' };
  const ST_LABEL = { presente:'Presente', ok:'Presente', ajuste:'Ajuste', falta:'Falta', atraso:'Atraso', hora_extra:'Extra' };

  const [page,    setPage]    = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => { setPage(1); }, [entries]);

  const cols = columns || [
    showEmployee && { key:'emp',      label:'Funcionário', render:r => r.employees?.name||'—' },
    { key:'date',     label:'Data',    render:r => fmtDate(r.date) },
    { key:'time_in',  label:'Entrada', render:r => r.time_in?.slice(0,5)||'—' },
    { key:'time_out', label:'Saída',   render:r => r.time_out?.slice(0,5)||'—' },
    { key:'extra',    label:'H. extras', render:r => {
      const w = entryWorkedMins(r);
      const ex = r.status==='hora_extra' ? parseExtraHoursToMins(r.extra_hours) : Math.max(0, w-STANDARD_MINS);
      return ex>0 ? <span style={{ color:'#7c3aed', fontWeight:600, fontSize:12 }}>{minutesToHM(ex)}</span> : null;
    }},
    { key:'status',   label:'Status',  render:r => <span className={`pill ${ST_CLS[r.status]||'ok'}`} style={{ fontSize:11 }}>{ST_LABEL[r.status]||r.status||'Presente'}</span> },
    { key:'notes',    label:'Obs.',    render:r => r.notes ? <span style={{ color:'var(--muted)', fontSize:12 }}>{r.notes}</span> : null },
  ].filter(Boolean);

  const paged = entries.slice((page - 1) * perPage, page * perPage);

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, overflow:'hidden' }}>
      {loading ? (
        <div className="time-ent-table" style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:400 }}>
            <thead>
              <tr style={{ background:'var(--surface-2)', color:'var(--muted)', fontSize:11, textTransform:'uppercase', letterSpacing:0.5 }}>
                {cols.map(c => <th key={c.key} style={{ padding:'10px 18px', textAlign:'left', fontWeight:600, whiteSpace:'nowrap' }}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }, (_, i) => (
                <tr key={i} style={{ borderTop:'1px solid var(--line-soft)' }}>
                  {cols.map(c => (
                    <td key={c.key} style={{ padding:'10px 18px' }}>
                      <Skeleton height={11} style={{ maxWidth: c.key === 'emp' || c.key === 'notes' ? '70%' : 80 }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : entries.length===0 ? (
        <EmptyState icon="clock" msg={emptyMsg||'Nenhum registro encontrado.'} />
      ) : (
        <>
          <div className="time-ent-table" style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:400 }}>
              <thead>
                <tr style={{ background:'var(--surface-2)', color:'var(--muted)', fontSize:11, textTransform:'uppercase', letterSpacing:0.5 }}>
                  {cols.map(c => <th key={c.key} style={{ padding:'10px 18px', textAlign:'left', fontWeight:600, whiteSpace:'nowrap' }}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {paged.map(r => (
                  <tr key={r.id} style={{ borderTop:'1px solid var(--line-soft)' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--hover)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    {cols.map(c => (
                      <td key={c.key} style={{ padding:'10px 18px', color:'var(--ink)' }}>
                        {c.render(r) ?? <span style={{ color:'var(--muted)' }}>—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — visíveis apenas no mobile */}
          <div className="time-ent-cards">
            {paged.map(r => {
              const titleCol  = cols[0];
              const statusCol = cols.find(c => c.key === 'status');
              const rowCols   = cols.filter(c => c !== titleCol && c !== statusCol);
              return (
                <div key={r.id} className="time-card">
                  <div className="time-card-head">
                    <span className="time-card-title">{titleCol?.render(r) ?? '—'}</span>
                    {statusCol && statusCol.render(r)}
                  </div>
                  {rowCols.map(c => {
                    const val = c.render(r);
                    if (val == null) return null;
                    return (
                      <div key={c.key} className="time-card-row">
                        <span className="time-card-lbl">{c.label}</span>
                        <span className="time-card-val">{val}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <Pagination total={entries.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
        </>
      )}
    </div>
  );
}
