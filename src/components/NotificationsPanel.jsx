import Icon from './Icon.jsx';
import { useNotifications } from '../hooks/useEmployees.js';

export default function NotificationsPanel({ open, onClose }) {
  const { items, loading, refetch } = useNotifications();

  if (!open) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="card fade-up"
        style={{
          position: 'absolute',
          top: 60,
          right: 20,
          width: 380,
          padding: 0,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-pop)',
        }}
      >
        <div className="row" style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Notificações</div>
          {items.length > 0 && (
            <span
              className="pill bad"
              style={{ fontSize: 10.5, padding: '1px 7px', marginLeft: 8 }}
            >
              {items.length}
            </span>
          )}
          <span className="grow" />
          <button
            className="btn ghost sm"
            onClick={refetch}
            title="Atualizar"
            style={{ padding: '0 8px' }}
          >
            <Icon name="history" size={13} />
          </button>
        </div>

        <div style={{ maxHeight: 440, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              <div className="pulse">Carregando…</div>
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--ok-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Icon name="check" size={20} style={{ color: 'var(--ok)' }} />
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Tudo em ordem</div>
              <div style={{ fontSize: 12 }}>Nenhuma notificação recente.</div>
            </div>
          ) : (
            items.map((it) => (
              <div
                key={it.id}
                className="row gap-3"
                style={{
                  padding: '11px 14px',
                  borderBottom: '1px solid var(--line-soft)',
                  alignItems: 'flex-start',
                  cursor: 'default',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div
                  className={`pill ${it.iconClass}`}
                  style={{ width: 32, height: 32, padding: 0, borderRadius: 8, justifyContent: 'center', flexShrink: 0 }}
                >
                  <Icon name={it.icon} size={15} />
                </div>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {it.title}
                  </div>
                  {it.sub && (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {it.sub}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 3 }}>{it.timeLabel}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          className="row gap-2"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '12px',
            border: 'none',
            background: 'var(--surface-2)',
            color: 'var(--brand)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            borderTop: '1px solid var(--line)',
          }}
          onClick={onClose}
        >
          Fechar <Icon name="x" size={13} />
        </button>
      </div>
    </div>
  );
}
