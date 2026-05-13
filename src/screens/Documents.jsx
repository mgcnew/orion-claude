import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../components/Icon.jsx';
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
  const [step, setStep]     = useState('category');
  const [cat, setCat]       = useState(null);
  const [form, setForm]     = useState({ name: '', doc_date: '', employee_id: '', file: null });
  const [extras, setExtras] = useState({});
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

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
    if (ok) { resetForm(); setStep('category'); setCat(null); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(8px,2vw,24px)',
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: step === 'category' ? 560 : 500,
        background: 'var(--surface)', borderRadius: 16,
        boxShadow: '0 32px 80px rgba(0,0,0,.25)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        maxHeight: 'calc(100vh - 32px)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {step === 'form' && (
            <button className="btn ghost icon sm" onClick={() => setStep('category')}>
              <Icon name="chevron-left" size={14} />
            </button>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {step === 'category' ? 'Novo documento' : catMeta?.name}
            </div>
            {step === 'form' && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>Preencha os dados do documento</div>
            )}
          </div>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={15} /></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {step === 'category' ? (
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setCat(c.id); resetForm(); setStep('form'); }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 8, padding: '16px 10px', borderRadius: 10, cursor: 'pointer',
                    border: '1px solid var(--line)', background: 'var(--surface)', textAlign: 'center',
                    transition: 'border-color .15s, background .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.background = c.color + '10'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--surface)'; }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: c.color + '1f', color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={c.icon} size={17} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, color: 'var(--ink)' }}>{c.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

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
                <div
                  style={{ border: '1.5px dashed var(--line)', borderRadius: 8, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: form.file ? 'var(--brand-tint)' : 'transparent' }}
                  onClick={() => fileRef.current?.click()}
                >
                  <Icon name={form.file ? 'check' : 'upload'} size={16} style={{ color: form.file ? 'var(--brand)' : 'var(--muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: form.file ? 'var(--ink)' : 'var(--muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {form.file ? form.file.name : 'Clique para selecionar um arquivo'}
                  </span>
                  {form.file && <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{(form.file.size / 1024).toFixed(0)} KB</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {step === 'form' && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
            <button className="btn ghost" onClick={onClose}>Cancelar</button>
            <span style={{ flex: 1 }} />
            <button
              className="btn"
              onClick={handleSaveAndContinue}
              disabled={saving || !form.name.trim()}
              title="Salva e abre um novo documento"
            >
              <Icon name="plus" size={13} /> Adicionar e continuar
            </button>
            <button
              className="btn primary"
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PAINEL DE FILTROS
// ============================================================
function DocFilterPanel({ filters, onChange, onClear, anchorRect, onClose, docCounts }) {
  const ref = useRef();

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  if (!anchorRect) return null;
  const top  = anchorRect.bottom + 6;
  const left = Math.max(8, anchorRect.right - 320);

  return createPortal(
    <div ref={ref} style={{
      position: 'fixed', top, left, width: 320,
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,.15)',
      zIndex: 500, padding: 16, display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--muted)' }}>Filtros</span>
        <button className="btn ghost sm" style={{ fontSize: 11, padding: '2px 8px' }} onClick={onClear}>Limpar</button>
      </div>

      {/* Categorias */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 8 }}>Categoria</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => onChange('cat', filters.cat === c.id ? null : c.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                border: `1px solid ${filters.cat === c.id ? c.color : 'var(--line)'}`,
                background: filters.cat === c.id ? c.color + '18' : 'transparent',
                color: filters.cat === c.id ? c.color : 'var(--ink)',
                borderRadius: 20, padding: '4px 10px', fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <Icon name={c.icon} size={11} />
              {c.name}
              {docCounts[c.id] > 0 && <span style={{ color: 'var(--muted)', fontSize: 10 }}>{docCounts[c.id]}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Data */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 8 }}>Data do documento</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>De</label>
            <DateInput value={filters.dateFrom} onChange={e => onChange('dateFrom', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Até</label>
            <DateInput value={filters.dateTo} onChange={e => onChange('dateTo', e.target.value)} />
          </div>
        </div>
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

export default function DocumentsScreen({ addToast, activeCompany }) {
  const { can } = usePermissions();
  const [filters, setFilters] = useState({ cat: null, dateFrom: '', dateTo: '' });
  const [view, setView]       = useState('list');
  const [search, setSearch]   = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
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

  const activeFilterCount = [
    !!filters.cat,
    !!filters.dateFrom,
    !!filters.dateTo,
  ].filter(Boolean).length;

  const toggleFilter = () => {
    if (!filterOpen) setFilterRect(filterBtnRef.current?.getBoundingClientRect() ?? null);
    setFilterOpen(v => !v);
  };
  const handleFilterChange = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const clearFilters = () => setFilters({ cat: null, dateFrom: '', dateTo: '' });

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

          {/* Filtros */}
          <button
            ref={filterBtnRef}
            className="btn sm"
            onClick={toggleFilter}
            style={{ background: activeFilterCount > 0 ? 'var(--brand-tint)' : undefined, color: activeFilterCount > 0 ? 'var(--brand)' : undefined, borderColor: activeFilterCount > 0 ? 'var(--brand)' : undefined }}
          >
            <Icon name="filter" size={13} /> Filtros
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

        {/* Active category chip */}
        {filters.cat && (() => {
          const cm = CATEGORIES.find(c => c.id === filters.cat);
          return (
            <div style={{ padding: '6px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8, background: cm.color + '0c', flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Filtrando por:</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cm.color + '18', color: cm.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                <Icon name={cm.icon} size={11} /> {cm.name}
              </span>
              <button className="btn ghost icon sm" style={{ width: 20, height: 20, padding: 0 }} onClick={() => handleFilterChange('cat', null)}>
                <Icon name="x" size={11} />
              </button>
            </div>
          );
        })()}

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
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}><div className="pulse">Carregando documentos…</div></div>
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
            <ListView
              docs={filtered}
              categories={CATEGORIES}
              selected={selected}
              onToggle={toggleSelect}
              onSelectAll={toggleSelectAll}
              allSelected={allSelected}
              someSelected={someSelected}
              onPreview={setPreviewDoc}
            />
          ) : (
            <GridView docs={filtered} categories={CATEGORIES} />
          )}
        </div>
      </div>

      {filterOpen && (
        <DocFilterPanel
          filters={filters}
          onChange={handleFilterChange}
          onClear={clearFilters}
          anchorRect={filterRect}
          onClose={() => setFilterOpen(false)}
          docCounts={docCounts}
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

function ListView({ docs, categories, selected, onToggle, onSelectAll, allSelected, someSelected, onPreview }) {
  const [hoveredRow, setHoveredRow] = useState(null);
  const allCheckRef = useRef();

  useEffect(() => {
    if (allCheckRef.current) allCheckRef.current.indeterminate = someSelected;
  }, [someSelected]);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 480 }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <th style={{ padding: '9px 16px', width: 36 }}>
              <input
                ref={allCheckRef}
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                style={{ accentColor: 'var(--brand)', cursor: 'pointer' }}
              />
            </th>
            <th style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 600 }}>Nome</th>
            <th className="doc-col-cat"    style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 600 }}>Categoria</th>
            <th className="doc-col-who"    style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 600 }}>Funcionário</th>
            <th className="doc-col-date"   style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 600 }}>Data</th>
            <th className="doc-col-size"   style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 600 }}>Tamanho</th>
            <th className="doc-col-status" style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 600 }}>Status</th>
            <th style={{ width: 80 }} />
          </tr>
        </thead>
        <tbody>
          {docs.map(f => {
            const cm      = categories.find(c => c.id === f.cat);
            const st      = STATUS_MAP[f.status] || STATUS_MAP.ok;
            const hovered = hoveredRow === f.id;
            const checked = selected.has(f.id);
            return (
              <tr
                key={f.id}
                style={{ borderTop: '1px solid var(--line-soft)', cursor: 'pointer', background: hovered || checked ? 'var(--hover)' : 'transparent', transition: 'background .1s' }}
                onMouseEnter={() => setHoveredRow(f.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td style={{ padding: '10px 16px' }} onClick={e => { e.stopPropagation(); onToggle(f.id); }}>
                  <input type="checkbox" checked={checked} onChange={() => onToggle(f.id)} style={{ accentColor: 'var(--brand)', cursor: 'pointer' }} />
                </td>

                <td style={{ padding: '10px 16px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <FileIcon type={f.type} color={cm?.color} size={30} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                      <div className="doc-name-sub" style={{ display: 'none', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                        {cm && <span className="doc-name-sub-cat" style={{ display: 'none', fontSize: 11, color: cm.color, fontWeight: 600 }}>{cm.name}</span>}
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{f.who}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>·</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{f.date}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <td className="doc-col-cat" style={{ padding: '10px 16px' }}>
                  {cm && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 500, color: cm.color, background: cm.color + '14', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cm.color, flexShrink: 0 }} />
                      {cm.name}
                    </span>
                  )}
                </td>
                <td className="doc-col-who"    style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{f.who}</td>
                <td className="doc-col-date"   style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{f.date}</td>
                <td className="doc-col-size"   style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{f.size ?? '—'}</td>
                <td className="doc-col-status" style={{ padding: '10px 16px' }}>
                  <span className={`pill ${st.cls}`} style={{ fontSize: 11 }}>{st.label}</span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{
                    display: 'flex', gap: 2, justifyContent: 'flex-end',
                    opacity: hovered || checked ? 1 : 0,
                    pointerEvents: hovered || checked ? 'auto' : 'none',
                    transition: 'opacity .12s',
                  }}>
                    {f.file_url && (
                      <button
                        className="btn ghost icon sm"
                        title="Visualizar"
                        onClick={e => { e.stopPropagation(); onPreview(f); }}
                      >
                        <Icon name="eye" size={13} />
                      </button>
                    )}
                    {f.file_url && (
                      <button
                        className="btn ghost icon sm"
                        title="Baixar"
                        onClick={e => { e.stopPropagation(); window.open(f.file_url, '_blank'); }}
                      >
                        <Icon name="download" size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GridView({ docs, categories }) {
  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, alignContent: 'start' }}>
      {docs.map(f => {
        const cm = categories.find(c => c.id === f.cat);
        return (
          <div
            key={f.id}
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'box-shadow .15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ height: 80, borderRadius: 7, marginBottom: 10, background: (cm?.color || '#888') + '10', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: '1px solid ' + (cm?.color || 'var(--line)') + '22' }}>
              {f.file_url && f.type === 'image' ? (
                <img src={f.file_url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 7 }} />
              ) : (
                <Icon name={f.type === 'image' ? 'image' : 'pdf'} size={30} style={{ color: cm?.color || 'var(--muted-2)' }} />
              )}
              <span style={{ position: 'absolute', top: 5, right: 5, fontSize: 9, fontWeight: 700, letterSpacing: 0.3, padding: '1px 5px', borderRadius: 4, background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
                {f.type.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{f.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{f.who}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span>{f.size ?? '—'}</span>
              <span>{f.date}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
