import { useState, useRef, useEffect, useCallback } from 'react';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import { useEmployees, useMonthEntries, createTimeEntry } from '../hooks/useEmployees.js';

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
    if (date > today) continue;
    const e = byDay[d];
    result[d] = e ? { status: e.status || 'presente', entry: e } : { status: 'sem_registro', entry: null };
  }
  return result;
}

const STATUS_COLOR = {
  presente:     { bg: 'var(--ok-bg,#dcfce7)', color: 'var(--ok)',      label: 'Presente' },
  ok:           { bg: 'var(--ok-bg,#dcfce7)', color: 'var(--ok)',      label: 'Presente' },
  ajuste:       { bg: '#dbeafe',              color: '#2563eb',         label: 'Ajuste'   },
  falta:        { bg: '#fee2e2',              color: '#dc2626',         label: 'Falta'    },
  atraso:       { bg: '#fef9c3',              color: '#ca8a04',         label: 'Atraso'   },
  hora_extra:   { bg: '#ede9fe',              color: '#7c3aed',         label: 'Extra'    },
  sem_registro: { bg: 'var(--surface-2)',     color: 'var(--muted-2)',  label: ''         },
  weekend:      { bg: 'var(--surface-2)',     color: 'var(--muted-2)',  label: ''         },
};

// ── Modal Cartão de Ponto ─────────────────────────────────────
const DEFAULT_PERIODS = [
  { in: '', out: '' },
  { in: '', out: '' },
];

function CartaoModal({ employees, onClose, onSave }) {
  const [empId,   setEmpId]   = useState('');
  const [date,    setDate]    = useState(new Date().toISOString().slice(0,10));
  const [periods, setPeriods] = useState(DEFAULT_PERIODS.map(p => ({ ...p })));
  const [saving,  setSaving]  = useState(false);

  const updatePeriod = (i, field, val) =>
    setPeriods(ps => ps.map((p, idx) => idx === i ? { ...p, [field]: val } : p));

  const addPeriod = () => setPeriods(ps => [...ps, { in: '', out: '' }]);
  const removePeriod = (i) => setPeriods(ps => ps.filter((_, idx) => idx !== i));

  const validPeriods = periods.filter(p => p.in && p.out);
  const totalMins    = periodsWorkedMins(validPeriods);
  const extraMins    = Math.max(0, totalMins - STANDARD_MINS);
  const hasRequired  = empId && date && validPeriods.length > 0;

  const handleSave = async () => {
    if (!hasRequired) return;
    setSaving(true);
    const firstIn  = validPeriods[0]?.in  || null;
    const lastOut  = validPeriods[validPeriods.length - 1]?.out || null;
    const { error } = await createTimeEntry({
      employee_id: empId,
      date,
      time_in:  firstIn,
      time_out: lastOut,
      status:   'presente',
      periods:  validPeriods,
      extra_hours: extraMins > 0 ? minutesToHM(extraMins) : null,
    });
    setSaving(false);
    if (error) { alert('Erro: ' + error.message); return; }
    onSave();
    onClose();
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
            <div style={{ fontSize:15, fontWeight:700 }}>Lançar cartão de ponto</div>
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
        <div style={{ padding:'14px 20px', borderTop:'1px solid var(--line)', display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={saving || !hasRequired}>
            {saving ? 'Salvando…' : 'Lançar cartão'}
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
function MonthCalendar({ ym, dayStatuses }) {
  const total  = daysInMonth(ym);
  const offset = firstDayOfWeek(ym);
  const cells  = Array.from({ length: Math.ceil((offset + total) / 7) * 7 });

  const counts = Object.values(dayStatuses).reduce((a, ds) => {
    const s = ds.status;
    if (s !== 'weekend' && s !== 'sem_registro') a[s] = (a[s]||0) + 1;
    return a;
  }, {});

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
        {[['presente','Normal','var(--ok)'],['atraso','Atraso','#ca8a04'],['falta','Falta','#dc2626'],['hora_extra','Extra','#7c3aed'],['ajuste','Ajuste','#2563eb']].map(([k,l,c]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--muted)' }}>
            <span style={{ width:10, height:10, borderRadius:3, background:c, opacity:.7 }} />
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
          const ds = dayStatuses[day];
          const sc = ds ? (STATUS_COLOR[ds.status] || {}) : {};
          const isToday = (() => { const n=new Date(); const [y,m]=ym.split('-').map(Number); return n.getFullYear()===y && n.getMonth()+1===m && n.getDate()===day; })();
          const e = ds?.entry;
          const w = e ? entryWorkedMins(e) : 0;
          const extraThisDay = w > STANDARD_MINS ? w - STANDARD_MINS : 0;
          const timeLabel = e?.time_in ? e.time_in.slice(0,5)
            : ds?.status==='falta' ? 'Falta'
            : ds?.status==='atraso' ? 'Atraso'
            : ds?.status==='hora_extra' ? (e?.extra_hours||'Extra')
            : '';
          return (
            <div key={i} title={e?.notes || undefined} style={{ borderRadius:8, padding:'8px 4px', textAlign:'center', background:isToday?'var(--brand)':(sc.bg||'var(--surface-2)'), color:isToday?'var(--brand-ink,#fff)':(sc.color||'var(--muted-2)'), border:isToday?'none':'1px solid var(--line)', cursor:ds&&ds.status!=='weekend'&&ds.status!=='sem_registro'?'pointer':'default' }}>
              <div style={{ fontSize:13, fontWeight:isToday?700:500 }}>{day}</div>
              {timeLabel && !isToday && <div style={{ fontSize:9, marginTop:2, fontWeight:600, opacity:.8 }}>{timeLabel}</div>}
              {extraThisDay > 0 && !isToday && <div style={{ fontSize:8, marginTop:1, color:'#7c3aed', fontWeight:700 }}>+{minutesToHM(extraThisDay)}</div>}
            </div>
          );
        })}
      </div>
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

export function TimeScreen({ addToast, activeCompany }) {
  const { employees, loading:empLoading } = useEmployees({ companyId: activeCompany?.id });
  const [tab,     setTab]     = useState('jornada');
  const [empId,   setEmpId]   = useState('');
  const [month,   setMonth]   = useState(new Date().toISOString().slice(0,7));
  const [modal,   setModal]   = useState(null);
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
  const empMap = {};
  entries.forEach(e => {
    const key  = e.employee_id;
    const name = e.employees?.name || key;
    if (!empMap[key]) empMap[key] = { name, employee_id:key, hue:e.employees?.hue, entries:[] };
    empMap[key].entries.push(e);
  });
  const bancoRows = Object.values(empMap).map(r => ({ ...r, ...computeStats(r.entries) }));

  // Resumo: por funcionário ou por dia se funcionário selecionado
  const resumoIsEmployee = !!empId;
  const resumoRows = resumoIsEmployee
    ? entries
    : bancoRows;

  return (
    <>
    <div className="fade-up" style={{ padding:24, display:'flex', flexDirection:'column', gap:18 }}>

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
        <Icon name="user" size={15} style={{ color:'var(--muted)', flexShrink:0 }} />
        <select className="field" value={empId} onChange={e => setEmpId(e.target.value)} disabled={empLoading} style={{ flex:1, maxWidth:280, height:36, fontSize:13 }}>
          <option value="">Todos os funcionários</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}{e.dept?` — ${e.dept}`:''}</option>)}
        </select>
        <div style={{ width:1, height:24, background:'var(--line)', margin:'0 4px' }} />
        <Icon name="history" size={15} style={{ color:'var(--muted)', flexShrink:0 }} />
        <input type="month" className="field" value={month} onChange={e => setMonth(e.target.value)} style={{ width:160, height:36, fontSize:13 }} />
        {empId && selectedEmp && (
          <>
            <div style={{ width:1, height:24, background:'var(--line)', margin:'0 4px' }} />
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
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'Horas trabalhadas', value:empId ? minutesToHM(stats.workedMins) : '—', icon:'clock',   color:'var(--brand)'                                      },
          { label:'Horas extras',      value:empId ? minutesToHM(stats.extraMins)  : '—', icon:'sparkle', color:stats.extraMins>0?'#7c3aed':'var(--muted)'            },
          { label:'Faltas no mês',     value:empId ? stats.faltaCount              : '—', icon:'alert',   color:stats.faltaCount>0?'#dc2626':'var(--muted)'            },
          { label:'Atrasos no mês',    value:empId ? stats.atrasoCount             : '—', icon:'history', color:stats.atrasoCount>0?'#ca8a04':'var(--muted)'           },
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

      {/* ── Tabs ── */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--line)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', border:'none', background:'transparent', fontSize:13, fontWeight:tab===t.id?700:500, color:tab===t.id?'var(--brand)':'var(--muted)', borderBottom:`2px solid ${tab===t.id?'var(--brand)':'transparent'}`, marginBottom:-1, cursor:'pointer', whiteSpace:'nowrap' }}>
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
                <MonthCalendar ym={month} dayStatuses={dayStatuses} />
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
        <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, overflow:'hidden' }}>
          {entLoading ? <div style={{ padding:40, textAlign:'center', color:'var(--muted)', fontSize:13 }}><div className="pulse">Carregando…</div></div>
          : bancoRows.length===0 ? <EmptyState icon="chart" msg="Nenhum registro neste período." />
          : (
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
                  {bancoRows.map((r,i) => (
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
          )}
        </div>
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
            {entLoading ? <div style={{ padding:40, textAlign:'center', color:'var(--muted)', fontSize:13 }}><div className="pulse">Carregando…</div></div>
            : resumoRows.length===0 ? <EmptyState icon="dashboard" msg="Nenhum registro encontrado para este período." />
            : resumoIsEmployee ? (
              /* Detalhe dia a dia para funcionário selecionado */
              <div style={{ overflowX:'auto' }}>
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
            ) : (
              /* Resumo por funcionário */
              <div style={{ overflowX:'auto' }}>
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
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Fechamento — ${selectedEmp.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
        h2 { margin: 0 0 4px; font-size: 20px; }
        .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
        td:last-child { text-align: right; font-weight: 600; }
        .total td { font-size: 16px; font-weight: 700; border-top: 2px solid #111; border-bottom: none; }
        .disc td { color: #dc2626; }
        .extra td:last-child { color: #7c3aed; }
      </style></head><body>
      <h2>Fechamento de ${fmtMonth(month)}</h2>
      <div class="sub">${selectedEmp.name} · ${selectedEmp.role || ''} · ${selectedEmp.contract || 'CLT'}</div>
      <table>
        <tr><td>Salário base</td><td>${brl(salary)}</td></tr>
        <tr class="extra"><td>Horas extras (${minutesToHM(extraMins)} × ${overtimePercent}% adicional)</td><td>+ ${brl(result.extraValue)}</td></tr>
        ${discounts.map(d => `<tr class="disc"><td>${d.label}</td><td>− ${brl(Number(d.value))}</td></tr>`).join('')}
        <tr class="total"><td>TOTAL</td><td>${brl(result.total)}</td></tr>
      </table>
      <p style="font-size:11px;color:#999;margin-top:32px">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
      <script>window.onload=()=>window.print()<\/script>
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

                  {/* Total */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', background:'var(--surface-2)' }}>
                    <span style={{ fontWeight:700, fontSize:15, textTransform:'uppercase', letterSpacing:0.3 }}>Total estimado</span>
                    <span style={{ fontWeight:800, fontSize:22, letterSpacing:-0.5, color:'var(--brand)' }}>{brl(result.total)}</span>
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

function EntriesTable({ entries, loading, columns, emptyMsg, showEmployee }) {
  const ST_CLS   = { presente:'ok', ok:'ok', ajuste:'ok', falta:'bad', atraso:'warn', hora_extra:'info' };
  const ST_LABEL = { presente:'Presente', ok:'Presente', ajuste:'Ajuste', falta:'Falta', atraso:'Atraso', hora_extra:'Extra' };

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

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--line)', borderRadius:10, overflow:'hidden' }}>
      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:'var(--muted)', fontSize:13 }}><div className="pulse">Carregando…</div></div>
      ) : entries.length===0 ? (
        <EmptyState icon="clock" msg={emptyMsg||'Nenhum registro encontrado.'} />
      ) : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:400 }}>
            <thead>
              <tr style={{ background:'var(--surface-2)', color:'var(--muted)', fontSize:11, textTransform:'uppercase', letterSpacing:0.5 }}>
                {cols.map(c => <th key={c.key} style={{ padding:'10px 18px', textAlign:'left', fontWeight:600, whiteSpace:'nowrap' }}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {entries.map(r => (
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
      )}
    </div>
  );
}
