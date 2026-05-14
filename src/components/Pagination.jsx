import Icon from './Icon.jsx';

export default function Pagination({ total, page, perPage, onPage, onPerPage }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to   = Math.min(page * perPage, total);

  const btnStyle = (active) => ({
    minWidth: 30, height: 30, padding: '0 8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 6, border: '1px solid var(--line)',
    background: active ? 'var(--brand)' : 'var(--surface-2)',
    color: active ? '#fff' : 'var(--ink)',
    fontSize: 12.5, fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    transition: 'background .1s, border-color .1s',
  });

  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', borderTop:'1px solid var(--line)', flexWrap:'wrap', gap:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ fontSize:12, color:'var(--muted)' }}>Linhas por página:</span>
        {[10, 20, 50].map(n => (
          <button
            key={n}
            onClick={() => { onPerPage(n); onPage(1); }}
            style={{ ...btnStyle(perPage === n), minWidth: 34 }}
            onMouseEnter={e => { if (perPage !== n) e.currentTarget.style.background = 'var(--hover)'; }}
            onMouseLeave={e => { if (perPage !== n) e.currentTarget.style.background = 'var(--surface-2)'; }}
          >{n}</button>
        ))}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
        <span style={{ fontSize:12, color:'var(--muted)', marginRight:4 }}>{from}–{to} de {total}</span>
        <button
          onClick={() => page > 1 && onPage(page - 1)}
          disabled={page <= 1}
          style={{ ...btnStyle(false), opacity: page <= 1 ? 0.35 : 1 }}
          onMouseEnter={e => { if (page > 1) e.currentTarget.style.background = 'var(--hover)'; }}
          onMouseLeave={e => { if (page > 1) e.currentTarget.style.background = 'var(--surface-2)'; }}
        ><Icon name="chevron-left" size={13} /></button>

        {pages.map((p, i) => p === '…'
          ? <span key={`e${i}`} style={{ fontSize:12, color:'var(--muted)', padding:'0 2px' }}>…</span>
          : <button
              key={p}
              onClick={() => onPage(p)}
              style={{ ...btnStyle(p === page) }}
              onMouseEnter={e => { if (p !== page) e.currentTarget.style.background = 'var(--hover)'; }}
              onMouseLeave={e => { if (p !== page) e.currentTarget.style.background = 'var(--surface-2)'; }}
            >{p}</button>
        )}

        <button
          onClick={() => page < totalPages && onPage(page + 1)}
          disabled={page >= totalPages}
          style={{ ...btnStyle(false), opacity: page >= totalPages ? 0.35 : 1 }}
          onMouseEnter={e => { if (page < totalPages) e.currentTarget.style.background = 'var(--hover)'; }}
          onMouseLeave={e => { if (page < totalPages) e.currentTarget.style.background = 'var(--surface-2)'; }}
        ><Icon name="chevron-right" size={13} /></button>
      </div>
    </div>
  );
}
