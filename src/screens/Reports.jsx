import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Icon from '../components/Icon.jsx';
import Pagination from '../components/Pagination.jsx';
import Skeleton from '../components/Skeleton.jsx';
import {
  useEmployees,
  useAllWarnings,
  useAllVacations,
  useAllDocuments,
  useAllTimecards,
} from '../hooks/useEmployees.js';

const REPORT_CATALOG = [
  {
    group: 'Pessoas',
    color: 'var(--brand)',
    items: [
      { id: 'headcount', label: 'Headcount ativo', icon: 'users',
        desc: 'Lista completa de colaboradores com cargo, departamento e data de admissão.',
        filters: ['empresa', 'departamento', 'status', 'admissao'],
        columns: ['Nome', 'Cargo', 'Departamento', 'Empresa', 'Status', 'Admissão'] },
      { id: 'turnover', label: 'Desligamentos', icon: 'logout',
        desc: 'Colaboradores desligados no período, com motivo e data efetiva.',
        filters: ['periodo', 'empresa', 'departamento'],
        columns: ['Nome', 'Cargo', 'Departamento', 'Desligamento', 'Status'] },
      { id: 'afastados', label: 'Afastamentos', icon: 'alert',
        desc: 'Colaboradores afastados por tipo de licença e prazo de retorno.',
        filters: ['periodo', 'empresa', 'departamento'],
        columns: ['Nome', 'Cargo', 'Departamento', 'Status', 'Admissão'] },
    ],
  },
  {
    group: 'Ponto',
    color: 'var(--info)',
    items: [
      { id: 'espelho', label: 'Espelho de ponto', icon: 'clock',
        desc: 'Jornada diária consolidada por colaborador com horas trabalhadas, faltas e atrasos.',
        filters: ['periodo', 'empresa', 'departamento', 'funcionario'],
        columns: ['Funcionário', 'Mês/Ano', 'Horas trabalhadas', 'Faltas', 'Banco de horas'] },
      { id: 'faltas', label: 'Faltas e atrasos', icon: 'alert',
        desc: 'Ocorrências de falta e atraso agrupadas por colaborador no período.',
        filters: ['periodo', 'empresa', 'departamento'],
        columns: ['Funcionário', 'Mês/Ano', 'Horas trabalhadas', 'Faltas', 'Banco de horas'] },
    ],
  },
  {
    group: 'RH',
    color: '#7c3aed',
    items: [
      { id: 'ferias', label: 'Programação de férias', icon: 'umbrella',
        desc: 'Períodos aquisitivos, datas concedidas e status de aprovação.',
        filters: ['periodo', 'empresa', 'departamento', 'status_ferias'],
        columns: ['Funcionário', 'Departamento', 'Período início', 'Período fim', 'Dias', 'Status'] },
      { id: 'advertencias', label: 'Advertências', icon: 'shield',
        desc: 'Ocorrências disciplinares registradas por tipo e severidade.',
        filters: ['periodo', 'empresa', 'departamento', 'severidade'],
        columns: ['Funcionário', 'Departamento', 'Tipo', 'Severidade', 'Data', 'Aplicado por'] },
    ],
  },
  {
    group: 'Documentos',
    color: 'var(--warn)',
    items: [
      { id: 'documentos', label: 'Documentos por categoria', icon: 'folder',
        desc: 'Arquivos cadastrados agrupados por categoria e colaborador.',
        filters: ['periodo', 'categoria_doc', 'empresa'],
        columns: ['Arquivo', 'Categoria', 'Funcionário', 'Tipo', 'Data upload'] },
    ],
  },
  {
    group: 'Financeiro',
    color: 'var(--ok)',
    items: [
      { id: 'folha', label: 'Folha consolidada', icon: 'chart',
        desc: 'Resumo de salários por departamento e centro de custo.',
        filters: ['empresa', 'departamento'],
        columns: ['Nome', 'Cargo', 'Departamento', 'Empresa', 'Status', 'Admissão'] },
    ],
  },
];

const ALL_REPORTS = REPORT_CATALOG.flatMap(g => g.items.map(r => ({ ...r, group: g.group, color: g.color })));

const MONTHS_CAL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_CAL   = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
}

function CustomSelect({ value, onChange, options = [], groups, placeholder = 'Selecionar…' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const allOpts = groups ? groups.flatMap(g => g.items.map(r => ({ value: r.id, label: r.label, icon: r.icon, group: g.color }))) : options;
  const sel = allOpts.find(o => o.value === value || o === value);
  const display = sel?.label ?? sel ?? placeholder;

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const pickOption = (val) => { onChange(val); setOpen(false); };

  const renderOpt = (opt) => {
    const val = opt.value ?? opt;
    const label = opt.label ?? opt;
    const active = val === value;
    return (
      <button key={val} onClick={() => pickOption(val)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', border: 'none', textAlign: 'left', cursor: 'pointer',
        background: active ? 'var(--brand-tint)' : 'transparent',
        color: active ? 'var(--brand)' : 'var(--ink)', fontWeight: active ? 600 : 400, fontSize: 13,
        transition: 'background .08s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? 'var(--brand-tint)' : 'transparent'; }}>
        {opt.icon && <Icon name={opt.icon} size={13} style={{ color: active ? 'var(--brand)' : opt.group ?? 'var(--muted)', flexShrink: 0 }} />}
        <span style={{ flex: 1 }}>{label}</span>
        {active && <Icon name="check" size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />}
      </button>
    );
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)',
        background: 'var(--surface-2)', color: value ? 'var(--ink)' : 'var(--muted)',
        fontSize: 13, cursor: 'pointer', textAlign: 'left', transition: 'border-color .12s',
      }}>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{display}</span>
        <Icon name="chevron-down" size={13} style={{ color: 'var(--muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div className="scroll-hidden" style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 700,
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 10, boxShadow: 'var(--shadow-pop)', maxHeight: 220, overflowY: 'auto', padding: '4px 0',
        }}>
          {groups ? groups.map(g => (
            <div key={g.group}>
              <div style={{ padding: '8px 12px 2px', fontSize: 10, fontWeight: 700, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: 1 }}>{g.group}</div>
              {g.items.map(r => renderOpt({ value: r.id, label: r.label, icon: r.icon, group: g.color }))}
            </div>
          )) : options.map(renderOpt)}
        </div>
      )}
    </div>
  );
}

function DatePicker({ value, onChange, placeholder = 'dd/mm/aaaa' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, openUp: false });
  const [view, setView] = useState(() => value ? new Date(value + 'T00:00') : new Date());
  const btnRef = useRef(null);
  const calRef = useRef(null);
  const selected = value ? new Date(value + 'T00:00') : null;
  const display = selected ? selected.toLocaleDateString('pt-BR') : '';
  const CAL_W = 260, CAL_H = 290;

  useEffect(() => { if (value) setView(new Date(value + 'T00:00')); }, [value]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (!btnRef.current?.contains(e.target) && !calRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const openUp = spaceBelow < CAL_H && r.top > CAL_H;
      let left = r.left;
      if (left + CAL_W > window.innerWidth - 8) left = r.right - CAL_W;
      setPos({ top: openUp ? r.top - CAL_H - 4 : r.bottom + 4, left, openUp });
    }
    setOpen(o => !o);
  };

  const year = view.getFullYear(), month = view.getMonth();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const today = new Date();
  const isSel = (d) => d && selected && year === selected.getFullYear() && month === selected.getMonth() && d === selected.getDate();
  const isToday = (d) => d && year === today.getFullYear() && month === today.getMonth() && d === today.getDate();

  const pick = (d) => {
    if (!d) return;
    onChange(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button ref={btnRef} onClick={handleOpen} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)',
        background: 'var(--surface-2)', color: display ? 'var(--ink)' : 'var(--muted)',
        fontSize: 13, cursor: 'pointer', textAlign: 'left',
      }}>
        <Icon name="calendar" size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{display || placeholder}</span>
        {value && (
          <span onClick={e => { e.stopPropagation(); onChange(''); }} style={{ display: 'flex', cursor: 'pointer', color: 'var(--muted-2)' }}>
            <Icon name="x" size={12} />
          </span>
        )}
      </button>
      {open && (
        <div ref={calRef} style={{
          position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, width: CAL_W,
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 10, boxShadow: 'var(--shadow-pop)', padding: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, gap: 4 }}>
            <button className="btn ghost icon sm" onClick={() => setView(new Date(year, month - 1, 1))}><Icon name="chevron-left" size={14} /></button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 700 }}>{MONTHS_CAL[month]} {year}</span>
            <button className="btn ghost icon sm" onClick={() => setView(new Date(year, month + 1, 1))}><Icon name="chevron-right" size={14} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS_CAL.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--muted-2)', padding: '2px 0' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {days.map((d, i) => (
              <button key={i} onClick={() => pick(d)} disabled={!d} style={{
                width: '100%', aspectRatio: '1', borderRadius: 6, border: 'none', fontSize: 12.5, cursor: d ? 'pointer' : 'default',
                background: isSel(d) ? 'var(--brand)' : isToday(d) ? 'var(--brand-tint)' : 'transparent',
                color: isSel(d) ? '#fff' : isToday(d) ? 'var(--brand)' : d ? 'var(--ink)' : 'transparent',
                fontWeight: isSel(d) || isToday(d) ? 700 : 400, transition: 'background .08s',
              }}
              onMouseEnter={e => { if (d && !isSel(d)) e.currentTarget.style.background = 'var(--hover)'; }}
              onMouseLeave={e => { if (d && !isSel(d)) e.currentTarget.style.background = isToday(d) ? 'var(--brand-tint)' : 'transparent'; }}>
                {d || ''}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReportFilters({ report, filters, setFilters, employees, depts, companies }) {
  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const has = (f) => report.filters.includes(f);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {has('periodo') && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>Período</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <DatePicker value={filters.inicio || ''} onChange={v => set('inicio', v)} placeholder="Início" />
            <DatePicker value={filters.fim || ''} onChange={v => set('fim', v)} placeholder="Fim" />
          </div>
        </div>
      )}

      {has('admissao') && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>Admissão (intervalo)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <DatePicker value={filters.admissao_ini || ''} onChange={v => set('admissao_ini', v)} placeholder="Início" />
            <DatePicker value={filters.admissao_fim || ''} onChange={v => set('admissao_fim', v)} placeholder="Fim" />
          </div>
        </div>
      )}

      {has('empresa') && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>Empresa</label>
          <CustomSelect value={filters.empresa || ''} onChange={v => set('empresa', v)} placeholder="Todas"
            options={[{ value: '', label: 'Todas' }, ...companies.map(c => ({ value: c, label: c }))]} />
        </div>
      )}

      {has('departamento') && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>Departamento</label>
          <CustomSelect value={filters.departamento || ''} onChange={v => set('departamento', v)} placeholder="Todos"
            options={[{ value: '', label: 'Todos' }, ...depts.map(d => ({ value: d, label: d }))]} />
        </div>
      )}

      {has('status') && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>Status</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[['', 'Todos'], ['ativo', 'Ativo'], ['férias', 'Férias'], ['afastado', 'Afastado'], ['desligado', 'Desligado']].map(([v, l]) => (
              <button key={v} onClick={() => set('status', v)} style={{
                padding: '5px 12px', borderRadius: 20, border: '1px solid', fontSize: 12.5, cursor: 'pointer',
                borderColor: (filters.status || '') === v ? 'var(--brand)' : 'var(--line)',
                background: (filters.status || '') === v ? 'var(--brand-tint)' : 'var(--surface-2)',
                color: (filters.status || '') === v ? 'var(--brand)' : 'var(--muted)',
                fontWeight: (filters.status || '') === v ? 700 : 400,
              }}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {has('funcionario') && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>Funcionário</label>
          <CustomSelect value={filters.funcionario || ''} onChange={v => set('funcionario', v)} placeholder="Todos"
            options={[{ value: '', label: 'Todos' }, ...employees.filter(e => e.status === 'ativo').map(e => ({ value: e.id, label: e.name }))]} />
        </div>
      )}

      {has('status_ferias') && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>Status das férias</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[['', 'Todos'], ['agendado', 'Agendado'], ['em_aberto', 'Em curso'], ['concedido', 'Quitado']].map(([v, l]) => (
              <button key={v} onClick={() => set('status_ferias', v)} style={{
                padding: '5px 12px', borderRadius: 20, border: '1px solid', fontSize: 12.5, cursor: 'pointer',
                borderColor: (filters.status_ferias || '') === v ? 'var(--brand)' : 'var(--line)',
                background: (filters.status_ferias || '') === v ? 'var(--brand-tint)' : 'var(--surface-2)',
                color: (filters.status_ferias || '') === v ? 'var(--brand)' : 'var(--muted)',
                fontWeight: (filters.status_ferias || '') === v ? 700 : 400,
              }}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {has('severidade') && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>Severidade</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[['', 'Todas'], ['verbal', 'Verbal'], ['escrita', 'Escrita'], ['suspensao', 'Suspensão']].map(([v, l]) => (
              <button key={v} onClick={() => set('severidade', v)} style={{
                padding: '5px 12px', borderRadius: 20, border: '1px solid', fontSize: 12.5, cursor: 'pointer',
                borderColor: (filters.severidade || '') === v ? 'var(--brand)' : 'var(--line)',
                background: (filters.severidade || '') === v ? 'var(--brand-tint)' : 'var(--surface-2)',
                color: (filters.severidade || '') === v ? 'var(--brand)' : 'var(--muted)',
                fontWeight: (filters.severidade || '') === v ? 700 : 400,
              }}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {has('categoria_doc') && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>Categoria</label>
          <CustomSelect value={filters.categoria_doc || ''} onChange={v => set('categoria_doc', v)} placeholder="Todas"
            options={[{ value: '', label: 'Todas' }, ...['Admissão','Contratos','Holerites','Atestados','Treinamentos','Rescisão','Férias'].map(c => ({ value: c, label: c }))]} />
        </div>
      )}
    </div>
  );
}

function useReportData(reportId, filters, employees, warnings, vacations, documents, timecards) {
  return useMemo(() => {
    const inPeriod = (dateStr) => {
      if (!dateStr) return true;
      const d = new Date(dateStr + 'T00:00:00');
      if (filters.inicio && d < new Date(filters.inicio)) return false;
      if (filters.fim && d > new Date(filters.fim + 'T23:59:59')) return false;
      return true;
    };

    const filterEmp = (e) => {
      if (filters.empresa && e.company !== filters.empresa) return false;
      if (filters.departamento && e.dept !== filters.departamento) return false;
      if (filters.status && e.status !== filters.status) return false;
      if (filters.admissao_ini && e.admission && e.admission < filters.admissao_ini) return false;
      if (filters.admissao_fim && e.admission && e.admission > filters.admissao_fim) return false;
      return true;
    };

    switch (reportId) {
      case 'headcount':
        return employees.filter(e => e.status !== 'desligado' && filterEmp(e)).map(e => ({
          cells: [e.name, e.role||'—', e.dept||'—', e.company||'—', e.status, fmtDate(e.admission)],
        }));
      case 'turnover':
        return employees.filter(e => e.status === 'desligado' && filterEmp(e)).map(e => ({
          cells: [e.name, e.role||'—', e.dept||'—', fmtDate(e.admission), e.status],
        }));
      case 'afastados':
        return employees.filter(e => e.status === 'afastado' && filterEmp(e)).map(e => ({
          cells: [e.name, e.role||'—', e.dept||'—', e.status, fmtDate(e.admission)],
        }));
      case 'espelho':
      case 'faltas': {
        let tcs = timecards;
        if (filters.funcionario) tcs = tcs.filter(tc => tc.employee_id === filters.funcionario);
        if (filters.inicio || filters.fim) {
          tcs = tcs.filter(tc => {
            const d = tc.month_year ? tc.month_year + '-01' : null;
            return inPeriod(d);
          });
        }
        return tcs.map(tc => {
          const emp = employees.find(e => e.id === tc.employee_id);
          if (filters.empresa && emp?.company !== filters.empresa) return null;
          if (filters.departamento && emp?.dept !== filters.departamento) return null;
          return { cells: [emp?.name||'—', tc.month_year||'—', tc.worked_hours||'—', String(tc.absences||0), tc.overtime||'—'] };
        }).filter(Boolean);
      }
      case 'ferias':
        return vacations.filter(v => {
          if (filters.status_ferias && v.status !== filters.status_ferias) return false;
          if (!inPeriod(v.period_start)) return false;
          const emp = employees.find(e => e.id === v.employee_id);
          if (filters.empresa && emp?.company !== filters.empresa) return false;
          if (filters.departamento && emp?.dept !== filters.departamento) return false;
          return true;
        }).map(v => {
          const emp = employees.find(e => e.id === v.employee_id);
          const statusLabel = { concedido: 'Quitado', em_aberto: 'Em curso', agendado: 'Agendado', pendente: 'Pendente' };
          return { cells: [emp?.name||'—', emp?.dept||'—', fmtDate(v.period_start), fmtDate(v.period_end), String(v.days||0), statusLabel[v.status]||v.status] };
        });
      case 'advertencias':
        return warnings.filter(w => {
          if (filters.severidade && w.severity !== filters.severidade) return false;
          if (!inPeriod(w.date)) return false;
          const emp = employees.find(e => e.id === w.employee_id);
          if (filters.empresa && emp?.company !== filters.empresa) return false;
          if (filters.departamento && emp?.dept !== filters.departamento) return false;
          return true;
        }).map(w => {
          const emp = employees.find(e => e.id === w.employee_id);
          const sevLabel = { verbal: 'Verbal', escrita: 'Escrita', suspensao: 'Suspensão' };
          return { cells: [emp?.name||'—', emp?.dept||'—', w.type||'—', sevLabel[w.severity]||'—', fmtDate(w.date), w.applied_by||'—'] };
        });
      case 'documentos':
        return documents.filter(doc => {
          if (filters.categoria_doc && doc.category !== filters.categoria_doc) return false;
          if (!inPeriod(doc.created_at?.slice(0,10))) return false;
          const emp = employees.find(e => e.id === doc.employee_id);
          if (filters.empresa && emp?.company !== filters.empresa) return false;
          return true;
        }).map(doc => {
          const emp = employees.find(e => e.id === doc.employee_id);
          return { cells: [doc.name||'—', doc.category||'—', emp?.name||'—', (doc.type||'').toUpperCase(), doc.created_at ? new Date(doc.created_at).toLocaleDateString('pt-BR') : '—'] };
        });
      case 'folha':
        return employees.filter(e => e.salary && filterEmp(e)).map(e => ({
          cells: [e.name, e.role||'—', e.dept||'—', e.company||'—', e.status, fmtDate(e.admission)],
          highlight: !e.salary,
        }));
      default:
        return [];
    }
  }, [reportId, filters, employees, warnings, vacations, documents, timecards]);
}

function ExportDropdown({ onExport }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const formats = [
    { id: 'XLSX', label: 'Excel (.xlsx)', icon: 'download', desc: 'Planilha editável' },
    { id: 'CSV',  label: 'CSV (.csv)',    icon: 'download', desc: 'Dados separados por ponto-e-vírgula' },
    { id: 'PDF',  label: 'PDF (.pdf)',    icon: 'pdf',      desc: 'Documento formatado para impressão' },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn sm primary" onClick={() => setOpen(o => !o)}>
        <Icon name="download" size={13} />
        Exportar
        <Icon name="chevron-down" size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 600,
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 10, boxShadow: 'var(--shadow-pop)', padding: '4px 0', minWidth: 220,
        }}>
          {formats.map(f => (
            <button key={f.id} onClick={() => { onExport(f.id); setOpen(false); }} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px', border: 'none', background: 'transparent',
              cursor: 'pointer', textAlign: 'left', transition: 'background .08s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={f.icon} size={14} style={{ color: 'var(--brand)' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{f.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{f.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterModal({ report, selectedId, onSelectReport, filters, setFilters, employees, depts, companies, onClose, onClear }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 40px rgba(0,0,0,.18)', border: '1px solid var(--line)',
          width: '100%', maxWidth: 480,
          display: 'flex', flexDirection: 'column',
          maxHeight: 'min(90vh, 680px)',
        }}
      >
        <div style={{ flexShrink: 0, padding: '16px 20px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="filter" size={15} style={{ color: 'var(--brand)' }} />
          <span style={{ fontSize: 14.5, fontWeight: 700, flex: 1 }}>Filtros</span>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="scroll-hidden" style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Tipo de relatório</label>
            <CustomSelect value={selectedId} onChange={onSelectReport} groups={REPORT_CATALOG} />
          </div>
          <div style={{ borderTop: '1px solid var(--line)' }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Filtros — {report.label}</div>
            <ReportFilters report={report} filters={filters} setFilters={setFilters} employees={employees} depts={depts} companies={companies} />
          </div>
        </div>
        <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn ghost sm" onClick={onClear}>Limpar filtros</button>
          <button className="btn primary sm" onClick={onClose}>Aplicar</button>
        </div>
      </div>
    </div>
  );
}

export default function ReportsScreen({ addToast, activeCompany }) {
  const [selectedId, setSelectedId]     = useState('headcount');
  const [filters, setFilters]           = useState({});
  const [history, setHistory]           = useState([]);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const { employees, loading: empLoading } = useEmployees({ companyId: activeCompany?.id });
  const { warnings,  loading: warnLoading } = useAllWarnings(activeCompany?.id);
  const { vacations, loading: vacLoading  } = useAllVacations(activeCompany?.id);
  const { documents, loading: docLoading  } = useAllDocuments(activeCompany?.id);
  const { timecards, loading: tcLoading   } = useAllTimecards(activeCompany?.id);

  const loading = empLoading || warnLoading || vacLoading || docLoading || tcLoading;
  const selected = ALL_REPORTS.find(r => r.id === selectedId);

  const depts     = useMemo(() => [...new Set(employees.map(e => e.dept).filter(Boolean))].sort(), [employees]);
  const companies = useMemo(() => [...new Set(employees.map(e => e.company).filter(Boolean))].sort(), [employees]);
  const rows      = useReportData(selectedId, filters, employees, warnings, vacations, documents, timecards);

  const handleExport = useCallback(async (format) => {
    if (!selected || rows.length === 0) return;
    const headers = selected.columns;
    const data    = rows.map(r => r.cells);
    const filename = `${selected.label.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}`;

    const triggerDownload = (url, name) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    };

    try {
      if (format === 'CSV') {
        const csv = [headers, ...data].map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        triggerDownload(URL.createObjectURL(blob), filename + '.csv');
      }

      if (format === 'XLSX') {
        const XLSX = await import('xlsx');
        const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, selected.label.slice(0, 31));
        XLSX.writeFile(wb, filename + '.xlsx');
      }

      if (format === 'PDF') {
        const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
          import('jspdf'),
          import('jspdf-autotable'),
        ]);
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        doc.setFontSize(13);
        doc.text(selected.label, 14, 14);
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} · ${rows.length} registros`, 14, 20);
        autoTable(doc, {
          head: [headers],
          body: data,
          startY: 26,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [42, 91, 255], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 248, 252] },
        });
        doc.save(filename + '.pdf');
      }

      setHistory(h => [{
        id: Date.now(), report: selected.label, format, rows: rows.length,
        at: new Date().toLocaleString('pt-BR'),
      }, ...h].slice(0, 8));
      addToast({ kind: 'ok', msg: `${selected.label} exportado como ${format} (${rows.length} registros)` });
    } catch (err) {
      console.error('Export error:', err);
      addToast({ kind: 'bad', msg: `Erro ao exportar: ${err.message}` });
    }
  }, [selected, rows, addToast]);

  const [page, setPage]       = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => { setPage(1); }, [rows]);

  const paged = rows.slice((page - 1) * perPage, page * perPage);
  const activeFiltersCount = Object.values(filters).filter(v => v).length;

  return (
    <>
    <div className="fade-up" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                  {selected?.group} /
                </span>
                <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: -0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selected?.label}
                </h1>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected?.desc}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
              <button className="btn sm" onClick={() => setFilterModalOpen(true)} style={{ position: 'relative' }}>
                <Icon name="filter" size={13} />
                Filtros
                {activeFiltersCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    background: 'var(--brand)', color: '#fff',
                    fontSize: 9, fontWeight: 700, borderRadius: 10,
                    padding: '1px 5px', lineHeight: 1.4,
                  }}>{activeFiltersCount}</span>
                )}
              </button>
              {activeFiltersCount > 0 && (
                <button className="btn sm ghost" onClick={() => setFilters({})}>Limpar filtros</button>
              )}
              {rows.length > 0 && <ExportDropdown onExport={handleExport} />}
            </div>
          </div>

          {history.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: 0.6, flexShrink: 0 }}>
                Recentes:
              </span>
              {history.slice(0, 5).map(h => (
                <span key={h.id} className="pill" style={{ fontSize: 10.5, gap: 4 }}>
                  <Icon name="download" size={9} />
                  {h.report} · {h.format} · {h.rows}reg
                </span>
              ))}
              <button className="btn ghost sm icon" onClick={() => setHistory([])}>
                <Icon name="x" size={11} />
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <div style={{
              padding: '10px 16px', borderBottom: '1px solid var(--line)',
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--surface-2)',
            }}>
              {loading ? (
                <span className="pulse" style={{ fontSize: 12.5, color: 'var(--muted)' }}>Carregando dados…</span>
              ) : (
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                  <strong style={{ color: 'var(--ink)' }}>{rows.length}</strong> registro{rows.length !== 1 ? 's' : ''}
                  {activeFiltersCount > 0 && (
                    <span> · {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''} ativo{activeFiltersCount !== 1 ? 's' : ''}</span>
                  )}
                </span>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0 }}>
              {loading ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 480 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                      <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600, width: 36, color: 'var(--muted-2)' }}>#</th>
                      {selected.columns.map(col => (
                        <th key={col} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 8 }, (_, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
                        <td style={{ padding: '9px 14px' }}>
                          <Skeleton width={12} height={10} />
                        </td>
                        {selected.columns.map((_col, ci) => (
                          <td key={ci} style={{ padding: '9px 14px', maxWidth: 200 }}>
                            <Skeleton height={11} style={{ maxWidth: ci === 0 ? '85%' : '70%' }} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : rows.length === 0 ? (
                <div style={{ padding: 64, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  <Icon name="folder" size={32} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
                  Nenhum registro encontrado com os filtros aplicados.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 480 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                      <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600, width: 36, color: 'var(--muted-2)' }}>#</th>
                      {selected.columns.map(col => (
                        <th key={col} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '9px 14px', color: 'var(--muted-2)', fontSize: 11, fontFamily: 'monospace' }}>{(page - 1) * perPage + i + 1}</td>
                        {row.cells.map((cell, ci) => (
                          <td key={ci} style={{ padding: '9px 14px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ci === 0
                              ? <span style={{ fontWeight: 600 }}>{cell}</span>
                              : <span style={{ color: 'var(--ink-soft)' }}>{cell}</span>
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {rows.length > 0 && (
              <Pagination
                total={rows.length}
                page={page}
                perPage={perPage}
                onPage={setPage}
                onPerPage={(n) => { setPerPage(n); setPage(1); }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
    {filterModalOpen && (
      <FilterModal
        report={selected}
        selectedId={selectedId}
        onSelectReport={(id) => { setSelectedId(id); setFilters({}); }}
        filters={filters}
        setFilters={setFilters}
        employees={employees}
        depts={depts}
        companies={companies}
        onClose={() => setFilterModalOpen(false)}
        onClear={() => { setFilters({}); }}
      />
    )}
    </>
  );
}
