import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../components/Icon.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { useAllDocuments, useEmployees, logAudit } from '../hooks/useEmployees.js';
import { supabase } from '../lib/supabase.js';
import { usePermissions } from '../lib/permissions.jsx';

const CATEGORIES = [
  { id: 'contratos',     name: 'Contratos',       icon: 'doc',         color: '#2A5BFF' },
  { id: 'rg-cpf',       name: 'RG / CPF',         icon: 'user',        color: '#1F8A5B' },
  { id: 'holerites',    name: 'Holerites',         icon: 'pdf',         color: '#C58A1B' },
  { id: 'atestados',    name: 'Atestados',         icon: 'image',       color: '#C2412C' },
  { id: 'advertencias', name: 'Advertências',      icon: 'alert',       color: '#a855f7' },
  { id: 'ferias',       name: 'Férias',            icon: 'umbrella',    color: '#0891b2' },
  { id: 'juridico',     name: 'Jurídico',          icon: 'shield',      color: '#475569' },
  { id: 'exames',       name: 'Exames Médicos',    icon: 'fingerprint', color: '#db2777' },
  { id: 'ponto',        name: 'Cartão de Ponto',   icon: 'clock',       color: '#0f766e' },
];

const DOC_EXTRA_FIELDS = {
  contratos: [
    { key: 'tipo_contrato',  label: 'Tipo de contrato',  type: 'select', options: ['CLT', 'PJ', 'Estágio', 'Temporário', 'Intermitente', 'Autônomo'] },
    { key: 'vigencia_inicio', label: 'Início da vigência', type: 'date' },
    { key: 'vigencia_fim',    label: 'Fim da vigência',    type: 'date' },
  ],
  holerites: [
    { key: 'mes_ref', label: 'Mês de referência', type: 'select', options: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'] },
    { key: 'ano_ref', label: 'Ano',               type: 'text',   placeholder: '2025' },
  ],
  atestados: [
    { key: 'cid',    label: 'CID',                 type: 'text', placeholder: 'ex: A09' },
    { key: 'dias',   label: 'Dias de afastamento', type: 'text', placeholder: 'ex: 3' },
    { key: 'medico', label: 'Médico / CRM',        type: 'text', placeholder: 'ex: Dr. Silva CRM-12345' },
  ],
  'rg-cpf': [
    { key: 'tipo_doc', label: 'Tipo',                type: 'select', options: ['RG', 'CPF', 'RNE', 'CNH', 'Passaporte'] },
    { key: 'numero',   label: 'Número do documento', type: 'text',   placeholder: 'ex: 12.345.678-9' },
  ],
  exames: [
    { key: 'tipo_exame', label: 'Tipo de exame', type: 'select', options: ['Admissional', 'Periódico', 'Demissional', 'Retorno ao trabalho', 'Mudança de função'] },
    { key: 'resultado',  label: 'Resultado',      type: 'select', options: ['Apto', 'Apto com restrições', 'Inapto'] },
    { key: 'medico',     label: 'Médico / CRM',   type: 'text',   placeholder: 'ex: Dr. Silva CRM-12345' },
  ],
  ferias: [
    { key: 'aq_inicio',   label: 'Período aquisitivo — de',  type: 'date' },
    { key: 'aq_fim',      label: 'Período aquisitivo — até', type: 'date' },
    { key: 'gozo_inicio', label: 'Período de gozo — de',     type: 'date' },
    { key: 'gozo_fim',    label: 'Período de gozo — até',    type: 'date' },
  ],
  advertencias: [
    { key: 'tipo_adv', label: 'Tipo',   type: 'select', options: ['Verbal', 'Escrita — 1ª', 'Escrita — 2ª', 'Suspensão'] },
    { key: 'motivo',   label: 'Motivo', type: 'textarea' },
  ],
  juridico: [
    { key: 'tipo_juridico',   label: 'Tipo',           type: 'select', options: ['Processo trabalhista', 'Notificação extrajudicial', 'Acordo', 'Sentença', 'Recurso', 'Outro'] },
    { key: 'numero_processo', label: 'Nº do processo', type: 'text',   placeholder: 'ex: 0001234-56.2025.5.00.0000' },
  ],
  ponto: [
    { key: 'mes_ref',    label: 'Mês de referência', type: 'select', options: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'] },
    { key: 'ano_ref',    label: 'Ano',               type: 'text',   placeholder: '2025' },
    { key: 'periodo',    label: 'Período',           type: 'select', options: ['Mensal', 'Quinzenal — 1ª', 'Quinzenal — 2ª', 'Semanal'] },
    { key: 'total_horas', label: 'Total de horas',   type: 'text',   placeholder: 'ex: 176h' },
  ],
};

const STATUS_MAP = {
  ok:      { label: 'OK',          cls: 'ok'   },
  warn:    { label: 'Atenção',     cls: 'warn' },
  bad:     { label: 'Crítico',     cls: 'bad'  },
  pending: { label: 'Pendente',    cls: 'warn' },
  sign:    { label: 'Assinatura',  cls: 'info' },
};

// Campo de data com máscara DD/MM/AAAA
function DateInput({ value, onChange }) {
  const toDisplay = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };
  const [display, setDisplay] = useState(() => toDisplay(value));
  useEffect(() => { setDisplay(toDisplay(value)); }, [value]);
  const handleChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    let masked = raw;
    if (raw.length > 4) masked = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4);
    else if (raw.length > 2) masked = raw.slice(0, 2) + '/' + raw.slice(2);
    setDisplay(masked);
    if (raw.length === 8) onChange({ target: { value: `${raw.slice(4, 8)}-${raw.slice(2, 4)}-${raw.slice(0, 2)}` } });
    else onChange({ target: { value: '' } });
  };
  return (
    <input type="text" className="field" value={display} onChange={handleChange}
      placeholder="DD/MM/AAAA" maxLength={10} inputMode="numeric" />
  );
}

function FileIcon({ type, color, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.22,
      background: (color || '#888') + '18', color: color || 'var(--muted)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon name={type === 'image' ? 'image' : 'pdf'} size={size * 0.5} />
    </div>
  );
}

// ============================================================
// MODAL — Adicionar Documento (com "Adicionar e continuar")
// ============================================================
function AddDocModal({ onClose, onSaved, employees = [], companyId = null }) {
  const [cat, setCat]       = useState(null);
  const [catOpen, setCatOpen] = useState(false);
  const [catRect, setCatRect] = useState(null);
  const catRef = useRef(null);
  const catTriggerRef = useRef(null);
  const [form, setForm]     = useState({ name: '', doc_date: '', employee_id: '', file: null });
  const [extras, setExtras] = useState({});
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const fileRef = useRef();
  const cameraRef = useRef();
  const isMobile = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  useEffect(() => {
    if (!catOpen) return;
    const handler = (e) => {
      const insideTrigger = catTriggerRef.current && catTriggerRef.current.contains(e.target);
      const insidePanel = e.target.closest?.('[data-cat-panel]');
      if (!insideTrigger && !insidePanel) setCatOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [catOpen]);

  const toggleCat = () => {
    if (!catOpen && catTriggerRef.current) {
      setCatRect(catTriggerRef.current.getBoundingClientRect());
    }
    setCatOpen(o => !o);
  };

  const catMeta    = CATEGORIES.find(c => c.id === cat);
  const extraFields = DOC_EXTRA_FIELDS[cat] ?? [];
  const setEx = (k, v) => setExtras(e => ({ ...e, [k]: v }));

  const resetForm = () => {
    setForm({ name: '', doc_date: '', employee_id: '', file: null });
    setExtras({});
  };

  const doSave = async () => {
    if (!form.name.trim()) return false;
    setSaving(true);
    const notes = Object.keys(extras).length ? JSON.stringify(extras) : null;
    const file  = form.file;

    let file_url = null;
    if (file) {
      const ext  = file.name.split('.').pop();
      const empId = form.employee_id || 'empresa';
      const path = `${empId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('employee-documents')
        .upload(path, file, { upsert: false });
      if (uploadErr) { alert('Erro no upload: ' + uploadErr.message); setSaving(false); return false; }
      const { data: urlData } = supabase.storage.from('employee-documents').getPublicUrl(path);
      file_url = urlData?.publicUrl ?? null;
    }

    const row = {
      employee_id:  form.employee_id || null,
      company_id:   companyId,
      name:         form.name.trim(),
      category:     cat,
      doc_date:     form.doc_date || null,
      notes,
      file_url,
      size: file ? `${(file.size / 1024).toFixed(0)} KB` : null,
      type: file ? (file.type?.includes('image') ? 'image' : 'pdf') : 'pdf',
      status: 'ok',
      uploaded_by: userId,
    };

    const { error } = await supabase.from('documents').insert(row);
    setSaving(false);
    if (error) { alert('Erro: ' + error.message); return false; }
    logAudit(companyId, 'UPLOAD', `Documento: ${form.name.trim()}`);
    onSaved?.();
    return true;
  };

  const handleSave = async () => {
    const ok = await doSave();
    if (ok) onClose();
  };

  const handleSaveAndContinue = async () => {
    const ok = await doSave();
    if (ok) { resetForm(); setCat(null); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(8px,3vh,32px) clamp(8px,2vw,24px)',
      overflowY: 'auto',
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 520,
        background: 'var(--surface)', borderRadius: 16,
        boxShadow: '0 32px 80px rgba(0,0,0,.25)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        maxHeight: 'min(90vh, 700px)',
        margin: 'auto',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Novo documento</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
              {cat ? 'Preencha os dados do documento' : 'Selecione a categoria abaixo para começar'}
            </div>
          </div>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={15} /></button>
        </div>

        <div className="scroll-hidden" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Categoria — dropdown */}
              <div ref={catRef} style={{ display: 'flex', flexDirection: 'column', gap: 5, position: 'relative' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Categoria *</label>
                <button
                  type="button"
                  ref={catTriggerRef}
                  onClick={toggleCat}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8,
                    border: `1px solid ${catOpen ? 'var(--brand)' : 'var(--line)'}`,
                    background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer',
                    fontSize: 13.5, fontWeight: 500, textAlign: 'left',
                    boxShadow: catOpen ? '0 0 0 2px var(--brand-tint)' : 'none',
                  }}
                >
                  {catMeta ? (
                    <>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: catMeta.color + '1f', color: catMeta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name={catMeta.icon} size={14} />
                      </div>
                      <span style={{ flex: 1, fontWeight: 600 }}>{catMeta.name}</span>
                    </>
                  ) : (
                    <span style={{ flex: 1, color: 'var(--muted)' }}>Selecione uma categoria…</span>
                  )}
                  <Icon name="chevron-down" size={14} style={{ color: 'var(--muted)', transform: catOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
                </button>

                {catOpen && catRect && createPortal(
                  <div
                    data-cat-panel
                    style={{
                      position: 'fixed',
                      top: catRect.bottom + 4,
                      left: catRect.left,
                      width: catRect.width,
                      background: 'var(--surface)', border: '1px solid var(--line)',
                      borderRadius: 10, zIndex: 500, overflow: 'hidden',
                      boxShadow: '0 10px 30px rgba(0,0,0,.14), 0 2px 6px rgba(0,0,0,.06)',
                      maxHeight: Math.min(320, window.innerHeight - catRect.bottom - 16),
                      overflowY: 'auto',
                    }}>
                    {CATEGORIES.map(c => {
                      const isActive = c.id === cat;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            if (c.id !== cat) { setCat(c.id); resetForm(); }
                            setCatOpen(false);
                          }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '9px 12px', border: 'none', background: isActive ? 'var(--brand-tint)' : 'transparent',
                            cursor: 'pointer', textAlign: 'left', fontSize: 13,
                            color: isActive ? 'var(--brand)' : 'var(--ink)',
                            fontWeight: isActive ? 600 : 500,
                          }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--hover)'; }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{ width: 26, height: 26, borderRadius: 6, background: c.color + '1f', color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon name={c.icon} size={13} />
                          </div>
                          <span style={{ flex: 1 }}>{c.name}</span>
                          {isActive && <Icon name="check" size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />}
                        </button>
                      );
                    })}
                  </div>,
                  document.body
                )}
              </div>

              {!cat && (
                <div style={{ padding: '20px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px dashed var(--line)', textAlign: 'center', fontSize: 12.5, color: 'var(--muted)' }}>
                  Selecione uma categoria acima para preencher os campos.
                </div>
              )}

              {cat && (
                <>

              {/* Funcionário / Empresa */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Pertence a *</label>
                <select
                  className="field"
                  value={form.employee_id}
                  onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                >
                  <option value="">— Empresa (sem vínculo com funcionário) —</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}{emp.dept ? ` · ${emp.dept}` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Nome */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Nome do documento *</label>
                <input className="field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Contrato de trabalho João" />
              </div>

              {/* Data */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Data do documento</label>
                <DateInput value={form.doc_date} onChange={e => setForm(f => ({ ...f, doc_date: e.target.value }))} />
              </div>

              {/* Campos extras por categoria */}
              {extraFields.map(field => (
                <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{field.label}</label>
                  {field.type === 'select' ? (
                    <select className="field" value={extras[field.key] ?? ''} onChange={e => setEx(field.key, e.target.value)}>
                      <option value="">Selecione…</option>
                      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : field.type === 'date' ? (
                    <DateInput value={extras[field.key] ?? ''} onChange={e => setEx(field.key, e.target.value)} />
                  ) : field.type === 'textarea' ? (
                    <textarea className="field" rows={3} style={{ resize: 'vertical' }} value={extras[field.key] ?? ''} onChange={e => setEx(field.key, e.target.value)} placeholder={field.placeholder} />
                  ) : (
                    <input className="field" value={extras[field.key] ?? ''} onChange={e => setEx(field.key, e.target.value)} placeholder={field.placeholder} />
                  )}
                </div>
              ))}

              {/* Arquivo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Arquivo</label>
                <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))} />
                {isMobile && (
                  <input
                    ref={cameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))}
                  />
                )}
                <div
                  style={{ border: '1.5px dashed var(--line)', borderRadius: 8, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: form.file ? 'var(--brand-tint)' : 'transparent' }}
                  onClick={() => fileRef.current?.click()}
                >
                  <Icon name={form.file ? 'check' : 'upload'} size={16} style={{ color: form.file ? 'var(--brand)' : 'var(--muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: form.file ? 'var(--ink)' : 'var(--muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {form.file ? form.file.name : isMobile ? 'Selecionar do dispositivo' : 'Clique para selecionar um arquivo'}
                  </span>
                  {form.file && <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{(form.file.size / 1024).toFixed(0)} KB</span>}
                </div>
                {isMobile && (
                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    style={{
                      marginTop: 6,
                      border: '1.5px solid var(--brand)',
                      borderRadius: 8,
                      padding: '12px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: 'var(--brand-tint)',
                      color: 'var(--brand)',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <Icon name="camera" size={16} />
                    Tirar foto do documento
                  </button>
                )}
              </div>
                </>
              )}
            </div>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <span style={{ flex: 1 }} />
          <button
            className="btn"
            onClick={handleSaveAndContinue}
            disabled={saving || !cat || !form.name.trim()}
            title="Salva e abre um novo documento"
          >
            <Icon name="plus" size={13} /> Adicionar e continuar
          </button>
          <button
            className="btn primary"
            onClick={handleSave}
            disabled={saving || !cat || !form.name.trim()}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TABS DE CATEGORIA
// ============================================================
function CategoryTabs({ categories, activeCat, docCounts, totalCount, onSelect }) {
  return (
    <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--line)', flexShrink: 0, scrollbarWidth: 'none' }}>
      <button
        onClick={() => onSelect(null)}
        style={{ flexShrink: 0, border: 'none', borderBottom: activeCat == null ? '2px solid var(--brand)' : '2px solid transparent', background: 'transparent', padding: '8px 14px', fontSize: 12.5, fontWeight: activeCat == null ? 700 : 500, color: activeCat == null ? 'var(--brand)' : 'var(--muted)', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        Todos
        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 10, background: activeCat == null ? 'var(--brand-tint)' : 'var(--surface-2)', color: activeCat == null ? 'var(--brand)' : 'var(--muted)' }}>
          {totalCount}
        </span>
      </button>
      {categories.filter(c => docCounts[c.id] > 0).map(c => (
        <button
          key={c.id}
          onClick={() => onSelect(activeCat === c.id ? null : c.id)}
          style={{ flexShrink: 0, border: 'none', borderBottom: activeCat === c.id ? `2px solid ${c.color}` : '2px solid transparent', background: 'transparent', padding: '8px 14px', fontSize: 12.5, fontWeight: activeCat === c.id ? 700 : 500, color: activeCat === c.id ? c.color : 'var(--muted)', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Icon name={c.icon} size={12} />
          {c.name}
          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 10, background: activeCat === c.id ? c.color + '20' : 'var(--surface-2)', color: activeCat === c.id ? c.color : 'var(--muted)' }}>
            {docCounts[c.id]}
          </span>
        </button>
      ))}
    </div>
  );
}

// ============================================================
// PAINEL DE FILTROS (apenas período)
// ============================================================
function DocFilterPanel({ filters, onChange, onClear, anchorRect, onClose }) {
  const ref = useRef();

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  if (!anchorRect) return null;
  const top  = anchorRect.bottom + 6;
  const left = Math.max(8, anchorRect.right - 256);

  return createPortal(
    <div ref={ref} style={{
      position: 'fixed', top, left, width: 256,
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,.15)',
      zIndex: 500, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--muted)' }}>Período</span>
        <button className="btn ghost sm" style={{ fontSize: 11, padding: '2px 8px' }} onClick={onClear}>Limpar</button>
      </div>
      <div>
        <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>De</label>
        <DateInput value={filters.dateFrom} onChange={e => onChange('dateFrom', e.target.value)} />
      </div>
      <div>
        <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Até</label>
        <DateInput value={filters.dateTo} onChange={e => onChange('dateTo', e.target.value)} />
      </div>
    </div>,
    document.body
  );
}

// ============================================================
// MODAL — Visualizar Documento
// ============================================================
function DocPreviewModal({ doc, onClose }) {
  const cm = CATEGORIES.find(c => c.id === doc.cat);

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = doc.file_url;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.click();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(6px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(8px,2vw,24px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 920, maxHeight: '90vh',
          background: 'var(--surface)', borderRadius: 16,
          boxShadow: '0 32px 80px rgba(0,0,0,.5)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <FileIcon type={doc.type} color={cm?.color} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
              {cm && <span style={{ color: cm.color, fontWeight: 600 }}>{cm.name}</span>}
              {cm && ' · '}{doc.who} · {doc.date}
            </div>
          </div>
          {doc.file_url && (
            <button className="btn sm" onClick={handleDownload}>
              <Icon name="download" size={13} /> Baixar
            </button>
          )}
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={15} /></button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', background: 'var(--bg)', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!doc.file_url ? (
            <div style={{ padding: 64, textAlign: 'center', color: 'var(--muted)' }}>
              <Icon name="folder" size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>Arquivo não disponível</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Este documento não tem arquivo anexado.</div>
            </div>
          ) : doc.type === 'image' ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <img src={doc.file_url} alt={doc.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
            </div>
          ) : (
            <iframe
              src={doc.file_url}
              title={doc.name}
              style={{ width: '100%', height: '100%', border: 'none', minHeight: 520 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocumentsScreen({ addToast, activeCompany, openModal }) {
  const { can } = usePermissions();
  const [filters, setFilters] = useState({ cat: null, dateFrom: '', dateTo: '' });
  const [view, setView]       = useState('list');
  const [search, setSearch]   = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(!!openModal);
  const [filterOpen, setFilterOpen]     = useState(false);
  const [filterRect, setFilterRect]     = useState(null);
  const [previewDoc, setPreviewDoc]     = useState(null);
  const filterBtnRef = useRef();

  const { documents: raw, loading, error, refetch } = useAllDocuments(activeCompany?.id);
  const { employees } = useEmployees({ companyId: activeCompany?.id });

  const docs = raw
    .map(d => ({
      id: d.id,
      name: d.name,
      cat: d.category,
      size: d.size,
      who: d.employees?.name || 'Empresa',
      date: d.doc_date
        ? new Date(d.doc_date + 'T00:00:00').toLocaleDateString('pt-BR')
        : new Date(d.created_at).toLocaleDateString('pt-BR'),
      isoDate: d.doc_date || d.created_at?.slice(0, 10) || '',
      type: d.type || 'pdf',
      status: d.status || 'ok',
      file_url: d.file_url,
    }));

  const docCounts = CATEGORIES.reduce((acc, c) => {
    acc[c.id] = docs.filter(d => d.cat === c.id).length;
    return acc;
  }, {});

  const filtered = docs.filter(d => {
    if (filters.cat && d.cat !== filters.cat) return false;
    if (filters.dateFrom && d.isoDate < filters.dateFrom) return false;
    if (filters.dateTo   && d.isoDate > filters.dateTo)   return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) &&
        !d.who.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeFilterCount = [!!filters.dateFrom, !!filters.dateTo].filter(Boolean).length;

  const toggleFilter = () => {
    if (!filterOpen) setFilterRect(filterBtnRef.current?.getBoundingClientRect() ?? null);
    setFilterOpen(v => !v);
  };
  const handleFilterChange = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const clearFilters       = () => setFilters({ cat: null, dateFrom: '', dateTo: '' });
  const clearDateFilters   = () => setFilters(f => ({ ...f, dateFrom: '', dateTo: '' }));

  const handleDelete = useCallback(async () => {
    if (!selected.size) return;
    setDeleting(true);
    const ids = [...selected];
    const { error: delErr } = await supabase.from('documents').delete().in('id', ids);
    setDeleting(false);
    if (delErr) addToast({ kind: 'bad', msg: 'Erro ao excluir: ' + delErr.message });
    else { addToast({ kind: 'ok', msg: `${ids.length} documento(s) excluído(s)` }); setSelected(new Set()); refetch(); }
  }, [selected, addToast, refetch]);

  const toggleSelect = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const allSelected  = filtered.length > 0 && filtered.every(d => selected.has(d.id));
  const someSelected = filtered.some(d => selected.has(d.id)) && !allSelected;
  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(d => d.id)));
  };

  return (
    <div
      className="fade-up"
      style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, height: '100%', boxSizing: 'border-box', position: 'relative' }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); }}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); setShowAddModal(true); }}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'var(--brand-tint)', border: '2px dashed var(--brand)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, backdropFilter: 'blur(2px)' }}>
          <Icon name="upload" size={40} style={{ color: 'var(--brand)' }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand)' }}>Solte para adicionar documento</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>PDF, JPG, PNG, DOCX até 20 MB</div>
        </div>
      )}

      {/* Page header */}
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <div className="grow">
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Documentos</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Contratos, holerites, atestados e toda a documentação da equipe.</p>
        </div>
        {can('Documentos', 'upload') && (
          <button className="btn primary" onClick={() => setShowAddModal(true)}>
            <Icon name="plus" size={15} /> Novo documento
          </button>
        )}
      </div>

      {/* Card with toolbar + table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* Toolbar */}
        <div className="row" style={{ padding: '8px 16px', borderBottom: '1px solid var(--line)', gap: 8, flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={13} style={{ position: 'absolute', left: 9, top: 10, color: 'var(--muted)' }} />
            <input
              className="field"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou funcionário…"
              style={{ width: 260, paddingLeft: 30, height: 34, fontSize: 13 }}
            />
          </div>
          <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center', marginLeft: 4 }}>
            {filtered.length} {filtered.length === 1 ? 'arquivo' : 'arquivos'}
          </span>
          <span className="grow" />

          {/* Filtro de período */}
          <button
            ref={filterBtnRef}
            className="btn sm"
            onClick={toggleFilter}
            style={{ background: activeFilterCount > 0 ? 'var(--brand-tint)' : undefined, color: activeFilterCount > 0 ? 'var(--brand)' : undefined, borderColor: activeFilterCount > 0 ? 'var(--brand)' : undefined }}
          >
            <Icon name="filter" size={13} /> Período
            {activeFilterCount > 0 && (
              <span style={{ background: 'var(--brand)', color: 'var(--brand-ink)', borderRadius: 20, fontSize: 10, fontWeight: 700, padding: '1px 6px', marginLeft: 4 }}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 7, overflow: 'hidden' }}>
            {[['list','dashboard'],['grid','folder']].map(([v, icon]) => (
              <button key={v} onClick={() => setView(v)} style={{ border: 'none', padding: '6px 9px', cursor: 'pointer', background: view === v ? 'var(--hover)' : 'transparent', color: 'var(--ink)' }}>
                <Icon name={icon} size={13} />
              </button>
            ))}
          </div>
        </div>

        {/* Category tabs */}
        <CategoryTabs
          categories={CATEGORIES}
          activeCat={filters.cat}
          docCounts={docCounts}
          totalCount={docs.length}
          onSelect={cat => handleFilterChange('cat', cat)}
        />

        {/* Selection bar */}
        {selected.size > 0 && (
          <div style={{ padding: '8px 16px', background: 'var(--brand-tint)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, flexShrink: 0 }}>
            <strong>{selected.size} selecionados</strong>
            <span className="grow" />
            <button className="btn sm"><Icon name="download" size={13} /> Baixar</button>
            <button className="btn sm" style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }} onClick={handleDelete} disabled={deleting}>
              <Icon name="trash" size={13} /> {deleting ? 'Excluindo…' : 'Excluir'}
            </button>
            <button className="btn ghost sm icon" onClick={() => setSelected(new Set())}><Icon name="x" size={13} /></button>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            view === 'list' ? (
              <div style={{ padding: 0 }}>
                {Array.from({ length: 3 }, (_, gi) => (
                  <div key={gi} style={{ borderBottom: '1px solid var(--line)' }}>
                    {/* Cabeçalho de grupo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--surface-2)' }}>
                      <Skeleton width={18} height={18} radius={4} />
                      <Skeleton height={13} style={{ maxWidth: 160, flex: 1 }} />
                      <Skeleton width={36} height={14} />
                    </div>
                    {/* Linhas de docs */}
                    {Array.from({ length: 3 }, (__, di) => (
                      <div key={di} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderTop: '1px solid var(--line-soft)' }}>
                        <Skeleton width={14} height={14} radius={3} />
                        <Skeleton width={28} height={28} radius={6} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Skeleton height={13} style={{ marginBottom: 5, maxWidth: '70%' }} />
                          <Skeleton height={11} style={{ maxWidth: '40%' }} />
                        </div>
                        <Skeleton width={70} height={12} />
                        <Skeleton width={20} height={20} radius={4} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="card" style={{ padding: 14 }}>
                    <Skeleton height={90} radius={8} style={{ marginBottom: 12 }} />
                    <Skeleton height={13} style={{ marginBottom: 6, maxWidth: '85%' }} />
                    <Skeleton height={11} style={{ maxWidth: '55%' }} />
                  </div>
                ))}
              </div>
            )
          ) : error ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--bad)', fontSize: 13 }}>
              <Icon name="alert" size={28} style={{ opacity: 0.5, marginBottom: 10 }} />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Erro ao carregar documentos</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{error}</div>
              <button className="btn sm" style={{ marginTop: 14 }} onClick={refetch}>Tentar novamente</button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 64, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              <Icon name="folder" size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Nenhum documento</div>
              <div style={{ fontSize: 12 }}>{search || activeFilterCount > 0 ? 'Tente ajustar os filtros' : 'Clique em "Novo documento" para começar'}</div>
            </div>
          ) : view === 'list' ? (
            <GroupedListView
              docs={filtered}
              categories={CATEGORIES}
              selected={selected}
              onToggle={toggleSelect}
              onPreview={setPreviewDoc}
            />
          ) : (
            <GridView docs={filtered} categories={CATEGORIES} onPreview={setPreviewDoc} />
          )}
        </div>
      </div>

      {filterOpen && (
        <DocFilterPanel
          filters={filters}
          onChange={handleFilterChange}
          onClear={clearDateFilters}
          anchorRect={filterRect}
          onClose={() => setFilterOpen(false)}
        />
      )}

      {showAddModal && (
        <AddDocModal
          employees={employees}
          companyId={activeCompany?.id ?? null}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { refetch(); addToast({ kind: 'ok', msg: 'Documento adicionado' }); }}
        />
      )}

      {previewDoc && (
        <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  );
}

// ============================================================
// DOC ROW (linha individual dentro de um grupo)
// ============================================================
function DocRow({ doc: f, cm, checked, onToggle, onPreview }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid var(--line-soft)', background: hovered || checked ? 'var(--hover)' : 'transparent', transition: 'background .1s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ padding: '9px 16px', width: 36, flexShrink: 0 }} onClick={e => { e.stopPropagation(); onToggle(f.id); }}>
        <input type="checkbox" checked={checked} onChange={() => onToggle(f.id)} style={{ accentColor: 'var(--brand)', cursor: 'pointer' }} />
      </div>

      <div style={{ flex: 1, padding: '9px 16px 9px 0', minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <FileIcon type={f.type} color={cm?.color} size={28} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
          {cm && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 600, color: cm.color, marginTop: 1 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: cm.color, flexShrink: 0 }} />
              {cm.name}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '9px 16px', color: 'var(--muted)', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {f.date}
      </div>

      <div style={{ padding: '9px 12px', flexShrink: 0, display: 'flex', gap: 2, justifyContent: 'flex-end', width: 76, opacity: hovered || checked ? 1 : 0, pointerEvents: hovered || checked ? 'auto' : 'none', transition: 'opacity .12s' }}>
        {f.file_url && <>
          <button className="btn ghost icon sm" title="Visualizar" onClick={e => { e.stopPropagation(); onPreview(f); }}><Icon name="eye" size={13} /></button>
          <button className="btn ghost icon sm" title="Baixar" onClick={e => { e.stopPropagation(); window.open(f.file_url, '_blank'); }}><Icon name="download" size={13} /></button>
        </>}
      </div>
    </div>
  );
}

// ============================================================
// GROUPED LIST VIEW — agrupa por funcionário
// ============================================================
function GroupedListView({ docs, categories, selected, onToggle, onPreview }) {
  const [collapsed, setCollapsed] = useState(new Set());

  const groups = useMemo(() => {
    const map = new Map();
    docs.forEach(d => {
      if (!map.has(d.who)) map.set(d.who, []);
      map.get(d.who).push(d);
    });
    return [...map.entries()].sort(([a], [b]) => {
      if (a === 'Empresa') return 1;
      if (b === 'Empresa') return -1;
      return a.localeCompare(b, 'pt-BR');
    });
  }, [docs]);

  const toggle = (key) => setCollapsed(s => {
    const n = new Set(s);
    n.has(key) ? n.delete(key) : n.add(key);
    return n;
  });

  return (
    <div>
      {groups.map(([name, groupDocs]) => {
        const isOpen = !collapsed.has(name);
        return (
          <div key={name}>
            <div
              onClick={() => toggle(name)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', cursor: 'pointer', background: 'var(--surface-2)', borderTop: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 2, userSelect: 'none' }}
            >
              <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={11} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>{name}</span>
              <span style={{ fontSize: 10.5, color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '0 6px', fontWeight: 600 }}>
                {groupDocs.length}
              </span>
            </div>
            {isOpen && groupDocs.map(f => {
              const cm = categories.find(c => c.id === f.cat);
              return <DocRow key={f.id} doc={f} cm={cm} checked={selected.has(f.id)} onToggle={onToggle} onPreview={onPreview} />;
            })}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// GRID VIEW
// ============================================================
function GridView({ docs, categories, onPreview }) {
  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, alignContent: 'start' }}>
      {docs.map(f => {
        const cm = categories.find(c => c.id === f.cat);
        return (
          <div
            key={f.id}
            onClick={() => f.file_url && onPreview(f)}
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 14, cursor: f.file_url ? 'pointer' : 'default', transition: 'box-shadow .15s, border-color .15s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.08)'; e.currentTarget.style.borderColor = cm?.color || 'var(--line)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--line)'; }}
          >
            <div style={{ height: 76, borderRadius: 7, marginBottom: 10, background: (cm?.color || '#888') + '10', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: '1px solid ' + (cm?.color || 'var(--line)') + '22' }}>
              {f.file_url && f.type === 'image' ? (
                <img src={f.file_url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 7 }} />
              ) : (
                <Icon name={f.type === 'image' ? 'image' : 'pdf'} size={28} style={{ color: cm?.color || 'var(--muted-2)' }} />
              )}
              {cm && (
                <span style={{ position: 'absolute', bottom: 5, left: 5, fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: cm.color + '22', color: cm.color, border: `1px solid ${cm.color}33` }}>
                  {cm.name}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{f.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{f.who}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{f.date}</div>
          </div>
        );
      })}
    </div>
  );
}
