import { useState, useRef, useEffect } from 'react';
import Icon from './Icon.jsx';
import Avatar from './Avatar.jsx';
import { supabase } from '../lib/supabase.js';

const HUE_PRESETS = [20, 60, 120, 180, 215, 260, 300, 340];

export default function ProfilePanel({ open, onClose, profile, onProfileUpdate }) {
  const [name, setName] = useState('');
  const [hue, setHue] = useState(215);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setHue(profile.avatar_hue ?? 215);
      setAvatarUrl(profile.avatar_url ?? null);
    }
  }, [profile]);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const ext = file.name.split('.').pop();
    const path = `${profile.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) { setError('Erro ao enviar foto.'); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    // Adiciona cache-buster para forçar reload da imagem
    const url = `${publicUrl}?t=${Date.now()}`;
    setAvatarUrl(url);
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
    onProfileUpdate({ ...profile, avatar_url: url });
    setUploading(false);
  };

  const handleRemovePhoto = async () => {
    setAvatarUrl(null);
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id);
    onProfileUpdate({ ...profile, avatar_url: null });
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('O nome não pode estar vazio.'); return; }
    setSaving(true);
    setError('');
    const { error: err } = await supabase
      .from('profiles')
      .update({ name: name.trim(), avatar_hue: hue })
      .eq('id', profile.id);
    await supabase.auth.updateUser({ data: { name: name.trim() } });
    setSaving(false);
    if (err) { setError('Erro ao salvar: ' + err.message); return; }
    onProfileUpdate({ ...profile, name: name.trim(), avatar_hue: hue });
    onClose();
  };

  const handleResetPassword = async () => {
    const email = profile?.email ?? '';
    if (!email) return;
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    setResetSent(true);
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.25)', backdropFilter: 'blur(2px)' }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 401,
        width: 360, background: 'var(--surface)',
        borderLeft: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,.1)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>Meu perfil</span>
          <button className="btn ghost icon sm" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* Foto */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{ position: 'relative' }}>
              <Avatar name={name || 'U'} size={80} hue={hue} url={avatarUrl} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'var(--brand)', border: '2px solid var(--surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'white',
                }}
              >
                <Icon name={uploading ? 'loader' : 'camera'} size={12} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn ghost sm" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ fontSize: 12 }}>
                <Icon name="upload" size={12} /> {uploading ? 'Enviando…' : 'Trocar foto'}
              </button>
              {avatarUrl && (
                <button className="btn ghost sm" onClick={handleRemovePhoto} style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Remover
                </button>
              )}
            </div>
          </div>

          {/* Nome */}
          <div style={{ marginBottom: 16 }}>
            <label className="label">Nome completo</label>
            <input className="field" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
          </div>

          {/* E-mail (readonly) */}
          <div style={{ marginBottom: 20 }}>
            <label className="label">E-mail</label>
            <input className="field" value={profile?.email ?? ''} disabled style={{ opacity: 0.55 }} />
          </div>

          {/* Cor do avatar */}
          {!avatarUrl && (
            <div style={{ marginBottom: 24 }}>
              <label className="label" style={{ marginBottom: 8 }}>Cor do avatar</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {HUE_PRESETS.map(h => (
                  <button
                    key={h}
                    onClick={() => setHue(h)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
                      background: `oklch(0.62 0.12 ${h})`,
                      outline: hue === h ? '3px solid var(--brand)' : '2px solid transparent',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Senha */}
          <div style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--line)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Senha</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
              Enviaremos um link de redefinição para o seu e-mail.
            </div>
            {resetSent ? (
              <div style={{ fontSize: 12.5, color: 'var(--ok, #16a34a)', fontWeight: 500 }}>
                <Icon name="check" size={13} /> Link enviado para {profile?.email}
              </div>
            ) : (
              <button className="btn ghost sm" onClick={handleResetPassword} style={{ fontSize: 12 }}>
                <Icon name="key" size={13} /> Alterar senha
              </button>
            )}
          </div>

          {error && (
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'var(--bad-tint, #FEE2E2)', color: 'var(--bad, #DC2626)', fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave} disabled={saving}>
            <Icon name="check" size={14} /> {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </>
  );
}
