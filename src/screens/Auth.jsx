import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import OrionGlyph from '../components/OrionGlyph.jsx';
import { supabase } from '../lib/supabase.js';

export function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

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
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setResetSent(true);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)',
        background: 'var(--bg)',
      }}
    >
      {/* Left — form */}
      <div
        style={{
          padding: '48px 56px',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        <div className="row gap-2">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-700) 100%)',
              position: 'relative',
            }}
          >
            <div style={{ position: 'absolute', inset: 6 }}>
              <OrionGlyph size={20} />
            </div>
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: -0.2 }}>
            Orion <span style={{ fontWeight: 500, color: 'var(--muted)' }}>Gestão</span>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <form onSubmit={submit} style={{ width: '100%', maxWidth: 380, margin: '0 auto' }}>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: 1.4,
                color: 'var(--brand)',
                marginBottom: 10,
              }}
            >
              BEM-VINDO DE VOLTA
            </div>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: -0.8,
                lineHeight: 1.1,
                margin: '0 0 10px',
              }}
            >
              Acesse sua plataforma corporativa
            </h1>
            <p
              style={{
                color: 'var(--muted)',
                fontSize: 14,
                marginBottom: 32,
                lineHeight: 1.55,
              }}
            >
              Toda a documentação da sua empresa, organizada e protegida em um único lugar.
            </p>

            <label className="label">E-mail corporativo</label>
            <input
              className="field"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="voce@empresa.com.br"
              required
            />

            <div className="row" style={{ marginTop: 16, marginBottom: 6 }}>
              <label className="label" style={{ margin: 0 }}>
                Senha
              </label>
              <span className="grow" />
              <button
                type="button"
                onClick={sendReset}
                style={{
                  fontSize: 12,
                  color: 'var(--brand)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                {resetSent ? '✓ E-mail enviado' : 'Esqueci minha senha'}
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                className="field"
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
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

            <label
              className="row gap-2"
              style={{
                marginTop: 18,
                fontSize: 13,
                color: 'var(--ink-soft)',
                cursor: 'pointer',
              }}
            >
              <input type="checkbox" defaultChecked style={{ accentColor: 'var(--brand)' }} />
              Manter-me conectado neste dispositivo
            </label>

            {error && (
              <div style={{
                marginTop: 12,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'var(--bad-bg)',
                color: 'var(--bad)',
                fontSize: 13,
                fontWeight: 500,
              }}>
                <Icon name="alert" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn primary"
              disabled={loading}
              style={{
                width: '100%',
                marginTop: 22,
                height: 44,
                fontSize: 14,
                justifyContent: 'center',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <span className="pulse">Verificando…</span>
              ) : (
                <>
                  Entrar <Icon name="chevron-right" size={16} />
                </>
              )}
            </button>

            <div
              className="row gap-2"
              style={{ margin: '22px 0', color: 'var(--muted-2)', fontSize: 12 }}
            >
              <div className="h-line" />
              <span style={{ whiteSpace: 'nowrap' }}>OU</span>
              <div className="h-line" />
            </div>

            <button
              type="button"
              className="btn"
              style={{ width: '100%', height: 42, justifyContent: 'center' }}
            >
              <Icon name="mail" size={16} /> Acessar via convite por e-mail
            </button>

            <div
              style={{
                marginTop: 36,
                padding: '12px 14px',
                borderRadius: 10,
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
              }}
            >
              <div className="row gap-2" style={{ fontSize: 12, color: 'var(--muted)' }}>
                <Icon name="shield" size={14} style={{ color: 'var(--ok)' }} />
                <span>
                  <strong style={{ color: 'var(--ink-soft)' }}>Ambiente seguro</strong> · Conexão
                  criptografada TLS 1.3 · LGPD compliant
                </span>
              </div>
            </div>
          </form>
        </div>

        <div className="row gap-3" style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>
          <span>© 2026 Orion Gestão</span>
          <span>·</span>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>
            Termos
          </a>
          <span>·</span>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>
            Privacidade
          </a>
          <span>·</span>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>
            Suporte
          </a>
        </div>
      </div>

      {/* Right — visual */}
      <div
        style={{
          background:
            'linear-gradient(165deg, var(--brand) 0%, var(--brand-700) 50%, #0F172A 100%)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 56,
        }}
      >
        {/* Soft grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
            WebkitMaskImage:
              'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          }}
        />
        {/* Concentric rings */}
        <svg
          width="520"
          height="520"
          viewBox="0 0 520 520"
          style={{ position: 'absolute', color: 'rgba(255,255,255,.13)' }}
        >
          {[60, 120, 180, 240].map((r) => (
            <circle key={r} cx="260" cy="260" r={r} fill="none" stroke="currentColor" strokeWidth="1" />
          ))}
          <circle cx="260" cy="260" r="6" fill="white" />
          <circle cx="380" cy="200" r="4" fill="white" opacity=".7" />
          <circle cx="160" cy="320" r="3" fill="white" opacity=".5" />
          <circle cx="320" cy="380" r="3" fill="white" opacity=".5" />
        </svg>

        <div style={{ position: 'relative', color: 'white', maxWidth: 460, textAlign: 'left' }}>
          <div
            className="pill"
            style={{
              background: 'rgba(255,255,255,.12)',
              color: 'white',
              padding: '5px 12px',
              marginBottom: 24,
              fontSize: 11.5,
              fontWeight: 600,
            }}
          >
            <span className="dot" style={{ background: '#5DE8A4' }} /> Sistema operacional · 99,98%
          </div>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -1,
              margin: '0 0 16px',
            }}
          >
            Sua empresa sem papel.
            <br />
            <span style={{ opacity: 0.7 }}>
              Documentos, ponto e folha em um só lugar.
            </span>
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,.65)',
              fontSize: 14.5,
              lineHeight: 1.6,
              marginBottom: 32,
            }}
          >
            Centralize cadastros, contratos, holerites e advertências com rastreabilidade auditável
            e assinatura digital.
          </p>
          <div className="col gap-3">
            {[
              { icon: 'shield', label: 'Criptografia ponta a ponta com chaves rotativas a cada 24h' },
              { icon: 'history', label: 'Trilha de auditoria completa — quem, o quê, quando, de onde' },
              { icon: 'fingerprint', label: 'Acesso granular por cargo, módulo e permissão' },
            ].map((f, i) => (
              <div
                key={i}
                className="row gap-3"
                style={{ color: 'rgba(255,255,255,.85)', fontSize: 13.5 }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,.10)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon name={f.icon} size={16} />
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

export function InviteScreen({ onAccept, onBack }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: 24,
      }}
    >
      <div className="card fade-up" style={{ width: 460, maxWidth: '100%', padding: 36 }}>
        <div className="row gap-2" style={{ marginBottom: 28 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, var(--brand), var(--brand-700))',
              position: 'relative',
            }}
          >
            <div style={{ position: 'absolute', inset: 6 }}>
              <OrionGlyph size={20} />
            </div>
          </div>
          <div style={{ fontWeight: 700, letterSpacing: -0.2 }}>Orion Gestão</div>
        </div>

        <div className="pill brand" style={{ marginBottom: 16 }}>
          <Icon name="mail" size={12} /> Convite recebido
        </div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: -0.5,
            margin: '0 0 8px',
          }}
        >
          Você foi convidado por <span style={{ color: 'var(--brand)' }}>Orion Matriz</span>
        </h1>
        <p
          style={{
            color: 'var(--muted)',
            fontSize: 13.5,
            lineHeight: 1.55,
            margin: '0 0 24px',
          }}
        >
          Mariana Oliveira (RH) convidou você para fazer parte da plataforma corporativa Orion.
          Conclua seu cadastro abaixo.
        </p>

        <div className="col gap-3">
          <div>
            <label className="label">Nome completo</label>
            <input className="field" defaultValue="Felipe Coutinho Braga" />
          </div>
          <div>
            <label className="label">Cargo</label>
            <select className="field">
              <option>Auxiliar Administrativo</option>
              <option>Assistente</option>
            </select>
          </div>
          <div className="row gap-3">
            <div className="grow">
              <label className="label">Senha</label>
              <input type="password" className="field" defaultValue="•••••••••" />
            </div>
            <div className="grow">
              <label className="label">Confirmar</label>
              <input type="password" className="field" defaultValue="•••••••••" />
            </div>
          </div>
        </div>

        <button
          onClick={onAccept}
          className="btn primary"
          style={{ width: '100%', marginTop: 22, height: 42, justifyContent: 'center' }}
        >
          Aceitar convite e entrar <Icon name="chevron-right" size={15} />
        </button>
        <button
          onClick={onBack}
          className="btn ghost"
          style={{
            width: '100%',
            marginTop: 8,
            height: 36,
            justifyContent: 'center',
            color: 'var(--muted)',
          }}
        >
          ← Voltar para login
        </button>
      </div>
    </div>
  );
}
