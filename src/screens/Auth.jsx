import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { supabase } from '../lib/supabase.js';
import { useCompanies, sendInvite } from '../hooks/useEmployees.js';
import logoFullLight from '../assets/logo-full.png';
import logoFullDark  from '../assets/logo-full-dark.png';

function getLogoSrc() {
  try {
    const stored = JSON.parse(localStorage.getItem('orion.tweaks.v1') || '{}');
    return stored.theme === 'dark' ? logoFullDark : logoFullLight;
  } catch { return logoFullLight; }
}

export function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const logoSrc = getLogoSrc();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos.'
        : err.message);
    } else {
      onLogin();
    }
  };

  const sendReset = async () => {
    if (!email) { setError('Digite seu e-mail antes de redefinir a senha.'); return; }
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setResetSent(true);
  };

  return (
    <div style={{ minHeight: '100vh', width: '100%', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)', background: 'var(--bg)' }}>

      {/* Left — form */}
      <div style={{ padding: '44px 56px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Logo */}
        <img
          src={logoSrc}
          alt="Orion Gestão"
          style={{ height: 42, objectFit: 'contain', objectPosition: 'left center' }}
        />

        {/* Form */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <form onSubmit={submit} style={{ width: '100%', maxWidth: 360, margin: '0 auto' }}>
            <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1.4, color: 'var(--brand)', margin: '0 0 10px' }}>
              BEM-VINDO DE VOLTA
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.2, margin: '0 0 8px' }}>
              Acesse sua conta
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: '0 0 28px', lineHeight: 1.55 }}>
              Gestão de pessoas centralizada e segura.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">E-mail</label>
                <input
                  className="field"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="voce@empresa.com.br"
                  required
                  autoFocus
                />
              </div>

              <div>
                <div className="row" style={{ marginBottom: 6 }}>
                  <label className="label" style={{ margin: 0 }}>Senha</label>
                  <span className="grow" />
                  <button
                    type="button"
                    onClick={sendReset}
                    style={{ fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                  >
                    {resetSent ? '✓ E-mail enviado' : 'Esqueci minha senha'}
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    className="field"
                    type={showPw ? 'text' : 'password'}
                    value={pw}
                    onChange={e => setPw(e.target.value)}
                    placeholder="••••••••"
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="btn ghost icon sm"
                    style={{ position: 'absolute', top: 4, right: 4 }}
                  >
                    <Icon name="eye" size={15} />
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'var(--bad-bg)', color: 'var(--bad)', fontSize: 13, fontWeight: 500 }}>
                <Icon name="alert" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn primary"
              disabled={loading}
              style={{ width: '100%', marginTop: 22, height: 44, fontSize: 14, justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? <span className="pulse">Verificando…</span> : <>Entrar <Icon name="chevron-right" size={16} /></>}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="row gap-2" style={{ fontSize: 11, color: 'var(--muted-2)' }}>
          <Icon name="shield" size={11} style={{ color: 'var(--ok)', flexShrink: 0 }} />
          <span>TLS 1.3 · LGPD compliant</span>
          <span className="grow" />
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Termos</a>
          <span>·</span>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacidade</a>
          <span>·</span>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Suporte</a>
        </div>
      </div>

      {/* Right — visual */}
      <div style={{ background: 'linear-gradient(165deg, var(--brand) 0%, var(--brand-700) 50%, #0F172A 100%)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 56 }}>
        {/* Grid overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)', backgroundSize: '32px 32px', maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)' }} />

        {/* Rings */}
        <svg width="480" height="480" viewBox="0 0 480 480" style={{ position: 'absolute', color: 'rgba(255,255,255,.10)' }}>
          {[60, 120, 180, 230].map(r => (
            <circle key={r} cx="240" cy="240" r={r} fill="none" stroke="currentColor" strokeWidth="1" />
          ))}
          <circle cx="240" cy="240" r="5" fill="white" opacity=".6" />
        </svg>

        <div style={{ position: 'relative', color: 'white', maxWidth: 440 }}>
          <div className="pill" style={{ background: 'rgba(255,255,255,.12)', color: 'white', padding: '5px 12px', marginBottom: 24, fontSize: 11.5, fontWeight: 600 }}>
            <span className="dot" style={{ background: '#5DE8A4' }} /> Sistema operacional · 99,98%
          </div>
          <h2 style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.15, letterSpacing: -0.8, margin: '0 0 14px' }}>
            Sua empresa sem papel.
            <br />
            <span style={{ opacity: 0.65 }}>Documentos, ponto e folha em um só lugar.</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 14, lineHeight: 1.6, margin: '0 0 30px' }}>
            Centralize contratos, holerites e advertências com rastreabilidade auditável e assinatura digital.
          </p>
          <div className="col gap-3">
            {[
              { icon: 'shield',      label: 'Criptografia ponta a ponta com chaves rotativas' },
              { icon: 'history',     label: 'Trilha de auditoria — quem, o quê, quando, de onde' },
              { icon: 'fingerprint', label: 'Acesso granular por cargo, módulo e permissão' },
            ].map((f, i) => (
              <div key={i} className="row gap-3" style={{ color: 'rgba(255,255,255,.8)', fontSize: 13.5 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={f.icon} size={15} />
                </div>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal de envio de convite (usado pelo admin dentro do sistema)
export function SendInviteModal({ onClose, addToast, initialEmail = '', initialCompanyId = null }) {
  const { companies } = useCompanies();
  const [email, setEmail] = useState(initialEmail);
  const [role, setRole] = useState('Operacional');
  const [selectedCompanies, setSelectedCompanies] = useState(initialCompanyId ? [initialCompanyId] : []);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(null);

  const toggleCompany = (id) => {
    setSelectedCompanies((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!email.trim() || selectedCompanies.length === 0) return;
    setSaving(true);
    const { data, error } = await sendInvite({ email: email.trim(), role, companyIds: selectedCompanies });
    setSaving(false);
    if (error) {
      addToast?.({ kind: 'err', msg: error.message });
    } else {
      setSent(data);
      addToast?.({ kind: 'ok', msg: `Convite registrado para ${email}` });
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--surface)', borderRadius: 16,
          boxShadow: '0 32px 80px rgba(0,0,0,.25)',
          padding: 28,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Convidar usuário</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
              O convidado receberá acesso às empresas selecionadas.
            </div>
          </div>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={15} /></button>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Convite registrado!</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
              Para enviar o acesso, encaminhe o link abaixo para <strong>{sent.email}</strong>:
            </div>
            <div
              style={{
                padding: '10px 14px', borderRadius: 8,
                background: 'var(--surface-2)', border: '1px solid var(--line)',
                fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all',
                cursor: 'pointer', textAlign: 'left',
              }}
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}?invite=${sent.token}`)}
            >
              {window.location.origin}?invite={sent.token}
              <span style={{ marginLeft: 8, color: 'var(--brand)', fontSize: 11 }}>copiar</span>
            </div>
            <button className="btn primary" style={{ marginTop: 18, width: '100%', justifyContent: 'center' }} onClick={onClose}>
              Fechar
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">E-mail do convidado *</label>
              <input
                className="field"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                autoFocus
              />
            </div>

            <div>
              <label className="label">Cargo / Perfil de acesso *</label>
              <select className="field" value={role} onChange={(e) => setRole(e.target.value)}>
                {['Operacional', 'RH', 'Gestor', 'Financeiro', 'Supervisor'].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Empresas com acesso * <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(selecione uma ou mais)</span></label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                {companies.map((c) => (
                  <label
                    key={c.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      border: `1px solid ${selectedCompanies.includes(c.id) ? 'var(--brand)' : 'var(--line)'}`,
                      background: selectedCompanies.includes(c.id) ? 'var(--brand-tint)' : 'var(--surface-2)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(c.id)}
                      onChange={() => toggleCompany(c.id)}
                      style={{ accentColor: 'var(--brand)', flexShrink: 0 }}
                    />
                    <div
                      style={{
                        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                        background: 'var(--brand)', color: 'var(--brand-ink)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700,
                      }}
                    >
                      {c.name.charAt(0)}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button className="btn" onClick={onClose}>Cancelar</button>
              <button
                className="btn primary"
                onClick={handleSend}
                disabled={saving || !email.trim() || selectedCompanies.length === 0}
              >
                {saving ? 'Enviando…' : <><Icon name="mail" size={13} /> Enviar convite</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CompleteRegistrationScreen({ session, onComplete }) {
  const [name, setName] = useState(session?.user?.user_metadata?.name ?? '');
  const [pw, setPw] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const email = session?.user?.email ?? '';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (pw.length < 6) { setError('A senha precisa ter pelo menos 6 caracteres.'); return; }
    if (pw !== pwConfirm) { setError('As senhas não coincidem.'); return; }
    if (!name.trim()) { setError('Digite seu nome completo.'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({
      password: pw,
      data: { name: name.trim() },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    onComplete();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div className="card fade-up" style={{ width: 440, maxWidth: '100%', padding: 40 }}>
        <img src={getLogoSrc()} alt="Orion Gestão" style={{ height: 36, objectFit: 'contain', objectPosition: 'left center', marginBottom: 28 }} />

        <div className="pill brand" style={{ marginBottom: 16, display: 'inline-flex' }}>
          <Icon name="mail" size={12} /> Convite recebido
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, margin: '0 0 6px' }}>
          Complete seu cadastro
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.55, margin: '0 0 24px' }}>
          Você foi convidado para acessar o sistema. Defina seu nome e senha para entrar.
        </p>

        <form className="col gap-3" onSubmit={submit}>
          <div>
            <label className="label">E-mail</label>
            <input className="field" value={email} disabled style={{ opacity: 0.6 }} />
          </div>
          <div>
            <label className="label">Nome completo</label>
            <input
              className="field"
              placeholder="Seu nome completo"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Criar senha</label>
            <div style={{ position: 'relative' }}>
              <input
                className="field"
                type={showPw ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={pw}
                onChange={e => setPw(e.target.value)}
                style={{ paddingRight: 40 }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}>
                <Icon name={showPw ? 'eye-off' : 'eye'} size={16} />
              </button>
            </div>
          </div>
          <div>
            <label className="label">Confirmar senha</label>
            <input
              className="field"
              type={showPw ? 'text' : 'password'}
              placeholder="Repita a senha"
              value={pwConfirm}
              onChange={e => setPwConfirm(e.target.value)}
            />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bad-tint, #FEE2E2)', color: 'var(--bad, #DC2626)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button className="btn primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? <span className="pulse">Aguarde…</span> : <><Icon name="check" size={14} /> Acessar o sistema</>}
          </button>
        </form>
      </div>
    </div>
  );
}

