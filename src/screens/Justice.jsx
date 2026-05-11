import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import OrionGlyph from '../components/OrionGlyph.jsx';

const JUSTICE_TEMPLATES = [
  { id: 'ato-admissao', title: 'Termo de admissão',          cat: 'Contratos',     pages: 3, icon: 'user' },
  { id: 'rescisao',     title: 'Termo de rescisão (TRCT)',   cat: 'Rescisões',     pages: 4, icon: 'x' },
  { id: 'advertencia',  title: 'Advertência formal',         cat: 'Disciplinares', pages: 1, icon: 'alert' },
  { id: 'suspensao',    title: 'Suspensão disciplinar',      cat: 'Disciplinares', pages: 2, icon: 'alert' },
  { id: 'ferias',       title: 'Aviso de férias',            cat: 'Férias',        pages: 1, icon: 'calendar' },
  { id: 'acordo',       title: 'Acordo extrajudicial',       cat: 'Acordos',       pages: 5, icon: 'share' },
  { id: 'ata',          title: 'Ata de reunião disciplinar', cat: 'Disciplinares', pages: 2, icon: 'doc' },
  { id: 'declaracao',   title: 'Declaração de vínculo',      cat: 'Declarações',   pages: 1, icon: 'doc' },
  { id: 'intimacao',    title: 'Resposta a intimação',       cat: 'Processos',     pages: 6, icon: 'scale' },
  { id: 'preposto',     title: 'Carta de preposição',        cat: 'Processos',     pages: 1, icon: 'scale' },
];

const JUSTICE_PROCESSES = [
  { num: '0021345-67.2025.5.02.0042', autor: 'Carlos Mendes Souza', vara: '42ª VT — São Paulo/SP', fase: 'Audiência',   status: 'warn', proxima: '21/05/2026' },
  { num: '0019874-22.2025.5.02.0011', autor: 'Patrícia A. Lima',    vara: '11ª VT — São Paulo/SP', fase: 'Sentença',    status: 'info', proxima: '—' },
  { num: '0017650-09.2024.5.02.0028', autor: 'Roberto F. Andrade',  vara: '28ª VT — São Paulo/SP', fase: 'Acordo',      status: 'ok',   proxima: 'encerrado' },
  { num: '0024112-44.2026.5.02.0008', autor: 'Joana M. Carvalho',   vara: '08ª VT — Guarulhos/SP', fase: 'Notificação', status: 'bad',  proxima: '12/05/2026' },
];

export default function JusticeScreen({ addToast }) {
  const [tab, setTab] = useState('documentos');
  const [selected, setSelected] = useState(null);
  const [employee, setEmployee] = useState('Mariana Oliveira');
  const [reason, setReason] = useState('');
  const [city, setCity] = useState('São Paulo');
  const [showPreview, setShowPreview] = useState(false);

  const tpl = selected ? JUSTICE_TEMPLATES.find((t) => t.id === selected) : null;

  const doPrint = () => {
    setShowPreview(true);
    setTimeout(() => window.print(), 200);
  };

  return (
    <div
      className="fade-up"
      style={{
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        maxWidth: 1280,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Header */}
      <div className="row no-print" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="grow">
          <div className="row gap-2" style={{ marginBottom: 6 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'var(--brand-tint)',
                color: 'var(--brand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="gavel" size={19} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
                Justiça
              </h1>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>
                Documentos jurídicos formatados para impressão A4 e exportação em PDF.
              </p>
            </div>
          </div>
        </div>
        <div className="row gap-2">
          <button className="btn">
            <Icon name="folder" size={14} /> Modelos enviados
          </button>
          <button
            className="btn primary"
            onClick={() => addToast({ kind: 'ok', msg: 'Pacote zipado com 12 documentos do mês' })}
          >
            <Icon name="download" size={14} /> Exportar mês
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="row gap-2 no-print"
        style={{ borderBottom: '1px solid var(--line)', paddingBottom: 0 }}
      >
        {[
          { id: 'documentos', l: 'Gerar documento',       i: 'doc' },
          { id: 'processos',  l: 'Processos ativos',      i: 'scale' },
          { id: 'historico',  l: 'Histórico de emissões', i: 'history' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="row gap-2"
            style={{
              padding: '10px 14px',
              border: 'none',
              background: 'transparent',
              color: tab === t.id ? 'var(--brand)' : 'var(--muted)',
              fontSize: 13,
              fontWeight: tab === t.id ? 700 : 500,
              cursor: 'pointer',
              borderBottom: `2px solid ${tab === t.id ? 'var(--brand)' : 'transparent'}`,
              marginBottom: -1,
            }}
          >
            <Icon name={t.i} size={14} /> {t.l}
          </button>
        ))}
      </div>

      {/* DOCUMENTOS TAB */}
      {tab === 'documentos' && !showPreview && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)',
            gap: 22,
          }}
        >
          {/* Template gallery */}
          <div className="col gap-3">
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                fontWeight: 700,
              }}
            >
              1. Escolha o modelo
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 10,
              }}
            >
              {JUSTICE_TEMPLATES.map((t) => {
                const active = selected === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t.id)}
                    style={{
                      textAlign: 'left',
                      padding: 14,
                      background: active ? 'var(--brand-tint)' : 'var(--surface)',
                      border: `1px solid ${active ? 'var(--brand)' : 'var(--line)'}`,
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  >
                    <div className="row" style={{ marginBottom: 8 }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 7,
                          background: active ? 'var(--brand)' : 'var(--surface-2)',
                          color: active ? 'var(--brand-ink)' : 'var(--muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon name={t.icon} size={14} />
                      </div>
                      <span className="grow" />
                      <span style={{ fontSize: 10.5, color: 'var(--muted-2)', fontWeight: 600 }}>
                        {t.pages} pág.
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: active ? 'var(--brand)' : 'var(--ink)',
                        lineHeight: 1.3,
                      }}
                    >
                      {t.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
                      {t.cat}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form panel */}
          <div className="col gap-3">
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                fontWeight: 700,
              }}
            >
              2. Preencha os dados
            </div>
            <div className="card" style={{ padding: 22 }}>
              {!tpl ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      margin: '0 auto 14px',
                      background: 'var(--surface-2)',
                      border: '1px dashed var(--line)',
                      color: 'var(--muted-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="gavel" size={22} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Selecione um modelo</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
                    Escolha à esquerda para abrir o formulário e gerar o PDF.
                  </div>
                </div>
              ) : (
                <>
                  <div className="row gap-2" style={{ marginBottom: 18 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{tpl.title}</h3>
                    <span className="grow" />
                    <span className="pill brand" style={{ fontSize: 10.5 }}>
                      A4 · Retrato
                    </span>
                  </div>

                  <div className="col gap-3">
                    <div>
                      <label className="label">Funcionário</label>
                      <select
                        className="field"
                        value={employee}
                        onChange={(e) => setEmployee(e.target.value)}
                      >
                        <option>Mariana Oliveira</option>
                        <option>Rafael Carneiro</option>
                        <option>Beatriz Almeida</option>
                        <option>Carlos Mendes Souza</option>
                        <option>Patrícia A. Lima</option>
                      </select>
                    </div>
                    <div className="row gap-3">
                      <div className="grow">
                        <label className="label">Cidade</label>
                        <input
                          className="field"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                        />
                      </div>
                      <div style={{ width: 160 }}>
                        <label className="label">Data</label>
                        <input className="field" type="date" defaultValue="2026-05-09" />
                      </div>
                    </div>
                    <div>
                      <label className="label">Motivo / fundamentação</label>
                      <textarea
                        className="field"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Descreva o motivo, datas e fatos relevantes…"
                        style={{ height: 110, padding: 12, resize: 'vertical', lineHeight: 1.5 }}
                      />
                    </div>
                    <div className="row gap-3">
                      <div className="grow">
                        <label className="label">Testemunha 1</label>
                        <input className="field" placeholder="Nome completo · CPF" />
                      </div>
                      <div className="grow">
                        <label className="label">Testemunha 2</label>
                        <input className="field" placeholder="Nome completo · CPF" />
                      </div>
                    </div>

                    <div
                      className="row gap-2"
                      style={{
                        padding: 12,
                        background: 'var(--surface-2)',
                        borderRadius: 8,
                        border: '1px solid var(--line-soft)',
                      }}
                    >
                      <Icon name="info" size={14} style={{ color: 'var(--muted)' }} />
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        Será gerado em 1 via para arquivo + 2 vias para assinatura. Margem A4
                        padrão (18mm).
                      </span>
                    </div>
                  </div>

                  <div
                    className="row gap-2"
                    style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line-soft)' }}
                  >
                    <button className="btn" onClick={() => setSelected(null)}>
                      <Icon name="chevron-left" size={13} /> Voltar
                    </button>
                    <span className="grow" />
                    <button className="btn" onClick={() => setShowPreview(true)}>
                      <Icon name="eye" size={14} /> Pré-visualizar
                    </button>
                    <button className="btn primary" onClick={doPrint}>
                      <Icon name="print" size={14} /> Imprimir / PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW */}
      {tab === 'documentos' && showPreview && tpl && (
        <PrintPreview
          tpl={tpl}
          employee={employee}
          city={city}
          reason={reason}
          onBack={() => setShowPreview(false)}
          onPrint={() => window.print()}
          addToast={addToast}
        />
      )}

      {/* PROCESSOS TAB */}
      {tab === 'processos' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
              Processos trabalhistas em curso
            </h3>
            <span className="grow" />
            <button className="btn sm">
              <Icon name="plus" size={13} /> Novo processo
            </button>
          </div>
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
                <th style={{ textAlign: 'left', padding: '10px 18px', fontWeight: 600 }}>Processo</th>
                <th style={{ textAlign: 'left', padding: '10px 18px', fontWeight: 600 }}>Reclamante</th>
                <th style={{ textAlign: 'left', padding: '10px 18px', fontWeight: 600 }}>Vara</th>
                <th style={{ textAlign: 'left', padding: '10px 18px', fontWeight: 600 }}>Fase</th>
                <th style={{ textAlign: 'left', padding: '10px 18px', fontWeight: 600 }}>Próxima ação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {JUSTICE_PROCESSES.map((p, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
                  <td style={{ padding: '12px 18px' }} className="mono">
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{p.num}</span>
                  </td>
                  <td style={{ padding: '12px 18px' }}>
                    <div className="row gap-2">
                      <Avatar name={p.autor} size={26} hue={i * 70 + 40} />
                      <span style={{ fontWeight: 500 }}>{p.autor}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 18px', color: 'var(--muted)', fontSize: 12.5 }}>{p.vara}</td>
                  <td style={{ padding: '12px 18px' }}>
                    <span className={`pill ${p.status}`}>
                      <span className="dot" />
                      {p.fase}
                    </span>
                  </td>
                  <td style={{ padding: '12px 18px' }} className="mono">
                    {p.proxima}
                  </td>
                  <td style={{ padding: '12px 18px' }} className="row gap-2">
                    <button className="btn ghost icon sm" title="PDF do processo">
                      <Icon name="print" size={13} />
                    </button>
                    <button className="btn ghost icon sm" title="Abrir">
                      <Icon name="chevron-right" size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* HISTÓRICO TAB */}
      {tab === 'historico' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
                <th style={{ textAlign: 'left', padding: '10px 18px', fontWeight: 600 }}>Data</th>
                <th style={{ textAlign: 'left', padding: '10px 18px', fontWeight: 600 }}>Documento</th>
                <th style={{ textAlign: 'left', padding: '10px 18px', fontWeight: 600 }}>Funcionário</th>
                <th style={{ textAlign: 'left', padding: '10px 18px', fontWeight: 600 }}>Emitido por</th>
                <th style={{ textAlign: 'left', padding: '10px 18px', fontWeight: 600 }}>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[
                { d: '08/05/2026', t: 'Termo de admissão',    f: 'Beatriz Almeida',  e: 'Mariana O.', s: 'Assinado',   k: 'ok' },
                { d: '06/05/2026', t: 'Advertência formal',   f: 'Lucas Fonseca',    e: 'Mariana O.', s: 'Pendente',   k: 'warn' },
                { d: '04/05/2026', t: 'Aviso de férias',      f: 'Patrícia A. Lima', e: 'Mariana O.', s: 'Assinado',   k: 'ok' },
                { d: '30/04/2026', t: 'Termo de rescisão',    f: 'Carlos M. Souza',  e: 'Mariana O.', s: 'Assinado',   k: 'ok' },
                { d: '28/04/2026', t: 'Acordo extrajudicial', f: 'Roberto Andrade',  e: 'Mariana O.', s: 'Homologado', k: 'info' },
              ].map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
                  <td style={{ padding: '12px 18px' }} className="mono">{r.d}</td>
                  <td style={{ padding: '12px 18px', fontWeight: 500 }}>{r.t}</td>
                  <td style={{ padding: '12px 18px', color: 'var(--ink-soft)' }}>{r.f}</td>
                  <td style={{ padding: '12px 18px', color: 'var(--muted)' }}>{r.e}</td>
                  <td style={{ padding: '12px 18px' }}>
                    <span className={`pill ${r.k}`}>
                      <span className="dot" />
                      {r.s}
                    </span>
                  </td>
                  <td style={{ padding: '12px 18px' }} className="row gap-2">
                    <button className="btn ghost icon sm">
                      <Icon name="eye" size={13} />
                    </button>
                    <button className="btn ghost icon sm">
                      <Icon name="download" size={13} />
                    </button>
                    <button className="btn ghost icon sm">
                      <Icon name="print" size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PrintPreview({ tpl, employee, city, reason, onBack, onPrint, addToast }) {
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  return (
    <div className="orion-print-shell" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar — hidden on print */}
      <div
        className="row gap-2 no-print"
        style={{
          padding: '12px 16px',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          position: 'sticky',
          top: 0,
          zIndex: 5,
        }}
      >
        <button className="btn" onClick={onBack}>
          <Icon name="chevron-left" size={13} /> Editar
        </button>
        <span className="grow" />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          Pré-visualização A4 · Margens 18mm
        </span>
        <span className="grow" />
        <button
          className="btn"
          onClick={() =>
            addToast && addToast({ kind: 'ok', msg: 'PDF salvo em /justica/' + tpl.id + '.pdf' })
          }
        >
          <Icon name="download" size={14} /> Salvar PDF
        </button>
        <button className="btn primary" onClick={onPrint}>
          <Icon name="print" size={14} /> Imprimir
        </button>
      </div>

      {/* A4 page — 210mm × 297mm at 96dpi ≈ 794 × 1123px */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 0 30px' }}>
        <div
          className="orion-print-page"
          style={{
            width: 794,
            minHeight: 1123,
            padding: '68px 70px',
            background: '#ffffff',
            color: '#0B0D11',
            fontFamily: '"Plus Jakarta Sans", serif',
            lineHeight: 1.6,
            boxShadow: '0 8px 32px rgba(20,25,40,.10), 0 2px 6px rgba(20,25,40,.06)',
            border: '1px solid var(--line)',
            borderRadius: 4,
          }}
        >
          {/* Letterhead */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              paddingBottom: 18,
              borderBottom: '2px solid #0B0D11',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: '#0B0D11',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <OrionGlyph size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3 }}>
                ORION GESTÃO LTDA.
              </div>
              <div style={{ fontSize: 10.5, color: '#444', marginTop: 2 }}>
                CNPJ 12.345.678/0001-90 · Av. Paulista, 1000 — São Paulo/SP · CEP 01310-100
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 10.5, color: '#444' }}>
              <div style={{ fontWeight: 700, color: '#0B0D11' }}>
                Documento {tpl.id.toUpperCase()}
              </div>
              <div>Emitido em {today}</div>
            </div>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: 18,
              fontWeight: 800,
              textAlign: 'center',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              margin: '32px 0 28px',
            }}
          >
            {tpl.title}
          </h1>

          {/* Body */}
          <div style={{ fontSize: 12, textAlign: 'justify' }}>
            <p style={{ margin: '0 0 14px' }}>
              Pelo presente instrumento particular, de um lado <b>ORION GESTÃO LTDA.</b>, pessoa
              jurídica de direito privado, inscrita no CNPJ sob o nº 12.345.678/0001-90, com sede
              na Av. Paulista, 1000, doravante denominada simplesmente <b>EMPREGADORA</b>, e de
              outro lado <b>{employee.toUpperCase()}</b>, brasileiro(a), portador(a) do RG nº
              ____________ e do CPF nº ___.___.___-__, residente e domiciliado(a) em {city}/SP,
              doravante denominado(a) simplesmente <b>EMPREGADO(A)</b>, têm entre si, justo e
              acordado, o presente termo, nos termos das cláusulas e condições a seguir.
            </p>

            <h3 style={{ fontSize: 12.5, fontWeight: 800, margin: '20px 0 8px' }}>
              CLÁUSULA PRIMEIRA — DO OBJETO
            </h3>
            <p style={{ margin: '0 0 14px' }}>
              O presente instrumento tem por objeto formalizar a relação prevista neste documento
              ({tpl.title.toLowerCase()}), regida pela Consolidação das Leis do Trabalho
              (Decreto-Lei nº 5.452/1943) e pelas normas convencionais aplicáveis à categoria
              profissional.
            </p>

            <h3 style={{ fontSize: 12.5, fontWeight: 800, margin: '20px 0 8px' }}>
              CLÁUSULA SEGUNDA — DA FUNDAMENTAÇÃO
            </h3>
            <p style={{ margin: '0 0 14px', whiteSpace: 'pre-wrap' }}>
              {reason ||
                '_______________________________________________________________________________________________________________________________________________________________________________________________________________________________'}
            </p>

            <h3 style={{ fontSize: 12.5, fontWeight: 800, margin: '20px 0 8px' }}>
              CLÁUSULA TERCEIRA — DA CIÊNCIA
            </h3>
            <p style={{ margin: '0 0 14px' }}>
              O(a) <b>EMPREGADO(A)</b> declara, neste ato, ter recebido cópia integral do presente
              instrumento, ter compreendido seus termos e estar ciente de seus efeitos jurídicos,
              manifestando expressa concordância mediante a aposição de sua assinatura ao final.
            </p>

            <p style={{ margin: '32px 0 0' }}>
              E, por estarem assim justos e contratados, firmam o presente em 02 (duas) vias de
              igual teor e forma, na presença das testemunhas abaixo identificadas.
            </p>

            <p style={{ margin: '20px 0 60px', textAlign: 'right' }}>
              {city}, {today}.
            </p>

            {/* Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 50, marginTop: 30 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #0B0D11', paddingTop: 8, fontSize: 11 }}>
                  <div style={{ fontWeight: 700 }}>ORION GESTÃO LTDA.</div>
                  <div style={{ color: '#444', marginTop: 2 }}>
                    Empregadora · CNPJ 12.345.678/0001-90
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #0B0D11', paddingTop: 8, fontSize: 11 }}>
                  <div style={{ fontWeight: 700 }}>{employee.toUpperCase()}</div>
                  <div style={{ color: '#444', marginTop: 2 }}>Empregado(a) · CPF ___.___.___-__</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 50, marginTop: 50 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #0B0D11', paddingTop: 8, fontSize: 11 }}>
                  <div style={{ fontWeight: 700 }}>Testemunha 1</div>
                  <div style={{ color: '#444', marginTop: 2 }}>Nome · CPF</div>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #0B0D11', paddingTop: 8, fontSize: 11 }}>
                  <div style={{ fontWeight: 700 }}>Testemunha 2</div>
                  <div style={{ color: '#444', marginTop: 2 }}>Nome · CPF</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              position: 'relative',
              marginTop: 50,
              paddingTop: 12,
              borderTop: '1px solid #ccc',
              fontSize: 9.5,
              color: '#666',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Documento gerado por Orion Gestão · {tpl.id}</span>
            <span>Página 1 de {tpl.pages}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
