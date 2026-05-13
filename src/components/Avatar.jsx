export default function Avatar({ name = '', size = 32, hue = 220, url = null }) {
  if (url) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        overflow: 'hidden', boxShadow: '0 0 0 2px var(--surface)',
      }}>
        <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: `linear-gradient(135deg, oklch(0.72 0.10 ${hue}) 0%, oklch(0.55 0.13 ${hue + 22}) 100%)`,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.36,
        fontWeight: 700,
        letterSpacing: -0.3,
        boxShadow: 'inset 0 -1px 0 rgba(0,0,0,.15), 0 0 0 2px var(--surface)',
      }}
    >
      {initials}
    </div>
  );
}
