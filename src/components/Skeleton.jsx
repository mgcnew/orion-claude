/**
 * Bloco de skeleton (placeholder animado).
 * Usa a classe global `.skel` (shimmer gradient definido em global.css).
 *
 * Props:
 *  - width:  número (px) ou string ('100%', '60%', etc.) — default '100%'
 *  - height: número (px) ou string — default 14
 *  - radius: número (px) — override do border-radius (default 6px da .skel)
 *  - circle: bool — atalho para círculo perfeito (width=height, radius=50%)
 *  - style:  estilos extras
 */
export default function Skeleton({ width = '100%', height = 14, radius, circle, style = {} }) {
  const size = circle
    ? { width: width || 32, height: width || 32, borderRadius: '50%' }
    : { width, height, ...(radius != null ? { borderRadius: radius } : {}) };
  return <div className="skel" style={{ display: 'block', ...size, ...style }} />;
}
