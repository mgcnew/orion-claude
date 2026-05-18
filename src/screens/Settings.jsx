import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../components/Icon.jsx';
import { supabase } from '../lib/supabase.js';
import { useCompanies, createCompany, updateCompany } from '../hooks/useEmployees.js';
import PermissionsScreen from './Permissions.jsx';

const settStyle = `
  .sett-page     { padding: clamp(14px, 4vw, 28px); display:flex; flex-direction:column; gap:20px; max-width:1180px; margin:0 auto; width:100%; }
  .sett-tabs     { display:flex; overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; border-bottom:1px solid var(--line); }
  .sett-tabs::-webkit-scrollbar { display:none; }
  .sett-row      { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding:18px 0; border-bottom:1px solid var(--line-soft); }
  .sett-row-ctrl { flex-shrink:0; }
  .sett-hist      { overflow-x:auto; }
  .sett-co-lbl    { display:inline; }
  .sett-acc-table { display:block; }
  .sett-acc-cards { display:none; flex-direction:column; gap:8px; margin-top:10px; }
  .sett-acc-card  { background:var(--surface-2); border:1px solid var(--line); border-radius:10px; padding:10px 12px; }
  .sett-acc-head  { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
  .sett-acc-row   { display:flex; gap:6px; padding:4px 0; border-top:1px solid var(--line-soft); }
  .sett-acc-lbl   { color:var(--muted); font-size:11px; min-width:44px; flex-shrink:0; padding-top:2px; }
  .sett-acc-val   { font-size:12px; color:var(--ink-soft); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  @media (max-width:768px) {
    .sett-row       { flex-direction:column; gap:10px; }
    .sett-row-ctrl  { overflow-x:auto; width:100%; }
    .sett-co-lbl    { display:none; }
    .sett-acc-table { display:none !important; }
    .sett-acc-cards { display:flex; }
  }
`;

// ── UI primitives (locais a Settings) ───────────────────────────
function SettingRow({ label, description, children }) {
  return (
    <div className="sett-row">
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{description}</div>}
      </div>
      <div className="sett-row-ctrl">{children}</div>
    </div>
  );
}

function SegControl({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, padding: 3, gap: 2 }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: '5px 14px', border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
            background: value === o.value ? 'var(--surface)' : 'transparent',
            color: value === o.value ? 'var(--ink)' : 'var(--muted)',
            boxShadow: value === o.value ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
            transition: 'all .12s',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <div
      onClick={() => onChange(!on)}
      style={{
        width: 36, height: 20, borderRadius: 10, flexShrink: 0,
        background: on ? 'var(--brand)' : 'var(--line)',
        position: 'relative', cursor: 'pointer', transition: 'background .15s',
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: on ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        transition: 'left .15s',
      }} />
    </div>
  );
}

// ── EmpresasTab ─────────────────────────────────────────────────
function EmpresasTab({ addToast }) {
  const { companies, loading, refetch } = useCompanies();
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const BLANK_FORM = { name: '', slug: '', address: '', number: '', logo_url: '', cnpj: '', email: '', phone: '' };
  const [form, setForm] = useState(BLANK_FORM);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const logoInputRef = useMemo(() => ({ current: null }), []);

  const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setForm(BLANK_FORM);
    setLogoFile(null);
    setLogoPreview(null);
    setEditTarget(null);
    setShowNew(true);
  };

  const openEdit = (c) => {
    setForm({
      name: c.name,
      slug: c.slug || '',
      address: c.address || '',
      number: c.number || '',
      logo_url: c.logo_url || '',
      cnpj: c.cnpj || '',
      email: c.email || '',
      phone: c.phone || '',
    });
    setLogoFile(null);
    setLogoPreview(c.logo_url || null);
    setEditTarget(c);
    setShowNew(true);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async (companyId) => {
    if (!logoFile) return form.logo_url || null;
    const ext = logoFile.name.split('.').pop();
    const path = `${companyId}.${ext}`;
    const { error } = await supabase.storage.from('company-logos').upload(path, logoFile, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('company-logos').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const slug = form.slug.trim() || slugify(form.name.trim());
      const contactFields = {
        address: form.address.trim() || null,
        number:  form.number.trim()  || null,
        cnpj:    form.cnpj.trim()    || null,
        email:   form.email.trim()   || null,
        phone:   form.phone.trim()   || null,
      };

      if (editTarget) {
        const logo_url = await uploadLogo(editTarget.id);
        const { error } = await updateCompany(editTarget.id, { name: form.name.trim(), slug, logo_url, ...contactFields });
        if (error) throw error;
      } else {
        const { created, error } = await createCompany({ name: form.name.trim(), slug, ...contactFields });
        if (error) throw error;
        if (logoFile && created) {
          const logo_url = await uploadLogo(created.id);
          await updateCompany(created.id, { logo_url });
        }
      }

      addToast({ kind: 'ok', msg: editTarget ? 'Empresa atualizada' : 'Empresa criada' });
      setShowNew(false);
      refetch();
    } catch (err) {
      addToast({ kind: 'err', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c) => {
    const { error } = await updateCompany(c.id, { active: !c.active });
    if (error) addToast({ kind: 'err', msg: error.message });
    else refetch();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Empresas</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
            Gerencie as empresas da sua conta. Cada empresa tem seus próprios funcionários e dados.
          </div>
        </div>
        <button className="btn primary sm" onClick={openNew}>
          <Icon name="plus" size={13} /> Nova empresa
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }} className="pulse">Carregando…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {companies.map((c) => (
            <div key={c.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
                background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-700) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {c.logo_url
                  ? <img src={c.logo_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: 'var(--brand-ink)', fontWeight: 700, fontSize: 16 }}>{c.name.charAt(0).toUpperCase()}</span>
                }
              </div>
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {c.name}
                  {!c.active && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, background: 'var(--surface-2)', color: 'var(--muted)', border: '1px solid var(--line)', borderRadius: 4, padding: '1px 6px' }}>INATIVA</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {c.address ? `${c.address}${c.number ? ', ' + c.number : ''}` : `/${c.slug || '—'}`}
                </div>
              </div>
              <div className="row gap-2">
                <button className="btn ghost sm" onClick={() => openEdit(c)}>
                  <Icon name="edit" size={13} /> <span className="sett-co-lbl">Editar</span>
                </button>
                <button className="btn ghost sm" onClick={() => handleToggleActive(c)} style={{ color: c.active ? 'var(--bad)' : 'var(--good)' }}>
                  <Icon name={c.active ? 'x' : 'check'} size={13} />
                  <span className="sett-co-lbl">{c.active ? 'Desativar' : 'Ativar'}</span>
                </button>
              </div>
            </div>
          ))}
          {companies.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Nenhuma empresa cadastrada.</div>
          )}
        </div>
      )}

      {showNew && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'clamp(8px, 2vw, 24px)', overflowY: 'auto',
          }}
          onClick={() => setShowNew(false)}
        >
          <div
            style={{
              width: '100%', maxWidth: 520, margin: 'auto',
              background: 'var(--surface)', borderRadius: 14,
              boxShadow: '0 24px 60px rgba(0,0,0,.2)',
              display: 'flex', flexDirection: 'column',
              maxHeight: 'calc(100vh - 32px)', overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '18px 22px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{editTarget ? 'Editar empresa' : 'Nova empresa'}</div>
              <button className="btn ghost icon sm" onClick={() => setShowNew(false)}><Icon name="x" size={15} /></button>
            </div>

            <div style={{ overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Logo da empresa</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
                  <div
                    style={{
                      width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
                      background: logoPreview ? 'transparent' : 'var(--surface-2)',
                      border: '2px dashed var(--line)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    onClick={() => logoInputRef.current?.click()}
                    title="Clique para selecionar"
                  >
                    {logoPreview
                      ? <img src={logoPreview} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Icon name="building" size={22} style={{ color: 'var(--muted)' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <button className="btn sm" onClick={() => logoInputRef.current?.click()}>
                      <Icon name="upload" size={13} /> {logoPreview ? 'Trocar imagem' : 'Selecionar logo'}
                    </button>
                    {logoPreview && (
                      <button className="btn ghost sm" style={{ marginLeft: 6, color: 'var(--bad)' }} onClick={() => { setLogoFile(null); setLogoPreview(null); set('logo_url', ''); }}>
                        Remover
                      </button>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>PNG, JPG ou WebP · máx 2 MB</div>
                  </div>
                </div>
                <input ref={(el) => { logoInputRef.current = el; }} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: 'none' }} onChange={handleLogoChange} />
              </div>

              <div>
                <label className="label">Nome da empresa *</label>
                <input
                  className="field"
                  value={form.name}
                  autoFocus
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({ ...f, name, slug: f.slug || slugify(name) }));
                  }}
                  placeholder="Ex: Empresa João LTDA"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10 }}>
                <div>
                  <label className="label">Endereço</label>
                  <input className="field" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Rua, Av., Beco…" />
                </div>
                <div>
                  <label className="label">Número</label>
                  <input className="field" value={form.number} onChange={(e) => set('number', e.target.value)} placeholder="Ex: 1000" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="label">CNPJ</label>
                  <input className="field" value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} placeholder="00.000.000/0001-00" />
                </div>
                <div>
                  <label className="label">Telefone</label>
                  <input className="field" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+55 11 0000-0000" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="label">E-mail corporativo</label>
                  <input className="field" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="contato@empresa.com.br" />
                </div>
              </div>

              <div>
                <label className="label">Identificador (slug)</label>
                <input className="field" value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="empresa-joao" />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  Usado internamente. Só letras minúsculas, números e hifens.
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn" onClick={() => setShowNew(false)}>Cancelar</button>
              <button className="btn primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? 'Salvando…' : editTarget ? 'Salvar alterações' : 'Criar empresa'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ── AparenciaTab ────────────────────────────────────────────────
const PRIMARY_PRESETS = [
  { color: '#2A5BFF', name: 'Azul Orion'       },
  { color: '#1E3A8A', name: 'Azul espacial'    },
  { color: '#0EA5E9', name: 'Ciano'            },
  { color: '#10B981', name: 'Verde corporativo'},
  { color: '#7C3AED', name: 'Roxo'             },
  { color: '#F97316', name: 'Laranja'          },
  { color: '#E11D48', name: 'Vermelho'         },
  { color: '#475569', name: 'Grafite'          },
];

function AparenciaTab({ tweaks, setTweak }) {
  const [, setCustomColor] = useState(tweaks.primary);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: '4px 24px 8px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', padding: '16px 0 4px' }}>Geral</div>
        <SettingRow label="Tema" description="Alterna entre modo claro e escuro em toda a interface.">
          <SegControl value={tweaks.theme} onChange={v => setTweak('theme', v)}
            options={[{ value: 'light', label: '☀ Claro' }, { value: 'dark', label: '◑ Escuro' }]} />
        </SettingRow>
        <SettingRow label="Tamanho do texto" description="Afeta o tamanho base das fontes em toda a plataforma.">
          <SegControl value={tweaks.fontSize} onChange={v => setTweak('fontSize', v)}
            options={[{ value: 'sm', label: 'Pequeno' }, { value: 'md', label: 'Padrão' }, { value: 'lg', label: 'Grande' }]} />
        </SettingRow>
        <SettingRow label="Sidebar padrão" description="Define se a barra lateral inicia expandida ou colapsada.">
          <SegControl value={tweaks.sidebarDefault} onChange={v => setTweak('sidebarDefault', v)}
            options={[{ value: 'expanded', label: 'Expandida' }, { value: 'collapsed', label: 'Colapsada' }]} />
        </SettingRow>
        <SettingRow label="Filtro de luz azul" description="Adiciona um tom quente à tela para reduzir o cansaço visual em uso prolongado.">
          <SegControl value={tweaks.blueLight} onChange={v => setTweak('blueLight', v)}
            options={[
              { value: 'off',    label: 'Desligado' },
              { value: 'low',    label: 'Suave' },
              { value: 'medium', label: 'Médio' },
              { value: 'high',   label: 'Forte' },
            ]} />
        </SettingRow>
      </div>

      <div className="card" style={{ padding: '4px 24px 20px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', padding: '16px 0 4px' }}>Cor da marca</div>
        <SettingRow label="Cor primária" description="Aplicada em botões, links, destaques e elementos interativos.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="color" value={tweaks.primary}
              onChange={e => { setCustomColor(e.target.value); setTweak('primary', e.target.value); }}
              style={{ width: 36, height: 36, border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer', padding: 2, background: 'var(--surface)' }}
              title="Cor personalizada" />
            <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>{tweaks.primary.toUpperCase()}</span>
          </div>
        </SettingRow>
        <div style={{ paddingBottom: 4 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Paletas predefinidas</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PRIMARY_PRESETS.map(p => (
              <button key={p.color} title={p.name} onClick={() => setTweak('primary', p.color)}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  background: p.color, cursor: 'pointer',
                  outline: tweaks.primary === p.color ? `3px solid ${p.color}` : 'none',
                  outlineOffset: 2,
                  boxShadow: tweaks.primary === p.color ? `0 0 0 1px var(--surface)` : '0 1px 3px rgba(0,0,0,.15)',
                  transform: tweaks.primary === p.color ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform .12s, outline .12s',
                }} />
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '4px 24px 8px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', padding: '16px 0 4px' }}>Layout</div>
        <SettingRow label="Raio dos cantos" description={`Arredondamento dos elementos de interface. Atual: ${tweaks.radius}px`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ v: 4, l: 'Reto' }, { v: 10, l: 'Padrão' }, { v: 16, l: 'Redondo' }].map(o => (
                <button key={o.v} onClick={() => setTweak('radius', o.v)}
                  style={{
                    padding: '5px 12px', border: '1px solid var(--line)', fontSize: 12, cursor: 'pointer',
                    background: tweaks.radius === o.v ? 'var(--brand-tint)' : 'var(--surface-2)',
                    color: tweaks.radius === o.v ? 'var(--brand)' : 'var(--muted)',
                    fontWeight: tweaks.radius === o.v ? 600 : 400,
                    borderRadius: o.v,
                    transition: 'all .12s',
                  }}>
                  {o.l}
                </button>
              ))}
            </div>
            <input type="range" min={4} max={20} step={1}
              value={tweaks.radius}
              onChange={e => setTweak('radius', Number(e.target.value))}
              style={{ width: 80, accentColor: 'var(--brand)' }} />
            <span style={{ fontSize: 12, color: 'var(--muted)', width: 32, textAlign: 'right', fontFamily: 'monospace' }}>{tweaks.radius}px</span>
          </div>
        </SettingRow>
        <SettingRow label="Densidade" description="Controla o espaçamento entre elementos e o tamanho dos componentes.">
          <SegControl value={tweaks.density} onChange={v => setTweak('density', v)}
            options={[{ value: 'compact', label: 'Compacto' }, { value: 'comfortable', label: 'Confortável' }]} />
        </SettingRow>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>Pré-visualização</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn primary" style={{ gap: 6 }}><Icon name="plus" size={13} /> Novo item</button>
          <button className="btn">Secundário</button>
          <button className="btn ghost">Ghost</button>
          <span className="pill good">Ativo</span>
          <span className="pill warn">Pendente</span>
          <span className="pill bad">Erro</span>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, width: '100%' }}>
            <input className="input" placeholder="Campo de texto…" style={{ maxWidth: 220 }} readOnly />
            <select className="input" style={{ maxWidth: 160 }}><option>Seletor</option></select>
          </div>
        </div>
      </div>
    </div>
  );
}

const ACTION_PILL = {
  LOGIN:   'ok',
  CRIOU:   'ok',
  ASSINOU: 'ok',
  GEROU:   'ok',
  EDITOU:  'info',
  UPLOAD:  'info',
  ACESSOU: '',
  EXPORT:  'warn',
  EXCLUIU: 'bad',
};

const HIST_PERIOD_OPTIONS = [
  { label: 'Hoje',       value: 1  },
  { label: '7 dias',     value: 7  },
  { label: '30 dias',    value: 30 },
  { label: 'Trimestre',  value: 90 },
];

// ── SegurancaTab ────────────────────────────────────────────────
function SegurancaTab({ addToast, tweaks, setTweak }) {
  const [user, setUser] = useState(null);
  const [auditRows, setAuditRows] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [histDays, setHistDays] = useState(30);
  const [histAction, setHistAction] = useState(null);
  const [histSearch, setHistSearch] = useState('');
  const [histPage, setHistPage] = useState(1);
  const HIST_PAGE_SIZE = 15;

  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const lockValue = tweaks?.inactivityLock ?? 'off';

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoadingAudit(true);
    const since = new Date(Date.now() - histDays * 86400000).toISOString();
    supabase
      .from('audit_log')
      .select('id, action, target, ip, device, created_at')
      .eq('actor_id', user.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => { setAuditRows(data ?? []); setLoadingAudit(false); });
  }, [user, histDays]);

  const distinctActions = useMemo(() => [...new Set(auditRows.map(r => r.action))].sort(), [auditRows]);

  const filteredRows = useMemo(() => {
    setHistPage(1);
    return auditRows.filter(r => {
      if (histAction && r.action !== histAction) return false;
      if (histSearch) {
        const q = histSearch.toLowerCase();
        if (!(r.ip || '').toLowerCase().includes(q) &&
            !(r.device || '').toLowerCase().includes(q) &&
            !(r.target || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [auditRows, histAction, histSearch]);

  const totalPages = Math.ceil(filteredRows.length / HIST_PAGE_SIZE);
  const pagedRows  = filteredRows.slice((histPage - 1) * HIST_PAGE_SIZE, histPage * HIST_PAGE_SIZE);

  async function handleChangePassword(e) {
    e.preventDefault();
    if (newPwd.length < 6) { addToast({ type: 'error', message: 'A senha deve ter ao menos 6 caracteres.' }); return; }
    if (newPwd !== confirmPwd) { addToast({ type: 'error', message: 'As senhas não coincidem.' }); return; }
    setPwdLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setPwdLoading(false);
    if (error) { addToast({ type: 'error', message: error.message }); return; }
    addToast({ type: 'success', message: 'Senha alterada com sucesso.' });
    setNewPwd(''); setConfirmPwd('');
  }

  async function handleTerminateSessions() {
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    if (error) { addToast({ type: 'error', message: error.message }); return; }
    addToast({ type: 'success', message: 'Outras sessões encerradas.' });
  }

  const SectionTitle = ({ children }) => (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--muted-2)', textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card" style={{ padding: 20 }}>
        <SectionTitle>Sessão atual</SectionTitle>
        <div className="row gap-3" style={{ alignItems: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--brand-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="user" size={20} style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{user?.email || '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Último acesso:{' '}
              {user?.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                : '—'}
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span className="pill ok">Ativa</span>
          </div>
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          <button className="btn ghost sm" style={{ color: 'var(--bad)' }} onClick={handleTerminateSessions}>
            <Icon name="logout" size={14} /> Encerrar outras sessões
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <SectionTitle>Alterar senha</SectionTitle>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Nova senha</label>
            <input className="field" type="password" placeholder="Mínimo 6 caracteres" value={newPwd} onChange={e => setNewPwd(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Confirmar nova senha</label>
            <input className="field" type="password" placeholder="Repita a nova senha" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <button className="btn primary sm" type="submit" disabled={pwdLoading || !newPwd}>
              {pwdLoading ? 'Salvando…' : 'Salvar nova senha'}
            </button>
          </div>
        </form>
      </div>

      {tweaks && setTweak && (
        <div className="card" style={{ padding: 20 }}>
          <SectionTitle>Bloqueio por inatividade</SectionTitle>
          <div className="row gap-3" style={{ alignItems: 'center' }}>
            <div className="grow">
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>Bloquear tela automaticamente</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                Exige nova autenticação após período sem atividade
              </div>
            </div>
            <Toggle on={lockValue !== 'off'} onChange={v => setTweak('inactivityLock', v ? '15' : 'off')} />
          </div>
          {lockValue !== 'off' && (
            <div className="row gap-2" style={{ marginTop: 14, flexWrap: 'wrap' }}>
              {[['5', '5 min'], ['10', '10 min'], ['15', '15 min'], ['30', '30 min'], ['60', '1 hora']].map(([val, lbl]) => (
                <button key={val} className={`btn sm ${lockValue === val ? 'primary' : 'ghost'}`} onClick={() => setTweak('inactivityLock', val)}>
                  {lbl}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <SectionTitle>Histórico de acesso</SectionTitle>
          <select
            className="field"
            value={histDays}
            onChange={e => { setHistDays(Number(e.target.value)); setHistAction(null); setHistSearch(''); }}
            style={{ height: 32, fontSize: 12, width: 'auto', paddingTop: 0, paddingBottom: 0 }}
          >
            {HIST_PERIOD_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Filtros de ação + busca */}
        {!loadingAudit && auditRows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className="btn sm"
                style={{
                  borderColor: histAction === null ? 'var(--brand)' : 'var(--line)',
                  background: histAction === null ? 'var(--brand-tint)' : 'transparent',
                  color: histAction === null ? 'var(--brand)' : 'var(--muted)',
                  fontWeight: histAction === null ? 700 : 500,
                }}
                onClick={() => setHistAction(null)}
              >
                Todos <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 4, padding: '0 5px', borderRadius: 8, background: histAction === null ? 'var(--brand)' : 'var(--surface-2)', color: histAction === null ? '#fff' : 'var(--muted)' }}>{auditRows.length}</span>
              </button>
              {distinctActions.map(a => {
                const active = histAction === a;
                const count = auditRows.filter(r => r.action === a).length;
                return (
                  <button
                    key={a}
                    className="btn sm"
                    style={{
                      borderColor: active ? 'var(--brand)' : 'var(--line)',
                      background: active ? 'var(--brand-tint)' : 'transparent',
                      color: active ? 'var(--brand)' : 'var(--muted)',
                      fontWeight: active ? 700 : 500,
                      fontFamily: 'monospace',
                      fontSize: 11,
                    }}
                    onClick={() => setHistAction(active ? null : a)}
                  >
                    {a} <span style={{ fontSize: 10, marginLeft: 4, padding: '0 4px', borderRadius: 8, background: active ? 'var(--brand)' : 'var(--surface-2)', color: active ? '#fff' : 'var(--muted)' }}>{count}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ position: 'relative' }}>
              <Icon name="search" size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
              <input
                className="field"
                value={histSearch}
                onChange={e => setHistSearch(e.target.value)}
                placeholder="Buscar por IP, dispositivo ou alvo…"
                style={{ paddingLeft: 28, height: 32, fontSize: 12 }}
              />
            </div>
          </div>
        )}

        {loadingAudit ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', padding: '12px 0' }} className="pulse">Carregando…</div>
        ) : auditRows.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', padding: '12px 0' }}>Nenhum registro no período.</div>
        ) : filteredRows.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', padding: '12px 0' }}>Nenhum resultado para os filtros aplicados.</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                {filteredRows.length} {filteredRows.length === 1 ? 'evento' : 'eventos'}
              </span>
              {(histAction || histSearch) && (
                <button className="btn ghost sm" style={{ fontSize: 10, padding: '1px 6px' }} onClick={() => { setHistAction(null); setHistSearch(''); }}>
                  Limpar filtros
                </button>
              )}
            </div>
            {/* desktop */}
            <div className="sett-hist sett-acc-table">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    {['Data', 'Ação', 'Alvo', 'IP', 'Dispositivo'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '7px 10px', color: 'var(--muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--line-soft)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '8px 10px', color: 'var(--muted)', fontFamily: 'monospace', fontSize: 11.5, whiteSpace: 'nowrap' }}>
                        {new Date(r.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span className={`pill ${ACTION_PILL[r.action] ?? ''}`} style={{ fontSize: 10.5, fontFamily: 'monospace' }}>{r.action}</span>
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--ink-soft)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.target || '—'}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--muted)', fontFamily: 'monospace', fontSize: 11.5, whiteSpace: 'nowrap' }}>{r.ip || '—'}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.device || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* mobile cards */}
            <div className="sett-acc-cards">
              {pagedRows.map(r => (
                <div key={r.id} className="sett-acc-card">
                  <div className="sett-acc-head">
                    <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: 'var(--muted)' }}>
                      {new Date(r.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    <span className={`pill ${ACTION_PILL[r.action] ?? ''}`} style={{ fontSize: 10.5, fontFamily: 'monospace' }}>{r.action}</span>
                  </div>
                  {r.target && (
                    <div className="sett-acc-row">
                      <span className="sett-acc-lbl">Alvo</span>
                      <span className="sett-acc-val">{r.target}</span>
                    </div>
                  )}
                  {r.ip && (
                    <div className="sett-acc-row">
                      <span className="sett-acc-lbl">IP</span>
                      <span className="sett-acc-val" style={{ fontFamily: 'monospace' }}>{r.ip}</span>
                    </div>
                  )}
                  {r.device && (
                    <div className="sett-acc-row">
                      <span className="sett-acc-lbl">Device</span>
                      <span className="sett-acc-val">{r.device}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* paginação */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                <button
                  className="btn ghost sm"
                  disabled={histPage === 1}
                  onClick={() => setHistPage(p => p - 1)}
                >
                  <Icon name="chevron-left" size={13} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    className="btn sm"
                    onClick={() => setHistPage(p)}
                    style={{
                      minWidth: 32,
                      background: histPage === p ? 'var(--brand)' : 'transparent',
                      color: histPage === p ? 'var(--brand-ink, #fff)' : 'var(--muted)',
                      borderColor: histPage === p ? 'var(--brand)' : 'var(--line)',
                      fontWeight: histPage === p ? 700 : 400,
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="btn ghost sm"
                  disabled={histPage === totalPages}
                  onClick={() => setHistPage(p => p + 1)}
                >
                  <Icon name="chevron-right" size={13} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── SettingsScreen ──────────────────────────────────────────────
export default function SettingsScreen({ initialTab, addToast, setRoute, activeCompany, tweaks, setTweak }) {
  const [tab, setTab] = useState(initialTab || 'empresas');
  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  const tabs = [
    { id: 'empresas',   l: 'Empresas',    i: 'building' },
    { id: 'aparencia',  l: 'Aparência',   i: 'sparkle' },
    { id: 'seguranca',  l: 'Segurança',   i: 'shield' },
    { id: 'permissoes', l: 'Permissões',  i: 'key' },
  ];

  return (
    <>
    <style>{settStyle}</style>
    <div className="fade-up sett-page">
      <div>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Configurações</h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          Conta, organização, segurança e permissões.
        </p>
      </div>

      <div className="sett-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              if (setRoute) setRoute(t.id === 'permissoes' ? 'settings-permissions' : 'settings');
            }}
            className="row gap-2"
            style={{
              padding: '10px 14px',
              border: 'none',
              background: 'transparent',
              color: tab === t.id ? 'var(--brand)' : 'var(--muted)',
              fontSize: 13,
              fontWeight: tab === t.id ? 700 : 500,
              cursor: 'pointer',
              borderBottom: `2px solid ${tab === t.id ? 'var(--brand)' : 'transparent'}`,
              marginBottom: -1,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Icon name={t.i} size={14} /> {t.l}
          </button>
        ))}
      </div>

      {tab === 'empresas' && <EmpresasTab addToast={addToast} />}
      {tab === 'aparencia' && tweaks && <AparenciaTab tweaks={tweaks} setTweak={setTweak} />}
      {tab === 'seguranca' && <SegurancaTab addToast={addToast} tweaks={tweaks} setTweak={setTweak} />}
      {tab === 'permissoes' && <PermissionsScreen addToast={addToast} embedded={true} activeCompany={activeCompany} />}
    </div>
    </>
  );
}
