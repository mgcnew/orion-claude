import { useState, useCallback } from 'react';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import * as D from '../data/mock.js';
import { useEmployees, useEmployee, useEmployeeCounts } from '../hooks/useEmployees.js';

// ---- helpers shared across tabs ----
const th = (w) => ({ textAlign: 'left', padding: '10px 14px', fontWeight: 600, width: w });
const td = () => ({ padding: '11px 14px', verticalAlign: 'middle' });

function StatusPill({ status }) {
  const map = {
    ativo: { c: 'ok', l: 'Ativo' },
    férias: { c: 'info', l: 'Férias' },
    afastado: { c: 'warn', l: 'Afastado' },
    desligado: { c: '', l: 'Desligado' },
  };
  const m = map[status] || map.ativo;
  return (
    <span className={`pill ${m.c}`}>
      <span className="dot" />
      {m.l}
    </span>
  );
}

// ============================================================
// LIST
// ============================================================
export function EmployeesList({ setRoute, setRouteParam, setRouteLabel }) {
  const [view, setView]     = useState('table');
  const [tab, setTab]       = useState('todos');
  const [q, setQ]           = useState('');
  const [selected, setSelected] = useState(new Set());

  const { counts } = useEmployeeCounts();
  const { employees: filtered, loading } = useEmployees({
    status: tab !== 'todos' ? tab : undefined,
    search: q || undefined,
  });

  const tabs = [
    { id: 'todos',     l: 'Todos',      n: counts.todos },
    { id: 'ativo',     l: 'Ativos',     n: counts.ativo },
    { id: 'férias',    l: 'Em férias',  n: counts['férias'] },
    { id: 'afastado',  l: 'Afastados',  n: counts.afastado },
    { id: 'desligado', l: 'Desligados', n: counts.desligado },
  ];

  const openProfile = useCallback((empId, empName) => {
    setRouteParam(empId);
    setRouteLabel?.(empName);
    setRoute('employees-profile');
  }, [setRoute, setRouteParam, setRouteLabel]);

  const toggle = (id) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
  };

  return (
    <div className="fade-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <div className="grow">
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
            Funcionários
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Gerencie cadastros, status e documentação de toda a equipe.
          </p>
        </div>
        <div className="row gap-2">
          <button className="btn">
            <Icon name="download" size={15} /> Exportar CSV
          </button>
          <button className="btn primary" onClick={() => setRoute('employees-new')}>
            <Icon name="plus" size={15} /> Novo funcionário
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Tab strip */}
        <div
          className="row"
          style={{ padding: '0 16px', borderBottom: '1px solid var(--line)', gap: 4 }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '12px 4px',
                margin: '0 8px 0 0',
                fontSize: 13,
                fontWeight: tab === t.id ? 600 : 500,
                color: tab === t.id ? 'var(--ink)' : 'var(--muted)',
                borderBottom: `2px solid ${tab === t.id ? 'var(--brand)' : 'transparent'}`,
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {t.l}{' '}
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted-2)', marginLeft: 4 }}>
                {t.n}
              </span>
            </button>
          ))}
          <span className="grow" />
          <div className="row gap-2" style={{ padding: '8px 0' }}>
            <div style={{ position: 'relative' }}>
              <Icon
                name="search"
                size={14}
                style={{ position: 'absolute', left: 10, top: 12, color: 'var(--muted)' }}
              />
              <input
                className="field"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome, cargo, depto…"
                style={{ width: 260, paddingLeft: 32, height: 34 }}
              />
            </div>
            <button className="btn sm">
              <Icon name="filter" size={13} /> Filtros
            </button>
            <div
              className="row"
              style={{ border: '1px solid var(--line)', borderRadius: 7, overflow: 'hidden' }}
            >
              <button
                onClick={() => setView('table')}
                style={{
                  border: 'none',
                  background: view === 'table' ? 'var(--hover)' : 'transparent',
                  padding: '6px 9px',
                  cursor: 'pointer',
                  color: 'var(--ink)',
                }}
              >
                <Icon name="dashboard" size={13} />
              </button>
              <button
                onClick={() => setView('cards')}
                style={{
                  border: 'none',
                  background: view === 'cards' ? 'var(--hover)' : 'transparent',
                  padding: '6px 9px',
                  cursor: 'pointer',
                  color: 'var(--ink)',
                }}
              >
                <Icon name="folder" size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Selection bar */}
        {selected.size > 0 && (
          <div
            className="row gap-3"
            style={{
              padding: '10px 16px',
              background: 'var(--brand-tint)',
              borderBottom: '1px solid var(--line)',
              fontSize: 13,
            }}
          >
            <strong>{selected.size} selecionados</strong>
            <span className="grow" />
            <button className="btn sm">
              <Icon name="download" size={13} /> Exportar
            </button>
            <button className="btn sm">
              <Icon name="lock" size={13} /> Bloquear acesso
            </button>
            <button className="btn sm">
              <Icon name="trash" size={13} /> Arquivar
            </button>
            <button className="btn ghost sm icon" onClick={() => setSelected(new Set())}>
              <Icon name="x" size={13} />
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            <div className="pulse">Carregando funcionários…</div>
          </div>
        ) : view === 'table' ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr
                  style={{
                    background: 'var(--surface-2)',
                    color: 'var(--muted)',
                    fontSize: 11.5,
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                  }}
                >
                  <th style={th(40)}>
                    <input
                      type="checkbox"
                      style={{ accentColor: 'var(--brand)' }}
                      onChange={(e) =>
                        setSelected(e.target.checked ? new Set(filtered.map((f) => f.id)) : new Set())
                      }
                    />
                  </th>
                  <th style={th()}>Funcionário</th>
                  <th style={th()}>Empresa</th>
                  <th style={th()}>Status</th>
                  <th style={th()}>Admissão</th>
                  <th style={th(60)}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr
                    key={emp.id}
                    style={{ borderTop: '1px solid var(--line-soft)', cursor: 'pointer' }}
                    onClick={() => openProfile(emp.id, emp.name)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={td()} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(emp.id)}
                        onChange={() => toggle(emp.id)}
                        style={{ accentColor: 'var(--brand)' }}
                      />
                    </td>
                    <td style={td()}>
                      <div className="row gap-3">
                        <Avatar name={emp.name} hue={emp.hue} size={34} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{emp.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                            {emp.role} · {emp.dept}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={td()}>
                      <span style={{ color: 'var(--muted)' }}>{emp.company}</span>
                    </td>
                    <td style={td()}>
                      <StatusPill status={emp.status} />
                    </td>
                    <td style={td()}>
                      <span className="mono" style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                        {emp.admission ? new Date(emp.admission + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                      </span>
                    </td>
                    <td style={td()} onClick={(e) => e.stopPropagation()}>
                      <button className="btn ghost icon sm">
                        <Icon name="more-v" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      Nenhum funcionário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              padding: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 12,
            }}
          >
            {filtered.map((emp) => (
              <div
                key={emp.id}
                className="card"
                style={{ padding: 16, cursor: 'pointer' }}
                onClick={() => openProfile(emp.id, emp.name)}
              >
                <div className="row" style={{ marginBottom: 12 }}>
                  <Avatar name={emp.name} hue={emp.hue} size={42} />
                  <span className="grow" />
                  <StatusPill status={emp.status} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{emp.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{emp.role}</div>
                <div className="h-line" style={{ margin: '12px 0' }} />
                <div className="row" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  <span>{emp.company}</span>
                  <span className="grow" />
                  <span>{emp.dept}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          className="row"
          style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--line)',
            color: 'var(--muted)',
            fontSize: 12,
          }}
        >
          <span>
            Mostrando {filtered.length} de {counts.todos}
          </span>
          <span className="grow" />
          <div className="row gap-2">
            <button className="btn ghost sm icon">
              <Icon name="chevron-left" size={13} />
            </button>
            <span className="kbd" style={{ padding: '4px 10px' }}>
              1
            </span>
            <button className="btn ghost sm icon">
              <Icon name="chevron-right" size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROFILE
// ============================================================
export function EmployeeProfile({ setRoute, employeeId }) {
  const [tab, setTab] = useState('dados');
  const { employee: emp, loading } = useEmployee(employeeId);
  const tabs = [
    { id: 'dados', l: 'Dados pessoais', icon: 'user' },
    { id: 'prof', l: 'Profissionais', icon: 'briefcase' },
    { id: 'docs', l: 'Documentos', icon: 'folder', n: 28 },
    { id: 'ponto', l: 'Controle de ponto', icon: 'clock' },
    { id: 'warn', l: 'Advertências', icon: 'alert', n: 1 },
    { id: 'pay', l: 'Holerites', icon: 'pdf', n: 24 },
    { id: 'ferias', l: 'Férias', icon: 'umbrella' },
    { id: 'hist', l: 'Histórico', icon: 'history' },
  ];

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        <div className="pulse">Carregando funcionário…</div>
      </div>
    );
  }

  if (!emp) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Funcionário não encontrado.{' '}
        <button className="btn ghost sm" onClick={() => setRoute('employees')}>Voltar</button>
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Back */}
      <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setRoute('employees')}>
        <Icon name="chevron-left" size={13} /> Funcionários
      </button>

      {/* Header card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            height: 100,
            background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-700) 100%)',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>
        <div
          className="row"
          style={{
            padding: '0 24px 18px',
            marginTop: -36,
            alignItems: 'flex-end',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative' }}>
            <Avatar name={emp.name} hue={emp.hue} size={86} />
          </div>
          <div className="grow" style={{ minWidth: 240, paddingTop: 36 }}>
            <div className="row gap-2">
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>
                {emp.name}
              </h2>
              <StatusPill status={emp.status} />
            </div>
            <div
              className="row gap-3"
              style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, flexWrap: 'wrap' }}
            >
              <span className="row gap-2">
                <Icon name="briefcase" size={13} /> {emp.role}
              </span>
              <span className="row gap-2">
                <Icon name="building" size={13} /> {emp.company}
              </span>
              <span className="row gap-2">
                <Icon name="folder" size={13} /> {emp.dept}
              </span>
              {emp.admission && (
                <span className="row gap-2">
                  <Icon name="history" size={13} /> Desde {new Date(emp.admission + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
          <div className="row gap-2" style={{ paddingTop: 36 }}>
            <button className="btn">
              <Icon name="mail" size={14} /> Enviar mensagem
            </button>
            <button className="btn">
              <Icon name="download" size={14} /> Exportar prontuário
            </button>
            <button className="btn primary">
              <Icon name="edit" size={14} /> Editar
            </button>
            <button className="btn ghost icon">
              <Icon name="more-v" size={15} />
            </button>
          </div>
        </div>

        {/* Quick stats strip */}
        <div className="row" style={{ borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}>
          {[
            { l: 'Tempo de empresa', v: (() => {
                if (!emp.admission) return '—';
                const ms = Date.now() - new Date(emp.admission + 'T00:00:00').getTime();
                const yrs = Math.floor(ms / (365.25 * 24 * 3600 * 1000));
                const mos = Math.floor((ms % (365.25 * 24 * 3600 * 1000)) / (30.44 * 24 * 3600 * 1000));
                return `${yrs} ano${yrs !== 1 ? 's' : ''} · ${mos} ${mos !== 1 ? 'meses' : 'mês'}`;
              })(), i: 'history' },
            { l: 'Banco de horas', v: '+12h 30m', i: 'clock', k: 'ok' },
            { l: 'Atestados (12m)', v: '0', i: 'doc' },
            { l: 'Próximas férias', v: '—', i: 'umbrella' },
            { l: 'Salário base', v: emp.salary ? emp.salary.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—', i: 'chart' },
            { l: 'Avaliação 360º', v: '—', i: 'sparkle' },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: '14px 18px',
                borderRight: i < 5 ? '1px solid var(--line)' : 'none',
              }}
            >
              <div
                className="row gap-2"
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                <Icon name={s.i} size={11} /> {s.l}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: s.k === 'ok' ? 'var(--ok)' : 'var(--ink)',
                }}
              >
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="row"
        style={{ borderBottom: '1px solid var(--line)', overflowX: 'auto', gap: 0 }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              border: 'none',
              background: 'transparent',
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: tab === t.id ? 600 : 500,
              color: tab === t.id ? 'var(--brand)' : 'var(--muted)',
              borderBottom: `2px solid ${tab === t.id ? 'var(--brand)' : 'transparent'}`,
              marginBottom: -1,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon name={t.icon} size={14} /> {t.l}
            {t.n != null && (
              <span className="pill" style={{ fontSize: 10.5, padding: '1px 6px' }}>
                {t.n}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'dados' && <DadosPessoais emp={emp} />}
      {tab === 'prof' && <DadosProfissionais emp={emp} />}
      {tab === 'docs' && <DocsTab />}
      {tab === 'ponto' && <PontoTab />}
      {tab === 'warn' && <WarnTab />}
      {tab === 'pay' && <PayTab emp={emp} />}
      {tab === 'ferias' && <FeriasTab />}
      {tab === 'hist' && <HistoryTab emp={emp} />}
    </div>
  );
}

function Field({ l, v, mono }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {l}
      </div>
      <div className={mono ? 'mono' : ''} style={{ fontSize: 14, color: 'var(--ink)' }}>
        {v}
      </div>
    </div>
  );
}

function DadosPessoais({ emp }) {
  const birthFmt = emp?.birth_date
    ? new Date(emp.birth_date + 'T00:00:00').toLocaleDateString('pt-BR')
    : '—';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>
          Informações pessoais
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
          <Field l="Nome completo" v={emp?.name || '—'} />
          <Field l="CPF" v={emp?.cpf || '—'} mono />
          <Field l="Data de nascimento" v={birthFmt} mono />
          <Field l="Estado civil" v={emp?.civil_status || '—'} />
          <Field l="Nacionalidade" v="Brasileiro(a)" />
          <Field l="Dependentes" v="—" />
        </div>
        <div className="h-line" style={{ margin: '22px 0' }} />
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Endereço & contato</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 18 }}>
          <Field l="Logradouro" v={emp?.address || '—'} />
          <Field l="Bairro" v={emp?.neighborhood || '—'} />
          <Field l="CEP" v={emp?.zip_code || '—'} mono />
          <Field l="Cidade / UF" v={emp?.city && emp?.state ? `${emp.city} / ${emp.state}` : '—'} />
          <Field l="Telefone" v={emp?.phone || '—'} mono />
          <Field l="E-mail pessoal" v={emp?.email_personal || '—'} />
        </div>
      </div>
      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Dependentes</h3>
        <div
          style={{
            padding: '24px 0',
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: 13,
            border: '1px dashed var(--line)',
            borderRadius: 10,
          }}
        >
          Nenhum dependente cadastrado
        </div>
        <button className="btn ghost sm" style={{ marginTop: 10 }}>
          <Icon name="plus" size={13} /> Adicionar dependente
        </button>
      </div>
    </div>
  );
}

function DadosProfissionais({ emp }) {
  const admFmt = emp?.admission
    ? new Date(emp.admission + 'T00:00:00').toLocaleDateString('pt-BR')
    : '—';
  const salaryFmt = emp?.salary
    ? emp.salary.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';
  return (
    <div className="card" style={{ padding: 22 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Vínculo empregatício</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
        <Field l="Cargo" v={emp?.role || '—'} />
        <Field l="Departamento" v={emp?.dept || '—'} />
        <Field l="Empresa" v={emp?.company || '—'} />
        <Field l="Centro de custo" v={emp?.cost_center || '—'} mono />
        <Field l="Data de admissão" v={admFmt} mono />
        <Field l="Tipo de contrato" v={emp?.contract || '—'} />
        <Field l="Carga horária" v={emp?.workload || '—'} />
        <Field l="Regime" v={emp?.regime || '—'} />
        <Field l="Salário base" v={salaryFmt} mono />
        <Field l="Supervisor direto" v={emp?.supervisor || '—'} />
      </div>
    </div>
  );
}

function DocsTab() {
  const cats = D.documentCategories.slice(0, 6);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
      {cats.map((c, i) => (
        <div key={i} className="card" style={{ padding: 16, cursor: 'pointer' }}>
          <div className="row gap-2">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: c.color + '1f',
                color: c.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={c.icon} size={17} />
            </div>
            <div className="grow">
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                {Math.floor(Math.random() * 8) + 1} arquivos
              </div>
            </div>
            <button className="btn ghost icon sm">
              <Icon name="more-v" size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PontoTab() {
  return (
    <div className="card" style={{ padding: 22 }}>
      <div className="row" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Jornada — Maio / 2026</h3>
        <span className="grow" />
        <div className="row gap-2">
          <span className="pill ok">+12h 30m banco de horas</span>
          <button className="btn sm">
            <Icon name="download" size={13} /> Espelho
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
          <div
            key={d}
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              textAlign: 'center',
              padding: '6px 0',
              fontWeight: 600,
            }}
          >
            {d}
          </div>
        ))}
        {Array.from({ length: 35 }).map((_, i) => {
          const day = i - 4;
          const valid = day >= 1 && day <= 31;
          const kind = !valid
            ? 'x'
            : day % 7 === 6 || day % 7 === 0
            ? 'weekend'
            : day === 9
            ? 'today'
            : day < 9
            ? 'done'
            : 'future';
          const bg = {
            done: 'var(--ok-bg)',
            weekend: 'var(--surface-2)',
            today: 'var(--brand)',
            future: 'var(--surface-2)',
            x: 'transparent',
          }[kind];
          const color = {
            done: 'var(--ok)',
            weekend: 'var(--muted-2)',
            today: 'var(--brand-ink)',
            future: 'var(--muted-2)',
            x: 'transparent',
          }[kind];
          return (
            <div
              key={i}
              style={{
                aspectRatio: '1.4',
                borderRadius: 6,
                background: bg,
                color,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: kind === 'today' ? 700 : 500,
                border: kind === 'today' ? 'none' : kind === 'x' ? 'none' : '1px solid var(--line)',
              }}
            >
              {valid ? day : ''}
              {kind === 'done' && (
                <span className="mono" style={{ fontSize: 9, opacity: 0.8 }}>
                  8h12
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WarnTab() {
  return (
    <div className="card" style={{ padding: 22 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>
        Advertências e ocorrências
      </h3>
      <div className="col gap-3">
        {[
          {
            d: '12 / 03 / 2024',
            t: 'Advertência verbal',
            k: 'warn',
            desc: 'Atrasos recorrentes em Q1/2024',
            who: 'Patricia Nobre',
          },
        ].map((w, i) => (
          <div
            key={i}
            className="row gap-3"
            style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 10 }}
          >
            <div
              className={`pill ${w.k}`}
              style={{ width: 36, height: 36, padding: 0, borderRadius: 9, justifyContent: 'center' }}
            >
              <Icon name="alert" size={16} />
            </div>
            <div className="grow">
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{w.t}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {w.desc} · aplicada por {w.who}
              </div>
            </div>
            <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
              {w.d}
            </span>
            <button className="btn sm">
              <Icon name="eye" size={13} /> Ver
            </button>
          </div>
        ))}
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: 13,
            border: '1px dashed var(--line)',
            borderRadius: 10,
          }}
        >
          Nenhuma outra ocorrência nos últimos 12 meses ·{' '}
          <a href="#" style={{ color: 'var(--brand)' }}>
            Ver histórico completo
          </a>
        </div>
      </div>
    </div>
  );
}

function PayTab({ emp }) {
  const gross = emp?.salary || 0;
  const disc = gross * 0.2359;
  const net = gross - disc;
  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
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
            <th style={th()}>Competência</th>
            <th style={th()}>Bruto</th>
            <th style={th()}>Descontos</th>
            <th style={th()}>Líquido</th>
            <th style={th()}>Status</th>
            <th style={th(80)}></th>
          </tr>
        </thead>
        <tbody>
          {['Abril 2026', 'Março 2026', 'Fevereiro 2026', 'Janeiro 2026', '13º — 2025', 'Dezembro 2025'].map(
            (m, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
                <td style={td()}><strong>{m}</strong></td>
                <td style={td()} className="mono">{gross ? fmt(gross) : '—'}</td>
                <td style={td()} className="mono">{gross ? fmt(disc) : '—'}</td>
                <td style={td()} className="mono"><strong>{gross ? fmt(net) : '—'}</strong></td>
                <td style={td()}><span className="pill ok">Disponível</span></td>
                <td style={td()}>
                  <button className="btn sm"><Icon name="download" size={13} /> PDF</button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

function FeriasTab() {
  return (
    <div className="card" style={{ padding: 22 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Períodos aquisitivos</h3>
      {[
        { p: '01/06/2025 → 31/05/2026', s: 'Em aberto · 30 dias disponíveis', k: 'info' },
        { p: '01/06/2024 → 31/05/2025', s: 'Concedido · 15/09/2025 → 14/10/2025 (30d)', k: 'ok' },
        { p: '01/06/2023 → 31/05/2024', s: 'Concedido · 18/09/2024 → 17/10/2024 (30d)', k: 'ok' },
      ].map((p, i) => (
        <div
          key={i}
          className="row gap-3"
          style={{ padding: '12px 0', borderTop: i ? '1px solid var(--line-soft)' : 'none' }}
        >
          <Icon name="umbrella" size={18} style={{ color: 'var(--info)' }} />
          <div className="grow">
            <div style={{ fontSize: 13.5, fontWeight: 600 }} className="mono">
              {p.p}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{p.s}</div>
          </div>
          <span className={`pill ${p.k}`}>{p.k === 'ok' ? 'Quitado' : 'Em curso'}</span>
        </div>
      ))}
    </div>
  );
}

function HistoryTab({ emp }) {
  const admYear = emp?.admission ? emp.admission.slice(0, 4) : null;
  const events = admYear ? [
    { y: String(Number(admYear) + 2), t: 'Promoção (Pleno)', d: 'Progressão de carreira · Aumento salarial' },
    { y: String(Number(admYear) + 1), t: 'Conclusão de treinamento obrigatório', d: '40h · Certificado emitido' },
    { y: admYear, t: `Admissão — ${emp.company}`, d: `Cargo inicial: ${emp.role}`, k: 'ok' },
  ] : [];
  return (
    <div className="card" style={{ padding: 22 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>
        Linha do tempo profissional
      </h3>
      {events.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Sem histórico disponível.</div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 28 }}>
          <div
            style={{
              position: 'absolute',
              left: 11,
              top: 0,
              bottom: 0,
              width: 1.5,
              background: 'var(--line)',
            }}
          />
          {events.map((it, i) => (
            <div key={i} style={{ position: 'relative', paddingBottom: 18 }}>
              <div
                style={{
                  position: 'absolute',
                  left: -22,
                  top: 4,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: it.k === 'warn' ? 'var(--warn)' : it.k === 'ok' ? 'var(--ok)' : 'var(--brand)',
                  border: '3px solid var(--surface)',
                  boxShadow: '0 0 0 1px var(--line)',
                }}
              />
              <div className="row gap-2">
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{it.t}</div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{it.y}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{it.d}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
