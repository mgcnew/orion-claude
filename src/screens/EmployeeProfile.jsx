import { useState, useEffect, useRef } from 'react';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import Skeleton from '../components/Skeleton.jsx';
import {
  useEmployee,
  useEmployeeWarnings,
  useEmployeeVacations,
  useEmployeeDocuments,
  useEmployeeHistory,
  useEmployeeTimeEntries,
  useOnboardingDocs,
  markOnboardingDocUploaded,
  createDocuments,
  updateEmployee,
  clockIn,
  clockOut,
  logAudit,
} from '../hooks/useEmployees.js';
import { supabase } from '../lib/supabase.js';
import { DateInput, EditEmployeeModal } from './Employees.jsx';

const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

// ── Helpers de tabela (duplicados de Employees.jsx) ──────────────
const th = (w) => ({ textAlign: 'left', padding: '10px 14px', fontWeight: 600, width: w });
const td = () => ({ padding: '11px 14px', verticalAlign: 'middle' });

// ── Upload de foto do funcionário (duplicado de Employees.jsx) ───
async function uploadEmployeePhoto(file, key) {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${key}/avatar.${ext}`;
  const { error } = await supabase.storage.from('employee-avatars').upload(path, file, { upsert: true });
  if (error) return { error };
  const { data: { publicUrl } } = supabase.storage.from('employee-avatars').getPublicUrl(path);
  return { url: `${publicUrl}?t=${Date.now()}` };
}

// ── Exportar prontuário em HTML (duplicado de Employees.jsx) ─────
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

// ── Modal (duplicado de Employees.jsx para evitar import cruzado) ─
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

// ── StatusPill (duplicado de Employees.jsx) ───────────────────────
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

function EmployeeProfile({ setRoute, employeeId }) {
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
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Back */}
        <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setRoute('employees')}>
          <Icon name="chevron-left" size={13} /> Funcionários
        </button>

        {/* Header card skeleton */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ height: 4, background: 'var(--brand)' }} />
          <div className="row" style={{ padding: '22px 24px', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <Skeleton width={86} circle />
            <div className="grow" style={{ minWidth: 240 }}>
              <Skeleton width={220} height={22} style={{ marginBottom: 10 }} />
              <div className="row gap-3" style={{ flexWrap: 'wrap', gap: 14 }}>
                <Skeleton width={120} height={12} />
                <Skeleton width={140} height={12} />
                <Skeleton width={90} height={12} />
                <Skeleton width={150} height={12} />
              </div>
            </div>
            <div className="row gap-2" style={{ paddingTop: 36 }}>
              <Skeleton width={130} height={32} radius={8} />
              <Skeleton width={150} height={32} radius={8} />
              <Skeleton width={90} height={32} radius={8} />
            </div>
          </div>
        </div>

        {/* Tab bar skeleton */}
        <div className="row gap-2" style={{ borderBottom: '1px solid var(--line)' }}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} width={100} height={32} radius={6} style={{ marginBottom: -1 }} />
          ))}
        </div>

        {/* Tab content skeleton (grid de cards) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="card" style={{ padding: 20 }}>
              <Skeleton width={140} height={14} style={{ marginBottom: 16 }} />
              <Skeleton height={12} style={{ marginBottom: 8, maxWidth: '85%' }} />
              <Skeleton height={12} style={{ marginBottom: 8, maxWidth: '70%' }} />
              <Skeleton height={12} style={{ maxWidth: '90%' }} />
            </div>
          ))}
        </div>
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
    <style>{`
      .ep-page          { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
      .ep-header        { padding: 22px 24px; display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
      .ep-header-meta   { flex: 1; min-width: 240px; }
      .ep-header-actions{ display: flex; gap: 8px; align-items: center; padding-top: 36px; }
      .ep-avatar-wrap   { position: relative; flex-shrink: 0; }
      .ep-name          { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.4px; }
      .ep-stats         { display: flex; border-top: 1px solid var(--line); background: var(--surface-2); }
      .ep-stat          { flex: 1; padding: 14px 18px; border-right: 1px solid var(--line); min-width: 0; }
      .ep-stat:last-child { border-right: none; }
      .ep-stat-l        { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.6px; font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
      .ep-stat-v        { font-size: 15px; font-weight: 700; }
      .ep-grid-pessoal  { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
      .ep-grid-info     { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; }
      .ep-grid-end      { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 18px; }
      .ep-grid-prof     { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }

      /* tabela responsiva utilitária */
      .ep-rtable { width: 100%; border-collapse: collapse; font-size: 13px; }
      .ep-rtable thead tr { background: var(--surface-2); color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; }
      .ep-rtable th { text-align: left; padding: 10px 14px; font-weight: 600; }
      .ep-rtable td { padding: 11px 14px; vertical-align: middle; border-top: 1px solid var(--line-soft); }

      @media (max-width: 768px) {
        .ep-page          { padding: 14px; gap: 12px; }
        .ep-header        { padding: 16px; gap: 14px; }
        .ep-header-meta   { min-width: 0; flex: 1 1 60%; }
        .ep-header-actions{ padding-top: 0; width: 100%; gap: 6px; flex-wrap: wrap; }
        .ep-name          { font-size: 18px; }

        /* esconde labels — sobra "Editar" como primário */
        .ep-action-label  { display: none; }
        .ep-action-edit .ep-action-label { display: inline; }
        .ep-action-edit   { flex: 1; justify-content: center; }

        /* stats viram grid 2 colunas (3 linhas) */
        .ep-stats         { display: grid; grid-template-columns: 1fr 1fr; }
        .ep-stat          { border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 12px 14px; }
        .ep-stat:nth-child(2n) { border-right: none; }
        .ep-stat:nth-last-child(-n+2) { border-bottom: none; }
        .ep-stat-l        { font-size: 10px; }
        .ep-stat-v        { font-size: 13.5px; }

        .ep-grid-pessoal  { grid-template-columns: 1fr; }
        .ep-grid-info     { grid-template-columns: 1fr 1fr; gap: 14px; }
        .ep-grid-end      { grid-template-columns: 1fr 1fr; gap: 14px; }
        .ep-grid-prof     { grid-template-columns: 1fr 1fr; gap: 14px; }

        /* tabelas → cards empilhados */
        .ep-rtable, .ep-rtable thead, .ep-rtable tbody, .ep-rtable tr, .ep-rtable td { display: block; width: 100%; box-sizing: border-box; }
        .ep-rtable thead { display: none; }
        .ep-rtable tr { border: 1px solid var(--line); border-radius: 10px; margin: 8px 12px; padding: 10px 4px; background: var(--surface); }
        .ep-rtable td { border-top: none; padding: 6px 12px; display: flex; align-items: center; gap: 10px; }
        .ep-rtable td::before { content: attr(data-label); font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: var(--muted); flex: 0 0 90px; }
        .ep-rtable td.ep-rtable-full::before { display: none; }
        .ep-rtable td.ep-rtable-full { display: block; padding-top: 10px; padding-bottom: 4px; }
      }
      @media (max-width: 480px) {
        .ep-grid-info     { grid-template-columns: 1fr; }
        .ep-grid-end      { grid-template-columns: 1fr; }
        .ep-grid-prof     { grid-template-columns: 1fr; }
        .ep-stats         { grid-template-columns: 1fr; }
        .ep-stat          { border-right: none !important; border-bottom: 1px solid var(--line); }
        .ep-stat:last-child { border-bottom: none; }
      }
    `}</style>
    <div className="fade-up ep-page">
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
        <div className="ep-header">
          <div className="ep-avatar-wrap">
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
          <div className="ep-header-meta">
            <div className="row gap-2">
              <h2 className="ep-name">{emp.name}</h2>
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
          <div className="ep-header-actions">
            <button className="btn" title="Enviar mensagem">
              <Icon name="mail" size={14} /> <span className="ep-action-label">Enviar mensagem</span>
            </button>
            <button className="btn" title="Exportar prontuário" onClick={() => exportProntuario(emp)}>
              <Icon name="download" size={14} /> <span className="ep-action-label">Exportar prontuário</span>
            </button>
            <button className="btn primary ep-action-edit" onClick={() => setShowEdit(true)}>
              <Icon name="edit" size={14} /> <span className="ep-action-label">Editar</span>
            </button>
            <button className="btn ghost icon">
              <Icon name="more-v" size={15} />
            </button>
          </div>
        </div>

        {/* Quick stats strip */}
        <div className="ep-stats">
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
            <div key={i} className="ep-stat">
              <div className="ep-stat-l">
                <Icon name={s.i} size={11} /> {s.l}
              </div>
              <div className="mono ep-stat-v">{s.v}</div>
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
    <div className="ep-grid-pessoal">
      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>
          Informações pessoais
        </h3>
        <div className="ep-grid-info">
          <Field l="Nome completo" v={emp?.name || '—'} />
          <Field l="CPF" v={emp?.cpf || '—'} mono />
          <Field l="Data de nascimento" v={birthFmt} mono />
          <Field l="Estado civil" v={emp?.civil_status || '—'} />
          <Field l="Nacionalidade" v="Brasileiro(a)" />
          <Field l="Dependentes" v="—" />
        </div>
        <div className="h-line" style={{ margin: '22px 0' }} />
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Endereço & contato</h3>
        <div className="ep-grid-end">
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
      <div className="ep-grid-prof">
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
              <table className="ep-rtable">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Categoria</th>
                    <th>Data</th>
                    <th>Detalhes</th>
                    <th>Status</th>
                    <th style={{ width: 52 }}></th>
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
                      <tr key={doc.id}>
                        <td data-label="Documento" className="ep-rtable-full">
                          <div className="row gap-2">
                            <div style={{ width: 30, height: 30, borderRadius: 7, background: (c?.color ?? '#999') + '1f', color: c?.color ?? '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Icon name={c?.icon ?? 'doc'} size={14} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                              {doc.size && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{doc.size}</div>}
                            </div>
                          </div>
                        </td>
                        <td data-label="Categoria">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: (c?.color ?? '#999') + '18', color: c?.color ?? '#999', borderRadius: 20, padding: '3px 9px', fontSize: 11.5, fontWeight: 600 }}>
                            {c?.name ?? doc.category}
                          </span>
                        </td>
                        <td data-label="Data">
                          <span className="mono" style={{ fontSize: 12 }}>{doc.doc_date ? fmtDate(doc.doc_date) : '—'}</span>
                        </td>
                        <td data-label="Detalhes">
                          <span style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {firstExtra ?? '—'}
                          </span>
                        </td>
                        <td data-label="Status"><StatusPill status={doc.status ?? 'ok'} /></td>
                        <td data-label="">
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
      <table className="ep-rtable">
        <thead>
          <tr>
            <th>Data</th>
            <th>Entrada</th>
            <th>Saída</th>
            <th>Status</th>
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
              <tr key={entry.id}>
                <td data-label="Data" className="mono">{new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td data-label="Entrada" className="mono">{entry.time_in ? entry.time_in.slice(0, 5) : '—'}</td>
                <td data-label="Saída" className="mono">{entry.time_out ? entry.time_out.slice(0, 5) : '—'}</td>
                <td data-label="Status">
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
      <table className="ep-rtable">
        <thead>
          <tr>
            <th>Competência / Arquivo</th>
            <th>Salário Base</th>
            <th>Data de Upload</th>
            <th style={{ width: 80 }}></th>
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
              <tr key={doc.id}>
                <td data-label="Competência" className="ep-rtable-full"><strong>{doc.name}</strong></td>
                <td data-label="Salário Base" className="mono">{emp.salary ? emp.salary.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</td>
                <td data-label="Upload" className="mono">{new Date(doc.created_at).toLocaleDateString('pt-BR')}</td>
                <td data-label="">
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
export default EmployeeProfile;

