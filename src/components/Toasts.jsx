import Icon from './Icon.jsx';

export default function Toasts({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind || ''}`}>
          <div
            className={`pill ${t.kind || ''}`}
            style={{
              width: 26,
              height: 26,
              padding: 0,
              justifyContent: 'center',
              borderRadius: 6,
              flexShrink: 0,
            }}
          >
            <Icon
              name={t.kind === 'ok' ? 'check' : t.kind === 'bad' ? 'x' : 'info'}
              size={14}
            />
          </div>
          <div
            className="grow"
            style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.45, paddingTop: 4 }}
          >
            {t.msg}
          </div>
        </div>
      ))}
    </div>
  );
}
