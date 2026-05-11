// Reusable Orion glyph — used in sidebar logo, auth screens, letterhead.
export default function OrionGlyph({ size = 18, color = 'white' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ color }}>
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        transform="rotate(60 12 12)"
      />
    </svg>
  );
}
