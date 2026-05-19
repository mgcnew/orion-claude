import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import Skeleton from '../components/Skeleton.jsx';
import OrionGlyph from '../components/OrionGlyph.jsx';
import {
  useEmployees, useAllWarnings, useAllVacations, useAllDocuments, useAllTimecards,
  useLaborCases, createLaborCase, updateLaborCase,
  useJusticeHistory, createJusticeHistoryEntry,
  logAudit,
} from '../hooks/useEmployees.js';
import { supabase } from '../lib/supabase.js';
import TutorialBanner from '../components/TutorialBanner.jsx';

// ── helpers ──────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d + 'T00:00').toLocaleDateString('pt-BR') : '—';
const isUrgent = (d) => { if (!d) return false; const diff = new Date(d + 'T00:00') - Date.now(); return diff >= 0 && diff < 7 * 86400000; };

const JUSTICE_TEMPLATES = [
  { id: 'ato-admissao', title: 'Termo de admissão',          cat: 'Contratos',     pages: 3, icon: 'user' },
  { id: 'rescisao',     title: 'Termo de rescisão (TRCT)',   cat: 'Rescisões',     pages: 4, icon: 'x' },
  { id: 'advertencia',  title: 'Advertência formal',         cat: 'Disciplinares', pages: 1, icon: 'alert' },
  { id: 'suspensao',    title: 'Suspensão disciplinar',      cat: 'Disciplinares', pages: 2, icon: 'alert' },
  { id: 'ferias',       title: 'Aviso de férias',            cat: 'Férias',        pages: 1, icon: 'calendar' },
  { id: 'acordo',       title: 'Acordo extrajudicial',       cat: 'Acordos',       pages: 5, icon: 'share' },
  { id: 'ata',          title: 'Ata de reunião disciplinar', cat: 'Disciplinares', pages: 2, icon: 'doc' },
  { id: 'declaracao',   title: 'Declaração de vínculo',      cat: 'Declarações',   pages: 1, icon: 'doc' },
  { id: 'intimacao',    title: 'Resposta a intimação',       cat: 'Processos',     pages: 6, icon: 'scale' },
  { id: 'preposto',     title: 'Carta de preposição',        cat: 'Processos',     pages: 1, icon: 'scale' },
];

const FASES = ['Notificação','Contestação','Audiência','Instrução','Alegações','Sentença','Recurso','Encerrado'];

// ── RowMenu ───────────────────────────────────────────────────
function RowMenu({ items }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!menuRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <>
      <button ref={btnRef} className="btn ghost icon sm" onClick={toggle} title="Ações">
        <Icon name="more" size={14} />
      </button>
      {open && (
        <div ref={menuRef} style={{
          position: 'fixed', top: pos.top, right: pos.right, zIndex: 600,
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--radius)', boxShadow: '0 4px 20px rgba(0,0,0,.13)',
          minWidth: 178, padding: '4px 0',
        }}>
          {items.map((item, i) =>
            item === 'sep' ? (
              <div key={i} style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
            ) : (
              <button key={i} onClick={() => { setOpen(false); item.action?.(); }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 14px', border: 'none', background: 'transparent',
                color: item.danger ? 'var(--danger)' : 'var(--ink)', fontSize: 13,
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <Icon name={item.icon} size={13} style={{ opacity: 0.7, flexShrink: 0 }} />
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </>
  );
}

// ── InfoField ─────────────────────────────────────────────────
function InfoField({ label, value, span }) {
  return (
    <div style={span ? { gridColumn: '1 / -1' } : {}}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>{value || '—'}</div>
    </div>
  );
}

// ── ProcessSlideOver ──────────────────────────────────────────
function ProcessSlideOver({ process: proc, onClose, onSaved, addToast }) {
  const [editFase, setEditFase] = useState(proc.fase);
  const [editProxima, setEditProxima] = useState(proc.proxima || '');
  const [nota, setNota] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notas, setNotas] = useState(proc.notas ?? []);

  const saveNota = async () => {
    if (!nota.trim()) return;
    const updated = [...notas, { autor: 'Você', data: new Date().toISOString().slice(0, 10), texto: nota }];
    const { error } = await updateLaborCase(proc.id, { notas: updated });
    if (!error) { logAudit(proc.company_id, 'EDITOU', `Nota no processo: ${proc.num}`); setNotas(updated); setNota(''); addToast({ kind: 'ok', msg: 'Nota adicionada' }); onSaved?.(); }
    else addToast({ kind: 'bad', msg: 'Erro ao salvar nota' });
  };

  const saveFase = async () => {
    setSaving(true);
    const { error } = await updateLaborCase(proc.id, { fase: editFase, proxima: editProxima || null });
    setSaving(false);
    if (!error) { logAudit(proc.company_id, 'EDITOU', `Processo: ${proc.num}`); setEditing(false); addToast({ kind: 'ok', msg: 'Processo atualizado' }); onSaved?.(); }
    else addToast({ kind: 'bad', msg: 'Erro ao atualizar' });
  };

  const encerrar = async () => {
    const { error } = await updateLaborCase(proc.id, { fase: 'Encerrado', status: 'ok' });
    if (!error) { addToast({ kind: 'warn', msg: 'Processo encerrado' }); onSaved?.(); onClose(); }
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.28)' }} onClick={onClose} />
      <div className="just-slideover" style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 401,
        background: 'var(--surface)', borderLeft: '1px solid var(--line)',
        boxShadow: '-8px 0 40px rgba(0,0,0,.12)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ flexShrink: 0, padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 5 }}>Processo</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.4 }}>{proc.num}</div>
          </div>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={15} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <SectionTitle>Dados</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <InfoField label="Reclamante" value={proc.autor} />
              <InfoField label="Responsável" value={proc.responsavel} />
              <InfoField label="Vara" value={proc.vara} />
              <InfoField label="Valor da causa" value={proc.valor_causa} />
              <InfoField label="Pedidos" value={proc.pedidos} span />
            </div>
          </div>

          <div>
            <SectionTitle>Fase atual</SectionTitle>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label className="label">Fase</label>
                    <select className="field" value={editFase} onChange={e => setEditFase(e.target.value)}>
                      {FASES.map(f => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Próxima ação</label>
                    <input type="date" className="field" value={editProxima} onChange={e => setEditProxima(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn ghost sm" onClick={() => setEditing(false)}>Cancelar</button>
                  <button className="btn primary sm" disabled={saving} onClick={saveFase}>
                    {saving ? 'Salvando…' : 'Salvar'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className={`pill ${proc.status}`}><span className="dot" />{editFase}</span>
                {editProxima && (
                  <span style={{ fontSize: 12.5, color: isUrgent(editProxima) ? 'var(--danger)' : 'var(--muted)' }}>
                    {isUrgent(editProxima) && <Icon name="alert" size={12} style={{ marginRight: 4 }} />}
                    Próxima: <strong>{fmtDate(editProxima)}</strong>
                  </span>
                )}
                <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => setEditing(true)}>
                  <Icon name="edit" size={12} /> Editar
                </button>
              </div>
            )}
          </div>

          <div>
            <SectionTitle>Documentos vinculados ({(proc.doc_names ?? []).length})</SectionTitle>
            {(proc.doc_names ?? []).length === 0
              ? <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 8px' }}>Nenhum documento vinculado.</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
                  {(proc.doc_names ?? []).map((doc, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--line-soft)' }}>
                      <Icon name="doc" size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc}</span>
                    </div>
                  ))}
                </div>
            }
          </div>

          <div>
            <SectionTitle>Notas e atualizações</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
              {notas.map((n, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <Avatar name={n.autor} size={26} hue={i * 80 + 120} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{n.autor}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtDate(n.data)}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{n.texto}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea className="field" value={nota} onChange={e => setNota(e.target.value)}
                placeholder="Adicionar nota ou atualização…"
                style={{ height: 72, resize: 'vertical', lineHeight: 1.5 }} />
              <button className="btn sm" disabled={!nota.trim()} onClick={saveNota}>Adicionar nota</button>
            </div>
          </div>

          <div style={{ fontSize: 11.5, color: 'var(--muted)', paddingTop: 10, borderTop: '1px solid var(--line-soft)' }}>
            Aberto por <strong>{proc.criado_por}</strong> em {fmtDate(proc.created_at?.slice(0, 10))}
          </div>
        </div>

        <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn ghost sm" onClick={() => addToast({ kind: 'ok', msg: 'Exportando PDF…' })}>
            <Icon name="download" size={13} /> PDF
          </button>
          {proc.fase !== 'Encerrado' && (
            <button className="btn sm" style={{ marginLeft: 'auto', color: 'var(--danger)', border: '1px solid var(--danger)', background: 'transparent' }}
              onClick={encerrar}>
              Encerrar
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── NewProcessModal ───────────────────────────────────────────
function NewProcessModal({ onClose, onSaved, addToast, companyId }) {
  const [form, setForm] = useState({ num: '', autor: '', vara: '', fase: 'Notificação', responsavel: '', pedidos: '', valor_causa: '', proxima: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.num.trim() || !form.autor.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await createLaborCase({
      ...form,
      proxima: form.proxima || null,
      company_id: companyId ?? null,
      criado_por: user?.email ?? 'Sistema',
      status: 'warn',
      notas: [],
      doc_names: [],
    });
    setSaving(false);
    if (error) { addToast({ kind: 'bad', msg: 'Erro ao cadastrar: ' + error.message }); return; }
    logAudit(companyId, 'CRIOU', `Processo: ${form.num}`);
    addToast({ kind: 'ok', msg: 'Processo cadastrado' });
    onSaved?.();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--line)', boxShadow: '0 8px 40px rgba(0,0,0,.18)',
        width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100dvh - 32px)',
      }}>
        <div style={{ flexShrink: 0, padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="scale" size={15} style={{ color: 'var(--brand)' }} />
          <span style={{ fontSize: 14.5, fontWeight: 700, flex: 1 }}>Novo processo</span>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Número do processo *</label>
            <input className="field" placeholder="0000000-00.0000.5.00.0000" value={form.num} onChange={e => set('num', e.target.value)} style={{ fontFamily: 'monospace' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label className="label">Reclamante *</label>
              <input className="field" placeholder="Nome completo" value={form.autor} onChange={e => set('autor', e.target.value)} />
            </div>
            <div>
              <label className="label">Vara</label>
              <input className="field" placeholder="Ex: 1ª VT — São Paulo/SP" value={form.vara} onChange={e => set('vara', e.target.value)} />
            </div>
            <div>
              <label className="label">Fase inicial</label>
              <select className="field" value={form.fase} onChange={e => set('fase', e.target.value)}>
                {FASES.filter(f => f !== 'Encerrado').map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Responsável</label>
              <input className="field" placeholder="Advogado(a) responsável" value={form.responsavel} onChange={e => set('responsavel', e.target.value)} />
            </div>
            <div>
              <label className="label">Valor da causa</label>
              <input className="field" placeholder="R$ 0,00" value={form.valor_causa} onChange={e => set('valor_causa', e.target.value)} />
            </div>
            <div>
              <label className="label">Próxima ação</label>
              <input type="date" className="field" value={form.proxima} onChange={e => set('proxima', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Pedidos</label>
            <textarea className="field" placeholder="Descreva os pedidos do reclamante…" value={form.pedidos} onChange={e => set('pedidos', e.target.value)} style={{ height: 72, resize: 'vertical', lineHeight: 1.5 }} />
          </div>
        </div>
        <div style={{ flexShrink: 0, padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn ghost sm" onClick={onClose}>Cancelar</button>
          <button className="btn primary sm" disabled={saving || !form.num.trim() || !form.autor.trim()} onClick={handleSave}>
            {saving ? 'Salvando…' : 'Cadastrar processo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DossieSection ─────────────────────────────────────────────
function DossieSection({ title, icon, count, color, children, onExport }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 16px', border: 'none', background: 'var(--surface-2)', cursor: 'pointer', textAlign: 'left',
      }}>
        <Icon name={icon} size={14} style={{ color: color || 'var(--brand)', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{title}</span>
        {count != null && (
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20, padding: '1px 8px', flexShrink: 0 }}>
            {count}
          </span>
        )}
        <button className="btn ghost sm" style={{ flexShrink: 0 }} onClick={e => { e.stopPropagation(); onExport?.(); }}>
          <Icon name="download" size={12} /> Exportar
        </button>
        <Icon name="chevron-down" size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', opacity: 0.45, flexShrink: 0 }} />
      </button>
      {open && <div style={{ padding: '14px 16px' }}>{children}</div>}
    </div>
  );
}

// ── DossieTab ─────────────────────────────────────────────────
function DossieTab({ employees, warnings, vacations, documents, timecards, cases, addToast }) {
  const [empId, setEmpId] = useState('');
  const emp = employees.find(e => e.id === empId);

  const empWarnings  = useMemo(() => warnings.filter(w => w.employee_id === empId),  [warnings, empId]);
  const empVacations = useMemo(() => vacations.filter(v => v.employee_id === empId), [vacations, empId]);
  const empDocuments = useMemo(() => documents.filter(d => d.employee_id === empId), [documents, empId]);
  const empTimecards = useMemo(() => timecards.filter(t => t.employee_id === empId), [timecards, empId]);
  const empCases     = useMemo(() => cases.filter(p => emp && p.autor === emp.name),  [cases, emp]);

  const statusPill = (s) => s === 'ativo' ? 'ok' : s === 'afastado' ? 'warn' : s === 'desligado' ? 'bad' : 'info';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', maxWidth: 340 }}>
          <label className="label">Funcionário</label>
          <select className="field" value={empId} onChange={e => setEmpId(e.target.value)}>
            <option value="">— Selecione um funcionário —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        {emp && (
          <button className="btn primary sm" onClick={() => addToast({ kind: 'ok', msg: `Exportando dossiê de ${emp.name}…` })}>
            <Icon name="download" size={13} /> Exportar pacote completo
          </button>
        )}
      </div>

      {!emp ? (
        <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--muted)' }}>
          <Icon name="users" size={38} style={{ opacity: 0.13, display: 'block', margin: '0 auto 14px' }} />
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Selecione um funcionário</div>
          <div style={{ fontSize: 12.5 }}>O dossiê completo será exibido aqui, pronto para exportação em audiência.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)' }}>
            <Avatar name={emp.name} size={40} hue={215} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{emp.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{emp.role || '—'} · {emp.dept || '—'} · {emp.company || '—'}</div>
            </div>
            <span className={`pill ${statusPill(emp.status)}`} style={{ flexShrink: 0 }}><span className="dot" />{emp.status || 'ativo'}</span>
            <div style={{ textAlign: 'right', fontSize: 11.5, color: 'var(--muted)', flexShrink: 0 }}>
              <div>Admissão</div>
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{emp.admission ? fmtDate(emp.admission) : '—'}</div>
            </div>
          </div>

          <DossieSection title="Advertências" icon="alert" count={empWarnings.length} color="var(--danger)"
            onExport={() => addToast({ kind: 'ok', msg: 'Advertências exportadas' })}>
            {empWarnings.length === 0
              ? <EmptyMsg>Nenhuma advertência registrada.</EmptyMsg>
              : <SimpleTable cols={['Data','Tipo','Motivo']} rows={empWarnings.map(w => [fmtDate(w.date), w.type || w.severity || '—', w.reason || '—'])} />
            }
          </DossieSection>

          <DossieSection title="Férias" icon="calendar" count={empVacations.length}
            onExport={() => addToast({ kind: 'ok', msg: 'Férias exportadas' })}>
            {empVacations.length === 0
              ? <EmptyMsg>Nenhum período de férias registrado.</EmptyMsg>
              : <SimpleTable cols={['Início','Fim','Status']} rows={empVacations.map(v => [fmtDate(v.period_start), fmtDate(v.period_end), v.status || '—'])} />
            }
          </DossieSection>

          <DossieSection title="Documentos" icon="folder" count={empDocuments.length}
            onExport={() => addToast({ kind: 'ok', msg: 'Documentos exportados' })}>
            {empDocuments.length === 0
              ? <EmptyMsg>Nenhum documento encontrado.</EmptyMsg>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {empDocuments.map(doc => (
                    <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--line-soft)' }}>
                      <Icon name="doc" size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name || 'Documento'}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{doc.category || ''}</span>
                    </div>
                  ))}
                </div>
            }
          </DossieSection>

          <DossieSection title="Registros de ponto" icon="clock" count={empTimecards.length}
            onExport={() => addToast({ kind: 'ok', msg: 'Ponto exportado' })}>
            {empTimecards.length === 0
              ? <EmptyMsg>Nenhum registro de ponto encontrado.</EmptyMsg>
              : <SimpleTable cols={['Mês','Horas trabalhadas']}
                  rows={empTimecards.slice(0, 20).map(tc => [tc.month_year || '—', tc.worked_hours ?? '—'])} />
            }
          </DossieSection>

          {empCases.length > 0 && (
            <DossieSection title="Processos trabalhistas" icon="scale" count={empCases.length} color="var(--danger)"
              onExport={() => addToast({ kind: 'ok', msg: 'Processos exportados' })}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {empCases.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--line-soft)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.num}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{p.vara}</div>
                    </div>
                    <span className={`pill ${p.status}`} style={{ fontSize: 10.5, flexShrink: 0 }}><span className="dot" />{p.fase}</span>
                  </div>
                ))}
              </div>
            </DossieSection>
          )}
        </div>
      )}
    </div>
  );
}

// ── small helpers ─────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
      {children}
    </div>
  );
}

function EmptyMsg({ children }) {
  return <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>{children}</p>;
}

function SimpleTable({ cols, rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 300 }}>
        <thead>
          <tr style={{ color: 'var(--muted)', fontSize: 11 }}>
            {cols.map(c => <th key={c} style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600 }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
              {row.map((cell, ci) => <td key={ci} style={{ padding: '7px 8px', color: ci === 0 ? 'var(--ink)' : 'var(--ink-soft)' }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── JusticeScreen (main) ──────────────────────────────────────
export default function JusticeScreen({ addToast, activeCompany }) {
  const [tab, setTab]                     = useState('processos');
  const [activeProcess, setActiveProcess] = useState(null);
  const [showNewProcess, setShowNewProcess] = useState(false);
  const [selected, setSelected]           = useState(null);
  const [empId, setEmpId]                 = useState('');
  const [reason, setReason]               = useState('');
  const [city, setCity]                   = useState('São Paulo');
  const [showPreview, setShowPreview]     = useState(false);
  const [histFilter, setHistFilter]       = useState('');

  const { employees }              = useEmployees({ companyId: activeCompany?.id });
  const { warnings }               = useAllWarnings(activeCompany?.id);
  const { vacations }              = useAllVacations(activeCompany?.id);
  const { documents }              = useAllDocuments(activeCompany?.id);
  const { timecards }              = useAllTimecards(activeCompany?.id);
  const { cases, loading: casesLoading, refetch: refetchCases } = useLaborCases(activeCompany?.id);
  const { history, refetch: refetchHistory }                    = useJusticeHistory(activeCompany?.id);

  const tpl = selected ? JUSTICE_TEMPLATES.find(t => t.id === selected) : null;
  const selectedEmp = employees.find(e => e.id === empId);

  const filteredHistory = useMemo(() =>
    histFilter ? history.filter(h => (h.employees?.name || '').toLowerCase().includes(histFilter.toLowerCase())) : history,
  [history, histFilter]);

  const handleGenerateDoc = useCallback(async () => {
    if (!tpl) return;
    const { data: { user } } = await supabase.auth.getUser();
    await createJusticeHistoryEntry({
      company_id: activeCompany?.id ?? null,
      employee_id: empId || null,
      template_id: tpl.id,
      template_title: tpl.title,
      emitted_by: user?.email ?? 'Sistema',
      status: 'Pendente',
    });
    logAudit(activeCompany?.id, 'GEROU', `Documento: ${tpl.title}`);
    refetchHistory();
    setShowPreview(true);
  }, [tpl, empId, activeCompany, refetchHistory]);

  const TABS = [
    { id: 'processos',  label: 'Processos',      icon: 'scale' },
    { id: 'dossie',     label: 'Dossiê',          icon: 'users' },
    { id: 'documentos', label: 'Gerar documento', icon: 'doc' },
    { id: 'historico',  label: 'Histórico',       icon: 'history' },
  ];

  const statusLabel = (fase) => {
    if (fase === 'Encerrado') return 'ok';
    if (['Notificação','Contestação'].includes(fase)) return 'bad';
    if (['Audiência','Instrução','Alegações'].includes(fase)) return 'warn';
    if (['Sentença','Recurso'].includes(fase)) return 'info';
    return 'warn';
  };

  return (
    <>
      <style>{`
        .just-page         { padding: 24px 28px; display: flex; flex-direction: column; gap: 0; max-width: 1280px; margin: 0 auto; width: 100%; min-height: 100%; box-sizing: border-box; }
        .just-header       { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
        .just-actions      { display: flex; gap: 8px; flex-wrap: wrap; }
        .just-docs-grid    { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 22px; }
        .just-doc-row      { display: grid; grid-template-columns: 1fr auto; gap: 10px; }
        .just-doc-date     { width: 150px; }
        .just-hist-row     { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .just-slideover    { width: clamp(300px, 42vw, 520px); }
        .just-hist-cards   { display: none; flex-direction: column; gap: 10px; padding: 12px; }
        .just-hist-card    { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; }
        .just-hist-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--line-soft); gap: 8px; }
        .just-hist-card-date { font-family: monospace; font-size: 12px; color: var(--muted); }
        .just-hist-card-title { font-size: 13.5px; font-weight: 600; color: var(--ink); margin-bottom: 8px; }
        .just-hist-card-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 3px 0; }
        .just-hist-card-lbl { font-size: 11.5px; color: var(--muted); }
        .just-hist-card-val { font-size: 12.5px; color: var(--ink-soft); text-align: right; }

        @media (max-width: 768px) {
          .just-page       { padding: 14px; }
          .just-header     { gap: 10px; margin-bottom: 14px; }
          .just-subtitle   { display: none; }
          .just-tabs       { margin-bottom: 14px !important; }
          .just-tab        { padding: 9px 12px !important; }
          .just-action-label { display: none; }
          .just-docs-grid  { grid-template-columns: 1fr; gap: 16px; }
          .just-doc-row    { grid-template-columns: 1fr; }
          .just-doc-date   { width: 100% !important; }
          .just-slideover  { width: 100% !important; }
        }
        @media (max-width: 768px) {
          .just-col-vara,
          .just-col-emissor { display: none; }
        }
        @media (max-width: 480px) {
          .just-page       { padding: 12px; }
          .just-hist-input { max-width: 100% !important; flex: 1; min-width: 0; }
          .just-col-proxima { display: none; }
          .just-table      { min-width: 0 !important; }
        }
        @media (max-width: 768px) {
          .just-hist-table-wrap { display: none !important; }
          .just-hist-cards      { display: flex; }
        }
      `}</style>
      <div className="fade-up just-page">
        <TutorialBanner screenKey="justice" />
        <div className="just-header">
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--brand-tint)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="gavel" size={19} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>Justiça</h1>
            <p className="just-subtitle" style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>Gestão de processos, dossiês e documentos jurídicos.</p>
          </div>
          <div className="just-actions">
            {tab === 'processos' && (
              <button className="btn primary sm" onClick={() => setShowNewProcess(true)}>
                <Icon name="plus" size={13} /> <span className="just-action-label">Novo processo</span>
              </button>
            )}
            <button className="btn sm" onClick={() => addToast({ kind: 'ok', msg: 'Exportando pacote do mês…' })}>
              <Icon name="download" size={13} /> <span className="just-action-label">Exportar mês</span>
            </button>
          </div>
        </div>

        <div className="scroll-hidden just-tabs" style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--line)', marginBottom: 22, overflowX: 'auto', flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className="just-tab" style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 16px', border: 'none', background: 'transparent', whiteSpace: 'nowrap',
              color: tab === t.id ? 'var(--brand)' : 'var(--muted)',
              fontSize: 13, fontWeight: tab === t.id ? 700 : 500, cursor: 'pointer',
              borderBottom: `2px solid ${tab === t.id ? 'var(--brand)' : 'transparent'}`,
              marginBottom: -1,
            }}>
              <Icon name={t.icon} size={13} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── PROCESSOS ── */}
        {tab === 'processos' && (
          casesLoading ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="just-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                      {[
                        { l: 'Processo' },
                        { l: 'Reclamante' },
                        { l: 'Vara', cls: 'just-col-vara' },
                        { l: 'Fase' },
                        { l: 'Próxima ação', cls: 'just-col-proxima' },
                        { l: '' },
                      ].map((h, i) => (
                        <th key={i} className={h.cls} style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, whiteSpace: 'nowrap' }}>{h.l}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 6 }, (_, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
                        <td style={{ padding: '12px 16px' }}><Skeleton width={140} height={11} /></td>
                        <td style={{ padding: '12px 16px' }}>
                          <div className="row gap-2">
                            <Skeleton width={26} circle />
                            <Skeleton height={12} style={{ maxWidth: 140, flex: 1 }} />
                          </div>
                        </td>
                        <td className="just-col-vara" style={{ padding: '12px 16px' }}><Skeleton height={12} style={{ maxWidth: 100 }} /></td>
                        <td style={{ padding: '12px 16px' }}><Skeleton width={80} height={18} radius={20} /></td>
                        <td className="just-col-proxima" style={{ padding: '12px 16px' }}><Skeleton width={100} height={11} /></td>
                        <td style={{ padding: '12px 16px' }}><Skeleton width={20} height={20} radius={4} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : cases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--muted)' }}>
              <Icon name="scale" size={38} style={{ opacity: 0.13, display: 'block', margin: '0 auto 14px' }} />
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Nenhum processo cadastrado</div>
              <div style={{ fontSize: 12.5, marginBottom: 16 }}>Clique em "Novo processo" para começar.</div>
              <button className="btn primary sm" onClick={() => setShowNewProcess(true)}>
                <Icon name="plus" size={13} /> Novo processo
              </button>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="just-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                      {[
                        { l: 'Processo' },
                        { l: 'Reclamante' },
                        { l: 'Vara', cls: 'just-col-vara' },
                        { l: 'Fase' },
                        { l: 'Próxima ação', cls: 'just-col-proxima' },
                        { l: '' },
                      ].map((h, i) => (
                        <th key={i} className={h.cls} style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, whiteSpace: 'nowrap' }}>{h.l}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((p, i) => {
                      const urgent = isUrgent(p.proxima);
                      const st = p.status || statusLabel(p.fase);
                      return (
                        <tr key={p.id} style={{ borderTop: '1px solid var(--line-soft)', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          onClick={() => setActiveProcess(p)}>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600 }}>{p.num}</span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <Avatar name={p.autor} size={26} hue={i * 70 + 40} />
                              <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{p.autor}</span>
                            </div>
                          </td>
                          <td className="just-col-vara" style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{p.vara || '—'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span className={`pill ${st}`}><span className="dot" />{p.fase}</span>
                          </td>
                          <td className="just-col-proxima" style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            {p.proxima ? (
                              <span style={{ fontSize: 12.5, color: urgent ? 'var(--danger)' : 'var(--ink)', fontWeight: urgent ? 700 : 400, display: 'flex', alignItems: 'center', gap: 5 }}>
                                {urgent && <Icon name="alert" size={12} />}
                                {fmtDate(p.proxima)}
                              </span>
                            ) : (
                              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                            <RowMenu items={[
                              { label: 'Ver detalhes', icon: 'eye', action: () => setActiveProcess(p) },
                              { label: 'Ver dossiê', icon: 'users', action: () => setTab('dossie') },
                              'sep',
                              { label: 'Exportar PDF', icon: 'download', action: () => addToast({ kind: 'ok', msg: 'PDF exportado' }) },
                              p.fase !== 'Encerrado' && 'sep',
                              p.fase !== 'Encerrado' && { label: 'Encerrar processo', icon: 'x', danger: true, action: async () => { await updateLaborCase(p.id, { fase: 'Encerrado', status: 'ok' }); refetchCases(); addToast({ kind: 'warn', msg: 'Processo encerrado' }); } },
                            ].filter(Boolean)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* ── DOSSIÊ ── */}
        {tab === 'dossie' && (
          <DossieTab
            employees={employees}
            warnings={warnings}
            vacations={vacations}
            documents={documents}
            timecards={timecards}
            cases={cases}
            addToast={addToast}
          />
        )}

        {/* ── DOCUMENTOS ── */}
        {tab === 'documentos' && !showPreview && (
          <div className="just-docs-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>1. Escolha o modelo</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {JUSTICE_TEMPLATES.map(t => {
                  const active = selected === t.id;
                  return (
                    <button key={t.id} onClick={() => setSelected(t.id)} style={{
                      textAlign: 'left', padding: 14,
                      background: active ? 'var(--brand-tint)' : 'var(--surface)',
                      border: `1px solid ${active ? 'var(--brand)' : 'var(--line)'}`,
                      borderRadius: 10, cursor: 'pointer',
                    }}>
                      <div style={{ display: 'flex', marginBottom: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: active ? 'var(--brand)' : 'var(--surface-2)', color: active ? 'var(--brand-ink)' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name={t.icon} size={13} />
                        </div>
                        <span style={{ flex: 1 }} />
                        <span style={{ fontSize: 10.5, color: 'var(--muted-2)', fontWeight: 600 }}>{t.pages} pág.</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--brand)' : 'var(--ink)', lineHeight: 1.3 }}>{t.title}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>{t.cat}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>2. Preencha os dados</div>
              <div className="card" style={{ padding: 22 }}>
                {!tpl ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px', background: 'var(--surface-2)', border: '1px dashed var(--line)', color: 'var(--muted-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="gavel" size={22} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Selecione um modelo</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>Escolha à esquerda para abrir o formulário.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, flex: 1 }}>{tpl.title}</h3>
                      <span className="pill brand" style={{ fontSize: 10.5 }}>A4 · Retrato</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label className="label">Funcionário</label>
                        <select className="field" value={empId} onChange={e => setEmpId(e.target.value)}>
                          <option value="">— Selecione —</option>
                          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                      </div>
                      <div className="just-doc-row">
                        <div><label className="label">Cidade</label><input className="field" value={city} onChange={e => setCity(e.target.value)} /></div>
                        <div className="just-doc-date"><label className="label">Data</label><input className="field" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
                      </div>
                      <div>
                        <label className="label">Motivo / fundamentação</label>
                        <textarea className="field" value={reason} onChange={e => setReason(e.target.value)}
                          placeholder="Descreva o motivo, datas e fatos relevantes…"
                          style={{ height: 96, resize: 'vertical', lineHeight: 1.5 }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div><label className="label">Testemunha 1</label><input className="field" placeholder="Nome · CPF" /></div>
                        <div><label className="label">Testemunha 2</label><input className="field" placeholder="Nome · CPF" /></div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
                        <button className="btn sm ghost" onClick={() => setSelected(null)}><Icon name="chevron-left" size={13} /> Voltar</button>
                        <span style={{ flex: 1 }} />
                        <button className="btn sm" onClick={handleGenerateDoc}><Icon name="eye" size={13} /> Pré-visualizar</button>
                        <button className="btn sm primary" onClick={async () => { await handleGenerateDoc(); setTimeout(() => window.print(), 200); }}>
                          <Icon name="print" size={13} /> Imprimir / PDF
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'documentos' && showPreview && tpl && (
          <PrintPreview
            tpl={tpl}
            employee={selectedEmp?.name || '—'}
            city={city}
            reason={reason}
            company={activeCompany}
            onBack={() => setShowPreview(false)}
            onPrint={() => window.print()}
            addToast={addToast}
          />
        )}

        {/* ── HISTÓRICO ── */}
        {tab === 'historico' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="just-hist-row">
              <input className="field just-hist-input" style={{ maxWidth: 260 }} placeholder="Filtrar por funcionário…"
                value={histFilter} onChange={e => setHistFilter(e.target.value)} />
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{filteredHistory.length} registro{filteredHistory.length !== 1 ? 's' : ''}</span>
            </div>
            {filteredHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--muted)', fontSize: 13 }}>
                Nenhum documento gerado ainda.
              </div>
            ) : (
              <>
              <div className="just-hist-table-wrap" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="just-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                        {[
                          { l: 'Data' },
                          { l: 'Documento' },
                          { l: 'Funcionário' },
                          { l: 'Emitido por', cls: 'just-col-emissor' },
                          { l: 'Status' },
                          { l: '' },
                        ].map((h, i) => (
                          <th key={i} className={h.cls} style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, whiteSpace: 'nowrap' }}>{h.l}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map(r => (
                        <tr key={r.id} style={{ borderTop: '1px solid var(--line-soft)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '11px 16px', fontFamily: 'monospace', fontSize: 12.5 }}>
                            {new Date(r.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td style={{ padding: '11px 16px', fontWeight: 500 }}>{r.template_title}</td>
                          <td style={{ padding: '11px 16px', color: 'var(--ink-soft)' }}>{r.employees?.name || '—'}</td>
                          <td className="just-col-emissor" style={{ padding: '11px 16px', color: 'var(--muted)', fontSize: 12.5 }}>{r.emitted_by || '—'}</td>
                          <td style={{ padding: '11px 16px' }}>
                            <span className={`pill ${r.status === 'Assinado' ? 'ok' : r.status === 'Homologado' ? 'info' : 'warn'}`}>
                              <span className="dot" />{r.status}
                            </span>
                          </td>
                          <td style={{ padding: '11px 16px' }}>
                            <RowMenu items={[
                              { label: 'Baixar PDF', icon: 'download', action: () => addToast({ kind: 'ok', msg: 'PDF baixado' }) },
                              { label: 'Imprimir', icon: 'print', action: () => addToast({ kind: 'ok', msg: 'Imprimindo…' }) },
                            ]} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cards — visíveis apenas no mobile */}
              <div className="just-hist-cards">
                {filteredHistory.map(r => (
                  <div key={r.id} className="just-hist-card">
                    <div className="just-hist-card-top">
                      <span className="just-hist-card-date">
                        {new Date(r.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      <span className={`pill ${r.status === 'Assinado' ? 'ok' : r.status === 'Homologado' ? 'info' : 'warn'}`}>
                        <span className="dot" />{r.status}
                      </span>
                      <RowMenu items={[
                        { label: 'Baixar PDF', icon: 'download', action: () => addToast({ kind: 'ok', msg: 'PDF baixado' }) },
                        { label: 'Imprimir', icon: 'print', action: () => addToast({ kind: 'ok', msg: 'Imprimindo…' }) },
                      ]} />
                    </div>
                    <div className="just-hist-card-title">{r.template_title}</div>
                    <div className="just-hist-card-row">
                      <span className="just-hist-card-lbl">Funcionário</span>
                      <span className="just-hist-card-val">{r.employees?.name || '—'}</span>
                    </div>
                    <div className="just-hist-card-row">
                      <span className="just-hist-card-lbl">Emitido por</span>
                      <span className="just-hist-card-val">{r.emitted_by || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </div>
        )}
      </div>

      {activeProcess && (
        <ProcessSlideOver
          process={activeProcess}
          onClose={() => setActiveProcess(null)}
          onSaved={() => { refetchCases(); setActiveProcess(null); }}
          addToast={addToast}
        />
      )}
      {showNewProcess && (
        <NewProcessModal
          onClose={() => setShowNewProcess(false)}
          onSaved={refetchCases}
          addToast={addToast}
          companyId={activeCompany?.id}
        />
      )}
    </>
  );
}

// ── PrintPreview ──────────────────────────────────────────────
function PrintPreview({ tpl, employee, city, reason, company, onBack, onPrint, addToast }) {
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const companyName = company?.name?.toUpperCase() || 'EMPRESA';
  const companyCnpj = company?.cnpj || '—';
  const companyAddress = company?.address || '—';

  return (
    <div className="orion-print-shell" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row gap-2 no-print" style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, position: 'sticky', top: 0, zIndex: 5 }}>
        <button className="btn" onClick={onBack}><Icon name="chevron-left" size={13} /> Editar</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Pré-visualização A4 · Margens 18mm</span>
        <span style={{ flex: 1 }} />
        <button className="btn" onClick={() => addToast?.({ kind: 'ok', msg: 'PDF salvo' })}>
          <Icon name="download" size={14} /> Salvar PDF
        </button>
        <button className="btn primary" onClick={onPrint}><Icon name="print" size={14} /> Imprimir</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 0 30px' }}>
        <div className="orion-print-page" style={{ width: 794, minHeight: 1123, padding: '68px 70px', background: '#ffffff', color: '#0B0D11', fontFamily: '"Manrope", sans-serif', lineHeight: 1.6, boxShadow: '0 8px 32px rgba(20,25,40,.10)', border: '1px solid var(--line)', borderRadius: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 18, borderBottom: '2px solid #0B0D11' }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, background: '#0B0D11', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <OrionGlyph size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3 }}>{companyName}</div>
              <div style={{ fontSize: 10.5, color: '#444', marginTop: 2 }}>CNPJ {companyCnpj} · {companyAddress}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 10.5, color: '#444' }}>
              <div style={{ fontWeight: 700, color: '#0B0D11' }}>Documento {tpl.id.toUpperCase()}</div>
              <div>Emitido em {today}</div>
            </div>
          </div>

          <h1 style={{ fontSize: 18, fontWeight: 800, textAlign: 'center', letterSpacing: 0.5, textTransform: 'uppercase', margin: '32px 0 28px' }}>{tpl.title}</h1>

          <div style={{ fontSize: 12, textAlign: 'justify' }}>
            <p style={{ margin: '0 0 14px' }}>
              Pelo presente instrumento particular, de um lado <b>{companyName}</b>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {companyCnpj}, com sede em {companyAddress}, doravante denominada <b>EMPREGADORA</b>, e de outro lado <b>{employee.toUpperCase()}</b>, residente e domiciliado(a) em {city}/SP, doravante denominado(a) <b>EMPREGADO(A)</b>, têm entre si justo e acordado o presente termo.
            </p>
            <h3 style={{ fontSize: 12.5, fontWeight: 800, margin: '20px 0 8px' }}>CLÁUSULA PRIMEIRA — DO OBJETO</h3>
            <p style={{ margin: '0 0 14px' }}>O presente instrumento tem por objeto formalizar a relação prevista neste documento ({tpl.title.toLowerCase()}), regida pela Consolidação das Leis do Trabalho (Decreto-Lei nº 5.452/1943) e pelas normas convencionais aplicáveis.</p>
            <h3 style={{ fontSize: 12.5, fontWeight: 800, margin: '20px 0 8px' }}>CLÁUSULA SEGUNDA — DA FUNDAMENTAÇÃO</h3>
            <p style={{ margin: '0 0 14px', whiteSpace: 'pre-wrap' }}>{reason || '_______________________________________________________________________________________________________________'}</p>
            <h3 style={{ fontSize: 12.5, fontWeight: 800, margin: '20px 0 8px' }}>CLÁUSULA TERCEIRA — DA CIÊNCIA</h3>
            <p style={{ margin: '0 0 14px' }}>O(a) <b>EMPREGADO(A)</b> declara ter recebido cópia integral do presente instrumento e estar ciente de seus efeitos jurídicos.</p>
            <p style={{ margin: '32px 0 0' }}>E, por estarem assim justos e contratados, firmam o presente em 02 (duas) vias de igual teor, na presença das testemunhas abaixo.</p>
            <p style={{ margin: '20px 0 60px', textAlign: 'right' }}>{city}, {today}.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 50, marginTop: 30 }}>
              <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #0B0D11', paddingTop: 8, fontSize: 11 }}><div style={{ fontWeight: 700 }}>{companyName}</div><div style={{ color: '#444', marginTop: 2 }}>Empregadora · CNPJ {companyCnpj}</div></div></div>
              <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #0B0D11', paddingTop: 8, fontSize: 11 }}><div style={{ fontWeight: 700 }}>{employee.toUpperCase()}</div><div style={{ color: '#444', marginTop: 2 }}>Empregado(a)</div></div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 50, marginTop: 50 }}>
              <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #0B0D11', paddingTop: 8, fontSize: 11 }}><div style={{ fontWeight: 700 }}>Testemunha 1</div><div style={{ color: '#444', marginTop: 2 }}>Nome · CPF</div></div></div>
              <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #0B0D11', paddingTop: 8, fontSize: 11 }}><div style={{ fontWeight: 700 }}>Testemunha 2</div><div style={{ color: '#444', marginTop: 2 }}>Nome · CPF</div></div></div>
            </div>
          </div>

          <div style={{ marginTop: 50, paddingTop: 12, borderTop: '1px solid #ccc', fontSize: 9.5, color: '#666', display: 'flex', justifyContent: 'space-between' }}>
            <span>Documento gerado por Orion Gestão · {tpl.id}</span>
            <span>Página 1 de {tpl.pages}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
