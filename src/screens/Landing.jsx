import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../components/Icon.jsx';
import { supabase } from '../lib/supabase.js';
import logoLanding from '../assets/logo-landing-page.png';

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

        <img src={logoLanding} alt="SR Gestão de Documentos" style={{ height: 160, objectFit: 'contain', objectPosition: 'center', marginBottom: 16, marginTop: -20, display: 'block', width: '100%' }} />

        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: '0 0 4px', color: '#0f172a', textAlign: 'center' }}>Acesse sua conta</h2>
        <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 28px', lineHeight: 1.5, textAlign: 'center' }}>Gestão de documentos centralizada e segura.</p>

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
// HERO MOCKUP — "antes vs depois" 100% vetorial
// ============================================================
function BeforeAfterMockup() {
  return (
    <div className="lp-mockup">
      {/* ── ANTES — papel/caos ───────────────────────── */}
      <div className="lp-mockup-before">
        <div className="lp-mockup-label" style={{ background: '#fef3c7', color: '#92400e' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
          Antes
        </div>
        <div className="lp-paper lp-paper-1">
          <div className="lp-paper-line" style={{ width: '70%' }} />
          <div className="lp-paper-line" style={{ width: '90%' }} />
          <div className="lp-paper-line" style={{ width: '55%' }} />
          <div className="lp-paper-line" style={{ width: '80%' }} />
        </div>
        <div className="lp-paper lp-paper-2">
          <div className="lp-paper-line" style={{ width: '85%' }} />
          <div className="lp-paper-line" style={{ width: '60%' }} />
          <div className="lp-paper-line" style={{ width: '75%' }} />
        </div>
        <div className="lp-paper lp-paper-3">
          <div className="lp-paper-stamp">URGENTE</div>
          <div className="lp-paper-line" style={{ width: '65%' }} />
          <div className="lp-paper-line" style={{ width: '80%' }} />
        </div>
        <div className="lp-postit">!</div>
      </div>

      {/* ── DEPOIS — dashboard digital ───────────────── */}
      <div className="lp-mockup-after">
        <div className="lp-mockup-label" style={{ background: '#dcfce7', color: '#166534' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
          Depois
        </div>

        <div className="lp-app">
          {/* topbar */}
          <div className="lp-app-top">
            <div style={{ display: 'flex', gap: 5 }}>
              <span className="lp-dot" style={{ background: '#ef4444' }} />
              <span className="lp-dot" style={{ background: '#f59e0b' }} />
              <span className="lp-dot" style={{ background: '#22c55e' }} />
            </div>
            <div className="lp-app-url">orion.app/dashboard</div>
          </div>

          {/* body */}
          <div className="lp-app-body">
            <div className="lp-app-side">
              <div className="lp-app-side-item lp-app-side-active">
                <span className="lp-side-icon" />
                <span className="lp-side-text" style={{ width: 38 }} />
              </div>
              <div className="lp-app-side-item">
                <span className="lp-side-icon" />
                <span className="lp-side-text" style={{ width: 30 }} />
              </div>
              <div className="lp-app-side-item">
                <span className="lp-side-icon" />
                <span className="lp-side-text" style={{ width: 42 }} />
              </div>
              <div className="lp-app-side-item">
                <span className="lp-side-icon" />
                <span className="lp-side-text" style={{ width: 34 }} />
              </div>
            </div>

            <div className="lp-app-main">
              <div className="lp-app-row">
                <div className="lp-app-card">
                  <div className="lp-app-card-label" />
                  <div className="lp-app-card-value">132</div>
                </div>
                <div className="lp-app-card">
                  <div className="lp-app-card-label" />
                  <div className="lp-app-card-value" style={{ color: '#22c55e' }}>+8</div>
                </div>
                <div className="lp-app-card">
                  <div className="lp-app-card-label" />
                  <div className="lp-app-card-value" style={{ color: '#2A5BFF' }}>96%</div>
                </div>
              </div>

              <div className="lp-app-chart">
                <svg viewBox="0 0 200 60" width="100%" height="100%" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lp-grad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#2A5BFF" stopOpacity=".35" />
                      <stop offset="100%" stopColor="#2A5BFF" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,42 L20,38 L40,40 L60,30 L80,32 L100,22 L120,24 L140,14 L160,18 L180,10 L200,12 L200,60 L0,60 Z"
                    fill="url(#lp-grad)"
                  />
                  <path
                    d="M0,42 L20,38 L40,40 L60,30 L80,32 L100,22 L120,24 L140,14 L160,18 L180,10 L200,12"
                    fill="none"
                    stroke="#2A5BFF"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PRODUCT BLOCK — alternating left/right
// ============================================================
function ProductBlock({ reverse, eyebrow, eyebrowColor, title, desc, bullets, mockup }) {
  return (
    <div className={`lp-pb ${reverse ? 'lp-pb-rev' : ''}`}>
      <div className="lp-pb-text">
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: eyebrowColor, textTransform: 'uppercase', marginBottom: 14 }}>{eyebrow}</div>
        <h3 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', fontWeight: 800, letterSpacing: -0.8, margin: '0 0 16px', color: '#0f172a', lineHeight: 1.15 }}>{title}</h3>
        <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.65, margin: '0 0 24px' }}>{desc}</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bullets.map(b => (
            <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14.5, color: '#334155', lineHeight: 1.55 }}>
              <span style={{ width: 20, height: 20, borderRadius: 6, background: eyebrowColor + '18', color: eyebrowColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <Icon name="check" size={12} />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div className="lp-pb-visual">{mockup}</div>
    </div>
  );
}

// ── mockups dos blocos ──────────────────────────────────
function MockupDocs() {
  const rows = [
    { name: 'Contrato_admissao.pdf', date: '15/05', color: '#2A5BFF' },
    { name: 'Holerite_04-2026.pdf',  date: '10/05', color: '#0891b2' },
    { name: 'Atestado_medico.pdf',   date: '08/05', color: '#7c3aed' },
    { name: 'Termo_LGPD.pdf',        date: '02/05', color: '#059669' },
  ];
  return (
    <div className="lp-mk">
      <div className="lp-mk-head">
        <div className="lp-mk-title">Documentos · João Silva</div>
        <div className="lp-mk-search" />
      </div>
      <div className="lp-mk-list">
        {rows.map(r => (
          <div key={r.name} className="lp-mk-row">
            <span className="lp-mk-fileicon" style={{ background: r.color + '18', color: r.color }}>
              <Icon name="folder" size={12} />
            </span>
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>{r.name}</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockupPoint() {
  const days = [8.2, 8.5, 7.8, 9.1, 8.0, 0, 0];
  const labels = ['S','T','Q','Q','S','S','D'];
  const max = 10;
  return (
    <div className="lp-mk">
      <div className="lp-mk-head">
        <div className="lp-mk-title">Banco de horas · Semana 19</div>
        <div className="lp-mk-pill" style={{ background: '#dcfce7', color: '#166534' }}>+2h 12min</div>
      </div>
      <div className="lp-mk-bars">
        {days.map((h, i) => (
          <div key={i} className="lp-mk-bar-col">
            <div className="lp-mk-bar" style={{ height: `${(h/max)*100}%`, background: h >= 8 ? '#2A5BFF' : h === 0 ? '#e2e8f0' : '#fbbf24' }} />
            <div className="lp-mk-bar-label">{labels[i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockupReports() {
  return (
    <div className="lp-mk">
      <div className="lp-mk-head">
        <div className="lp-mk-title">Headcount · 2026</div>
        <div className="lp-mk-pill" style={{ background: '#eef3ff', color: '#2A5BFF' }}>↗ +12%</div>
      </div>
      <div className="lp-mk-chart">
        <svg viewBox="0 0 240 90" width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lp-mk-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2A5BFF" stopOpacity=".28" />
              <stop offset="100%" stopColor="#2A5BFF" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0,1,2,3].map(i => (
            <line key={i} x1="0" y1={20 + i*20} x2="240" y2={20 + i*20} stroke="#f1f5f9" strokeWidth="1" />
          ))}
          <path d="M0,68 L30,60 L60,62 L90,48 L120,52 L150,38 L180,30 L210,22 L240,18 L240,90 L0,90 Z" fill="url(#lp-mk-grad)" />
          <path d="M0,68 L30,60 L60,62 L90,48 L120,52 L150,38 L180,30 L210,22 L240,18" fill="none" stroke="#2A5BFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {[[0,68],[30,60],[60,62],[90,48],[120,52],[150,38],[180,30],[210,22],[240,18]].map(([x,y],i) => (
            <circle key={i} cx={x} cy={y} r="2.5" fill="#fff" stroke="#2A5BFF" strokeWidth="1.5" />
          ))}
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// LANDING PAGE
// ============================================================
const STATS = [
  { value: '< 2s',  label: 'acesso a qualquer documento' },
  { value: '100%',  label: 'rastreabilidade auditável' },
  { value: 'LGPD',  label: 'conformidade por padrão' },
  { value: 'TLS 1.3', label: 'criptografia em trânsito' },
];

const SECURITY = [
  { icon: 'shield',      title: 'LGPD compliant',     desc: 'Controle granular de acesso por usuário e por categoria de dado.' },
  { icon: 'fingerprint', title: 'Criptografia TLS 1.3', desc: 'Conexões protegidas pelo protocolo mais moderno disponível.' },
  { icon: 'history',     title: 'Trilha de auditoria',  desc: 'Cada acesso, edição e download registrado de forma imutável.' },
];

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && e.target.classList.add('lp-in')),
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, delay = 0 }) {
  const ref = useReveal();
  return <div ref={ref} className="lp-reveal" style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

export default function LandingPage() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const openLogin = () => setLoginOpen(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="lp-root">
      <style>{`
        .lp-root { min-height: 100vh; background: #fff; color: #0f172a; font-family: inherit; overflow-x: hidden; }

        /* ── REVEAL ON SCROLL ───────────────────────────── */
        .lp-reveal { opacity: 0; transform: translateY(20px); transition: opacity .7s ease-out, transform .7s ease-out; }
        .lp-reveal.lp-in { opacity: 1; transform: none; }
        @media (prefers-reduced-motion: reduce) {
          .lp-reveal { opacity: 1; transform: none; transition: none; }
        }

        /* ── HERO WRAPPER ───────────────────────────────── */
        .lp-hero-wrap { background: radial-gradient(ellipse 80% 60% at 50% 0%, #e8efff 0%, #f3f7ff 30%, #fafbff 60%, #fff 100%); }

        /* ── NAVBAR (transparente, sticky, vira sólido ao rolar) ── */
        .lp-nav-outer {
          position: sticky; top: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px clamp(20px, 5vw, 56px);
          background: transparent;
          border-bottom: 1px solid transparent;
          transition: background .25s ease, border-color .25s ease, backdrop-filter .25s ease, box-shadow .25s ease;
        }
        .lp-nav-outer.lp-scrolled {
          background: rgba(255,255,255,.78);
          backdrop-filter: blur(18px) saturate(160%);
          -webkit-backdrop-filter: blur(18px) saturate(160%);
          border-bottom-color: rgba(15,23,42,.08);
          box-shadow: 0 4px 24px rgba(15,23,42,.04);
        }
        .lp-nav-logo {
          height: clamp(150px, 16vw, 210px); width: auto; object-fit: contain; display: block;
          margin: calc(clamp(150px, 16vw, 210px) / -2 + 22px) 0;
          transition: height .25s ease, margin .25s ease;
        }
        .lp-nav-outer.lp-scrolled .lp-nav-logo {
          height: clamp(110px, 12vw, 160px);
          margin: calc(clamp(110px, 12vw, 160px) / -2 + 22px) 0;
        }
        .lp-nav-cta {
          height: 44px; padding: 0 20px 0 18px; border-radius: 999px;
          background: rgba(255,255,255,.7);
          color: #0f172a; border: 1px solid rgba(15,23,42,.08);
          font-size: 13.5px; font-weight: 600; cursor: pointer;
          display: inline-flex; align-items: center; gap: 7px; white-space: nowrap;
          backdrop-filter: blur(12px) saturate(140%);
          -webkit-backdrop-filter: blur(12px) saturate(140%);
          box-shadow: 0 1px 0 rgba(255,255,255,.7) inset, 0 4px 16px rgba(15,23,42,.06);
          transition: background .18s, color .18s, border-color .18s, transform .18s, box-shadow .18s;
        }
        .lp-nav-cta:hover {
          background: #0f172a; color: #fff; border-color: #0f172a;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(15,23,42,.18);
        }
        .lp-nav-outer.lp-scrolled .lp-nav-cta {
          background: #0f172a; color: #fff; border-color: #0f172a;
          box-shadow: 0 4px 14px rgba(15,23,42,.14);
        }
        .lp-nav-outer.lp-scrolled .lp-nav-cta:hover {
          background: #2A5BFF; border-color: #2A5BFF;
          box-shadow: 0 8px 24px rgba(42,91,255,.32);
        }

        /* ── HERO ───────────────────────────────────────── */
        .lp-hero { padding: clamp(40px, 7vw, 80px) clamp(20px, 4vw, 48px) clamp(48px, 7vw, 80px); display: grid; grid-template-columns: 1fr 1fr; gap: clamp(32px, 5vw, 64px); align-items: center; max-width: 1200px; margin: 0 auto; }
        .lp-hero-eyebrow { display: inline-flex; align-items: center; gap: 7px; background: rgba(42,91,255,.08); color: #2A5BFF; border-radius: 20px; padding: 6px 12px; font-size: 12px; font-weight: 700; margin-bottom: 24px; letter-spacing: 0.3px; border: 1px solid rgba(42,91,255,.18); }
        .lp-hero-h1 { font-size: clamp(2rem, 5.2vw, 3.5rem); font-weight: 800; line-height: 1.05; letter-spacing: -1.5px; margin: 0 0 22px; color: #0f172a; }
        .lp-hero-h1 .grad { background: linear-gradient(135deg, #2A5BFF 0%, #6b8aff 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .lp-hero-h1 .muted { color: #94a3b8; font-weight: 700; }
        .lp-hero-p { font-size: clamp(0.98rem, 1.4vw, 1.075rem); color: #475569; line-height: 1.65; margin: 0 0 32px; max-width: 480px; }
        .lp-hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 28px; }
        .lp-cta-primary { height: 50px; padding: 0 26px; border-radius: 12px; background: #2A5BFF; color: #fff; border: none; font-size: 15px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 6px 24px rgba(42,91,255,.35); transition: transform .18s, box-shadow .18s, background .18s; }
        .lp-cta-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(42,91,255,.5); background: #1d4ce8; }
        .lp-cta-ghost   { height: 50px; padding: 0 22px; border-radius: 12px; background: transparent; color: #475569; border: 1.5px solid #e2e8f0; font-size: 15px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; transition: border-color .15s, color .15s, background .15s; }
        .lp-cta-ghost:hover { border-color: #2A5BFF; color: #2A5BFF; background: rgba(42,91,255,.04); }
        .lp-hero-chips { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .lp-hero-chip  { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: #64748b; font-weight: 500; }

        /* ── MOCKUP ANTES/DEPOIS ────────────────────────── */
        .lp-mockup { position: relative; aspect-ratio: 1.05/1; width: 100%; max-width: 560px; margin: 0 auto; }
        .lp-mockup-before, .lp-mockup-after { position: absolute; border-radius: 20px; transition: transform .4s ease; }
        .lp-mockup-before {
          top: 0; left: 0; width: 58%; height: 58%;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          padding: 18px; overflow: hidden;
          box-shadow: 0 10px 30px rgba(180, 120, 0, .15);
          transform: rotate(-3deg);
          filter: saturate(.85);
        }
        .lp-mockup-after {
          bottom: 0; right: 0; width: 70%; height: 76%;
          background: #fff;
          padding: 14px; overflow: hidden;
          box-shadow: 0 24px 60px rgba(42,91,255,.22), 0 4px 16px rgba(15,23,42,.06);
          border: 1px solid rgba(15,23,42,.05);
          animation: lp-float 5s ease-in-out infinite;
        }
        @keyframes lp-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .lp-mockup:hover .lp-mockup-before { transform: rotate(-5deg) translate(-4px, -4px); }

        .lp-mockup-label { position: absolute; top: 12px; left: 12px; display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; padding: 4px 8px; border-radius: 999px; letter-spacing: 0.4px; text-transform: uppercase; z-index: 5; }
        .lp-mockup-after .lp-mockup-label { top: 22px; left: 22px; }

        /* papéis no card "antes" */
        .lp-paper { position: absolute; background: #fff; border-radius: 4px; padding: 8px 10px; box-shadow: 0 4px 12px rgba(0,0,0,.12); }
        .lp-paper-1 { top: 38px; left: 14px; width: 50%; transform: rotate(-8deg); }
        .lp-paper-2 { top: 56px; left: 36%; width: 48%; transform: rotate(6deg); }
        .lp-paper-3 { bottom: 14px; left: 20%; width: 56%; transform: rotate(-3deg); }
        .lp-paper-line { height: 3px; background: #cbd5e1; border-radius: 2px; margin: 4px 0; }
        .lp-paper-stamp { font-size: 8px; font-weight: 800; color: #dc2626; border: 1.5px solid #dc2626; padding: 1px 4px; border-radius: 2px; display: inline-block; margin-bottom: 4px; letter-spacing: .5px; transform: rotate(-4deg); }
        .lp-postit { position: absolute; right: 14px; bottom: 14px; width: 38px; height: 38px; background: #fde047; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 22px; color: #b45309; border-radius: 2px; transform: rotate(8deg); box-shadow: 0 4px 10px rgba(0,0,0,.15); }

        /* janela app no card "depois" */
        .lp-app { display: flex; flex-direction: column; height: 100%; background: #f8fafc; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; }
        .lp-app-top { height: 26px; background: #fff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8px; padding: 0 10px; flex-shrink: 0; }
        .lp-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .lp-app-url { flex: 1; text-align: center; font-size: 9.5px; color: #94a3b8; background: #f1f5f9; border-radius: 4px; padding: 2px 8px; }
        .lp-app-body { display: flex; flex: 1; min-height: 0; }
        .lp-app-side { width: 80px; background: #fff; border-right: 1px solid #e2e8f0; padding: 10px 8px; display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
        .lp-app-side-item { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 6px; }
        .lp-app-side-active { background: rgba(42,91,255,.1); }
        .lp-side-icon { width: 10px; height: 10px; border-radius: 3px; background: #cbd5e1; }
        .lp-app-side-active .lp-side-icon { background: #2A5BFF; }
        .lp-side-text { height: 6px; border-radius: 2px; background: #e2e8f0; }
        .lp-app-side-active .lp-side-text { background: rgba(42,91,255,.4); }
        .lp-app-main { flex: 1; padding: 14px; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
        .lp-app-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
        .lp-app-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; }
        .lp-app-card-label { width: 60%; height: 5px; background: #e2e8f0; border-radius: 2px; margin-bottom: 6px; }
        .lp-app-card-value { font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: -.5px; }
        .lp-app-chart { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; flex: 1; min-height: 60px; }

        /* ── STATS STRIP ────────────────────────────────── */
        .lp-stats-wrap { background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: clamp(28px, 4vw, 40px) clamp(20px, 4vw, 48px); }
        .lp-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: clamp(16px, 3vw, 32px); max-width: 1200px; margin: 0 auto; }
        .lp-stat { text-align: center; }
        .lp-stat-v { font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 800; color: #2A5BFF; letter-spacing: -1px; margin-bottom: 4px; line-height: 1; }
        .lp-stat-l { font-size: 12.5px; color: #64748b; font-weight: 500; line-height: 1.4; }

        /* ── PRODUCT BLOCKS ─────────────────────────────── */
        .lp-products { padding: clamp(64px, 9vw, 112px) clamp(20px, 4vw, 48px); max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: clamp(64px, 9vw, 112px); }
        .lp-section-head { text-align: center; max-width: 640px; margin: 0 auto clamp(48px, 6vw, 72px); }
        .lp-section-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 1.6px; color: #2A5BFF; text-transform: uppercase; margin-bottom: 12px; }
        .lp-section-h2 { font-size: clamp(1.875rem, 3.5vw, 2.5rem); font-weight: 800; letter-spacing: -1px; margin: 0 0 14px; color: #0f172a; line-height: 1.15; }
        .lp-section-p { font-size: 16px; color: #64748b; line-height: 1.6; margin: 0; }

        .lp-pb { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(32px, 5vw, 64px); align-items: center; }
        .lp-pb-rev .lp-pb-text   { order: 2; }
        .lp-pb-rev .lp-pb-visual { order: 1; }

        .lp-mk { background: #fff; border-radius: 16px; box-shadow: 0 24px 60px rgba(15,23,42,.08), 0 4px 16px rgba(15,23,42,.04); border: 1px solid #eef2f7; padding: 18px; max-width: 460px; margin: 0 auto; }
        .lp-mk-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 8px; }
        .lp-mk-title { font-size: 13px; font-weight: 700; color: #0f172a; }
        .lp-mk-search { width: 110px; height: 26px; background: #f1f5f9; border-radius: 6px; }
        .lp-mk-pill { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; }
        .lp-mk-list { display: flex; flex-direction: column; gap: 6px; }
        .lp-mk-row  { display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: #f8fafc; border-radius: 8px; }
        .lp-mk-fileicon { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .lp-mk-bars { display: grid; grid-template-columns: repeat(7,1fr); gap: 8px; height: 120px; align-items: end; }
        .lp-mk-bar-col { display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; }
        .lp-mk-bar { width: 100%; border-radius: 4px 4px 0 0; min-height: 4px; transition: height .3s; }
        .lp-mk-bar-label { font-size: 10px; color: #94a3b8; font-weight: 600; }
        .lp-mk-chart { height: 120px; }

        /* ── SECURITY ───────────────────────────────────── */
        .lp-sec { background: linear-gradient(180deg, #0b1224 0%, #0f172a 100%); padding: clamp(64px, 8vw, 96px) clamp(20px, 4vw, 48px); position: relative; overflow: hidden; }
        .lp-sec::before { content: ''; position: absolute; top: -100px; left: 50%; transform: translateX(-50%); width: 600px; height: 600px; background: radial-gradient(circle, rgba(93,232,164,.08) 0%, transparent 60%); pointer-events: none; }
        .lp-sec-inner { max-width: 1100px; margin: 0 auto; position: relative; }
        .lp-sec-grid  { display: grid; grid-template-columns: repeat(3,1fr); gap: clamp(16px, 3vw, 24px); }
        .lp-sec-card  { padding: 28px; border-radius: 16px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); transition: background .2s, border-color .2s, transform .2s; }
        .lp-sec-card:hover { background: rgba(255,255,255,.06); border-color: rgba(93,232,164,.25); transform: translateY(-3px); }
        .lp-sec-icon  { width: 44px; height: 44px; border-radius: 11px; background: rgba(93,232,164,.12); display: flex; align-items: center; justify-content: center; margin-bottom: 18px; color: #5DE8A4; }
        .lp-sec-title { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .lp-sec-desc  { font-size: 14px; color: rgba(255,255,255,.6); line-height: 1.6; }

        /* ── CTA FINAL ──────────────────────────────────── */
        .lp-final { padding: clamp(64px, 9vw, 112px) clamp(20px, 4vw, 48px); text-align: center; }
        .lp-final-inner { max-width: 640px; margin: 0 auto; }
        .lp-final h2 { font-size: clamp(1.875rem, 4vw, 2.625rem); font-weight: 800; letter-spacing: -1px; margin: 0 0 16px; color: #0f172a; line-height: 1.15; }
        .lp-final p  { font-size: 16px; color: #64748b; margin: 0 0 32px; line-height: 1.6; }
        .lp-final-chips { display: inline-flex; align-items: center; justify-content: center; gap: 18px; margin-top: 24px; flex-wrap: wrap; }

        /* ── FOOTER ─────────────────────────────────────── */
        .lp-footer { border-top: 1px solid #e2e8f0; background: #f8fafc; padding: 24px clamp(20px, 4vw, 48px); display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .lp-footer-logo { height: 36px; width: auto; object-fit: contain; }
        .lp-footer-links { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .lp-footer-link { font-size: 12.5px; color: #94a3b8; text-decoration: none; transition: color .15s; }
        .lp-footer-link:hover { color: #2A5BFF; }

        /* ── RESPONSIVE ─────────────────────────────────── */
        @media (max-width: 960px) {
          .lp-hero { grid-template-columns: 1fr; gap: 48px; }
          .lp-hero-text-col { order: 2; }
          .lp-hero-visual-col { order: 1; max-width: 480px; margin: 0 auto; width: 100%; }
          .lp-stats { grid-template-columns: repeat(2,1fr); gap: 24px; }
          .lp-pb, .lp-pb-rev { grid-template-columns: 1fr; gap: 32px; }
          .lp-pb-rev .lp-pb-text   { order: 2; }
          .lp-pb-rev .lp-pb-visual { order: 1; }
          .lp-pb .lp-pb-text       { order: 2; }
          .lp-pb .lp-pb-visual     { order: 1; }
          .lp-sec-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 520px) {
          .lp-nav-cta  { height: 38px; font-size: 12.5px; padding: 0 14px 0 12px; }
          .lp-cta-primary, .lp-cta-ghost { height: 46px; font-size: 14px; flex: 1; justify-content: center; }
          .lp-mockup { max-width: 360px; }
          .lp-mk-bars { height: 100px; }
        }
      `}</style>

      {/* ════ HERO + NAV ═══════════════════════════════════ */}
      <div className="lp-hero-wrap">
        <header className={`lp-nav-outer ${scrolled ? 'lp-scrolled' : ''}`}>
          <img src={logoLanding} alt="SR Gestão de Documentos" className="lp-nav-logo" />
          <button onClick={openLogin} className="lp-nav-cta">
            <Icon name="user" size={13} /> Entrar
          </button>
        </header>

        <section className="lp-hero">
          <div className="lp-hero-text-col">
            <div className="lp-hero-eyebrow">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              Plataforma de gestão de RH
            </div>
            <h1 className="lp-hero-h1">
              Seu RH.<br />
              <span className="grad">Sem papel.</span><br />
              <span className="muted">Sem caos.</span>
            </h1>
            <p className="lp-hero-p">
              Centralize documentos, ponto, advertências e holerites com segurança total, rastreabilidade auditável e exportação em segundos — tudo em um único sistema.
            </p>
            <div className="lp-hero-ctas">
              <button onClick={openLogin} className="lp-cta-primary">
                Acessar o sistema <Icon name="chevron-right" size={16} />
              </button>
              <a href="#features" className="lp-cta-ghost">Saiba mais</a>
            </div>
            <div className="lp-hero-chips">
              {['LGPD compliant', 'TLS 1.3', 'Trilha auditável'].map(t => (
                <span key={t} className="lp-hero-chip">
                  <Icon name="check" size={13} style={{ color: '#22c55e' }} /> {t}
                </span>
              ))}
            </div>
          </div>

          <div className="lp-hero-visual-col">
            <BeforeAfterMockup />
          </div>
        </section>
      </div>

      {/* ════ STATS ═══════════════════════════════════════ */}
      <section className="lp-stats-wrap">
        <div className="lp-stats">
          {STATS.map(s => (
            <Reveal key={s.label}><div className="lp-stat">
              <div className="lp-stat-v">{s.value}</div>
              <div className="lp-stat-l">{s.label}</div>
            </div></Reveal>
          ))}
        </div>
      </section>

      {/* ════ PRODUCT BLOCKS ══════════════════════════════ */}
      <section id="features" className="lp-products">
        <div className="lp-section-head">
          <div className="lp-section-eyebrow">Funcionalidades</div>
          <h2 className="lp-section-h2">Tudo que o seu RH precisa</h2>
          <p className="lp-section-p">Um sistema completo, sem planilhas dispersas, sem pastas físicas e sem retrabalho.</p>
        </div>

        <Reveal>
          <ProductBlock
            eyebrow="Documentos"
            eyebrowColor="#2A5BFF"
            title="Toda a vida documental de cada funcionário em um só lugar."
            desc="Contratos, holerites, atestados e termos organizados por colaborador e categoria. Acesso e download em segundos."
            bullets={[
              'Upload por arrastar-e-soltar com categorização automática',
              'Visualização inline de PDFs sem precisar baixar',
              'Histórico completo com data, hora e responsável por upload',
            ]}
            mockup={<MockupDocs />}
          />
        </Reveal>

        <Reveal>
          <ProductBlock
            reverse
            eyebrow="Ponto"
            eyebrowColor="#0891b2"
            title="Banco de horas que não depende de planilha."
            desc="Espelho de ponto, banco de horas e registro de faltas, com exportação em PDF ou Excel para qualquer período."
            bullets={[
              'Cálculo automático de horas extras e DSR',
              'Visão semanal, mensal e por colaborador',
              'Exportação compatível com folha de pagamento',
            ]}
            mockup={<MockupPoint />}
          />
        </Reveal>

        <Reveal>
          <ProductBlock
            eyebrow="Relatórios"
            eyebrowColor="#059669"
            title="Decisões com dados, não com achismo."
            desc="Headcount, turnover, folha consolidada e custos por centro de resultado — prontos para apresentar à liderança."
            bullets={[
              'Filtros por unidade, cargo, departamento e período',
              'Gráficos prontos para copiar em apresentações',
              'Exportação PDF e Excel com um clique',
            ]}
            mockup={<MockupReports />}
          />
        </Reveal>
      </section>

      {/* ════ SECURITY ════════════════════════════════════ */}
      <section className="lp-sec">
        <div className="lp-sec-inner">
          <div className="lp-section-head">
            <div className="lp-section-eyebrow" style={{ color: '#5DE8A4' }}>Segurança</div>
            <h2 className="lp-section-h2" style={{ color: '#fff' }}>Proteção que o seu RH merece</h2>
            <p className="lp-section-p" style={{ color: 'rgba(255,255,255,.55)' }}>
              Dados de funcionários são sensíveis. Nossa infraestrutura foi construída para protegê-los por padrão.
            </p>
          </div>

          <div className="lp-sec-grid">
            {SECURITY.map(s => (
              <Reveal key={s.title}><div className="lp-sec-card">
                <div className="lp-sec-icon"><Icon name={s.icon} size={20} /></div>
                <div className="lp-sec-title">{s.title}</div>
                <div className="lp-sec-desc">{s.desc}</div>
              </div></Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════ CTA FINAL ═══════════════════════════════════ */}
      <section className="lp-final">
        <div className="lp-final-inner">
          <h2>Pronto para digitalizar<br />o seu RH?</h2>
          <p>Acesse agora e veja como é simples centralizar toda a gestão de pessoas da sua empresa.</p>
          <button onClick={openLogin} className="lp-cta-primary" style={{ height: 54, padding: '0 32px', fontSize: 16 }}>
            Acessar o sistema <Icon name="chevron-right" size={17} />
          </button>
          <div className="lp-final-chips">
            {['LGPD compliant', 'TLS 1.3', 'Sem fidelidade'].map(t => (
              <span key={t} className="lp-hero-chip">
                <Icon name="check" size={12} style={{ color: '#22c55e' }} /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ════ FOOTER ══════════════════════════════════════ */}
      <footer className="lp-footer">
        <img src={logoLanding} alt="SR Gestão" className="lp-footer-logo" />
        <span style={{ flex: 1 }} />
        <div className="lp-footer-links">
          <span className="lp-footer-link">© 2026 Orion Gestão</span>
          <span style={{ color: '#e2e8f0' }}>·</span>
          <a href="#" className="lp-footer-link">Termos</a>
          <a href="#" className="lp-footer-link">Privacidade</a>
          <a href="#" className="lp-footer-link">Suporte</a>
        </div>
      </footer>

      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </div>
  );
}
