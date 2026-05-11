import { useState } from 'react';
import Icon from './Icon.jsx';

const PRIMARY_OPTIONS = [
  '#2A5BFF', // Azul Orion
  '#1E3A8A', // Azul espacial
  '#0EA5E9', // Cian
  '#10B981', // Verde corporativo
  '#7C3AED', // Roxo
  '#F97316', // Laranja
  '#E11D48', // Vermelho
  '#475569', // Grafite
];

export default function TweaksPanel({ tweaks, setTweak, onLogout }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button className="tweaks-fab" onClick={() => setOpen(true)} aria-label="Abrir Tweaks">
        <Icon name="sparkle" size={14} /> Tweaks
      </button>
    );
  }

  return (
    <aside className="tweaks-panel" role="dialog" aria-label="Tweaks">
      <div className="tw-head">
        <strong style={{ fontSize: 13, fontWeight: 700 }}>Tweaks</strong>
        <button
          onClick={() => setOpen(false)}
          aria-label="Fechar"
          style={{
            border: 0,
            background: 'transparent',
            color: 'var(--muted)',
            width: 24,
            height: 24,
            borderRadius: 6,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="x" size={14} />
        </button>
      </div>

      <div className="tw-body">
        {/* Cor primária */}
        <section className="tw-section">
          <div className="tw-title">Cor primária</div>
          <div className="tw-row">
            <div className="tw-label">
              <span>Marca</span>
              <span className="mono">{tweaks.primary}</span>
            </div>
            <div className="tw-swatches">
              {PRIMARY_OPTIONS.map((c) => (
                <button
                  key={c}
                  className="tw-swatch"
                  data-on={tweaks.primary === c ? '1' : '0'}
                  onClick={() => setTweak('primary', c)}
                  style={{ background: c }}
                  aria-label={`Selecionar cor ${c}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Tema */}
        <section className="tw-section">
          <div className="tw-title">Tema</div>
          <div className="tw-row">
            <div className="tw-label">
              <span>Modo</span>
            </div>
            <div className="tw-seg">
              {[
                { v: 'light', l: 'Claro' },
                { v: 'dark', l: 'Escuro' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  data-on={tweaks.theme === opt.v ? '1' : '0'}
                  onClick={() => setTweak('theme', opt.v)}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Cantos & densidade */}
        <section className="tw-section">
          <div className="tw-title">Densidade & cantos</div>
          <div className="tw-row">
            <div className="tw-label">
              <span>Raio dos cantos</span>
              <span className="mono">{tweaks.radius}px</span>
            </div>
            <input
              type="range"
              className="tw-slider"
              min={4}
              max={18}
              step={1}
              value={tweaks.radius}
              onChange={(e) => setTweak('radius', Number(e.target.value))}
            />
          </div>
          <div className="tw-row">
            <div className="tw-label">
              <span>Densidade</span>
            </div>
            <div className="tw-seg">
              {[
                { v: 'compact', l: 'Compacto' },
                { v: 'comfortable', l: 'Confortável' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  data-on={tweaks.density === opt.v ? '1' : '0'}
                  onClick={() => setTweak('density', opt.v)}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Sair */}
        {onLogout && (
          <section className="tw-section">
            <div className="tw-title">Sessão</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button className="tw-btn" onClick={onLogout}>
                Sair da conta
              </button>
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}
