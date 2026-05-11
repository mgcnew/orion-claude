import Icon from './Icon.jsx';

const ITEMS = [
  { icon: 'alert',    iconClass: 'bad',  title: '4 documentos vencendo nos próximos 7 dias',  time: 'agora'  },
  { icon: 'umbrella', iconClass: 'info', title: 'Beatriz Almeida solicitou férias',           time: 'há 2 h' },
  { icon: 'upload',   iconClass: 'ok',   title: 'Holerites de outubro gerados (248)',         time: 'há 1 h' },
  { icon: 'alert',    iconClass: 'warn', title: 'Diego Pacheco enviou atestado de 22 dias',   time: 'há 5 h' },
  { icon: 'user',     iconClass: 'info', title: 'Convite aceito por Felipe Coutinho',         time: 'ontem'  },
];

export default function NotificationsPanel({ open, onClose }) {
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
          <span className="grow" />
          <button className="btn ghost sm">Marcar todas</button>
        </div>
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {ITEMS.map((it, i) => (
            <div
              key={i}
              className="row gap-3"
              style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--line-soft)',
                alignItems: 'flex-start',
              }}
            >
              <div
                className={`pill ${it.iconClass}`}
                style={{
                  width: 32,
                  height: 32,
                  padding: 0,
                  borderRadius: 8,
                  justifyContent: 'center',
                }}
              >
                <Icon name={it.icon} size={16} />
              </div>
              <div className="grow">
                <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.4 }}>
                  {it.title}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
                  {it.time}
                </div>
              </div>
            </div>
          ))}
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
        >
          Ver todas <Icon name="chevron-right" size={14} />
        </button>
      </div>
    </div>
  );
}
