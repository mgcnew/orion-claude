import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import OrionGlyph from '../components/OrionGlyph.jsx';
import { supabase } from '../lib/supabase.js';
import { useCompanies, sendInvite } from '../hooks/useEmployees.js';

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

// Modal de envio de convite (usado pelo admin dentro do sistema)
export function SendInviteModal({ onClose, addToast }) {
  const { companies } = useCompanies();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Operacional');
  const [selectedCompanies, setSelectedCompanies] = useState([]);
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
