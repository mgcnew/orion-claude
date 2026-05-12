import { useState, useRef, useCallback, useEffect } from 'react';
import Icon from '../components/Icon.jsx';
import { useAllDocuments } from '../hooks/useEmployees.js';
import { supabase } from '../lib/supabase.js';

const CATEGORIES = [
  { id: 'contratos',    name: 'Contratos',       icon: 'doc',         color: '#2A5BFF' },
  { id: 'rg-cpf',      name: 'RG / CPF',        icon: 'user',        color: '#1F8A5B' },
  { id: 'holerites',   name: 'Holerites',        icon: 'pdf',         color: '#C58A1B' },
  { id: 'atestados',   name: 'Atestados',        icon: 'image',       color: '#C2412C' },
  { id: 'advertencias',name: 'Advertências',     icon: 'alert',       color: '#a855f7' },
  { id: 'ferias',      name: 'Férias',           icon: 'umbrella',    color: '#0891b2' },
  { id: 'juridico',    name: 'Jurídico',         icon: 'shield',      color: '#475569' },
  { id: 'exames',      name: 'Exames Médicos',   icon: 'fingerprint', color: '#db2777' },
];

const STATUS_MAP = {
  ok:   { label: 'OK',      cls: 'ok'  },
  warn: { label: 'Atenção', cls: 'warn'},
  bad:  { label: 'Crítico', cls: 'bad' },
  pending: { label: 'Pendente', cls: 'warn' },
  sign:    { label: 'Assinatura', cls: 'info' },
};

function FileIcon({ type, color, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.22,
      background: (color || '#888') + '18',
      color: color || 'var(--muted)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon name={type === 'image' ? 'image' : 'pdf'} size={size * 0.5} />
    </div>
  );
}

export default function DocumentsScreen({ addToast }) {
  const [tab, setTab]           = useState('all');
  const [cat, setCat]           = useState(null);
  const [view, setView]         = useState('list');
  const [search, setSearch]     = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [userId, setUserId]     = useState(null);
  const fileInputRef = useRef();

  const { documents: raw, loading, error, refetch } = useAllDocuments();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  const docs = raw.map(d => ({
    id: d.id,
    name: d.name,
    cat: d.category,
    size: d.size,
    who: d.employees?.name || 'Sistema',
    date: new Date(d.created_at).toLocaleDateString('pt-BR'),
    type: d.type || 'pdf',
    status: d.status || 'ok',
  }));

  const catCounts = CATEGORIES.reduce((acc, c) => {
    acc[c.id] = docs.filter(d => d.cat === c.id).length;
    return acc;
  }, {});

  const pending = docs.filter(d => d.status === 'pending' || d.status === 'warn');
  const sign    = docs.filter(d => d.status === 'sign');

  const filtered = docs.filter(d => {
    if (tab === 'pending' && d.status !== 'pending' && d.status !== 'warn') return false;
    if (tab === 'sign'    && d.status !== 'sign')    return false;
    if (cat && d.cat !== cat) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleUpload = useCallback(async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const file = files[0];
    const { error: upErr } = await supabase.from('documents').insert({
      name: file.name || `Documento_${Date.now()}.pdf`,
      category: cat || CATEGORIES[0].id,
      size: file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : '—',
      type: file.type?.includes('image') ? 'image' : 'pdf',
      status: 'ok',
      uploaded_by: userId,
    });
    if (upErr) addToast({ kind: 'bad', msg: 'Erro ao fazer upload: ' + upErr.message });
    else { addToast({ kind: 'ok', msg: `${file.name || 'Arquivo'} enviado` }); refetch(); }
    setUploading(false);
  }, [cat, addToast, refetch, userId]);

  const handleDelete = useCallback(async () => {
    if (!selected.size) return;
    setDeleting(true);
    const ids = [...selected];
    const { error: delErr } = await supabase.from('documents').delete().in('id', ids);
    setDeleting(false);
    if (delErr) addToast({ kind: 'bad', msg: 'Erro ao excluir: ' + delErr.message });
    else {
      addToast({ kind: 'ok', msg: `${ids.length} documento(s) excluído(s)` });
      setSelected(new Set());
      refetch();
    }
  }, [selected, addToast, refetch]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const toggleSelect = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const activeCatMeta = CATEGORIES.find(c => c.id === cat);

  return (
    <div
      style={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); }}
      onDrop={onDrop}
    >
      {/* ── Drag overlay ── */}
      {dragOver && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          background: 'var(--brand-tint)',
          border: '2px dashed var(--brand)',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 10, backdropFilter: 'blur(2px)',
        }}>
          <Icon name="upload" size={40} style={{ color: 'var(--brand)' }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand)' }}>Solte para fazer upload</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>PDF, JPG, PNG, DOCX até 20 MB</div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, flexShrink: 0,
        borderRight: '1px solid var(--line)',
        background: 'var(--surface)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
        padding: '16px 0',
      }}>
        <div style={{ padding: '0 14px 12px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Documentos
        </div>

        {/* Nav items */}
        {[
          { id: 'all',     label: 'Todos',              icon: 'folder',   n: docs.length },
          { id: 'pending', label: 'Pendentes',          icon: 'alert',    n: pending.length, accent: pending.length > 0 },
          { id: 'sign',    label: 'Aguard. assinatura', icon: 'edit',     n: sign.length,    accent: sign.length > 0 },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => { setTab(item.id); setCat(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 14px',
              border: 'none', background: tab === item.id && !cat ? 'var(--hover)' : 'transparent',
              borderRadius: 0, cursor: 'pointer', width: '100%', textAlign: 'left',
              color: tab === item.id && !cat ? 'var(--ink)' : 'var(--muted)',
              fontSize: 13.5, fontWeight: tab === item.id && !cat ? 600 : 400,
            }}
          >
            <Icon name={item.icon} size={14} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.n > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 600, minWidth: 20, textAlign: 'center',
                padding: '1px 5px', borderRadius: 10,
                background: item.accent ? 'var(--warn-bg, #fff3cd)' : 'var(--surface-2)',
                color: item.accent ? 'var(--warn)' : 'var(--muted)',
              }}>{item.n}</span>
            )}
          </button>
        ))}

        <div style={{ height: 1, background: 'var(--line)', margin: '12px 14px' }} />

        <div style={{ padding: '0 14px 8px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Categorias
        </div>

        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => { setCat(cat === c.id ? null : c.id); setTab('all'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 14px',
              border: 'none',
              background: cat === c.id ? c.color + '14' : 'transparent',
              borderRadius: 0, cursor: 'pointer', width: '100%', textAlign: 'left',
              color: cat === c.id ? c.color : 'var(--muted)',
              fontSize: 13, fontWeight: cat === c.id ? 600 : 400,
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: cat === c.id ? c.color : 'var(--muted-2)',
            }} />
            <span style={{ flex: 1 }}>{c.name}</span>
            <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>{catCounts[c.id] || 0}</span>
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Upload button */}
        <div style={{ padding: '12px 14px 0' }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={e => handleUpload(e.target.files)}
          />
          <button
            className="btn primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Icon name={uploading ? 'loader' : 'upload'} size={14} />
            {uploading ? 'Enviando…' : 'Upload'}
          </button>
          <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 6 }}>
            ou arraste para a tela
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {cat ? activeCatMeta?.name : tab === 'pending' ? 'Pendentes' : tab === 'sign' ? 'Aguardando assinatura' : 'Todos os documentos'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
              {filtered.length} {filtered.length === 1 ? 'arquivo' : 'arquivos'}
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={13} style={{ position: 'absolute', left: 9, top: 10, color: 'var(--muted)' }} />
            <input
              className="field"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar documentos…"
              style={{ width: 220, paddingLeft: 30, height: 34, fontSize: 13 }}
            />
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 7, overflow: 'hidden' }}>
            {[['list','dashboard'],['grid','folder']].map(([v, icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  border: 'none', padding: '6px 9px', cursor: 'pointer',
                  background: view === v ? 'var(--hover)' : 'transparent',
                  color: 'var(--ink)',
                }}
              >
                <Icon name={icon} size={13} />
              </button>
            ))}
          </div>
        </div>

        {/* Selection bar */}
        {selected.size > 0 && (
          <div style={{
            padding: '8px 20px', background: 'var(--brand-tint)',
            borderBottom: '1px solid var(--line)',
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
          }}>
            <strong>{selected.size} selecionados</strong>
            <span style={{ flex: 1 }} />
            <button className="btn sm"><Icon name="download" size={13} /> Baixar</button>
            <button
              className="btn sm"
              style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }}
              onClick={handleDelete}
              disabled={deleting}
            >
              <Icon name="trash" size={13} /> {deleting ? 'Excluindo…' : 'Excluir'}
            </button>
            <button className="btn ghost sm icon" onClick={() => setSelected(new Set())}>
              <Icon name="x" size={13} />
            </button>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              <div className="pulse">Carregando documentos…</div>
            </div>
          ) : error ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--bad)', fontSize: 13 }}>
              <Icon name="alert" size={28} style={{ opacity: 0.5, marginBottom: 10 }} />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Erro ao carregar documentos</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{error}</div>
              <button className="btn sm" style={{ marginTop: 14 }} onClick={refetch}>Tentar novamente</button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 64, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              <Icon name="folder" size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Nenhum documento</div>
              <div style={{ fontSize: 12 }}>
                {search ? 'Tente outro termo de busca' : 'Faça upload ou altere o filtro'}
              </div>
            </div>
          ) : view === 'list' ? (
            <ListView docs={filtered} categories={CATEGORIES} selected={selected} onToggle={toggleSelect} />
          ) : (
            <GridView docs={filtered} categories={CATEGORIES} />
          )}
        </div>
      </div>
    </div>
  );
}

function ListView({ docs, categories, selected, onToggle }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          <th style={{ padding: '9px 16px', width: 36 }}>
            <input type="checkbox" style={{ accentColor: 'var(--brand)' }} />
          </th>
          <th style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 600 }}>Nome</th>
          <th style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 600 }}>Categoria</th>
          <th style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 600 }}>Enviado por</th>
          <th style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 600 }}>Data</th>
          <th style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 600 }}>Tamanho</th>
          <th style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 600 }}>Status</th>
          <th style={{ width: 80 }} />
        </tr>
      </thead>
      <tbody>
        {docs.map(f => {
          const cm = categories.find(c => c.id === f.cat);
          const st = STATUS_MAP[f.status] || STATUS_MAP.ok;
          return (
            <tr
              key={f.id}
              style={{ borderTop: '1px solid var(--line-soft)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <td style={{ padding: '10px 16px' }} onClick={e => { e.stopPropagation(); onToggle(f.id); }}>
                <input type="checkbox" checked={selected.has(f.id)} onChange={() => onToggle(f.id)} style={{ accentColor: 'var(--brand)' }} />
              </td>
              <td style={{ padding: '10px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileIcon type={f.type} color={cm?.color} size={30} />
                  <span style={{ fontWeight: 500, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                </div>
              </td>
              <td style={{ padding: '10px 16px' }}>
                {cm && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11.5, fontWeight: 500,
                    color: cm.color, background: cm.color + '14',
                    padding: '2px 8px', borderRadius: 20,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: cm.color }} />
                    {cm.name}
                  </span>
                )}
              </td>
              <td style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12.5 }}>{f.who}</td>
              <td style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12.5 }}>{f.date}</td>
              <td style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12.5 }}>{f.size}</td>
              <td style={{ padding: '10px 16px' }}>
                <span className={`pill ${st.cls}`} style={{ fontSize: 11 }}>{st.label}</span>
              </td>
              <td style={{ padding: '10px 16px' }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button className="btn ghost icon sm"><Icon name="eye" size={13} /></button>
                  <button className="btn ghost icon sm"><Icon name="download" size={13} /></button>
                  <button className="btn ghost icon sm"><Icon name="more-v" size={13} /></button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function GridView({ docs, categories }) {
  return (
    <div style={{
      padding: 20,
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: 12,
      alignContent: 'start',
    }}>
      {docs.map(f => {
        const cm = categories.find(c => c.id === f.cat);
        return (
          <div
            key={f.id}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              padding: 14,
              cursor: 'pointer',
              transition: 'box-shadow .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            {/* Thumbnail */}
            <div style={{
              height: 80, borderRadius: 7, marginBottom: 10,
              background: (cm?.color || '#888') + '10',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              border: '1px solid ' + (cm?.color || 'var(--line)') + '22',
            }}>
              <Icon name={f.type === 'image' ? 'image' : 'pdf'} size={30} style={{ color: cm?.color || 'var(--muted-2)' }} />
              <span style={{
                position: 'absolute', top: 5, right: 5,
                fontSize: 9, fontWeight: 700, letterSpacing: 0.3,
                padding: '1px 5px', borderRadius: 4,
                background: 'var(--surface)', border: '1px solid var(--line)',
                color: 'var(--muted)',
              }}>
                {f.type.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
              {f.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{f.size}</span>
              <span>{f.date}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
