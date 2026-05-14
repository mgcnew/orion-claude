import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../components/Icon.jsx';
import { supabase } from '../lib/supabase.js';
import logoFullLight from '../assets/logo-full.png';
import logoFullDark  from '../assets/logo-full-dark.png';
import logoLanding   from '../assets/logo-landing-page.png';
import heroImg       from '../assets/hero-comparison.png';

function getLogoSrc() {
  try {
    const stored = JSON.parse(localStorage.getItem('orion.tweaks.v1') || '{}');
    return stored.theme === 'dark' ? logoFullDark : logoFullLight;
  } catch { return logoFullLight; }
}

// ============================================================
// LOGIN MODAL
// ============================================================
function LoginModal({ onClose }) {
  const [email, setEmail]     = useState('');
  const [pw, setPw]           = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (err) setError(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : err.message);
  };

  const sendReset = async () => {
    if (!email) { setError('Digite seu e-mail antes de redefinir a senha.'); return; }
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setResetSent(true);
  };

  const fieldStyle = {
    width: '100%', boxSizing: 'border-box', height: 44, padding: '0 14px',
    borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc',
    fontSize: 14, color: '#0f172a', outline: 'none', fontFamily: 'inherit',
    transition: 'border-color .15s',
  };

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 22, boxShadow: '0 40px 100px rgba(15,23,42,.22), 0 8px 32px rgba(15,23,42,.1)', padding: '40px 40px 32px', position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#94a3b8'; }}
        >
          <Icon name="x" size={14} />
        </button>

        <img src={logoLanding} alt="SR Gestão de Documentos" style={{ height: 130, objectFit: 'contain', objectPosition: 'left', marginBottom: 16, marginTop: -16, display: 'block' }} />

        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: '0 0 4px', color: '#0f172a' }}>Acesse sua conta</h2>
        <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 28px', lineHeight: 1.5 }}>Gestão de pessoas centralizada e segura.</p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="voce@empresa.com.br"
              required
              autoFocus
              style={fieldStyle}
              onFocus={e => e.target.style.borderColor = '#2A5BFF'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>Senha</label>
              <span style={{ flex: 1 }} />
              <button
                type="button"
                onClick={sendReset}
                style={{ fontSize: 12, color: '#2A5BFF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
              >
                {resetSent ? '✓ E-mail enviado' : 'Esqueci minha senha'}
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={e => setPw(e.target.value)}
                placeholder="••••••••"
                style={{ ...fieldStyle, paddingRight: 44 }}
                onFocus={e => e.target.style.borderColor = '#2A5BFF'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', top: 0, right: 0, width: 44, height: 44, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}
              >
                <Icon name="eye" size={15} />
              </button>
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', color: '#DC2626', fontSize: 13, fontWeight: 500, border: '1px solid #FECACA' }}>
              <Icon name="alert" size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />{error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', height: 46, borderRadius: 11, background: loading ? '#93a3d4' : '#2A5BFF', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, boxShadow: loading ? 'none' : '0 4px 20px rgba(42,91,255,.35)', transition: 'background .15s, box-shadow .15s' }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#1d4ce8'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(42,91,255,.45)'; } }}
            onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = '#2A5BFF'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(42,91,255,.35)'; } }}
          >
            {loading ? 'Verificando…' : <>Entrar <Icon name="chevron-right" size={15} /></>}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 20, justifyContent: 'center', fontSize: 11, color: '#94a3b8' }}>
          <Icon name="shield" size={11} style={{ color: '#22c55e' }} />
          <span>TLS 1.3 · LGPD compliant</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================================
// LANDING PAGE
// ============================================================
const FEATURES = [
  {
    icon: 'folder',
    color: '#2A5BFF',
    title: 'Documentos digitais',
    desc: 'Contratos, holerites e atestados organizados por funcionário e categoria, com visualização e download em segundos.',
  },
  {
    icon: 'clock',
    color: '#0891b2',
    title: 'Controle de ponto',
    desc: 'Espelho de ponto, banco de horas e registro de faltas com exportação em PDF ou Excel para qualquer período.',
  },
  {
    icon: 'users',
    color: '#7c3aed',
    title: 'Gestão de RH',
    desc: 'Advertências, férias, desligamentos e admissões com histórico completo e rastreabilidade auditável.',
  },
  {
    icon: 'chart',
    color: '#059669',
    title: 'Relatórios executivos',
    desc: 'Headcount, turnover, folha consolidada e mais — prontos para exportar e apresentar à liderança.',
  },
];

const SECURITY = [
  {
    icon: 'shield',
    title: 'LGPD compliant',
    desc: 'Tratamento de dados pessoais em conformidade com a Lei Geral de Proteção de Dados. Controle granular de acesso por usuário.',
  },
  {
    icon: 'fingerprint',
    title: 'Criptografia TLS 1.3',
    desc: 'Todas as conexões entre o browser e o servidor são criptografadas com o protocolo mais moderno disponível.',
  },
  {
    icon: 'history',
    title: 'Trilha de auditoria',
    desc: 'Cada acesso, edição, download e exclusão é registrado com data, hora e usuário. Imutável e exportável.',
  },
];

export default function LandingPage() {
  const [loginOpen, setLoginOpen] = useState(false);

  const openLogin = () => setLoginOpen(true);

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#0f172a', fontFamily: 'inherit', overflowX: 'hidden' }}>
      <style>{`
        @keyframes lp-float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-14px); }
        }
        .lp-nav-outer { position: sticky; top: 0; z-index: 100; display: flex; justify-content: center; padding: 16px 24px; pointer-events: none; }
        .lp-nav       { pointer-events: all; display: inline-flex; align-items: center; gap: 32px; height: 68px; padding: 0 16px 0 8px; min-width: 460px; border-radius: 999px; background: rgba(232,239,255,.45); backdrop-filter: blur(16px) saturate(160%); -webkit-backdrop-filter: blur(16px) saturate(160%); border: 1px solid rgba(255,255,255,.55); box-shadow: 0 2px 20px rgba(42,91,255,.08), 0 1px 0 rgba(255,255,255,.6) inset; }
        .lp-hero-wrap { background: linear-gradient(160deg, #e8efff 0%, #f2f6ff 40%, #f8faff 70%, #fff 100%); }
        .lp-hero      { padding: 80px 48px 64px; display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; max-width: 1200px; margin: 0 auto; }
        .lp-hero-h1   { font-size: 52px; }
        .lp-hero-img  { display: flex; justify-content: center; align-items: center; }
        .lp-stats-pad { padding: 36px 48px; }
        .lp-stats     { display: grid; grid-template-columns: repeat(4,1fr); gap: 24px; max-width: 1200px; margin: 0 auto; }
        .lp-features  { padding: 80px 48px; max-width: 1200px; margin: 0 auto; }
        .lp-feat-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 24px; }
        .lp-sec-pad   { padding: 80px 48px; }
        .lp-sec-grid  { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
        .lp-cta       { padding: 80px 48px; }
        .lp-footer    { padding: 28px 48px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .lp-footer-links { display: flex; align-items: center; gap: 16px; }

        @media (max-width: 900px) {
          .lp-feat-grid { grid-template-columns: 1fr; }
          .lp-sec-grid  { grid-template-columns: repeat(2,1fr); }
        }

        @media (max-width: 680px) {
          .lp-nav-outer { padding: 12px 16px; }
          .lp-hero      { padding: 48px 20px 40px; grid-template-columns: 1fr; gap: 40px; }
          .lp-hero-h1   { font-size: 36px; letter-spacing: -1px; }
          .lp-hero-img  { order: -1; }
          .lp-stats-pad { padding: 32px 20px; }
          .lp-stats     { grid-template-columns: repeat(2,1fr); }
          .lp-features  { padding: 56px 20px; }
          .lp-feat-grid { grid-template-columns: 1fr; }
          .lp-sec-pad   { padding: 56px 20px; }
          .lp-sec-grid  { grid-template-columns: 1fr; }
          .lp-cta       { padding: 56px 20px; }
          .lp-footer    { padding: 24px 20px; flex-direction: column; align-items: flex-start; gap: 12px; }
          .lp-footer-links { flex-wrap: wrap; }
        }
      `}</style>

      {/* ── NAVBAR + HERO — mesmo fundo ───────────────────────── */}
      <div className="lp-hero-wrap">

      <div className="lp-nav-outer">
        <nav className="lp-nav">
          <img src={logoLanding} alt="SR Gestão de Documentos" style={{ height: 140, objectFit: 'contain', objectPosition: 'left center', marginTop: -36, marginBottom: -36, marginLeft: -4, alignSelf: 'center', display: 'block', transform: 'translateY(6px)' }} />
          <span style={{ flex: 1 }} />
          <button
            onClick={openLogin}
            style={{ height: 34, padding: '0 16px', borderRadius: 999, background: '#2A5BFF', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'opacity .15s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Icon name="user" size={13} /> Entrar
          </button>
        </nav>
      </div>

      <section className="lp-hero">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#EEF3FF', color: '#2A5BFF', borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 700, marginBottom: 24, letterSpacing: 0.3 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
            Novo · Gestão Digital de RH
          </div>

          <h1 className="lp-hero-h1" style={{ fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5, margin: '0 0 20px', color: '#0f172a' }}>
            Seu RH.<br />
            <span style={{ color: '#2A5BFF' }}>Sem papel.</span><br />
            <span style={{ color: '#64748b', fontWeight: 700 }}>Sem caos.</span>
          </h1>

          <p style={{ fontSize: 17, color: '#475569', lineHeight: 1.65, margin: '0 0 36px', maxWidth: 480 }}>
            Centralize documentos, ponto, advertências e holerites com segurança total, rastreabilidade auditável e assinatura digital — tudo em um único sistema.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
            <button
              onClick={openLogin}
              style={{ height: 50, padding: '0 28px', borderRadius: 12, background: '#2A5BFF', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 24px rgba(42,91,255,.35)', transition: 'transform .15s, box-shadow .15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(42,91,255,.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(42,91,255,.35)'; }}
            >
              Acessar o sistema <Icon name="chevron-right" size={16} />
            </button>
            <a
              href="#features"
              style={{ height: 50, padding: '0 24px', borderRadius: 12, background: 'transparent', color: '#475569', border: '1.5px solid #e2e8f0', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', transition: 'border-color .15s, color .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2A5BFF'; e.currentTarget.style.color = '#2A5BFF'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
            >
              Saiba mais
            </a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {['LGPD compliant', 'TLS 1.3', '99,98% uptime'].map(t => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                <Icon name="check" size={13} style={{ color: '#22c55e' }} /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Hero image — float + mask fade */}
        <div className="lp-hero-img">
          <img
            src={heroImg}
            alt="Método antigo vs método novo"
            style={{
              width: '100%',
              maxWidth: 520,
              borderRadius: 24,
              objectFit: 'contain',
              display: 'block',
              boxShadow: '0 24px 64px rgba(42,91,255,.15), 0 4px 16px rgba(0,0,0,.06)',
              animation: 'lp-float 4.5s ease-in-out infinite',
              maskImage: 'radial-gradient(ellipse 92% 88% at 50% 50%, black 60%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 92% 88% at 50% 50%, black 60%, transparent 100%)',
            }}
          />
        </div>
      </section>
      </div>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <section className="lp-stats-pad" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div className="lp-stats">
          {[
            { value: '9', label: 'categorias de documentos' },
            { value: '100%', label: 'rastreabilidade auditável' },
            { value: 'LGPD', label: 'conformidade garantida' },
            { value: '24h', label: 'suporte disponível' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#2A5BFF', letterSpacing: -1, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section id="features" className="lp-features">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: '#2A5BFF', textTransform: 'uppercase', marginBottom: 12 }}>Funcionalidades</div>
          <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1, margin: '0 0 14px', color: '#0f172a' }}>Tudo que o seu RH precisa</h2>
          <p style={{ fontSize: 16, color: '#64748b', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
            Um sistema completo, sem planilhas, sem pastas físicas e sem retrabalho.
          </p>
        </div>

        <div className="lp-feat-grid">
          {FEATURES.map(f => (
            <div
              key={f.title}
              style={{ padding: 32, borderRadius: 16, border: '1.5px solid #e2e8f0', background: '#fff', display: 'flex', gap: 20, alignItems: 'flex-start', transition: 'border-color .15s, box-shadow .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = f.color; e.currentTarget.style.boxShadow = `0 8px 32px ${f.color}18`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 12, background: f.color + '14', color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={f.icon} size={22} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECURITY ──────────────────────────────────────────── */}
      <section className="lp-sec-pad" style={{ background: '#0f172a' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: '#5DE8A4', textTransform: 'uppercase', marginBottom: 12 }}>Segurança</div>
            <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1, margin: '0 0 14px', color: '#fff' }}>
              Proteção que o seu RH merece
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,.55)', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
              Dados de funcionários são sensíveis. Nossa infraestrutura foi construída para protegê-los por padrão.
            </p>
          </div>

          <div className="lp-sec-grid">
            {SECURITY.map(s => (
              <div key={s.title} style={{ padding: 32, borderRadius: 16, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(93,232,164,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <Icon name={s.icon} size={22} style={{ color: '#5DE8A4' }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────── */}
      <section className="lp-cta" style={{ textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1, margin: '0 0 16px', color: '#0f172a', lineHeight: 1.15 }}>
            Pronto para digitalizar<br />o seu RH?
          </h2>
          <p style={{ fontSize: 16, color: '#64748b', margin: '0 0 36px', lineHeight: 1.6 }}>
            Acesse agora e veja como é simples centralizar toda a gestão de pessoas da sua empresa.
          </p>
          <button
            onClick={openLogin}
            style={{ height: 52, padding: '0 36px', borderRadius: 14, background: '#2A5BFF', color: '#fff', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 24px rgba(42,91,255,.35)', transition: 'transform .15s, box-shadow .15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 36px rgba(42,91,255,.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(42,91,255,.35)'; }}
          >
            Acessar o sistema <Icon name="chevron-right" size={17} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 24, flexWrap: 'wrap' }}>
            {['LGPD compliant', 'TLS 1.3', 'Sem contrato de fidelidade'].map(t => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                <Icon name="check" size={12} style={{ color: '#22c55e' }} /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="lp-footer" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <img src={logoLanding} alt="SR Gestão de Documentos" style={{ height: 100, objectFit: 'contain', margin: '-16px 0' }} />
        <span style={{ flex: 1 }} />
        <div className="lp-footer-links">
          <span style={{ fontSize: 12, color: '#94a3b8' }}>© 2026 Orion Gestão</span>
          <span style={{ color: '#e2e8f0' }}>·</span>
          <a href="#" style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none' }}>Termos</a>
          <a href="#" style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none' }}>Privacidade</a>
          <a href="#" style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none' }}>Suporte</a>
        </div>
      </footer>

      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </div>
  );
}
