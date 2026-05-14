import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import { useEmployees, useEmployee, useEmployeeCounts, useEmployeeWarnings, useEmployeeVacations, useEmployeeDocuments, useEmployeeHistory, useEmployeeTimeEntries, clockIn, clockOut, createEmployee, updateEmployee, updateEmployeeStatus, createDocuments, useCompanies, useOnboardingDocs, createOnboardingDocs, markOnboardingDocUploaded, useAllPendingOnboarding, logAudit } from '../hooks/useEmployees.js';
import { supabase } from '../lib/supabase.js';
import { usePermissions } from '../lib/permissions.jsx';

// ── Checklist de admissão ─────────────────────────────────────
const ONBOARDING_BASE = [
  { name: 'RG (frente e verso)',               category: 'rg-cpf'    },
  { name: 'CPF',                               category: 'rg-cpf'    },
  { name: 'Comprovante de residência',          category: 'contratos' },
  { name: 'Foto 3×4',                          category: 'rg-cpf'    },
  { name: 'PIS / PASEP',                       category: 'contratos' },
  { name: 'Dados bancários (agência e conta)', category: 'contratos' },
  { name: 'Atestado de saúde admissional',     category: 'exames'    },
];
const ONBOARDING_CLT         = [{ name: 'Carteira de Trabalho (CTPS)',                category: 'contratos' }];
const ONBOARDING_CASADO      = [{ name: 'Certidão de casamento',                      category: 'contratos' }];
const ONBOARDING_DEPENDENTES = [
  { name: 'Certidão de nascimento dos dependentes', category: 'contratos' },
  { name: 'Comprovante de vacinação (dependentes)', category: 'contratos' },
];

function buildOnboardingList(form) {
  const docs = [...ONBOARDING_BASE];
  if (form.contract?.startsWith('CLT')) docs.push(...ONBOARDING_CLT);
  if (form.civil_status === 'Casado(a)')    docs.push(...ONBOARDING_CASADO);
  if (form.has_dependents)                  docs.push(...ONBOARDING_DEPENDENTES);
  return docs;
}

const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
const normalizeDateForInput = (value) => {
  if (!value) return '';
  if (typeof value !== 'string') return '';
  const trimmed = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

// Campo de data com máscara DD/MM/AAAA que converte de/para ISO internamente
function DateInput({ value, onChange, className, hasError }) {
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
    if (raw.length === 8) {
      onChange({ target: { value: `${raw.slice(4, 8)}-${raw.slice(2, 4)}-${raw.slice(0, 2)}` } });
    } else {
      onChange({ target: { value: '' } });
    }
  };

  return (
    <input
      type="text"
      className={`field${hasError ? ' error' : ''}${className ? ' ' + className : ''}`}
      value={display}
      onChange={handleChange}
      placeholder="DD/MM/AAAA"
      maxLength={10}
      inputMode="numeric"
    />
  );
}

// ============================================================
// MODAL BASE
// ============================================================
function Modal({ title, subtitle, onClose, children, width = 560 }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(8px, 2vw, 24px)',
      overflowY: 'auto',
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: width,
        background: 'var(--surface)', borderRadius: 16,
        boxShadow: '0 32px 80px rgba(0,0,0,.25)',
        overflow: 'hidden',
        maxHeight: 'calc(100vh - 32px)',
        display: 'flex', flexDirection: 'column',
        margin: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
          </div>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={15} /></button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}

function PhotoPicker({ name, url, onPick, onRemove, size = 84 }) {
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  const handle = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    await onPick(f);
    setBusy(false);
    e.target.value = '';
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative' }}>
        <Avatar name={name || 'F'} size={size} hue={215} url={url} />
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={busy}
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--brand)', border: '2px solid var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'white',
          }}
          title={url ? 'Trocar foto' : 'Adicionar foto'}
        >
          <Icon name={busy ? 'loader' : 'camera'} size={13} />
        </button>
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handle} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn ghost sm" onClick={() => ref.current?.click()} disabled={busy} style={{ fontSize: 12 }}>
          <Icon name="upload" size={12} /> {busy ? 'Enviando…' : url ? 'Trocar foto' : 'Adicionar foto'}
        </button>
        {url && (
          <button type="button" className="btn ghost sm" onClick={onRemove} style={{ fontSize: 12, color: 'var(--muted)' }}>
            Remover
          </button>
        )}
      </div>
    </div>
  );
}

function FL({ label, children, span }) {
  return (
    <div style={{ gridColumn: span ? `1 / -1` : undefined, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</label>
      {children}
    </div>
  );
}

// ============================================================
// MODAL NOVO FUNCIONÁRIO — 4 steps com progresso
// ============================================================
const NEW_EMP_STEPS = [
  { id: 'pessoal',      label: 'Dados pessoais',    icon: 'user'      },
  { id: 'profissional', label: 'Dados profissionais',icon: 'briefcase' },
  { id: 'contato',      label: 'Contato & endereço', icon: 'mail'      },
  { id: 'revisao',      label: 'Revisão',            icon: 'check'     },
];

const BLANK_EMP = {
  name: '', cpf: '', birth_date: '', civil_status: 'Solteiro(a)', has_dependents: false,
  role: '', dept: '', company: '', company_id: '', contract: 'CLT — Tempo indet.',
  admission: new Date().toISOString().slice(0, 10), salary: '', cost_center: '', workload: '44h semanais', regime: 'Presencial', supervisor: '',
  phone: '', email_personal: '', address: '', neighborhood: '', city: '', state: '', zip_code: '',
  status: 'ativo', generate_checklist: true,
  avatar_url: null,
};

// Faz upload de uma foto de funcionário e retorna a URL pública
async function uploadEmployeePhoto(file, key) {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${key}/avatar.${ext}`;
  const { error } = await supabase.storage.from('employee-avatars').upload(path, file, { upsert: true });
  if (error) return { error };
  const { data: { publicUrl } } = supabase.storage.from('employee-avatars').getPublicUrl(path);
  return { url: `${publicUrl}?t=${Date.now()}` };
}

export function NewEmployeeModal({ onClose, onCreated }) {
  const [step, setStep]     = useState(0);
  const [form, setForm]     = useState(BLANK_EMP);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [docFiles, setDocFiles] = useState([]);
  const docInputRef = useRef();
  const { companies } = useCompanies();

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onClose]);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

  const validate = () => {
    const e = {};
    if (step === 0 && !form.name.trim()) e.name = 'Obrigatório';
    if (step === 1) {
      if (!form.role.trim()) e.role = 'Obrigatório';
      if (!form.dept.trim()) e.dept = 'Obrigatório';
      if (!form.admission)   e.admission = 'Obrigatório';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => Math.min(s + 1, 3)); };
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name: form.name, role: form.role, dept: form.dept, company: form.company,
      company_id: form.company_id || null,
      contract: form.contract, admission: form.admission,
      salary: form.salary ? parseFloat(form.salary) : null,
      cost_center: form.cost_center, workload: form.workload, regime: form.regime,
      supervisor: form.supervisor, phone: form.phone, email_personal: form.email_personal,
      address: form.address, neighborhood: form.neighborhood, city: form.city,
      state: form.state, zip_code: form.zip_code,
      cpf: form.cpf, birth_date: form.birth_date || null, civil_status: form.civil_status,
      status: 'ativo', hue: Math.floor(Math.random() * 360),
      avatar_url: form.avatar_url || null,
    };
    const { created, error } = await createEmployee(payload);
    if (error) { setSaving(false); alert('Erro ao salvar: ' + error.message); return; }
    if (created) {
      logAudit(created.company_id, 'CRIOU', `Funcionário: ${created.name}`);
      const { data: { user } } = await supabase.auth.getUser();
      if (docFiles.length > 0) {
        await createDocuments(
          created.id,
          docFiles.map(f => ({
            name: f.name,
            category: 'contratos',
            size: f.size ? `${(f.size / 1024).toFixed(0)} KB` : '—',
            type: f.type?.includes('image') ? 'image' : 'pdf',
          })),
          user?.id ?? null,
          form.company_id || null,
        );
      }
      if (form.generate_checklist) {
        await createOnboardingDocs(created.id, buildOnboardingList(form));
      }
    }
    setSaving(false);
    onCreated?.();
    onClose();
  };

  // ── backdrop ──────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(8px, 2vw, 24px)',
      }}
      onClick={onClose}
    >
      {/* ── modal card ── */}
      <div
        style={{
          width: '100%', maxWidth: 640,
          background: 'var(--surface)', borderRadius: 16,
          boxShadow: '0 32px 80px rgba(0,0,0,.25)',
          display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100dvh - 32px)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── HEADER fixo ── */}
        <div style={{ flexShrink: 0, borderBottom: '1px solid var(--line)' }}>
          {/* título */}
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Novo funcionário</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Preencha os dados do novo colaborador</div>
            </div>
            <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={15} /></button>
          </div>

          {/* barra de progresso */}
          <div style={{ padding: '0 20px 16px', display: 'flex', alignItems: 'flex-start' }}>
            {NEW_EMP_STEPS.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', flex: i < NEW_EMP_STEPS.length - 1 ? 1 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i < step ? 'var(--ok)' : i === step ? 'var(--brand)' : 'var(--surface-2)',
                    border: `2px solid ${i < step ? 'var(--ok)' : i === step ? 'var(--brand)' : 'var(--line)'}`,
                    color: i <= step ? '#fff' : 'var(--muted)',
                    fontSize: 12, fontWeight: 700, flexShrink: 0, transition: 'all .2s',
                  }}>
                    {i < step ? <Icon name="check" size={12} /> : i + 1}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: i === step ? 700 : 400,
                    color: i === step ? 'var(--ink)' : 'var(--muted)',
                    textAlign: 'center', lineHeight: 1.25,
                    width: 60, wordBreak: 'break-word',
                  }}>
                    {s.label}
                  </span>
                </div>
                {i < NEW_EMP_STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, margin: '13px 6px 0',
                    background: i < step ? 'var(--ok)' : 'var(--line)',
                    transition: 'background .3s', minWidth: 8,
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── BODY rolável ── */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 20px 8px' }}>
          {step === 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                <PhotoPicker
                  name={form.name}
                  url={form.avatar_url}
                  onPick={async (file) => {
                    const tempKey = `temp-${crypto.randomUUID()}`;
                    const { url, error } = await uploadEmployeePhoto(file, tempKey);
                    if (error) { alert('Erro ao enviar foto: ' + error.message); return; }
                    set('avatar_url', url);
                  }}
                  onRemove={() => set('avatar_url', null)}
                />
              </div>
              <FL label="Nome completo *" span={2}>
                <input className={`field ${errors.name ? 'error' : ''}`} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nome completo do colaborador" />
                {errors.name && <span style={{ fontSize: 11, color: 'var(--bad)' }}>{errors.name}</span>}
              </FL>
              <FL label="CPF">
                <input className="field" value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
              </FL>
              <FL label="Data de nascimento">
                <DateInput value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
              </FL>
              <FL label="Estado civil" span={2}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)'].map(v => (
                    <button key={v} onClick={() => set('civil_status', v)} style={{
                      flex: '1 1 110px', padding: '8px 4px', borderRadius: 8, border: '1px solid',
                      borderColor: form.civil_status === v ? 'var(--brand)' : 'var(--line)',
                      background: form.civil_status === v ? 'var(--brand-tint)' : 'var(--surface-2)',
                      color: form.civil_status === v ? 'var(--brand)' : 'var(--muted)',
                      fontWeight: form.civil_status === v ? 700 : 400, fontSize: 12, cursor: 'pointer',
                    }}>{v}</button>
                  ))}
                </div>
              </FL>
              <FL label="Possui dependentes?" span={2}>
                <button
                  onClick={() => set('has_dependents', !form.has_dependents)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    borderRadius: 8, border: '1px solid',
                    borderColor: form.has_dependents ? 'var(--brand)' : 'var(--line)',
                    background: form.has_dependents ? 'var(--brand-tint)' : 'var(--surface-2)',
                    cursor: 'pointer', fontSize: 13,
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, border: '2px solid',
                    borderColor: form.has_dependents ? 'var(--brand)' : 'var(--muted)',
                    background: form.has_dependents ? 'var(--brand)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {form.has_dependents && <Icon name="check" size={11} style={{ color: 'var(--brand-ink)' }} />}
                  </div>
                  <span style={{ color: form.has_dependents ? 'var(--brand)' : 'var(--fg)', fontWeight: form.has_dependents ? 600 : 400 }}>
                    Sim, possui filhos ou dependentes
                  </span>
                </button>
              </FL>
            </div>
          )}

          {step === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <FL label="Cargo *">
                <input className={`field ${errors.role ? 'error' : ''}`} value={form.role} onChange={e => set('role', e.target.value)} placeholder="Ex: Analista de RH" />
                {errors.role && <span style={{ fontSize: 11, color: 'var(--bad)' }}>{errors.role}</span>}
              </FL>
              <FL label="Departamento *">
                <input className={`field ${errors.dept ? 'error' : ''}`} value={form.dept} onChange={e => set('dept', e.target.value)} placeholder="Ex: Recursos Humanos" />
                {errors.dept && <span style={{ fontSize: 11, color: 'var(--bad)' }}>{errors.dept}</span>}
              </FL>
              <FL label="Empresa">
                <select
                  className="field"
                  value={form.company_id}
                  onChange={e => {
                    const co = companies.find(c => c.id === e.target.value);
                    set('company_id', e.target.value);
                    set('company', co?.name || '');
                  }}
                >
                  <option value="">Selecionar empresa…</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FL>
              <FL label="Tipo de contrato">
                <select className="field" value={form.contract} onChange={e => set('contract', e.target.value)}>
                  {['CLT — Tempo indet.','CLT — Tempo det.','CLT — Experiência (90 dias)','PJ','Estágio','Temporário','Aprendiz'].map(c => <option key={c}>{c}</option>)}
                </select>
              </FL>
              <FL label="Data de admissão *">
                <DateInput value={form.admission} onChange={e => set('admission', e.target.value)} hasError={!!errors.admission} />
                {errors.admission && <span style={{ fontSize: 11, color: 'var(--bad)' }}>{errors.admission}</span>}
              </FL>
              <FL label="Salário base (R$)">
                <input className="field" value={form.salary} onChange={e => set('salary', e.target.value)} placeholder="0,00" />
              </FL>
              <FL label="Centro de custo">
                <input className="field" value={form.cost_center} onChange={e => set('cost_center', e.target.value)} placeholder="Ex: RH-001" />
              </FL>
              <FL label="Supervisor direto">
                <input className="field" value={form.supervisor} onChange={e => set('supervisor', e.target.value)} placeholder="Nome do supervisor" />
              </FL>
              <FL label="Carga horária">
                <select className="field" value={form.workload} onChange={e => set('workload', e.target.value)}>
                  {['44h semanais','40h semanais','30h semanais','20h semanais'].map(c => <option key={c}>{c}</option>)}
                </select>
              </FL>
              <FL label="Regime de trabalho">
                <select className="field" value={form.regime} onChange={e => set('regime', e.target.value)}>
                  {['Presencial','Remoto','Híbrido (2×3)','Híbrido (3×2)'].map(c => <option key={c}>{c}</option>)}
                </select>
              </FL>
              <FL label="Gerar checklist de admissão" span={2}>
                <button
                  onClick={() => set('generate_checklist', !form.generate_checklist)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    borderRadius: 8, border: '1px solid',
                    borderColor: form.generate_checklist ? 'var(--brand)' : 'var(--line)',
                    background: form.generate_checklist ? 'var(--brand-tint)' : 'var(--surface-2)',
                    cursor: 'pointer', fontSize: 13, width: '100%',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, border: '2px solid',
                    borderColor: form.generate_checklist ? 'var(--brand)' : 'var(--muted)',
                    background: form.generate_checklist ? 'var(--brand)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {form.generate_checklist && <Icon name="check" size={11} style={{ color: 'var(--brand-ink)' }} />}
                  </div>
                  <div>
                    <div style={{ color: form.generate_checklist ? 'var(--brand)' : 'var(--fg)', fontWeight: form.generate_checklist ? 600 : 400 }}>
                      Gerar checklist de documentos de admissão
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                      Lista de documentos exigidos sera vinculada ao perfil do funcionário
                    </div>
                  </div>
                </button>
              </FL>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <FL label="Telefone">
                <input className="field" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+55 11 9 0000-0000" />
              </FL>
              <FL label="E-mail pessoal">
                <input type="email" className="field" value={form.email_personal} onChange={e => set('email_personal', e.target.value)} placeholder="nome@email.com" />
              </FL>
              <FL label="Logradouro" span={2}>
                <input className="field" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, número, complemento" />
              </FL>
              <FL label="Bairro">
                <input className="field" value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} placeholder="Bairro" />
              </FL>
              <FL label="CEP">
                <input className="field" value={form.zip_code} onChange={e => set('zip_code', e.target.value)} placeholder="00000-000" />
              </FL>
              <FL label="Cidade">
                <input className="field" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Cidade" />
              </FL>
              <FL label="Estado (UF)">
                <input className="field" value={form.state} onChange={e => set('state', e.target.value)} placeholder="SP" maxLength={2} style={{ textTransform: 'uppercase' }} />
              </FL>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                {
                  title: 'Dados pessoais',
                  rows: [['Nome', form.name||'—'],['CPF', form.cpf||'—'],['Nascimento', fmtDate(form.birth_date)],['Estado civil', form.civil_status]],
                },
                {
                  title: 'Dados profissionais',
                  rows: [['Cargo', form.role||'—'],['Departamento', form.dept||'—'],['Empresa', form.company],['Contrato', form.contract],['Admissão', fmtDate(form.admission)],['Salário', form.salary ? `R$ ${parseFloat(form.salary).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—'],['Regime', form.regime],['Carga', form.workload]],
                },
                ...(form.phone || form.email_personal || form.city ? [{
                  title: 'Contato & endereço',
                  rows: [['Telefone', form.phone||'—'],['E-mail', form.email_personal||'—'],['Cidade/UF', form.city && form.state ? `${form.city} / ${form.state}` : form.city||'—']],
                }] : []),
              ].map(section => (
                <div key={section.title} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 16, border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 }}>
                    {section.title}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                    {section.rows.map(([l, v]) => (
                      <div key={l}>
                        <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 2 }}>{l}</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Checklist de admissão preview */}
              {form.generate_checklist && (
                <div style={{ background: 'var(--brand-tint)', borderRadius: 10, padding: 16, border: '1px solid var(--brand)', borderOpacity: 0.3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Icon name="check-circle" size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                      Checklist de admissão
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                    Os seguintes documentos serão solicitados ao funcionário:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {buildOnboardingList(form).map((doc, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', flexShrink: 0 }} />
                        <span>{doc.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documentos iniciais */}
              <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 16, border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
                  Documentos iniciais <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
                </div>
                <input
                  ref={docInputRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={e => {
                    setDocFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
                    e.target.value = '';
                  }}
                />
                {docFiles.length === 0 ? (
                  <button className="btn ghost sm" onClick={() => docInputRef.current?.click()}>
                    <Icon name="upload" size={13} /> Selecionar arquivos
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {docFiles.map((f, i) => (
                      <div key={i} className="row gap-2" style={{ fontSize: 12.5 }}>
                        <Icon name="pdf" size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{f.name}</span>
                        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{(f.size / 1024).toFixed(0)} KB</span>
                        <button className="btn ghost icon sm" onClick={() => setDocFiles(prev => prev.filter((_, j) => j !== i))}>
                          <Icon name="x" size={11} />
                        </button>
                      </div>
                    ))}
                    <button className="btn ghost sm" style={{ marginTop: 4 }} onClick={() => docInputRef.current?.click()}>
                      <Icon name="plus" size={13} /> Adicionar mais
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER fixo ── */}
        <div style={{
          flexShrink: 0, padding: '14px 20px',
          borderTop: '1px solid var(--line)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--surface)',
        }}>
          <button className="btn" onClick={step === 0 ? onClose : prev}>
            {step === 0 ? 'Cancelar' : <><Icon name="chevron-left" size={13} /> Voltar</>}
          </button>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Etapa {step + 1} de {NEW_EMP_STEPS.length}</span>
          {step < 3 ? (
            <button className="btn primary" onClick={next}>
              Próximo <Icon name="chevron-right" size={13} />
            </button>
          ) : (
            <button className="btn primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando…' : <><Icon name="check" size={13} /> Cadastrar funcionário</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL AFASTAMENTO
// ============================================================
export function AfastamentoModal({ employee, onClose, onSaved }) {
  const TIPOS = ['Licença médica','Licença maternidade','Licença paternidade','Acidente de trabalho','Licença não remunerada','Outro'];
  const [form, setForm] = useState({ tipo: TIPOS[0], inicio: new Date().toISOString().slice(0,10), retorno: '', obs: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateEmployeeStatus(employee.id, 'afastado');
    setSaving(false);
    if (error) { alert('Erro: ' + error.message); return; }
    logAudit(employee.company_id, 'EDITOU', `Afastamento: ${employee.name}`);
    onSaved?.();
    onClose();
  };

  return (
    <Modal title="Registrar afastamento" subtitle={employee?.name} onClose={onClose} width={500}>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FL label="Tipo de afastamento">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            {TIPOS.map(t => (
              <button key={t} onClick={() => set('tipo', t)} style={{
                padding: '9px 12px', borderRadius: 8, border: '1px solid',
                borderColor: form.tipo === t ? 'var(--brand)' : 'var(--line)',
                background: form.tipo === t ? 'var(--brand-tint)' : 'var(--surface-2)',
                color: form.tipo === t ? 'var(--brand)' : 'var(--muted)',
                fontWeight: form.tipo === t ? 700 : 400, fontSize: 12.5, cursor: 'pointer',
                textAlign: 'left',
              }}>{t}</button>
            ))}
          </div>
        </FL>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <FL label="Data de início">
            <input type="date" className="field" value={form.inicio} onChange={e => set('inicio', e.target.value)} />
          </FL>
          <FL label="Retorno previsto">
            <input type="date" className="field" value={form.retorno} onChange={e => set('retorno', e.target.value)} />
          </FL>
        </div>
        <FL label="Observações">
          <textarea className="field" rows={3} placeholder="Informações adicionais sobre o afastamento…" value={form.obs}
            onChange={e => set('obs', e.target.value)} style={{ resize: 'vertical' }} />
        </FL>
      </div>
      <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn" style={{ background: '#fef9c3', borderColor: '#ca8a04', color: '#92400e' }} onClick={handleSave} disabled={saving}>
          <Icon name="alert" size={13} /> {saving ? 'Salvando…' : 'Confirmar afastamento'}
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
// MODAL DESLIGAMENTO
// ============================================================
export function DesligamentoModal({ employee, onClose, onSaved }) {
  const MOTIVOS = ['Pedido de demissão','Demissão sem justa causa','Demissão com justa causa','Término de contrato','Aposentadoria','Falecimento'];
  const [form, setForm] = useState({ motivo: MOTIVOS[0], data: new Date().toISOString().slice(0,10), obs: '' });
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const canSave = confirm === 'DESLIGAR';

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const { error } = await updateEmployeeStatus(employee.id, 'desligado');
    setSaving(false);
    if (error) { alert('Erro: ' + error.message); return; }
    logAudit(employee.company_id, 'EXCLUIU', `Desligamento: ${employee.name}`);
    onSaved?.();
    onClose();
  };

  return (
    <Modal title="Desligar funcionário" subtitle={employee?.name} onClose={onClose} width={500}>
      {/* Aviso crítico */}
      <div style={{ margin: '20px 24px 0', padding: 14, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Icon name="alert" size={18} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.5 }}>
          <strong>Ação irreversível.</strong> O funcionário será marcado como desligado e perderá acesso ao sistema. Certifique-se de ter concluído todos os processos de RH antes de prosseguir.
        </div>
      </div>

      <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FL label="Motivo do desligamento">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            {MOTIVOS.map(m => (
              <button key={m} onClick={() => set('motivo', m)} style={{
                padding: '9px 12px', borderRadius: 8, border: '1px solid',
                borderColor: form.motivo === m ? '#dc2626' : 'var(--line)',
                background: form.motivo === m ? '#fee2e2' : 'var(--surface-2)',
                color: form.motivo === m ? '#dc2626' : 'var(--muted)',
                fontWeight: form.motivo === m ? 700 : 400, fontSize: 12.5, cursor: 'pointer',
                textAlign: 'left',
              }}>{m}</button>
            ))}
          </div>
        </FL>
        <FL label="Data efetiva do desligamento">
          <input type="date" className="field" value={form.data} onChange={e => set('data', e.target.value)} />
        </FL>
        <FL label="Observações">
          <textarea className="field" rows={2} value={form.obs} onChange={e => set('obs', e.target.value)} placeholder="Informações adicionais…" style={{ resize: 'vertical' }} />
        </FL>
        <FL label={`Para confirmar, digite DESLIGAR`}>
          <input className="field" value={confirm} onChange={e => setConfirm(e.target.value.toUpperCase())}
            placeholder="DESLIGAR" style={{ fontFamily: 'monospace', letterSpacing: 1 }} />
        </FL>
      </div>
      <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button onClick={handleSave} disabled={!canSave || saving} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 8, border: '1px solid #dc2626',
          background: canSave ? '#dc2626' : 'var(--surface-2)',
          color: canSave ? '#fff' : 'var(--muted)',
          fontWeight: 600, fontSize: 13, cursor: canSave ? 'pointer' : 'not-allowed',
          opacity: saving ? 0.7 : 1,
        }}>
          <Icon name="trash" size={13} /> {saving ? 'Salvando…' : 'Desligar funcionário'}
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
// MODAL REATIVAÇÃO
// ============================================================
export function ReativacaoModal({ employee, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateEmployeeStatus(employee.id, 'ativo');
    setSaving(false);
    if (error) { alert('Erro: ' + error.message); return; }
    logAudit(employee.company_id, 'EDITOU', `Reativação: ${employee.name}`);
    onSaved?.();
    onClose();
  };
  return (
    <Modal title="Reativar funcionário" subtitle={employee?.name} onClose={onClose} width={440}>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 16, background: 'var(--ok-bg,#dcfce7)', border: '1px solid #86efac', borderRadius: 10, marginBottom: 16 }}>
          <Avatar name={employee?.name || '?'} hue={employee?.hue || 120} size={44} url={employee?.avatar_url} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{employee?.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{employee?.role} · {employee?.dept}</div>
          </div>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
          O status do colaborador será alterado para <strong style={{ color: 'var(--ok)' }}>Ativo</strong> e ele voltará a aparecer nas listagens normais. Confirma a reativação?
        </p>
      </div>
      <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando…' : <><Icon name="check" size={13} /> Reativar</>}
        </button>
      </div>
    </Modal>
  );
}

// ---- helpers shared across tabs ----
const th = (w) => ({ textAlign: 'left', padding: '10px 14px', fontWeight: 600, width: w });
const td = () => ({ padding: '11px 14px', verticalAlign: 'middle' });

function StatusPill({ status }) {
  const map = {
    ativo: { c: 'ok', l: 'Ativo' },
    férias: { c: 'info', l: 'Férias' },
    afastado: { c: 'warn', l: 'Afastado' },
    desligado: { c: '', l: 'Desligado' },
  };
  const m = map[status] || map.ativo;
  return (
    <span className={`pill ${m.c}`}>
      <span className="dot" />
      {m.l}
    </span>
  );
}

// ============================================================
// LIST
// ============================================================
function RowMenu({ emp, onProfile, onAfastar, onDesligar, onReativar }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const btnRef = useRef();
  const menuRef = useRef();

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (!menuRef.current?.contains(e.target) && !btnRef.current?.contains(e.target))
        setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!open) setRect(btnRef.current.getBoundingClientRect());
    setOpen(o => !o);
  };

  const isOff = emp.status === 'desligado' || emp.status === 'afastado';
  const actions = [
    { label: 'Ver perfil',            icon: 'user',  fn: onProfile },
    null,
    ...(isOff  ? [{ label: 'Reativar',              icon: 'check', fn: onReativar }] : []),
    ...(!isOff ? [{ label: 'Registrar afastamento', icon: 'alert', fn: onAfastar, color: '#ca8a04' }] : []),
    { label: 'Desligar', icon: 'trash', fn: onDesligar, color: '#dc2626' },
  ].filter(Boolean);

  // Posição: abre abaixo do botão; se não couber, abre acima
  const menuHeight = actions.length * 41 + 8;
  const spaceBelow  = rect ? window.innerHeight - rect.bottom : 999;
  const top  = rect
    ? (spaceBelow >= menuHeight ? rect.bottom + 4 : rect.top - menuHeight - 4)
    : 0;
  const right = rect ? window.innerWidth - rect.right : 0;

  return (
    <div ref={btnRef}>
      <button className="btn ghost icon sm" onClick={handleToggle}>
        <Icon name="more-v" size={14} />
      </button>
      {open && rect && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed', top, right, zIndex: 9999,
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.14)',
            minWidth: 210, overflow: 'hidden',
          }}
        >
          {actions.map((a, i) =>
            a === null ? (
              <div key={i} style={{ height: 1, background: 'var(--line)', margin: '2px 0' }} />
            ) : (
              <button
                key={a.label}
                onClick={e => { e.stopPropagation(); setOpen(false); a.fn(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  width: '100%', padding: '10px 14px', border: 'none',
                  background: 'transparent', cursor: 'pointer', fontSize: 13.5,
                  color: a.color || 'var(--ink)', textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Icon name={a.icon} size={14} style={{ color: a.color || 'var(--brand)' }} />
                {a.label}
              </button>
            )
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

const STATUS_OPTIONS = [
  { id: 'todos',     l: 'Todos'      },
  { id: 'ativo',     l: 'Ativos'     },
  { id: 'férias',    l: 'Em férias'  },
  { id: 'afastado',  l: 'Afastados'  },
  { id: 'desligado', l: 'Desligados' },
];

function FilterPanel({ filters, onChange, onClear, anchorRect, onClose }) {
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!anchorRect) return null;

  const top = anchorRect.bottom + 6;
  const left = anchorRect.right - 280;

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top,
        left: Math.max(8, left),
        width: 280,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,.15)',
        zIndex: 500,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--muted)' }}>
          Filtros
        </span>
        <button className="btn ghost sm" style={{ fontSize: 11, padding: '2px 8px' }} onClick={onClear}>
          Limpar
        </button>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 8 }}>
          Status
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => onChange('status', s.id)}
              style={{
                border: `1px solid ${filters.status === s.id ? 'var(--brand)' : 'var(--line)'}`,
                background: filters.status === s.id ? 'var(--brand-tint)' : 'transparent',
                color: filters.status === s.id ? 'var(--brand)' : 'var(--ink)',
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {s.l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 8 }}>
          Admissão
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>De</label>
            <DateInput
              value={filters.admissionFrom}
              onChange={(e) => onChange('admissionFrom', e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Até</label>
            <DateInput
              value={filters.admissionTo}
              onChange={(e) => onChange('admissionTo', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function EmployeesList({ setRoute, setRouteParam, setRouteLabel, companyId, openModal }) {
  const { can } = usePermissions();
  const [view, setView]     = useState('table');
  const [filters, setFilters] = useState({ status: 'todos', admissionFrom: '', admissionTo: '' });
  const [q, setQ]           = useState('');
  const [selected, setSelected] = useState(new Set());
  const [showNewModal, setShowNewModal] = useState(!!openModal);
  const [actionModal, setActionModal]   = useState(null); // { type: 'afastar'|'desligar'|'reativar', emp }
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterRect, setFilterRect] = useState(null);
  const filterBtnRef = useRef();

  const { counts, refetch: refetchCounts } = useEmployeeCounts(companyId);
  const { employees: filtered, loading, refetch } = useEmployees({
    status: filters.status !== 'todos' ? filters.status : undefined,
    search: q || undefined,
    companyId,
    admissionFrom: filters.admissionFrom || undefined,
    admissionTo: filters.admissionTo || undefined,
  });
  const { pendingByEmployee } = useAllPendingOnboarding();

  const onSaved = () => { refetch(); refetchCounts(); };

  const activeFilterCount = [
    filters.status !== 'todos',
    !!filters.admissionFrom,
    !!filters.admissionTo,
  ].filter(Boolean).length;

  const toggleFilter = () => {
    if (!filterOpen) {
      setFilterRect(filterBtnRef.current?.getBoundingClientRect() ?? null);
    }
    setFilterOpen((v) => !v);
  };

  const handleFilterChange = (key, val) => setFilters((f) => ({ ...f, [key]: val }));
  const clearFilters = () => setFilters({ status: 'todos', admissionFrom: '', admissionTo: '' });

  const openProfile = useCallback((empId, empName) => {
    setRouteParam(empId);
    setRouteLabel?.(empName);
    setRoute('employees-profile');
  }, [setRoute, setRouteParam, setRouteLabel]);

  const toggle = (id) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
  };

  return (
    <>
    <div className="fade-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <div className="grow">
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
            Funcionários
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Gerencie cadastros, status e documentação de toda a equipe.
          </p>
        </div>
        <div className="row gap-2">
          <button className="btn">
            <Icon name="download" size={15} /> Exportar CSV
          </button>
          {can('Funcionários', 'criar') && (
            <button className="btn primary" onClick={() => setShowNewModal(true)}>
              <Icon name="plus" size={15} /> Novo funcionário
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          className="row"
          style={{ padding: '8px 16px', borderBottom: '1px solid var(--line)', gap: 8 }}
        >
          <div style={{ position: 'relative' }}>
            <Icon
              name="search"
              size={14}
              style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }}
            />
            <input
              className="field"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, cargo, depto…"
              style={{ width: 260, paddingLeft: 32, height: 34 }}
            />
          </div>
          <span className="grow" />
          <div style={{ position: 'relative' }}>
            <button ref={filterBtnRef} className="btn sm" onClick={toggleFilter}
              style={{ background: activeFilterCount > 0 ? 'var(--brand-tint)' : undefined, color: activeFilterCount > 0 ? 'var(--brand)' : undefined, borderColor: activeFilterCount > 0 ? 'var(--brand)' : undefined }}
            >
              <Icon name="filter" size={13} /> Filtros
              {activeFilterCount > 0 && (
                <span style={{ background: 'var(--brand)', color: 'var(--brand-ink)', borderRadius: 20, fontSize: 10, fontWeight: 700, padding: '1px 6px', marginLeft: 4 }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
          {filterOpen && (
            <FilterPanel
              filters={filters}
              onChange={handleFilterChange}
              onClear={clearFilters}
              anchorRect={filterRect}
              onClose={() => setFilterOpen(false)}
            />
          )}
            <div
              className="row"
              style={{ border: '1px solid var(--line)', borderRadius: 7, overflow: 'hidden' }}
            >
              <button
                onClick={() => setView('table')}
                style={{
                  border: 'none',
                  background: view === 'table' ? 'var(--hover)' : 'transparent',
                  padding: '6px 9px',
                  cursor: 'pointer',
                  color: 'var(--ink)',
                }}
              >
                <Icon name="dashboard" size={13} />
              </button>
              <button
                onClick={() => setView('cards')}
                style={{
                  border: 'none',
                  background: view === 'cards' ? 'var(--hover)' : 'transparent',
                  padding: '6px 9px',
                  cursor: 'pointer',
                  color: 'var(--ink)',
                }}
              >
                <Icon name="folder" size={13} />
              </button>
            </div>
        </div>

        {/* Selection bar */}
        {selected.size > 0 && (
          <div
            className="row gap-3"
            style={{
              padding: '10px 16px',
              background: 'var(--brand-tint)',
              borderBottom: '1px solid var(--line)',
              fontSize: 13,
            }}
          >
            <strong>{selected.size} selecionados</strong>
            <span className="grow" />
            <button className="btn sm">
              <Icon name="download" size={13} /> Exportar
            </button>
            <button className="btn sm">
              <Icon name="lock" size={13} /> Bloquear acesso
            </button>
            <button className="btn sm">
              <Icon name="trash" size={13} /> Arquivar
            </button>
            <button className="btn ghost sm icon" onClick={() => setSelected(new Set())}>
              <Icon name="x" size={13} />
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            <div className="pulse">Carregando funcionários…</div>
          </div>
        ) : view === 'table' ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr
                  style={{
                    background: 'var(--surface-2)',
                    color: 'var(--muted)',
                    fontSize: 11.5,
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                  }}
                >
                  <th style={th(40)}>
                    <input
                      type="checkbox"
                      style={{ accentColor: 'var(--brand)' }}
                      onChange={(e) =>
                        setSelected(e.target.checked ? new Set(filtered.map((f) => f.id)) : new Set())
                      }
                    />
                  </th>
                  <th style={th()}>Funcionário</th>
                  <th style={th()}>Empresa</th>
                  <th style={th()}>Status</th>
                  <th style={th()}>Admissão</th>
                  <th style={th(60)}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr
                    key={emp.id}
                    style={{ borderTop: '1px solid var(--line-soft)', cursor: 'pointer' }}
                    onClick={() => openProfile(emp.id, emp.name)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={td()} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(emp.id)}
                        onChange={() => toggle(emp.id)}
                        style={{ accentColor: 'var(--brand)' }}
                      />
                    </td>
                    <td style={td()}>
                      <div className="row gap-3">
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <Avatar name={emp.name} hue={emp.hue} size={34} url={emp.avatar_url} />
                          {pendingByEmployee[emp.id] > 0 && (
                            <div style={{
                              position: 'absolute', top: -3, right: -3,
                              width: 14, height: 14, borderRadius: '50%',
                              background: 'var(--bad)', border: '2px solid var(--surface)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              animation: 'pulse 1.8s ease-in-out infinite',
                            }}>
                              <span style={{ fontSize: 8, fontWeight: 700, color: '#fff', lineHeight: 1 }}>!</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{emp.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                            {emp.role} · {emp.dept}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={td()}>
                      <span style={{ color: 'var(--muted)' }}>{emp.company}</span>
                    </td>
                    <td style={td()}>
                      <StatusPill status={emp.status} />
                    </td>
                    <td style={td()}>
                      <span className="mono" style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                        {emp.admission ? new Date(emp.admission + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                      </span>
                    </td>
                    <td style={td()} onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        emp={emp}
                        onProfile={() => openProfile(emp.id, emp.name)}
                        onAfastar={() => setActionModal({ type: 'afastar', emp })}
                        onDesligar={() => setActionModal({ type: 'desligar', emp })}
                        onReativar={() => setActionModal({ type: 'reativar', emp })}
                      />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      Nenhum funcionário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              padding: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 12,
            }}
          >
            {filtered.map((emp) => (
              <div
                key={emp.id}
                className="card"
                style={{ padding: 16, cursor: 'pointer' }}
                onClick={() => openProfile(emp.id, emp.name)}
              >
                <div className="row" style={{ marginBottom: 12 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar name={emp.name} hue={emp.hue} size={42} url={emp.avatar_url} />
                    {pendingByEmployee[emp.id] > 0 && (
                      <div style={{
                        position: 'absolute', top: -3, right: -3,
                        width: 16, height: 16, borderRadius: '50%',
                        background: 'var(--bad)', border: '2px solid var(--surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'pulse 1.8s ease-in-out infinite',
                      }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', lineHeight: 1 }}>!</span>
                      </div>
                    )}
                  </div>
                  <span className="grow" />
                  <StatusPill status={emp.status} />
                  <div onClick={e => e.stopPropagation()}>
                    <RowMenu
                      emp={emp}
                      onProfile={() => openProfile(emp.id, emp.name)}
                      onAfastar={() => setActionModal({ type: 'afastar', emp })}
                      onDesligar={() => setActionModal({ type: 'desligar', emp })}
                      onReativar={() => setActionModal({ type: 'reativar', emp })}
                    />
                  </div>
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{emp.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{emp.role}</div>
                <div className="h-line" style={{ margin: '12px 0' }} />
                <div className="row" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  <span>{emp.company}</span>
                  <span className="grow" />
                  <span>{emp.dept}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          className="row"
          style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--line)',
            color: 'var(--muted)',
            fontSize: 12,
          }}
        >
          <span>
            Mostrando {filtered.length} de {counts.todos}
          </span>
          <span className="grow" />
          <div className="row gap-2">
            <button className="btn ghost sm icon">
              <Icon name="chevron-left" size={13} />
            </button>
            <span className="kbd" style={{ padding: '4px 10px' }}>
              1
            </span>
            <button className="btn ghost sm icon">
              <Icon name="chevron-right" size={13} />
            </button>
          </div>
        </div>
      </div>

    </div>

      {showNewModal && (
        <NewEmployeeModal onClose={() => setShowNewModal(false)} onCreated={onSaved} />
      )}
      {actionModal?.type === 'afastar' && (
        <AfastamentoModal employee={actionModal.emp} onClose={() => setActionModal(null)} onSaved={onSaved} />
      )}
      {actionModal?.type === 'desligar' && (
        <DesligamentoModal employee={actionModal.emp} onClose={() => setActionModal(null)} onSaved={onSaved} />
      )}
      {actionModal?.type === 'reativar' && (
        <ReativacaoModal employee={actionModal.emp} onClose={() => setActionModal(null)} onSaved={onSaved} />
      )}
    </>
  );
}

// ============================================================
// EXPORT PRONTUÁRIO
// ============================================================
function exportProntuario(emp) {
  const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
  const curr = (v) => v ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
  const html = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><title>Prontuário — ${emp.name}</title>
<style>
*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:0;padding:24px;line-height:1.5}
h1{font-size:20px;margin:0 0 2px}h2{font-size:11px;text-transform:uppercase;letter-spacing:.7px;color:#555;margin:20px 0 8px;padding-bottom:4px;border-bottom:1px solid #e5e7eb}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px 24px;margin-bottom:4px}
.f label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.4px;display:block;margin-bottom:2px}.f span{font-size:12px}
.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:2px solid #2A5BFF;margin-bottom:14px}
.badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:20px;background:#dbeafe;color:#1d4ed8;font-weight:600;margin-top:5px}
@media print{body{padding:14px}}
</style></head><body>
<div class="header">
  <div>
    <h1>${emp.name}</h1>
    <div style="color:#666;font-size:12px;margin-top:3px">${emp.role} &middot; ${emp.dept} &middot; ${emp.company}</div>
    <span class="badge">${emp.status === 'ativo' ? 'Ativo' : emp.status}</span>
  </div>
  <div style="font-size:11px;color:#888;text-align:right">Emitido em ${new Date().toLocaleDateString('pt-BR')}<br/>Orion Gestão</div>
</div>
<h2>Dados Pessoais</h2>
<div class="grid">
  <div class="f"><label>CPF</label><span>${emp.cpf || '—'}</span></div>
  <div class="f"><label>Nascimento</label><span>${fmt(emp.birth_date)}</span></div>
  <div class="f"><label>Estado Civil</label><span>${emp.civil_status || '—'}</span></div>
  <div class="f"><label>Telefone</label><span>${emp.phone || '—'}</span></div>
  <div class="f"><label>E-mail</label><span>${emp.email_personal || '—'}</span></div>
</div>
<div class="grid">
  <div class="f" style="grid-column:1/3"><label>Endereço</label><span>${[emp.address, emp.neighborhood].filter(Boolean).join(', ') || '—'}</span></div>
  <div class="f"><label>CEP</label><span>${emp.zip_code || '—'}</span></div>
  <div class="f"><label>Cidade / UF</label><span>${emp.city && emp.state ? emp.city + ' / ' + emp.state : '—'}</span></div>
</div>
<h2>Vínculo Empregatício</h2>
<div class="grid">
  <div class="f"><label>Cargo</label><span>${emp.role || '—'}</span></div>
  <div class="f"><label>Departamento</label><span>${emp.dept || '—'}</span></div>
  <div class="f"><label>Empresa</label><span>${emp.company || '—'}</span></div>
  <div class="f"><label>Tipo de Contrato</label><span>${emp.contract || '—'}</span></div>
  <div class="f"><label>Data de Admissão</label><span>${fmt(emp.admission)}</span></div>
  <div class="f"><label>Salário Base</label><span>${curr(emp.salary)}</span></div>
  <div class="f"><label>Carga Horária</label><span>${emp.workload || '—'}</span></div>
  <div class="f"><label>Regime</label><span>${emp.regime || '—'}</span></div>
  <div class="f"><label>Centro de Custo</label><span>${emp.cost_center || '—'}</span></div>
  <div class="f"><label>Supervisor Direto</label><span>${emp.supervisor || '—'}</span></div>
</div>
<div style="margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#999;text-align:center">
  Documento gerado pelo sistema Orion Gestão &middot; ${new Date().toLocaleString('pt-BR')}
</div>
<script>window.onload=()=>{window.print()}</script>
</body></html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
}

// ============================================================
// MODAL EDITAR FUNCIONÁRIO
// ============================================================
const EDIT_EMP_STEPS = [
  { id: 'pessoal',      label: 'Dados pessoais',     icon: 'user'      },
  { id: 'profissional', label: 'Dados profissionais', icon: 'briefcase' },
  { id: 'contato',      label: 'Contato & endereço',  icon: 'mail'      },
];

function EditEmployeeModal({ employee, onClose, onSaved }) {
  const [step, setStep] = useState(0);
  const { companies } = useCompanies();
  const [form, setForm] = useState({
    name: employee.name || '', cpf: employee.cpf || '',
    birth_date: normalizeDateForInput(employee.birth_date), civil_status: employee.civil_status || 'Solteiro(a)',
    role: employee.role || '', dept: employee.dept || '',
    company: employee.company || '', company_id: employee.company_id || '',
    contract: employee.contract || 'CLT — Tempo indet.',
    admission: normalizeDateForInput(employee.admission), salary: employee.salary?.toString() || '',
    cost_center: employee.cost_center || '', workload: employee.workload || '44h semanais',
    regime: employee.regime || 'Presencial', supervisor: employee.supervisor || '',
    phone: employee.phone || '', email_personal: employee.email_personal || '',
    address: employee.address || '', neighborhood: employee.neighborhood || '',
    city: employee.city || '', state: employee.state || '', zip_code: employee.zip_code || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onClose]);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

  const validate = () => {
    const e = {};
    if (step === 0 && !form.name.trim()) e.name = 'Obrigatório';
    if (step === 1) {
      if (!form.role.trim()) e.role = 'Obrigatório';
      if (!form.dept.trim()) e.dept = 'Obrigatório';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => Math.min(s + 1, EDIT_EMP_STEPS.length - 1)); };
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const { error } = await updateEmployee(employee.id, {
      name: form.name, role: form.role, dept: form.dept, company: form.company,
      contract: form.contract, admission: form.admission || null,
      salary: form.salary ? parseFloat(form.salary) : null,
      cost_center: form.cost_center, workload: form.workload, regime: form.regime,
      supervisor: form.supervisor, phone: form.phone, email_personal: form.email_personal,
      address: form.address, neighborhood: form.neighborhood, city: form.city,
      state: form.state, zip_code: form.zip_code,
      cpf: form.cpf, birth_date: form.birth_date || null, civil_status: form.civil_status,
    });
    setSaving(false);
    if (error) { alert('Erro ao salvar: ' + error.message); return; }
    logAudit(employee.company_id, 'EDITOU', `Funcionário: ${form.name}`);
    onSaved?.();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(8px, 2vw, 24px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 640,
          background: 'var(--surface)', borderRadius: 16,
          boxShadow: '0 32px 80px rgba(0,0,0,.25)',
          display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100dvh - 32px)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── HEADER fixo ── */}
        <div style={{ flexShrink: 0, borderBottom: '1px solid var(--line)' }}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Editar funcionário</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{employee.name} · {employee.role}</div>
            </div>
            <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={15} /></button>
          </div>

          {/* barra de progresso — idêntica ao NewEmployeeModal */}
          <div style={{ padding: '0 20px 16px', display: 'flex', alignItems: 'flex-start' }}>
            {EDIT_EMP_STEPS.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', flex: i < EDIT_EMP_STEPS.length - 1 ? 1 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i < step ? 'var(--ok)' : i === step ? 'var(--brand)' : 'var(--surface-2)',
                    border: `2px solid ${i < step ? 'var(--ok)' : i === step ? 'var(--brand)' : 'var(--line)'}`,
                    color: i <= step ? '#fff' : 'var(--muted)',
                    fontSize: 12, fontWeight: 700, flexShrink: 0, transition: 'all .2s',
                  }}>
                    {i < step ? <Icon name="check" size={12} /> : i + 1}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: i === step ? 700 : 400,
                    color: i === step ? 'var(--ink)' : 'var(--muted)',
                    textAlign: 'center', lineHeight: 1.25,
                    width: 60, wordBreak: 'break-word',
                  }}>
                    {s.label}
                  </span>
                </div>
                {i < EDIT_EMP_STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, margin: '13px 6px 0',
                    background: i < step ? 'var(--ok)' : 'var(--line)',
                    transition: 'background .3s', minWidth: 8,
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── BODY rolável ── */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 20px 8px' }}>
          {step === 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <FL label="Nome completo *" span={2}>
                <input className={`field ${errors.name ? 'error' : ''}`} value={form.name} onChange={e => set('name', e.target.value)} />
                {errors.name && <span style={{ fontSize: 11, color: 'var(--bad)' }}>{errors.name}</span>}
              </FL>
              <FL label="CPF">
                <input className="field" value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
              </FL>
              <FL label="Data de nascimento">
                <DateInput value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
              </FL>
              <FL label="Estado civil" span={2}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)'].map(v => (
                    <button key={v} onClick={() => set('civil_status', v)} style={{
                      flex: '1 1 110px', padding: '8px 4px', borderRadius: 8, border: '1px solid',
                      borderColor: form.civil_status === v ? 'var(--brand)' : 'var(--line)',
                      background: form.civil_status === v ? 'var(--brand-tint)' : 'var(--surface-2)',
                      color: form.civil_status === v ? 'var(--brand)' : 'var(--muted)',
                      fontWeight: form.civil_status === v ? 700 : 400, fontSize: 12, cursor: 'pointer',
                    }}>{v}</button>
                  ))}
                </div>
              </FL>
            </div>
          )}

          {step === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <FL label="Cargo *">
                <input className={`field ${errors.role ? 'error' : ''}`} value={form.role} onChange={e => set('role', e.target.value)} />
                {errors.role && <span style={{ fontSize: 11, color: 'var(--bad)' }}>{errors.role}</span>}
              </FL>
              <FL label="Departamento *">
                <input className={`field ${errors.dept ? 'error' : ''}`} value={form.dept} onChange={e => set('dept', e.target.value)} />
                {errors.dept && <span style={{ fontSize: 11, color: 'var(--bad)' }}>{errors.dept}</span>}
              </FL>
              <FL label="Empresa">
                <select
                  className="field"
                  value={form.company_id}
                  onChange={e => {
                    const co = companies.find(c => c.id === e.target.value);
                    set('company_id', e.target.value);
                    set('company', co?.name || '');
                  }}
                >
                  <option value="">Selecionar empresa…</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FL>
              <FL label="Tipo de contrato">
                <select className="field" value={form.contract} onChange={e => set('contract', e.target.value)}>
                  {['CLT — Tempo indet.','CLT — Tempo det.','CLT — Experiência (90 dias)','PJ','Estágio','Temporário','Aprendiz'].map(c => <option key={c}>{c}</option>)}
                </select>
              </FL>
              <FL label="Data de admissão">
                <DateInput value={form.admission} onChange={e => set('admission', e.target.value)} />
              </FL>
              <FL label="Salário base (R$)">
                <input className="field" value={form.salary} onChange={e => set('salary', e.target.value)} placeholder="0,00" />
              </FL>
              <FL label="Centro de custo">
                <input className="field" value={form.cost_center} onChange={e => set('cost_center', e.target.value)} />
              </FL>
              <FL label="Supervisor direto">
                <input className="field" value={form.supervisor} onChange={e => set('supervisor', e.target.value)} />
              </FL>
              <FL label="Carga horária">
                <select className="field" value={form.workload} onChange={e => set('workload', e.target.value)}>
                  {['44h semanais','40h semanais','30h semanais','20h semanais'].map(c => <option key={c}>{c}</option>)}
                </select>
              </FL>
              <FL label="Regime de trabalho">
                <select className="field" value={form.regime} onChange={e => set('regime', e.target.value)}>
                  {['Presencial','Remoto','Híbrido (2×3)','Híbrido (3×2)'].map(c => <option key={c}>{c}</option>)}
                </select>
              </FL>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <FL label="Telefone">
                <input className="field" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+55 11 9 0000-0000" />
              </FL>
              <FL label="E-mail pessoal">
                <input type="email" className="field" value={form.email_personal} onChange={e => set('email_personal', e.target.value)} />
              </FL>
              <FL label="Logradouro" span={2}>
                <input className="field" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, número, complemento" />
              </FL>
              <FL label="Bairro">
                <input className="field" value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} />
              </FL>
              <FL label="CEP">
                <input className="field" value={form.zip_code} onChange={e => set('zip_code', e.target.value)} placeholder="00000-000" />
              </FL>
              <FL label="Cidade">
                <input className="field" value={form.city} onChange={e => set('city', e.target.value)} />
              </FL>
              <FL label="Estado (UF)">
                <input className="field" value={form.state} onChange={e => set('state', e.target.value)} placeholder="SP" maxLength={2} style={{ textTransform: 'uppercase' }} />
              </FL>
            </div>
          )}
        </div>

        {/* ── FOOTER fixo ── */}
        <div style={{
          flexShrink: 0, padding: '14px 20px',
          borderTop: '1px solid var(--line)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--surface)',
        }}>
          <button className="btn" onClick={step === 0 ? onClose : prev}>
            {step === 0 ? 'Cancelar' : <><Icon name="chevron-left" size={13} /> Voltar</>}
          </button>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Etapa {step + 1} de {EDIT_EMP_STEPS.length}</span>
          {step < EDIT_EMP_STEPS.length - 1 ? (
            <button className="btn primary" onClick={next}>
              Próximo <Icon name="chevron-right" size={13} />
            </button>
          ) : (
            <button className="btn primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando…' : <><Icon name="check" size={13} /> Salvar alterações</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROFILE
// ============================================================
export function EmployeeProfile({ setRoute, employeeId }) {
  const [tab, setTab] = useState('dados');
  const [showEdit, setShowEdit] = useState(false);
  const { employee: emp, loading, refetch: refetchEmp } = useEmployee(employeeId);
  const { warnings } = useEmployeeWarnings(employeeId);
  const { vacations } = useEmployeeVacations(employeeId);
  const { documents, refetch: refetchDocs } = useEmployeeDocuments(employeeId);
  const { history } = useEmployeeHistory(employeeId);
  const { timeEntries, refetch: refetchTimeEntries } = useEmployeeTimeEntries(employeeId);
  const { docs: onboardingDocs, refetch: refetchOnboarding } = useOnboardingDocs(employeeId);
  const pendingOnboarding = onboardingDocs.filter(d => d.status === 'pending');

  const tabs = [
    { id: 'dados', l: 'Dados pessoais', icon: 'user' },
    { id: 'prof', l: 'Profissionais', icon: 'briefcase' },
    { id: 'docs', l: 'Documentos', icon: 'folder', n: documents.length || null },
    { id: 'ponto', l: 'Controle de ponto', icon: 'clock' },
    { id: 'warn', l: 'Advertências', icon: 'alert', n: warnings.length || null },
    { id: 'pay', l: 'Holerites', icon: 'pdf' },
    { id: 'ferias', l: 'Férias', icon: 'umbrella', n: vacations.length || null },
    { id: 'hist', l: 'Histórico', icon: 'history' },
  ];

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        <div className="pulse">Carregando funcionário…</div>
      </div>
    );
  }

  if (!emp) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Funcionário não encontrado.{' '}
        <button className="btn ghost sm" onClick={() => setRoute('employees')}>Voltar</button>
      </div>
    );
  }

  return (
    <>
    <div className="fade-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Back */}
      <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setRoute('employees')}>
        <Icon name="chevron-left" size={13} /> Funcionários
      </button>

      {/* Onboarding warning banner */}
      {pendingOnboarding.length > 0 && (
        <div
          style={{
            background: 'rgba(var(--bad-rgb, 239,68,68), 0.1)', border: '1px solid var(--bad)',
            borderRadius: 10, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          }}
          onClick={() => setTab('docs')}
        >
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: 'var(--bad)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            animation: 'pulse 1.8s ease-in-out infinite',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>!</span>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--bad)' }}>
              Documentos pendentes de admissão
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {pendingOnboarding.length} documento{pendingOnboarding.length > 1 ? 's' : ''} ainda não entregue{pendingOnboarding.length > 1 ? 's' : ''} — clique para ver a lista
            </div>
          </div>
          <span style={{ marginLeft: 'auto', color: 'var(--bad)' }}>
            <Icon name="chevron-right" size={14} />
          </span>
        </div>
      )}

      {/* Header card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ height: 4, background: 'var(--brand)' }} />
        <div
          className="row"
          style={{
            padding: '22px 24px',
            alignItems: 'center',
            gap: 18,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative' }}>
            <Avatar name={emp.name} hue={emp.hue} size={86} url={emp.avatar_url} />
            <button
              type="button"
              onClick={async () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async () => {
                  const f = input.files?.[0];
                  if (!f) return;
                  const { url, error } = await uploadEmployeePhoto(f, emp.id);
                  if (error) { alert('Erro ao enviar foto: ' + error.message); return; }
                  await updateEmployee(emp.id, { avatar_url: url });
                  refetchEmp();
                };
                input.click();
              }}
              style={{
                position: 'absolute', bottom: 2, right: 2,
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--brand)', border: '2px solid var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'white',
              }}
              title={emp.avatar_url ? 'Trocar foto' : 'Adicionar foto'}
            >
              <Icon name="camera" size={13} />
            </button>
          </div>
          <div className="grow" style={{ minWidth: 240 }}>
            <div className="row gap-2">
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>
                {emp.name}
              </h2>
              <StatusPill status={emp.status} />
            </div>
            <div
              className="row gap-3"
              style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, flexWrap: 'wrap' }}
            >
              <span className="row gap-2">
                <Icon name="briefcase" size={13} /> {emp.role}
              </span>
              <span className="row gap-2">
                <Icon name="building" size={13} /> {emp.company}
              </span>
              <span className="row gap-2">
                <Icon name="folder" size={13} /> {emp.dept}
              </span>
              {emp.admission && (
                <span className="row gap-2">
                  <Icon name="history" size={13} /> Desde {new Date(emp.admission + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
          <div className="row gap-2" style={{ paddingTop: 36 }}>
            <button className="btn">
              <Icon name="mail" size={14} /> Enviar mensagem
            </button>
            <button className="btn" onClick={() => exportProntuario(emp)}>
              <Icon name="download" size={14} /> Exportar prontuário
            </button>
            <button className="btn primary" onClick={() => setShowEdit(true)}>
              <Icon name="edit" size={14} /> Editar
            </button>
            <button className="btn ghost icon">
              <Icon name="more-v" size={15} />
            </button>
          </div>
        </div>

        {/* Quick stats strip */}
        <div className="row" style={{ borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}>
          {[
            { l: 'Tempo de empresa', v: (() => {
                if (!emp.admission) return '—';
                const ms = Date.now() - new Date(emp.admission + 'T00:00:00').getTime();
                const yrs = Math.floor(ms / (365.25 * 24 * 3600 * 1000));
                const mos = Math.floor((ms % (365.25 * 24 * 3600 * 1000)) / (30.44 * 24 * 3600 * 1000));
                if (yrs === 0 && mos === 0) return 'Recém-contratado';
                return `${yrs > 0 ? yrs + ' ano' + (yrs !== 1 ? 's' : '') : ''} ${yrs > 0 && mos > 0 ? '· ' : ''}${mos > 0 ? mos + ' ' + (mos !== 1 ? 'meses' : 'mês') : ''}`;
              })(), i: 'history' },
            { l: 'Banco de horas', v: '—', i: 'clock' },
            { l: 'Atestados', v: documents.filter(d => d.category === 'atestados').length.toString(), i: 'doc' },
            { l: 'Próximas férias', v: (() => {
                const scheduled = vacations.find(v => v.status === 'agendado');
                return scheduled ? new Date(scheduled.period_start + 'T00:00:00').toLocaleDateString('pt-BR').slice(0, 5) : '—';
              })(), i: 'umbrella' },
            { l: 'Salário base', v: emp.salary ? emp.salary.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—', i: 'chart' },
            { l: 'Avaliação 360º', v: '—', i: 'sparkle' },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: '14px 18px',
                borderRight: i < 5 ? '1px solid var(--line)' : 'none',
              }}
            >
              <div
                className="row gap-2"
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                <Icon name={s.i} size={11} /> {s.l}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: s.k === 'ok' ? 'var(--ok)' : 'var(--ink)',
                }}
              >
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="row"
        style={{ borderBottom: '1px solid var(--line)', overflowX: 'auto', gap: 0 }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              border: 'none',
              background: 'transparent',
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: tab === t.id ? 600 : 500,
              color: tab === t.id ? 'var(--brand)' : 'var(--muted)',
              borderBottom: `2px solid ${tab === t.id ? 'var(--brand)' : 'transparent'}`,
              marginBottom: -1,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon name={t.icon} size={14} /> {t.l}
            {t.n != null && (
              <span className="pill" style={{ fontSize: 10.5, padding: '1px 6px' }}>
                {t.n}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'dados' && <DadosPessoais emp={emp} />}
      {tab === 'prof' && <DadosProfissionais emp={emp} />}
      {tab === 'docs' && <DocsTab employeeId={emp.id} documents={documents} refetch={refetchDocs} onboardingDocs={onboardingDocs} refetchOnboarding={refetchOnboarding} />}
      {tab === 'ponto' && <PontoTab employeeId={emp.id} timeEntries={timeEntries} refetch={refetchTimeEntries} />}
      {tab === 'warn' && <WarnTab employeeId={emp.id} />}
      {tab === 'pay' && <PayTab emp={emp} documents={documents} />}
      {tab === 'ferias' && <FeriasTab employeeId={emp.id} />}
      {tab === 'hist' && <HistoryTab emp={emp} history={history} />}
    </div>

    {showEdit && emp && (
      <EditEmployeeModal
        employee={emp}
        onClose={() => setShowEdit(false)}
        onSaved={() => { refetchEmp(); setShowEdit(false); }}
      />
    )}
  </>
  );
}

function Field({ l, v, mono }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {l}
      </div>
      <div className={mono ? 'mono' : ''} style={{ fontSize: 14, color: 'var(--ink)' }}>
        {v}
      </div>
    </div>
  );
}

function DadosPessoais({ emp }) {
  const birthFmt = emp?.birth_date
    ? new Date(emp.birth_date + 'T00:00:00').toLocaleDateString('pt-BR')
    : '—';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>
          Informações pessoais
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
          <Field l="Nome completo" v={emp?.name || '—'} />
          <Field l="CPF" v={emp?.cpf || '—'} mono />
          <Field l="Data de nascimento" v={birthFmt} mono />
          <Field l="Estado civil" v={emp?.civil_status || '—'} />
          <Field l="Nacionalidade" v="Brasileiro(a)" />
          <Field l="Dependentes" v="—" />
        </div>
        <div className="h-line" style={{ margin: '22px 0' }} />
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Endereço & contato</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 18 }}>
          <Field l="Logradouro" v={emp?.address || '—'} />
          <Field l="Bairro" v={emp?.neighborhood || '—'} />
          <Field l="CEP" v={emp?.zip_code || '—'} mono />
          <Field l="Cidade / UF" v={emp?.city && emp?.state ? `${emp.city} / ${emp.state}` : '—'} />
          <Field l="Telefone" v={emp?.phone || '—'} mono />
          <Field l="E-mail pessoal" v={emp?.email_personal || '—'} />
        </div>
      </div>
      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Dependentes</h3>
        <div
          style={{
            padding: '24px 0',
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: 13,
            border: '1px dashed var(--line)',
            borderRadius: 10,
          }}
        >
          Nenhum dependente cadastrado
        </div>
        <button className="btn ghost sm" style={{ marginTop: 10 }}>
          <Icon name="plus" size={13} /> Adicionar dependente
        </button>
      </div>
    </div>
  );
}

function DadosProfissionais({ emp }) {
  const admFmt = emp?.admission
    ? new Date(emp.admission + 'T00:00:00').toLocaleDateString('pt-BR')
    : '—';
  const salaryFmt = emp?.salary
    ? emp.salary.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';
  return (
    <div className="card" style={{ padding: 22 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Vínculo empregatício</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
        <Field l="Cargo" v={emp?.role || '—'} />
        <Field l="Departamento" v={emp?.dept || '—'} />
        <Field l="Empresa" v={emp?.company || '—'} />
        <Field l="Centro de custo" v={emp?.cost_center || '—'} mono />
        <Field l="Data de admissão" v={admFmt} mono />
        <Field l="Tipo de contrato" v={emp?.contract || '—'} />
        <Field l="Carga horária" v={emp?.workload || '—'} />
        <Field l="Regime" v={emp?.regime || '—'} />
        <Field l="Salário base" v={salaryFmt} mono />
        <Field l="Supervisor direto" v={emp?.supervisor || '—'} />
      </div>
    </div>
  );
}

const DOC_CATEGORIES = [
  { id: 'contratos',     name: 'Contratos',      icon: 'doc',         color: '#2A5BFF' },
  { id: 'holerites',    name: 'Holerites',       icon: 'pdf',         color: '#059669' },
  { id: 'atestados',    name: 'Atestados',       icon: 'image',       color: '#D97706' },
  { id: 'rg-cpf',       name: 'RG / CPF',        icon: 'user',        color: '#1F8A5B' },
  { id: 'exames',       name: 'Exames Médicos',  icon: 'fingerprint', color: '#db2777' },
  { id: 'ferias',       name: 'Férias',          icon: 'umbrella',    color: '#0891b2' },
  { id: 'advertencias', name: 'Advertências',    icon: 'alert',       color: '#a855f7' },
  { id: 'juridico',     name: 'Jurídico',        icon: 'shield',      color: '#475569' },
  { id: 'ponto',        name: 'Cartão de Ponto', icon: 'clock',       color: '#0f766e' },
];

// Campos extras por categoria — armazenados como JSON em notes
const DOC_EXTRA_FIELDS = {
  contratos: [
    { key: 'tipo_contrato', label: 'Tipo de contrato', type: 'select', options: ['CLT', 'PJ', 'Estágio', 'Temporário', 'Intermitente', 'Autônomo'] },
    { key: 'vigencia_inicio', label: 'Início da vigência', type: 'date' },
    { key: 'vigencia_fim',   label: 'Fim da vigência',   type: 'date' },
  ],
  holerites: [
    { key: 'mes_ref', label: 'Mês de referência', type: 'select', options: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'] },
    { key: 'ano_ref', label: 'Ano',               type: 'text',  placeholder: '2025' },
  ],
  atestados: [
    { key: 'cid',    label: 'CID',                      type: 'text', placeholder: 'ex: A09' },
    { key: 'dias',   label: 'Dias de afastamento',      type: 'text', placeholder: 'ex: 3' },
    { key: 'medico', label: 'Médico / CRM',             type: 'text', placeholder: 'ex: Dr. Silva CRM-12345' },
  ],
  'rg-cpf': [
    { key: 'tipo_doc', label: 'Tipo',               type: 'select', options: ['RG', 'CPF', 'RNE', 'CNH', 'Passaporte'] },
    { key: 'numero',   label: 'Número do documento', type: 'text',   placeholder: 'ex: 12.345.678-9' },
  ],
  exames: [
    { key: 'tipo_exame', label: 'Tipo de exame', type: 'select', options: ['Admissional', 'Periódico', 'Demissional', 'Retorno ao trabalho', 'Mudança de função'] },
    { key: 'resultado',  label: 'Resultado',      type: 'select', options: ['Apto', 'Apto com restrições', 'Inapto'] },
    { key: 'medico',     label: 'Médico / CRM',   type: 'text',   placeholder: 'ex: Dr. Silva CRM-12345' },
  ],
  ferias: [
    { key: 'aq_inicio', label: 'Período aquisitivo — de', type: 'date' },
    { key: 'aq_fim',    label: 'Período aquisitivo — até', type: 'date' },
    { key: 'gozo_inicio', label: 'Período de gozo — de',  type: 'date' },
    { key: 'gozo_fim',    label: 'Período de gozo — até', type: 'date' },
  ],
  advertencias: [
    { key: 'tipo_adv', label: 'Tipo', type: 'select', options: ['Verbal', 'Escrita — 1ª', 'Escrita — 2ª', 'Suspensão'] },
    { key: 'motivo',   label: 'Motivo', type: 'textarea' },
  ],
  juridico: [
    { key: 'tipo_juridico',    label: 'Tipo',           type: 'select', options: ['Processo trabalhista', 'Notificação extrajudicial', 'Acordo', 'Sentença', 'Recurso', 'Outro'] },
    { key: 'numero_processo',  label: 'Nº do processo', type: 'text',   placeholder: 'ex: 0001234-56.2025.5.00.0000' },
  ],
  ponto: [
    { key: 'mes_ref',    label: 'Mês de referência', type: 'select', options: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'] },
    { key: 'ano_ref',    label: 'Ano',               type: 'text',   placeholder: '2025' },
    { key: 'periodo',    label: 'Período',           type: 'select', options: ['Mensal', 'Quinzenal — 1ª', 'Quinzenal — 2ª', 'Semanal'] },
    { key: 'total_horas', label: 'Total de horas',   type: 'text',   placeholder: 'ex: 176h' },
  ],
};

// ============================================================
// MODAL — Adicionar Documento
// ============================================================
function UploadDocModal({ employeeId, onClose, onSaved }) {
  const [step, setStep] = useState('category'); // 'category' | 'form'
  const [cat, setCat] = useState(null);
  const [form, setForm] = useState({ name: '', doc_date: '', file: null });
  const [extras, setExtras] = useState({});
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  const catMeta = DOC_CATEGORIES.find(c => c.id === cat);
  const extraFields = DOC_EXTRA_FIELDS[cat] ?? [];

  const setEx = (k, v) => setExtras(e => ({ ...e, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const notes = Object.keys(extras).length ? JSON.stringify(extras) : null;
    const file = form.file;

    let file_url = null;
    if (file) {
      const ext = file.name.split('.').pop();
      const path = `${employeeId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('employee-documents')
        .upload(path, file, { upsert: false });
      if (uploadErr) { alert('Erro no upload: ' + uploadErr.message); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from('employee-documents').getPublicUrl(path);
      file_url = urlData?.publicUrl ?? null;
    }

    const row = {
      employee_id: employeeId,
      name: form.name.trim(),
      category: cat,
      doc_date: form.doc_date || null,
      notes,
      file_url,
      size: file ? `${(file.size / 1024).toFixed(0)} KB` : null,
      type: file ? (file.type?.includes('image') ? 'image' : 'pdf') : 'pdf',
      status: 'ok',
      uploaded_by: userId,
    };
    const { error } = await supabase.from('documents').insert(row);
    setSaving(false);
    if (error) { alert('Erro: ' + error.message); return; }
    onSaved?.();
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(8px,2vw,24px)',
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: step === 'category' ? 520 : 480,
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
              {step === 'category' ? 'Adicionar documento' : catMeta?.name}
            </div>
            {step === 'form' && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>Preencha os dados do documento</div>
            )}
          </div>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={15} /></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {step === 'category' ? (
            /* Escolha de categoria */
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {DOC_CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setCat(c.id); setExtras({}); setForm({ name: '', doc_date: '', file: null }); setStep('form'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    border: '1px solid var(--line)', background: 'var(--surface)',
                    textAlign: 'left', transition: 'border-color .15s, background .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.background = c.color + '10'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--surface)'; }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: c.color + '1f', color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={c.icon} size={16} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                </button>
              ))}
            </div>
          ) : (
            /* Formulário */
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Nome do documento */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Nome do documento *</label>
                <input className="field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Contrato de trabalho João" />
              </div>

              {/* Data do documento */}
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
                  <span style={{ fontSize: 13, color: form.file ? 'var(--ink)' : 'var(--muted)' }}>
                    {form.file ? form.file.name : 'Clique para selecionar um arquivo'}
                  </span>
                  {form.file && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>{(form.file.size / 1024).toFixed(0)} KB</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {step === 'form' && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn ghost" onClick={onClose}>Cancelar</button>
            <button className="btn primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? 'Salvando…' : 'Salvar documento'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MODAL — Preview de Documento
// ============================================================
function DocPreviewModal({ doc, onClose }) {
  const catMeta = DOC_CATEGORIES.find(c => c.id === doc.category);
  const extraFields = DOC_EXTRA_FIELDS[doc.category] ?? [];
  let parsedNotes = {};
  try { if (doc.notes) parsedNotes = JSON.parse(doc.notes); } catch (_) { /* ignore */ }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(8px,2vw,24px)',
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'var(--surface)', borderRadius: 16,
        boxShadow: '0 32px 80px rgba(0,0,0,.25)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        maxHeight: 'calc(100vh - 32px)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: (catMeta?.color ?? '#999') + '1f', color: catMeta?.color ?? '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name={catMeta?.icon ?? 'doc'} size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{catMeta?.name ?? doc.category}</div>
          </div>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={15} /></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Preview do arquivo */}
          {doc.file_url ? (
            doc.type === 'image' ? (
              <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--surface-2)', maxHeight: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={doc.file_url}
                  alt={doc.name}
                  style={{ maxWidth: '100%', maxHeight: 340, objectFit: 'contain', display: 'block' }}
                />
              </div>
            ) : (
              <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)', height: 400 }}>
                <iframe
                  src={doc.file_url}
                  title={doc.name}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              </div>
            )
          ) : (
            <div style={{ borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--line)', height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)' }}>
              <Icon name={doc.type === 'image' ? 'image' : 'pdf'} size={28} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: 12 }}>Arquivo não disponível</span>
            </div>
          )}

          {/* Dados base */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 3 }}>Data do documento</div>
              <div style={{ fontSize: 13 }}>{doc.doc_date ? fmtDate(doc.doc_date) : '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 3 }}>Adicionado em</div>
              <div style={{ fontSize: 13 }}>{doc.created_at ? new Date(doc.created_at).toLocaleDateString('pt-BR') : '—'}</div>
            </div>
          </div>

          {/* Campos extras */}
          {extraFields.length > 0 && Object.keys(parsedNotes).length > 0 && (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {extraFields.map(f => parsedNotes[f.key] ? (
                <div key={f.key} style={{ gridColumn: f.type === 'textarea' ? '1 / -1' : undefined }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)', marginBottom: 3 }}>{f.label}</div>
                  <div style={{ fontSize: 13, whiteSpace: f.type === 'textarea' ? 'pre-wrap' : 'normal' }}>{parsedNotes[f.key]}</div>
                </div>
              ) : null)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB DOCUMENTOS
// ============================================================
function DocsTab({ employeeId, documents = [], refetch, onboardingDocs = [], refetchOnboarding }) {
  const [showUpload, setShowUpload] = useState(false);
  const [preview, setPreview] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const sharedFileRef = useRef();
  const pendingDocIdRef = useRef(null);

  const catOf = (id) => DOC_CATEGORIES.find(c => c.id === id);

  const uploadedChecklist = onboardingDocs.filter(d => d.status === 'uploaded');

  const triggerChecklistUpload = (docId) => {
    pendingDocIdRef.current = docId;
    sharedFileRef.current?.click();
  };

  const handleFileChosen = async (e) => {
    const file = e.target.files?.[0];
    const docId = pendingDocIdRef.current;
    e.target.value = '';
    if (!file || !docId) return;
    setUploadingId(docId);
    try {
      const item = onboardingDocs.find(d => d.id === docId);
      const { data: { user } } = await supabase.auth.getUser();
      await createDocuments(employeeId, [{
        name: item?.name ?? file.name,
        category: item?.category ?? 'contratos',
        size: file.size ? `${(file.size / 1024).toFixed(0)} KB` : '—',
        type: file.type?.includes('image') ? 'image' : 'pdf',
      }], user?.id ?? null);
      const { data: newDoc } = await supabase
        .from('documents')
        .select('id')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      await markOnboardingDocUploaded(docId, newDoc?.id ?? null);
      refetch?.();
      refetchOnboarding?.();
    } finally {
      setUploadingId(null);
      pendingDocIdRef.current = null;
    }
  };

  return (
    <>
      {/* Hidden file input shared for checklist uploads */}
      <input type="file" ref={sharedFileRef} style={{ display: 'none' }} onChange={handleFileChosen} />

      {/* Checklist de admissão */}
      {onboardingDocs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
            Checklist de admissão
            <span style={{ marginLeft: 8, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: uploadedChecklist.length < onboardingDocs.length ? 'var(--bad)' : 'var(--ok)' }}>
              {uploadedChecklist.length}/{onboardingDocs.length} entregues
            </span>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {onboardingDocs.map((item, i) => (
              <div
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: item.status === 'uploaded' ? 'var(--ok)' : 'var(--line)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.status === 'uploaded'
                    ? <Icon name="check" size={11} style={{ color: '#fff' }} />
                    : <span style={{ fontSize: 9, color: 'var(--muted)' }}>–</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: item.status === 'uploaded' ? 'var(--muted)' : 'var(--fg)', textDecoration: item.status === 'uploaded' ? 'line-through' : 'none' }}>
                    {item.name}
                  </div>
                </div>
                {item.status === 'pending' && (
                  <button
                    className="btn ghost sm"
                    disabled={!!uploadingId}
                    onClick={() => triggerChecklistUpload(item.id)}
                  >
                    {uploadingId === item.id ? '…' : <><Icon name="upload" size={12} /> Enviar</>}
                  </button>
                )}
                {item.status === 'uploaded' && (
                  <span style={{ fontSize: 11, color: 'var(--ok)', fontWeight: 600 }}>Entregue</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Toolbar */}
        <div className="row" style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            {documents.length} documento{documents.length !== 1 ? 's' : ''}
          </span>
          <span className="grow" />
          <button className="btn primary sm" onClick={() => setShowUpload(true)}>
            <Icon name="upload" size={13} /> Adicionar documento
          </button>
        </div>

        {/* Tabela */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {documents.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              <Icon name="folder" size={28} style={{ opacity: 0.25, display: 'block', margin: '0 auto 10px' }} />
              Nenhum documento cadastrado. Clique em "Adicionar documento" para começar.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    <th style={th()}>Documento</th>
                    <th style={th()}>Categoria</th>
                    <th style={th()}>Data</th>
                    <th style={th()}>Detalhes</th>
                    <th style={th()}>Status</th>
                    <th style={th(52)}></th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => {
                    const c = catOf(doc.category);
                    let parsedNotes = {};
                    try { if (doc.notes) parsedNotes = JSON.parse(doc.notes); } catch (_) { /* */ }
                    const extraFields = DOC_EXTRA_FIELDS[doc.category] ?? [];
                    const firstExtra = extraFields[0] ? parsedNotes[extraFields[0].key] : null;

                    return (
                      <tr key={doc.id} style={{ borderTop: '1px solid var(--line-soft)' }}>
                        <td style={td()}>
                          <div className="row gap-2">
                            <div style={{ width: 30, height: 30, borderRadius: 7, background: (c?.color ?? '#999') + '1f', color: c?.color ?? '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Icon name={c?.icon ?? 'doc'} size={14} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{doc.name}</div>
                              {doc.size && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{doc.size}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={td()}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: (c?.color ?? '#999') + '18', color: c?.color ?? '#999', borderRadius: 20, padding: '3px 9px', fontSize: 11.5, fontWeight: 600 }}>
                            {c?.name ?? doc.category}
                          </span>
                        </td>
                        <td style={td()}>
                          <span className="mono" style={{ fontSize: 12 }}>{doc.doc_date ? fmtDate(doc.doc_date) : '—'}</span>
                        </td>
                        <td style={td()}>
                          <span style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160, display: 'block' }}>
                            {firstExtra ?? '—'}
                          </span>
                        </td>
                        <td style={td()}><StatusPill status={doc.status ?? 'ok'} /></td>
                        <td style={td(52)}>
                          <button
                            className="btn ghost icon sm"
                            title="Visualizar documento"
                            onClick={() => setPreview(doc)}
                          >
                            <Icon name="eye" size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showUpload && (
        <UploadDocModal
          employeeId={employeeId}
          onClose={() => setShowUpload(false)}
          onSaved={() => { refetch?.(); setShowUpload(false); }}
        />
      )}
      {preview && (
        <DocPreviewModal doc={preview} onClose={() => setPreview(null)} />
      )}
    </>
  );
}



function PontoTab({ employeeId, timeEntries = [], refetch }) {
  const [loadingAction, setLoadingAction] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  const todayEntry = timeEntries.find(e => e.date === today);
  const clockedIn = todayEntry && todayEntry.time_in && !todayEntry.time_out;

  const handlePonto = async () => {
    setLoadingAction(true);
    if (!clockedIn) {
      await clockIn(employeeId);
    } else {
      await clockOut(employeeId, todayEntry.id);
    }
    if (refetch) refetch();
    setLoadingAction(false);
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="row gap-2" style={{ padding: '16px', borderBottom: '1px solid var(--line)' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Controle de ponto</h3>
        <span className="grow" />
        <button 
          className="btn primary" 
          onClick={handlePonto} 
          disabled={loadingAction || (todayEntry && todayEntry.time_in && todayEntry.time_out)}
        >
          <Icon name="clock" size={14} /> 
          {loadingAction ? 'Registrando...' : clockedIn ? 'Registrar Saída' : 'Registrar Entrada'}
        </button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr
            style={{
              background: 'var(--surface-2)',
              color: 'var(--muted)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}
          >
            <th style={th()}>Data</th>
            <th style={th()}>Entrada</th>
            <th style={th()}>Saída</th>
            <th style={th()}>Status</th>
          </tr>
        </thead>
        <tbody>
          {timeEntries.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                Nenhum registro de ponto encontrado.
              </td>
            </tr>
          ) : (
            timeEntries.map((entry) => (
              <tr key={entry.id} style={{ borderTop: '1px solid var(--line-soft)' }}>
                <td style={td()} className="mono">{new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td style={td()} className="mono">{entry.time_in ? entry.time_in.slice(0, 5) : '—'}</td>
                <td style={td()} className="mono">{entry.time_out ? entry.time_out.slice(0, 5) : '—'}</td>
                <td style={td()}>
                  <StatusPill status={entry.status} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function WarnTab({ employeeId }) {
  const { warnings, loading } = useEmployeeWarnings(employeeId);
  const severityColor = { verbal: 'warn', escrita: 'bad', suspensao: 'bad' };

  return (
    <div className="card" style={{ padding: 22 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>
        Advertências e ocorrências
      </h3>
      {loading ? (
        <div className="pulse" style={{ fontSize: 13, color: 'var(--muted)' }}>Carregando…</div>
      ) : warnings.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13, border: '1px dashed var(--line)', borderRadius: 10 }}>
          Nenhuma advertência registrada.
        </div>
      ) : (
        <div className="col gap-3">
          {warnings.map((w) => (
            <div key={w.id} className="row gap-3" style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 10 }}>
              <div
                className={`pill ${severityColor[w.severity] || 'warn'}`}
                style={{ width: 36, height: 36, padding: 0, borderRadius: 9, justifyContent: 'center', flexShrink: 0 }}
              >
                <Icon name="alert" size={16} />
              </div>
              <div className="grow">
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{w.type}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {w.description}{w.applied_by ? ` · aplicada por ${w.applied_by}` : ''}
                </div>
              </div>
              <span className="mono" style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>
                {new Date(w.date + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PayTab({ emp, documents = [] }) {
  const holerites = documents.filter(d => d.category === 'Holerites');
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr
            style={{
              background: 'var(--surface-2)',
              color: 'var(--muted)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}
          >
            <th style={th()}>Competência / Arquivo</th>
            <th style={th()}>Salário Base</th>
            <th style={th()}>Data de Upload</th>
            <th style={th(80)}></th>
          </tr>
        </thead>
        <tbody>
          {holerites.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                Nenhum holerite arquivado.
              </td>
            </tr>
          ) : (
            holerites.map((doc) => (
              <tr key={doc.id} style={{ borderTop: '1px solid var(--line-soft)' }}>
                <td style={td()}><strong>{doc.name}</strong></td>
                <td style={td()} className="mono">{emp.salary ? emp.salary.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</td>
                <td style={td()} className="mono">{new Date(doc.created_at).toLocaleDateString('pt-BR')}</td>
                <td style={td()}>
                  <button className="btn sm"><Icon name="download" size={13} /> {doc.type.toUpperCase()}</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function FeriasTab({ employeeId }) {
  const { vacations, loading } = useEmployeeVacations(employeeId);
  const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : null;
  const statusLabel = { concedido: 'Quitado', em_aberto: 'Em curso', agendado: 'Agendado' };
  const statusColor = { concedido: 'ok', em_aberto: 'info', agendado: 'warn' };

  return (
    <div className="card" style={{ padding: 22 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Períodos aquisitivos</h3>
      {loading ? (
        <div className="pulse" style={{ fontSize: 13, color: 'var(--muted)' }}>Carregando…</div>
      ) : vacations.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13, border: '1px dashed var(--line)', borderRadius: 10 }}>
          Nenhum período registrado.
        </div>
      ) : (
        vacations.map((v, i) => {
          const granted = v.granted_start && v.granted_end
            ? ` · Concedido ${fmt(v.granted_start)} → ${fmt(v.granted_end)} (${v.days}d)`
            : ` · ${v.days} dias disponíveis`;
          return (
            <div key={v.id} className="row gap-3" style={{ padding: '12px 0', borderTop: i ? '1px solid var(--line-soft)' : 'none' }}>
              <Icon name="umbrella" size={18} style={{ color: 'var(--info)', flexShrink: 0 }} />
              <div className="grow">
                <div style={{ fontSize: 13.5, fontWeight: 600 }} className="mono">
                  {fmt(v.period_start)} → {fmt(v.period_end)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {statusLabel[v.status] || v.status}{granted}
                </div>
              </div>
              <span className={`pill ${statusColor[v.status] || 'info'}`}>
                {statusLabel[v.status] || v.status}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

function HistoryTab({ emp, history = [] }) {
  const admYear = emp?.admission ? emp.admission.slice(0, 4) : null;
  const events = [
    ...history.map(h => ({
      y: h.date.slice(0, 4),
      fullDate: h.date,
      t: h.title,
      d: h.description,
      k: h.type === 'promotion' ? 'brand' : h.type === 'salary_change' ? 'ok' : 'info'
    })),
    ...(admYear ? [{ 
      y: admYear, 
      fullDate: emp.admission,
      t: `Admissão — ${emp.company}`, 
      d: `Cargo inicial: ${emp.role}`, 
      k: 'ok' 
    }] : [])
  ].sort((a, b) => new Date(b.fullDate) - new Date(a.fullDate));
  
  return (
    <div className="card" style={{ padding: 22 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>
        Linha do tempo profissional
      </h3>
      {events.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Sem histórico disponível.</div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 28 }}>
          <div
            style={{
              position: 'absolute',
              left: 11,
              top: 0,
              bottom: 0,
              width: 1.5,
              background: 'var(--line)',
            }}
          />
          {events.map((it, i) => (
            <div key={i} style={{ position: 'relative', paddingBottom: 18 }}>
              <div
                style={{
                  position: 'absolute',
                  left: -22,
                  top: 4,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: it.k === 'warn' ? 'var(--warn)' : it.k === 'ok' ? 'var(--ok)' : 'var(--brand)',
                  border: '3px solid var(--surface)',
                  boxShadow: '0 0 0 1px var(--line)',
                }}
              />
              <div className="row gap-2">
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{it.t}</div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{it.y}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{it.d}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
