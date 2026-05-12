import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import * as D from '../data/mock.js';
import { useAllDocuments } from '../hooks/useEmployees.js';
import { supabase } from '../lib/supabase.js';

export default function DocumentsScreen({ addToast }) {
  const [view, setView] = useState('grid');
  const [cat, setCat] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { documents: rawDocs, loading, error, refetch } = useAllDocuments();

  const documents = rawDocs.map(d => ({
    id: d.id,
    name: d.name,
    cat: d.category,
    size: d.size,
    who: d.employees?.name || 'Sistema',
    date: new Date(d.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    type: d.type,
    status: d.status
  }));

  const dynamicCategories = D.documentCategories.map(c => ({
    ...c,
    count: documents.filter(d => d.cat === c.id).length
  }));

  const filtered = cat ? documents.filter((d) => d.cat === cat) : documents;

  const handleUpload = async () => {
    setUploading(true);
    const { error } = await supabase.from('documents').insert({
      name: `Documento_Novo_${Math.floor(Math.random() * 1000)}.pdf`,
      category: D.documentCategories[Math.floor(Math.random() * D.documentCategories.length)].id,
      size: `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 9)} MB`,
      type: 'pdf',
      status: 'ok'
    });
    
    if (error) {
      addToast({ kind: 'bad', msg: 'Erro ao fazer upload' });
    } else {
      addToast({ kind: 'ok', msg: 'Upload concluído com sucesso' });
      refetch();
    }
    setUploading(false);
  };

  return (
    <div className="fade-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <div className="grow">
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
            Documentos
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            3.048 arquivos · 14,2 GB · indexação automática habilitada
          </p>
        </div>
        <div className="row gap-2">
          <button className="btn">
            <Icon name="scan" size={15} /> Scanner mobile
          </button>
          <button className="btn">
            <Icon name="folder" size={15} /> Nova pasta
          </button>
          <button
            className="btn primary"
            onClick={handleUpload}
            disabled={uploading}
          >
            <Icon name={uploading ? 'loader' : 'upload'} size={15} /> 
            {uploading ? 'Enviando...' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleUpload();
        }}
        style={{
          padding: '20px 24px',
          borderRadius: 12,
          border: `1.5px dashed ${dragActive ? 'var(--brand)' : 'var(--line)'}`,
          background: dragActive ? 'var(--brand-tint)' : 'var(--surface-2)',
          transition: 'all .15s',
        }}
      >
        <div className="row gap-3">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand)',
            }}
          >
            <Icon name="upload" size={20} />
          </div>
          <div className="grow">
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              Arraste arquivos aqui ou{' '}
              <span style={{ color: 'var(--brand)', textDecoration: 'underline', cursor: 'pointer' }}>
                selecione do dispositivo
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              PDF, JPG, PNG, DOCX até 20 MB · OCR automático em PDFs · classificação por IA
            </div>
          </div>
          <span className="pill brand">
            <Icon name="sparkle" size={11} /> Auto-classificação
          </span>
        </div>
      </div>

      {/* Categories */}
      <div>
        <div className="row" style={{ marginBottom: 10 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}
          >
            Categorias
          </h3>
          <span className="grow" />
          <button
            onClick={() => setCat(null)}
            style={{
              border: 'none',
              background: 'transparent',
              color: cat ? 'var(--brand)' : 'var(--muted)',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {cat ? 'Limpar filtro' : ''}
          </button>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
          }}
        >
          {dynamicCategories.map((c) => {
            const active = cat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCat(active ? null : c.id)}
                className="card"
                style={{
                  padding: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: `1px solid ${active ? c.color : 'var(--line)'}`,
                  background: active ? c.color + '12' : 'var(--surface)',
                  transition: 'all .15s',
                }}
              >
                <div className="row gap-2" style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: c.color + '1f',
                      color: c.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={c.icon} size={14} />
                  </div>
                  <span className="grow" />
                  <div className="mono" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    {c.count}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* File list/grid */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          className="row"
          style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', gap: 10 }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>
            {cat ? dynamicCategories.find((c) => c.id === cat)?.name : 'Todos os documentos'}
          </div>
          <span className="pill" style={{ fontSize: 11 }}>
            {filtered.length}
          </span>
          <span className="grow" />
          <button className="btn ghost sm">
            <Icon name="filter" size={13} /> Filtros
          </button>
          <select
            className="field"
            style={{ height: 32, width: 'auto', paddingRight: 28, fontSize: 12.5 }}
          >
            <option>Mais recentes</option>
            <option>A → Z</option>
            <option>Tamanho</option>
          </select>
          <div
            className="row"
            style={{ border: '1px solid var(--line)', borderRadius: 7, overflow: 'hidden' }}
          >
            <button
              onClick={() => setView('grid')}
              style={{
                border: 'none',
                background: view === 'grid' ? 'var(--hover)' : 'transparent',
                padding: '6px 9px',
                cursor: 'pointer',
                color: 'var(--ink)',
              }}
            >
              <Icon name="folder" size={13} />
            </button>
            <button
              onClick={() => setView('list')}
              style={{
                border: 'none',
                background: view === 'list' ? 'var(--hover)' : 'transparent',
                padding: '6px 9px',
                cursor: 'pointer',
                color: 'var(--ink)',
              }}
            >
              <Icon name="dashboard" size={13} />
            </button>
          </div>
        </div>

        {view === 'grid' ? (
          <div
            style={{
              padding: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', gridColumn: '1 / -1' }}>
                Carregando documentos...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', gridColumn: '1 / -1' }}>
                Nenhum documento encontrado.
              </div>
            ) : filtered.map((f, i) => {
              const cm = dynamicCategories.find((c) => c.id === f.cat);
              return (
                <div key={i} className="card" style={{ padding: 12, cursor: 'pointer' }}>
                  <div
                    style={{
                      aspectRatio: '1.4',
                      borderRadius: 6,
                      marginBottom: 10,
                      background: `repeating-linear-gradient(135deg, ${cm?.color || 'var(--line)'}10, ${
                        cm?.color || 'var(--line)'
                      }10 8px, transparent 8px, transparent 16px), var(--surface-2)`,
                      border: '1px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: cm?.color,
                      position: 'relative',
                    }}
                  >
                    <Icon name={f.type === 'image' ? 'image' : 'pdf'} size={28} />
                    <span
                      className="pill"
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        fontSize: 9.5,
                        padding: '1px 6px',
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                      }}
                    >
                      {f.type.toUpperCase()}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {f.name}
                  </div>
                  <div
                    className="row gap-2"
                    style={{ marginTop: 4, fontSize: 11, color: 'var(--muted)' }}
                  >
                    <span>{f.size}</span>
                    <span>·</span>
                    <span>{f.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr
                style={{
                  background: 'var(--surface-2)',
                  color: 'var(--muted)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                }}
              >
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Nome</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Categoria</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Enviado por</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Data</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Tamanho</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
                    Carregando documentos...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
                    Nenhum documento encontrado.
                  </td>
                </tr>
              ) : filtered.map((f, i) => {
                const cm = dynamicCategories.find((c) => c.id === f.cat);
                return (
                  <tr
                    key={i}
                    style={{ borderTop: '1px solid var(--line-soft)', cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '11px 16px' }}>
                      <div className="row gap-2">
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            background: (cm?.color || '#888') + '1f',
                            color: cm?.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icon name={f.type === 'image' ? 'image' : 'pdf'} size={13} />
                        </div>
                        <span style={{ fontWeight: 500 }}>{f.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span
                        className="pill"
                        style={{ background: (cm?.color || '#888') + '1f', color: cm?.color }}
                      >
                        {cm?.name}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', color: 'var(--muted)' }}>{f.who}</td>
                    <td
                      style={{ padding: '11px 16px', color: 'var(--muted)' }}
                      className="mono"
                    >
                      {f.date}
                    </td>
                    <td
                      style={{ padding: '11px 16px', color: 'var(--muted)' }}
                      className="mono"
                    >
                      {f.size}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span className={`pill ${f.status}`}>
                        {f.status === 'ok'
                          ? 'OK'
                          : f.status === 'warn'
                          ? 'Atenção'
                          : 'Crítico'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <div className="row gap-1">
                        <button className="btn ghost icon sm">
                          <Icon name="eye" size={13} />
                        </button>
                        <button className="btn ghost icon sm">
                          <Icon name="download" size={13} />
                        </button>
                        <button className="btn ghost icon sm">
                          <Icon name="more-v" size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
