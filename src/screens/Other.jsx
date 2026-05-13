import { useState, useEffect, Fragment, useMemo } from 'react';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import * as D from '../data/mock.js';
import { supabase } from '../lib/supabase.js';
import {
  createEmployee,
  useEmployees,
  useAllWarnings,
  createWarning,
  useAllVacations,
  updateVacationStatus,
  createDocuments,
  createVacation,
  useAllDocuments,
  useAllTimecards,
  useCompanies,
  createCompany,
  updateCompany,
  useAuditLog,
  logAudit,
  useCompanyUsers,
  updateUserCompany,
  usePendingInvitesByCompany,
  deleteInvite,
  findProfileByEmail,
  promoteUserToCompany,
  linkEmployeeUser,
  revokeUserCompany,
} from '../hooks/useEmployees.js';
import { MODULES, ROLES, ROLE_TEMPLATES, usePermissions } from '../lib/permissions.jsx';
import { SendInviteModal } from './Auth.jsx';

// ============================================================
// TIME TRACKING
// ============================================================
// PERMISSIONS
// ============================================================
const OWNER_ID = '__owner__';

export function PermissionsScreen({ addToast, embedded, activeCompany: propCompany }) {
  const { companies } = useCompanies();
  // Company can come from prop (Settings) or be picked inside the screen
  const [localCompanyId, setLocalCompanyId] = useState(propCompany?.id ?? null);
  const companyId = propCompany?.id ?? localCompanyId;
  const company = propCompany ?? companies.find(c => c.id === localCompanyId) ?? null;

  const { members, loading: membersLoading, refetch } = useCompanyUsers(companyId);
  const { invites, loading: invitesLoading, refetch: refetchInvites } = usePendingInvitesByCompany(companyId);

  const [activeId, setActiveId] = useState(null); // user_id or '__owner__' or invite id
  const [localGrants, setLocalGrants] = useState({});
  const [localRole, setLocalRole] = useState('Operacional');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [promoting, setPromoting] = useState(null);
  const [revoking, setRevoking] = useState(false);

  const { employees: companyEmployees } = useEmployees({ companyId });

  const selected = activeId && activeId !== OWNER_ID ? members.find(m => m.user_id === activeId) : null;
  const selectedInvite = activeId && !selected && activeId !== OWNER_ID ? invites.find(i => i.id === activeId) : null;

  useEffect(() => {
    if (selected) {
      setLocalGrants(selected.grants ?? {});
      setLocalRole(selected.role ?? 'Operacional');
    }
  }, [activeId, selected]);

  // Reset active selection when company changes
  useEffect(() => { setActiveId(null); }, [companyId]);

  const isOn = (module, perm) => {
    if (localRole === 'Administrador') return true;
    const key = `${module}.${perm}`;
    if (localGrants[key] !== undefined) return Boolean(localGrants[key]);
    const tpl = ROLE_TEMPLATES[localRole] ?? ROLE_TEMPLATES.Operacional;
    return tpl[key] ?? false;
  };

  const toggle = (module, perm) => {
    const key = `${module}.${perm}`;
    setLocalGrants(g => ({ ...g, [key]: !isOn(module, perm) }));
  };

  const applyTemplate = (role) => { setLocalRole(role); setLocalGrants({}); };

  const handleSave = async () => {
    if (!activeId || activeId === OWNER_ID || !companyId) return;
    setSaving(true);
    const { error } = await updateUserCompany(activeId, companyId, { role: localRole, grants: localGrants });
    setSaving(false);
    if (error) {
      addToast({ kind: 'warn', msg: 'Erro ao salvar: ' + error.message });
    } else {
      logAudit(companyId, 'EDITOU', `Permissões: ${selected?.profile?.name ?? activeId}`);
      addToast({ kind: 'ok', msg: 'Permissões salvas!' });
      refetch();
    }
  };

  const handleCancelInvite = async (inviteId) => {
    const { error } = await deleteInvite(inviteId);
    if (error) { addToast({ kind: 'warn', msg: 'Erro ao cancelar convite' }); return; }
    addToast({ kind: 'ok', msg: 'Convite cancelado' });
    logAudit(companyId, 'EXCLUIU', `Convite: ${selectedInvite?.email}`);
    setActiveId(null);
    refetchInvites();
  };

  const handleRevoke = async () => {
    if (!selected || !companyId) return;
    setRevoking(true);
    const { error } = await revokeUserCompany(selected.user_id, companyId);
    setRevoking(false);
    if (error) { addToast({ kind: 'warn', msg: 'Erro ao revogar acesso: ' + error.message }); return; }
    logAudit(companyId, 'EXCLUIU', `Acesso revogado: ${selected.profile?.name ?? selected.user_id}`);
    addToast({ kind: 'ok', msg: `Acesso de ${selected.profile?.name ?? 'usuário'} revogado.` });
    setActiveId(null);
    refetch();
  };

  const q = search.toLowerCase();
  const filteredMembers = members.filter(m =>
    !q || (m.profile?.name ?? '').toLowerCase().includes(q) || (m.profile?.email ?? '').toLowerCase().includes(q)
  );
  const filteredInvites = invites.filter(i => !i.accepted_at && (!q || i.email.toLowerCase().includes(q)));

  // Employees without system access yet (not in members, not in pending invites)
  const memberEmails = new Set([
    ...members.map(m => m.profile?.email).filter(Boolean),
    ...invites.filter(i => !i.accepted_at).map(i => i.email),
  ]);
  const employeesWithoutAccess = (companyEmployees ?? []).filter(e =>
    e.email_personal && !memberEmails.has(e.email_personal) &&
    (!q || e.name.toLowerCase().includes(q) || e.email_personal.toLowerCase().includes(q))
  );

  const handleGiveAccess = async (emp) => {
    if (!companyId || promoting) return;
    setPromoting(emp.id);
    const profile = await findProfileByEmail(emp.email_personal);
    setPromoting(null);
    if (profile) {
      // Já tem conta — promove direto, sem convite
      const { error } = await promoteUserToCompany(profile.id, companyId);
      if (error) { addToast({ kind: 'warn', msg: 'Erro ao promover: ' + error.message }); return; }
      await linkEmployeeUser(emp.id, profile.id);
      logAudit(companyId, 'CRIOU', `Acesso direto: ${emp.name}`);
      addToast({ kind: 'ok', msg: `${emp.name} adicionado com sucesso!` });
      refetch();
    } else {
      // Sem conta — abre convite pré-preenchido
      setInviteEmail(emp.email_personal);
      setShowInviteModal(true);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className={embedded ? '' : 'fade-up'} style={{ padding: embedded ? 0 : 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!embedded && (
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="grow">
            <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Permissões granulares</h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Configure exatamente o que cada usuário pode acessar — por empresa.</p>
          </div>
          {selected && (
            <button className="btn primary" disabled={saving} onClick={handleSave}>
              <Icon name="check" size={14} /> {saving ? 'Salvando…' : 'Salvar alterações'}
            </button>
          )}
        </div>
      )}

      {/* Seletor de empresa interno (só quando não vem de prop) */}
      {!propCompany && (
        <div className="card" style={{ padding: '12px 16px' }}>
          <div className="row gap-3" style={{ alignItems: 'center' }}>
            <Icon name="building" size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>Empresa:</span>
            <select
              className="field"
              value={localCompanyId ?? ''}
              onChange={e => setLocalCompanyId(e.target.value || null)}
              style={{ flex: 1, maxWidth: 320 }}
            >
              <option value="">Selecione uma empresa…</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Aviso inline quando Settings e empresa não selecionada */}
      {!companyId ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
          <Icon name="building" size={28} style={{ marginBottom: 10, opacity: 0.35 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>Selecione uma empresa acima</div>
          <div style={{ fontSize: 12.5, marginTop: 6 }}>As permissões são individuais por empresa.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: 16 }}>

          {/* ── Coluna esquerda: lista de usuários ── */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
              <input className="field" placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)} style={{ height: 33, fontSize: 13 }} />
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {/* Linha do Dono — sempre fixa */}
              <button
                onClick={() => setActiveId(OWNER_ID)}
                style={{
                  width: '100%', textAlign: 'left', display: 'flex', gap: 10, alignItems: 'center',
                  padding: '11px 13px', border: 'none',
                  background: activeId === OWNER_ID ? 'var(--brand-tint)' : 'var(--surface-2)',
                  cursor: 'pointer', borderBottom: '1px solid var(--line)',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-700) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="shield" size={14} style={{ color: 'white' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: activeId === OWNER_ID ? 'var(--brand)' : 'var(--ink)' }}>Você (Dono)</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Acesso total a esta empresa</div>
                </div>
                <span className="pill ok" style={{ fontSize: 10 }}>admin</span>
              </button>

              {/* Usuários com acesso (convites aceitos) */}
              {membersLoading ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}><div className="pulse">Carregando…</div></div>
              ) : filteredMembers.length === 0 && filteredInvites.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 12.5 }}>
                  Nenhum usuário convidado ainda.
                </div>
              ) : (
                <>
                  {filteredMembers.map((m) => (
                    <button
                      key={m.user_id}
                      onClick={() => setActiveId(m.user_id)}
                      style={{
                        width: '100%', textAlign: 'left', display: 'flex', gap: 10, alignItems: 'center',
                        padding: '10px 13px', border: 'none',
                        background: m.user_id === activeId ? 'var(--brand-tint)' : 'transparent',
                        cursor: 'pointer', borderBottom: '1px solid var(--line-soft)',
                      }}
                    >
                      <Avatar name={m.profile?.name ?? '?'} size={30} hue={m.profile?.avatar_hue ?? 215} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: m.user_id === activeId ? 'var(--brand)' : 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.profile?.name ?? 'Usuário'}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.role} · {m.profile?.email ?? '—'}
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* Convites pendentes */}
                  {filteredInvites.length > 0 && (
                    <>
                      <div style={{ padding: '10px 13px 4px', fontSize: 10.5, fontWeight: 700, color: 'var(--muted-2)', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                        Aguardando aceite
                      </div>
                      {filteredInvites.map((inv) => (
                        <button
                          key={inv.id}
                          onClick={() => setActiveId(inv.id)}
                          style={{
                            width: '100%', textAlign: 'left', display: 'flex', gap: 10, alignItems: 'center',
                            padding: '10px 13px', border: 'none',
                            background: inv.id === activeId ? 'var(--brand-tint)' : 'transparent',
                            cursor: 'pointer', borderBottom: '1px solid var(--line-soft)',
                          }}
                        >
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-2)', border: '1.5px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon name="mail" size={13} style={{ color: 'var(--muted)' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 500, color: inv.id === activeId ? 'var(--brand)' : 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {inv.email}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{inv.role} · enviado {fmtDate(inv.created_at)}</div>
                          </div>
                          <span className="pill warn" style={{ fontSize: 10 }}>pendente</span>
                        </button>
                      ))}
                    </>
                  )}
                </>
              )}

              {/* Funcionários sem acesso ao sistema */}
              {employeesWithoutAccess.length > 0 && (
                <>
                  <div style={{ padding: '10px 13px 4px', fontSize: 10.5, fontWeight: 700, color: 'var(--muted-2)', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Funcionários sem acesso
                  </div>
                  {employeesWithoutAccess.map((emp) => (
                    <div
                      key={emp.id}
                      style={{
                        display: 'flex', gap: 10, alignItems: 'center',
                        padding: '9px 13px', borderBottom: '1px solid var(--line-soft)',
                      }}
                    >
                      <Avatar name={emp.name} size={30} hue={emp.hue ?? 215} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email_personal}</div>
                      </div>
                      <button
                        className="btn ghost sm"
                        style={{ flexShrink: 0, fontSize: 11, padding: '3px 8px' }}
                        disabled={promoting === emp.id}
                        onClick={() => handleGiveAccess(emp)}
                      >
                        {promoting === emp.id ? '…' : 'Dar acesso'}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Rodapé — botão de convidar */}
            <div style={{ padding: 10, borderTop: '1px solid var(--line)' }}>
              <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setInviteEmail(''); setShowInviteModal(true); }}>
                <Icon name="plus" size={14} /> Convidar usuário
              </button>
            </div>
          </div>

          {/* ── Coluna direita: painel de permissões ── */}
          {activeId === OWNER_ID ? (
            <div className="card" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-700) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="shield" size={24} style={{ color: 'white' }} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Acesso total</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, maxWidth: 340 }}>
                  Como dono desta empresa, você tem acesso irrestrito a todos os módulos e não precisa de permissões configuradas.
                </div>
              </div>
              <div style={{ padding: '10px 18px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--line)', fontSize: 12.5, color: 'var(--muted)', maxWidth: 360, lineHeight: 1.6 }}>
                Para conceder acesso a outras pessoas, use o botão <strong>Convidar usuário</strong> e configure as permissões delas individualmente.
              </div>
            </div>
          ) : selectedInvite ? (
            <div className="card" style={{ padding: 28 }}>
              <div className="row gap-3" style={{ marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-2)', border: '2px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="mail" size={18} style={{ color: 'var(--muted)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedInvite.email}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Convite pendente · {selectedInvite.role}</div>
                </div>
              </div>
              <div className="col gap-3" style={{ marginBottom: 24 }}>
                <div style={{ padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--line-soft)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>Enviado em</div>
                  <div style={{ fontSize: 13 }}>{fmtDate(selectedInvite.created_at)}</div>
                </div>
                <div style={{ padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--line-soft)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>Papel ao aceitar</div>
                  <div style={{ fontSize: 13 }}>{selectedInvite.role}</div>
                </div>
                <div style={{ padding: '12px 16px', background: 'var(--warn-tint, #FFF8E1)', borderRadius: 10, border: '1px solid var(--warn-line, #FFE08A)', fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.6 }}>
                  Aguardando o usuário aceitar o convite. Após aceitar, ele aparecerá na lista e você poderá configurar as permissões em detalhe.
                </div>
              </div>
              <button
                className="btn"
                style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }}
                onClick={() => handleCancelInvite(selectedInvite.id)}
              >
                <Icon name="x" size={14} /> Cancelar convite
              </button>
            </div>
          ) : selected ? (
            <div className="card" style={{ padding: 22 }}>
              <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{selected.profile?.name ?? 'Usuário'}</h3>
                    <span className="pill brand">{localRole}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                    <span>Template:</span>
                    {ROLES.map(r => (
                      <button key={r} onClick={() => applyTemplate(r)} className="btn ghost sm"
                        style={{ borderColor: localRole === r ? 'var(--brand)' : undefined, color: localRole === r ? 'var(--brand)' : undefined }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="btn primary sm" disabled={saving} onClick={handleSave}>
                  <Icon name="check" size={13} /> {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
              <div className="h-line" style={{ margin: '16px 0' }} />
              <div className="col gap-4" style={{ overflowY: 'auto', maxHeight: 480 }}>
                {MODULES.map((mod) => (
                  <div key={mod.module}>
                    <div className="row" style={{ marginBottom: 8 }}>
                      <h4 style={{ margin: 0, fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7, color: 'var(--muted)' }}>{mod.module}</h4>
                      <span className="grow" />
                      <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>
                        {mod.perms.filter(p => isOn(mod.module, p)).length}/{mod.perms.length} ativas
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 7 }}>
                      {mod.perms.map((p) => {
                        const on = isOn(mod.module, p);
                        return (
                          <button key={p} onClick={() => toggle(mod.module, p)} className="row gap-2"
                            style={{
                              padding: '9px 11px', borderRadius: 8,
                              border: `1px solid ${on ? 'var(--brand)' : 'var(--line)'}`,
                              background: on ? 'var(--brand-tint)' : 'var(--surface)',
                              color: on ? 'var(--brand)' : 'var(--ink-soft)',
                              cursor: 'pointer', fontSize: 12.5, fontWeight: 500,
                            }}
                          >
                            <div style={{ width: 28, height: 15, borderRadius: 8, background: on ? 'var(--brand)' : 'var(--line)', position: 'relative', flexShrink: 0, transition: 'background .15s' }}>
                              <div style={{ position: 'absolute', top: 1.5, left: on ? 14 : 1.5, width: 12, height: 12, borderRadius: '50%', background: 'white', transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
                            </div>
                            <span style={{ textTransform: 'capitalize' }}>{p}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-line" style={{ margin: '12px 0' }} />
              <button
                className="btn"
                style={{ color: 'var(--bad)', borderColor: 'var(--bad)', fontSize: 13 }}
                disabled={revoking}
                onClick={handleRevoke}
              >
                <Icon name="x" size={14} /> {revoking ? 'Revogando…' : 'Revogar acesso ao sistema'}
              </button>
            </div>
          ) : (
            <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Icon name="key" size={28} style={{ opacity: 0.35 }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>Selecione um usuário</div>
              <div style={{ fontSize: 12.5, maxWidth: 280, lineHeight: 1.6 }}>Clique em um usuário à esquerda para configurar suas permissões nesta empresa.</div>
            </div>
          )}
        </div>
      )}

      {showInviteModal && (
        <SendInviteModal
          onClose={() => { setShowInviteModal(false); setInviteEmail(''); refetchInvites(); }}
          addToast={addToast}
          initialEmail={inviteEmail}
          initialCompanyId={companyId}
        />
      )}
    </div>
  );
}

// ============================================================
// AUDIT
// ============================================================
const ACTION_COLOR = {
  EDITOU: 'info', UPLOAD: 'info', ACESSOU: '', GEROU: 'ok',
  EXPORT: 'warn', LOGIN: '', EXCLUIU: 'bad', ASSINOU: 'ok', CRIOU: 'ok',
};
const DAYS_OPTIONS = [
  { label: 'Hoje',         value: 1 },
  { label: 'Últimos 7 dias', value: 7 },
  { label: '30 dias',      value: 30 },
  { label: 'Trimestre',    value: 90 },
];

export function AuditScreen({ activeCompany }) {
  const [days, setDays] = useState(30);
  const [q, setQ]       = useState('');
  const { logs, loading, refetch } = useAuditLog({ companyId: activeCompany?.id, days });

  const today = new Date().toDateString();
  const filtered = q
    ? logs.filter(l => [l.who, l.action, l.target].join(' ').toLowerCase().includes(q.toLowerCase()))
    : logs;

  const todayCount   = logs.filter(l => new Date(l.created_at).toDateString() === today).length;
  const uniqueActors = new Set(logs.map(l => l.who)).size;
  const exportCount  = logs.filter(l => l.action === 'EXPORT').length;
  const deleteCount  = logs.filter(l => l.action === 'EXCLUIU').length;

  const kpis = [
    { l: 'Eventos no período', v: logs.length,    k: '' },
    { l: 'Eventos hoje',       v: todayCount,      k: '' },
    { l: 'Atores únicos',      v: uniqueActors,    k: '' },
    { l: 'Exportações',        v: exportCount,     k: exportCount > 0 ? 'warn' : '' },
    { l: 'Exclusões',          v: deleteCount,     k: deleteCount > 0 ? 'bad'  : '' },
  ];

  return (
    <div className="fade-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="grow">
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
            Auditoria
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Trilha completa de acessos, edições e exportações — imutável.
          </p>
        </div>
        <div className="row gap-2">
          <input
            className="field"
            style={{ width: 200, height: 36 }}
            placeholder="Buscar por usuário, ação…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <select
            className="field"
            style={{ width: 160, height: 36 }}
            value={days}
            onChange={e => { setDays(Number(e.target.value)); }}
          >
            {DAYS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button className="btn" onClick={refetch}>
            <Icon name="refresh" size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {kpis.map((s, i) => (
          <div key={i} className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>
              {s.l}
            </div>
            <div className="row" style={{ marginTop: 6, alignItems: 'baseline', gap: 8 }}>
              <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>
                {loading ? '—' : s.v}
              </div>
              {s.k && <span className={`pill ${s.k}`} style={{ fontSize: 10 }}>•</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            {q ? 'Nenhum evento encontrado para essa busca.' : 'Nenhum evento de auditoria no período.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, whiteSpace: 'nowrap' }}>Quando</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Quem</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Ação</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Alvo</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>IP</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Dispositivo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={l.id} style={{ borderTop: '1px solid var(--line-soft)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap', color: 'var(--muted)' }}>
                      {new Date(l.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div className="row gap-2">
                        <Avatar name={l.who || '?'} size={26} hue={i * 60 + 30} />
                        <span style={{ fontWeight: 500 }}>{l.who || '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span className={`pill ${ACTION_COLOR[l.action] || ''}`} style={{ fontFamily: 'monospace', fontSize: 10.5 }}>
                        {l.action}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--ink-soft)' }}>{l.target || '—'}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12 }}>
                      <span style={{ color: 'var(--muted)' }}>{l.ip || '—'}</span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>{l.device || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ============================================================
// REPORTS
// ============================================================

const REPORT_CATALOG = [
  {
    group: 'Pessoas',
    color: 'var(--brand)',
    items: [
      {
        id: 'headcount',
        label: 'Headcount ativo',
        icon: 'users',
        desc: 'Lista completa de colaboradores com cargo, departamento e data de admissão.',
        filters: ['empresa', 'departamento', 'status', 'admissao'],
        columns: ['Nome', 'Cargo', 'Departamento', 'Empresa', 'Status', 'Admissão'],
      },
      {
        id: 'turnover',
        label: 'Desligamentos',
        icon: 'logout',
        desc: 'Colaboradores desligados no período, com motivo e data efetiva.',
        filters: ['periodo', 'empresa', 'departamento'],
        columns: ['Nome', 'Cargo', 'Departamento', 'Desligamento', 'Status'],
      },
      {
        id: 'afastados',
        label: 'Afastamentos',
        icon: 'alert',
        desc: 'Colaboradores afastados por tipo de licença e prazo de retorno.',
        filters: ['periodo', 'empresa', 'departamento'],
        columns: ['Nome', 'Cargo', 'Departamento', 'Status', 'Admissão'],
      },
    ],
  },
  {
    group: 'Ponto',
    color: 'var(--info)',
    items: [
      {
        id: 'espelho',
        label: 'Espelho de ponto',
        icon: 'clock',
        desc: 'Jornada diária consolidada por colaborador com horas trabalhadas, faltas e atrasos.',
        filters: ['periodo', 'empresa', 'departamento', 'funcionario'],
        columns: ['Funcionário', 'Mês/Ano', 'Horas trabalhadas', 'Faltas', 'Banco de horas'],
      },
      {
        id: 'faltas',
        label: 'Faltas e atrasos',
        icon: 'alert',
        desc: 'Ocorrências de falta e atraso agrupadas por colaborador no período.',
        filters: ['periodo', 'empresa', 'departamento'],
        columns: ['Funcionário', 'Mês/Ano', 'Horas trabalhadas', 'Faltas', 'Banco de horas'],
      },
    ],
  },
  {
    group: 'RH',
    color: '#7c3aed',
    items: [
      {
        id: 'ferias',
        label: 'Programação de férias',
        icon: 'umbrella',
        desc: 'Períodos aquisitivos, datas concedidas e status de aprovação.',
        filters: ['periodo', 'empresa', 'departamento', 'status_ferias'],
        columns: ['Funcionário', 'Departamento', 'Período início', 'Período fim', 'Dias', 'Status'],
      },
      {
        id: 'advertencias',
        label: 'Advertências',
        icon: 'shield',
        desc: 'Ocorrências disciplinares registradas por tipo e severidade.',
        filters: ['periodo', 'empresa', 'departamento', 'severidade'],
        columns: ['Funcionário', 'Departamento', 'Tipo', 'Severidade', 'Data', 'Aplicado por'],
      },
    ],
  },
  {
    group: 'Documentos',
    color: 'var(--warn)',
    items: [
      {
        id: 'documentos',
        label: 'Documentos por categoria',
        icon: 'folder',
        desc: 'Arquivos cadastrados agrupados por categoria e colaborador.',
        filters: ['periodo', 'categoria_doc', 'empresa'],
        columns: ['Arquivo', 'Categoria', 'Funcionário', 'Tipo', 'Data upload'],
      },
    ],
  },
  {
    group: 'Financeiro',
    color: 'var(--ok)',
    items: [
      {
        id: 'folha',
        label: 'Folha consolidada',
        icon: 'chart',
        desc: 'Resumo de salários por departamento e centro de custo.',
        filters: ['empresa', 'departamento'],
        columns: ['Nome', 'Cargo', 'Departamento', 'Empresa', 'Status', 'Admissão'],
      },
    ],
  },
];

const ALL_REPORTS = REPORT_CATALOG.flatMap(g => g.items.map(r => ({ ...r, group: g.group, color: g.color })));

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
}

function ReportFilters({ report, filters, setFilters, employees, depts, companies }) {
  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const has = (f) => report.filters.includes(f);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {has('periodo') && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>
            Período
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input type="date" className="field" value={filters.inicio || ''} onChange={e => set('inicio', e.target.value)} />
            <input type="date" className="field" value={filters.fim || ''} onChange={e => set('fim', e.target.value)} />
          </div>
        </div>
      )}

      {has('admissao') && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>
            Admissão (intervalo)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input type="date" className="field" value={filters.admissao_ini || ''} onChange={e => set('admissao_ini', e.target.value)} />
            <input type="date" className="field" value={filters.admissao_fim || ''} onChange={e => set('admissao_fim', e.target.value)} />
          </div>
        </div>
      )}

      {has('empresa') && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>
            Empresa
          </label>
          <select className="field" value={filters.empresa || ''} onChange={e => set('empresa', e.target.value)}>
            <option value="">Todas</option>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {has('departamento') && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>
            Departamento
          </label>
          <select className="field" value={filters.departamento || ''} onChange={e => set('departamento', e.target.value)}>
            <option value="">Todos</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      )}

      {has('status') && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>
            Status
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[['', 'Todos'], ['ativo', 'Ativo'], ['férias', 'Férias'], ['afastado', 'Afastado'], ['desligado', 'Desligado']].map(([v, l]) => (
              <button key={v} onClick={() => set('status', v)} style={{
                padding: '5px 12px', borderRadius: 20, border: '1px solid', fontSize: 12.5, cursor: 'pointer',
                borderColor: (filters.status || '') === v ? 'var(--brand)' : 'var(--line)',
                background: (filters.status || '') === v ? 'var(--brand-tint)' : 'var(--surface-2)',
                color: (filters.status || '') === v ? 'var(--brand)' : 'var(--muted)',
                fontWeight: (filters.status || '') === v ? 700 : 400,
              }}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {has('funcionario') && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>
            Funcionário
          </label>
          <select className="field" value={filters.funcionario || ''} onChange={e => set('funcionario', e.target.value)}>
            <option value="">Todos</option>
            {employees.filter(e => e.status === 'ativo').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      )}

      {has('status_ferias') && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>
            Status das férias
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[['', 'Todos'], ['agendado', 'Agendado'], ['em_aberto', 'Em curso'], ['concedido', 'Quitado']].map(([v, l]) => (
              <button key={v} onClick={() => set('status_ferias', v)} style={{
                padding: '5px 12px', borderRadius: 20, border: '1px solid', fontSize: 12.5, cursor: 'pointer',
                borderColor: (filters.status_ferias || '') === v ? 'var(--brand)' : 'var(--line)',
                background: (filters.status_ferias || '') === v ? 'var(--brand-tint)' : 'var(--surface-2)',
                color: (filters.status_ferias || '') === v ? 'var(--brand)' : 'var(--muted)',
                fontWeight: (filters.status_ferias || '') === v ? 700 : 400,
              }}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {has('severidade') && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>
            Severidade
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[['', 'Todas'], ['verbal', 'Verbal'], ['escrita', 'Escrita'], ['suspensao', 'Suspensão']].map(([v, l]) => (
              <button key={v} onClick={() => set('severidade', v)} style={{
                padding: '5px 12px', borderRadius: 20, border: '1px solid', fontSize: 12.5, cursor: 'pointer',
                borderColor: (filters.severidade || '') === v ? 'var(--brand)' : 'var(--line)',
                background: (filters.severidade || '') === v ? 'var(--brand-tint)' : 'var(--surface-2)',
                color: (filters.severidade || '') === v ? 'var(--brand)' : 'var(--muted)',
                fontWeight: (filters.severidade || '') === v ? 700 : 400,
              }}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {has('categoria_doc') && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>
            Categoria
          </label>
          <select className="field" value={filters.categoria_doc || ''} onChange={e => set('categoria_doc', e.target.value)}>
            <option value="">Todas</option>
            {['Admissão','Contratos','Holerites','Atestados','Treinamentos','Rescisão','Férias'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

function useReportData(reportId, filters, employees, warnings, vacations, documents, timecards) {
  return useMemo(() => {
    const inPeriod = (dateStr) => {
      if (!dateStr) return true;
      const d = new Date(dateStr + 'T00:00:00');
      if (filters.inicio && d < new Date(filters.inicio)) return false;
      if (filters.fim && d > new Date(filters.fim + 'T23:59:59')) return false;
      return true;
    };

    const filterEmp = (e) => {
      if (filters.empresa && e.company !== filters.empresa) return false;
      if (filters.departamento && e.dept !== filters.departamento) return false;
      if (filters.status && e.status !== filters.status) return false;
      if (filters.admissao_ini && e.admission && e.admission < filters.admissao_ini) return false;
      if (filters.admissao_fim && e.admission && e.admission > filters.admissao_fim) return false;
      return true;
    };

    switch (reportId) {
      case 'headcount':
        return employees.filter(e => e.status !== 'desligado' && filterEmp(e)).map(e => ({
          cells: [e.name, e.role||'—', e.dept||'—', e.company||'—', e.status, fmtDate(e.admission)],
        }));

      case 'turnover':
        return employees.filter(e => e.status === 'desligado' && filterEmp(e)).map(e => ({
          cells: [e.name, e.role||'—', e.dept||'—', fmtDate(e.admission), e.status],
        }));

      case 'afastados':
        return employees.filter(e => e.status === 'afastado' && filterEmp(e)).map(e => ({
          cells: [e.name, e.role||'—', e.dept||'—', e.status, fmtDate(e.admission)],
        }));

      case 'espelho':
      case 'faltas': {
        let tcs = timecards;
        if (filters.funcionario) tcs = tcs.filter(tc => tc.employee_id === filters.funcionario);
        if (filters.inicio || filters.fim) {
          tcs = tcs.filter(tc => {
            const d = tc.month_year ? tc.month_year + '-01' : null;
            return inPeriod(d);
          });
        }
        return tcs.map(tc => {
          const emp = employees.find(e => e.id === tc.employee_id);
          if (filters.empresa && emp?.company !== filters.empresa) return null;
          if (filters.departamento && emp?.dept !== filters.departamento) return null;
          return {
            cells: [emp?.name||'—', tc.month_year||'—', tc.worked_hours||'—', String(tc.absences||0), tc.overtime||'—'],
          };
        }).filter(Boolean);
      }

      case 'ferias':
        return vacations.filter(v => {
          if (filters.status_ferias && v.status !== filters.status_ferias) return false;
          if (!inPeriod(v.period_start)) return false;
          const emp = employees.find(e => e.id === v.employee_id);
          if (filters.empresa && emp?.company !== filters.empresa) return false;
          if (filters.departamento && emp?.dept !== filters.departamento) return false;
          return true;
        }).map(v => {
          const emp = employees.find(e => e.id === v.employee_id);
          const statusLabel = { concedido: 'Quitado', em_aberto: 'Em curso', agendado: 'Agendado', pendente: 'Pendente' };
          return {
            cells: [emp?.name||'—', emp?.dept||'—', fmtDate(v.period_start), fmtDate(v.period_end), String(v.days||0), statusLabel[v.status]||v.status],
          };
        });

      case 'advertencias':
        return warnings.filter(w => {
          if (filters.severidade && w.severity !== filters.severidade) return false;
          if (!inPeriod(w.date)) return false;
          const emp = employees.find(e => e.id === w.employee_id);
          if (filters.empresa && emp?.company !== filters.empresa) return false;
          if (filters.departamento && emp?.dept !== filters.departamento) return false;
          return true;
        }).map(w => {
          const emp = employees.find(e => e.id === w.employee_id);
          const sevLabel = { verbal: 'Verbal', escrita: 'Escrita', suspensao: 'Suspensão' };
          return {
            cells: [emp?.name||'—', emp?.dept||'—', w.type||'—', sevLabel[w.severity]||'—', fmtDate(w.date), w.applied_by||'—'],
          };
        });

      case 'documentos':
        return documents.filter(doc => {
          if (filters.categoria_doc && doc.category !== filters.categoria_doc) return false;
          if (!inPeriod(doc.created_at?.slice(0,10))) return false;
          const emp = employees.find(e => e.id === doc.employee_id);
          if (filters.empresa && emp?.company !== filters.empresa) return false;
          return true;
        }).map(doc => {
          const emp = employees.find(e => e.id === doc.employee_id);
          return {
            cells: [doc.name||'—', doc.category||'—', emp?.name||'—', (doc.type||'').toUpperCase(), doc.created_at ? new Date(doc.created_at).toLocaleDateString('pt-BR') : '—'],
          };
        });

      case 'folha':
        return employees.filter(e => e.salary && filterEmp(e)).map(e => ({
          cells: [e.name, e.role||'—', e.dept||'—', e.company||'—', e.status, fmtDate(e.admission)],
          highlight: !e.salary,
        }));

      default:
        return [];
    }
  }, [reportId, filters, employees, warnings, vacations, documents, timecards]);
}

function FilterModal({ report, filters, setFilters, employees, depts, companies, onClose, onClear }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 40px rgba(0,0,0,.18)', border: '1px solid var(--line)',
          width: '100%', maxWidth: 400,
          display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100dvh - 32px)',
        }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0, padding: '16px 20px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="filter" size={15} style={{ color: 'var(--brand)' }} />
          <span style={{ fontSize: 14.5, fontWeight: 700, flex: 1 }}>Filtros</span>
          <span style={{ fontSize: 11.5, color: 'var(--muted)', flex: 1 }}>
            {report.label}
          </span>
          <button className="btn ghost icon sm" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '18px 20px' }}>
          <ReportFilters
            report={report}
            filters={filters}
            setFilters={setFilters}
            employees={employees}
            depts={depts}
            companies={companies}
          />
        </div>

        {/* Footer */}
        <div style={{
          flexShrink: 0, padding: '12px 20px',
          borderTop: '1px solid var(--line)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button className="btn ghost sm" onClick={onClear}>Limpar filtros</button>
          <button className="btn primary sm" onClick={onClose}>Aplicar</button>
        </div>
      </div>
    </div>
  );
}

export function ReportsScreen({ addToast, activeCompany }) {
  const [selectedId, setSelectedId]     = useState('headcount');
  const [filters, setFilters]           = useState({});
  const [history, setHistory]           = useState([]);
  const [catalogOpen, setCatalogOpen]   = useState(true);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const { employees, loading: empLoading } = useEmployees({ companyId: activeCompany?.id });
  const { warnings,  loading: warnLoading } = useAllWarnings(activeCompany?.id);
  const { vacations, loading: vacLoading  } = useAllVacations(activeCompany?.id);
  const { documents, loading: docLoading  } = useAllDocuments(activeCompany?.id);
  const { timecards, loading: tcLoading   } = useAllTimecards(activeCompany?.id);

  const loading = empLoading || warnLoading || vacLoading || docLoading || tcLoading;
  const selected = ALL_REPORTS.find(r => r.id === selectedId);

  const depts     = useMemo(() => [...new Set(employees.map(e => e.dept).filter(Boolean))].sort(), [employees]);
  const companies = useMemo(() => [...new Set(employees.map(e => e.company).filter(Boolean))].sort(), [employees]);
  const rows      = useReportData(selectedId, filters, employees, warnings, vacations, documents, timecards);

  const handleExport = (format) => {
    setHistory(h => [{
      id: Date.now(), report: selected.label, format, rows: rows.length,
      at: new Date().toLocaleString('pt-BR'),
    }, ...h].slice(0, 8));
    addToast({ kind: 'ok', msg: `${selected.label} exportado como ${format} (${rows.length} registros)` });
  };

  const selectReport = (id) => { setSelectedId(id); setFilters({}); };
  const activeFiltersCount = Object.values(filters).filter(v => v).length;

  return (
    <>
    <div className="fade-up" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Catálogo (toggle) ── */}
      {catalogOpen && (
        <div style={{
          width: 220, flexShrink: 0,
          borderRight: '1px solid var(--line)',
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '14px 10px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, flex: 1, padding: '0 4px' }}>
              Relatórios
            </span>
            <button className="btn ghost icon sm" onClick={() => setCatalogOpen(false)} title="Recolher">
              <Icon name="panel-left" size={14} />
            </button>
          </div>
          {REPORT_CATALOG.map(group => (
            <div key={group.group}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: 1, padding: '10px 14px 4px' }}>
                {group.group}
              </div>
              {group.items.map(r => {
                const active = r.id === selectedId;
                return (
                  <button key={r.id} onClick={() => selectReport(r.id)} title={r.label} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 7, border: 'none', margin: '1px 4px', width: 'calc(100% - 8px)',
                    background: active ? 'var(--brand-tint)' : 'transparent',
                    color: active ? 'var(--brand)' : 'var(--ink-soft)',
                    fontWeight: active ? 600 : 400, fontSize: 13, cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--hover)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                    <Icon name={r.icon} size={14} style={{ color: active ? 'var(--brand)' : group.color, flexShrink: 0 }} />
                    <span style={{ lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── Área principal ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Barra de topo do relatório */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

            {/* Botão reabrir catálogo */}
            {!catalogOpen && (
              <button className="btn ghost icon sm" onClick={() => setCatalogOpen(true)} title="Abrir catálogo">
                <Icon name="panel-left" size={14} />
              </button>
            )}

            {/* Info do relatório */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                  {selected?.group} /
                </span>
                <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: -0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selected?.label}
                </h1>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected?.desc}
              </p>
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
              <button
                className="btn sm"
                onClick={() => setFilterModalOpen(true)}
                style={{ position: 'relative' }}
              >
                <Icon name="filter" size={13} />
                Filtros
                {activeFiltersCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    background: 'var(--brand)', color: '#fff',
                    fontSize: 9, fontWeight: 700, borderRadius: 10,
                    padding: '1px 5px', lineHeight: 1.4,
                  }}>{activeFiltersCount}</span>
                )}
              </button>
              {activeFiltersCount > 0 && (
                <button className="btn sm ghost" onClick={() => setFilters({})}>
                  Limpar filtros
                </button>
              )}
              {rows.length > 0 && (
                <>
                  <button className="btn sm" onClick={() => handleExport('XLSX')}>
                    <Icon name="download" size={13} /> XLSX
                  </button>
                  <button className="btn sm" onClick={() => handleExport('CSV')}>
                    <Icon name="download" size={13} /> CSV
                  </button>
                  <button className="btn sm primary" onClick={() => handleExport('PDF')}>
                    <Icon name="pdf" size={13} /> PDF
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Histórico inline (compacto) */}
          {history.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: 0.6, flexShrink: 0 }}>
                Recentes:
              </span>
              {history.slice(0, 5).map(h => (
                <span key={h.id} className="pill" style={{ fontSize: 10.5, gap: 4 }}>
                  <Icon name="download" size={9} />
                  {h.report} · {h.format} · {h.rows}reg
                </span>
              ))}
              <button className="btn ghost sm icon" onClick={() => setHistory([])}>
                <Icon name="x" size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Corpo: tabela */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

          {/* Tabela de dados */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

            {/* Barra de resultado */}
            <div style={{
              padding: '10px 16px', borderBottom: '1px solid var(--line)',
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--surface-2)',
            }}>
              {loading ? (
                <span className="pulse" style={{ fontSize: 12.5, color: 'var(--muted)' }}>Carregando dados…</span>
              ) : (
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                  <strong style={{ color: 'var(--ink)' }}>{rows.length}</strong> registro{rows.length !== 1 ? 's' : ''}
                  {activeFiltersCount > 0 && (
                    <span> · {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''} ativo{activeFiltersCount !== 1 ? 's' : ''}</span>
                  )}
                </span>
              )}
            </div>

            {/* Dados */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0 }}>
              {loading ? (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  <div className="pulse">Carregando…</div>
                </div>
              ) : rows.length === 0 ? (
                <div style={{ padding: 64, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  <Icon name="folder" size={32} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
                  Nenhum registro encontrado com os filtros aplicados.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 480 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                      <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600, width: 36, color: 'var(--muted-2)' }}>#</th>
                      {selected.columns.map(col => (
                        <th key={col} style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '9px 14px', color: 'var(--muted-2)', fontSize: 11, fontFamily: 'monospace' }}>{i + 1}</td>
                        {row.cells.map((cell, ci) => (
                          <td key={ci} style={{ padding: '9px 14px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ci === 0
                              ? <span style={{ fontWeight: 600 }}>{cell}</span>
                              : <span style={{ color: 'var(--ink-soft)' }}>{cell}</span>
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    {filterModalOpen && (
      <FilterModal
        report={selected}
        filters={filters}
        setFilters={setFilters}
        employees={employees}
        depts={depts}
        companies={companies}
        onClose={() => setFilterModalOpen(false)}
        onClear={() => { setFilters({}); }}
      />
    )}
    </>
  );
}

// ============================================================
// NEW EMPLOYEE
// ============================================================
export function NewEmployee({ setRoute, addToast }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const steps = ['Dados pessoais', 'Endereço', 'Vínculo', 'Documentos'];

  // Form state
  const [form, setForm] = useState({
    name: '', social_name: '', birth_date: '', cpf: '', rg: '', civil_status: 'Solteiro(a)', email_personal: '', phone: '',
    address: '', zip_code: '', neighborhood: '', city: '', state: 'SP',
    role: '', dept: 'RH', company: 'Orion Matriz', contract: 'CLT', admission: '', salary: '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Documents state
  const [docs, setDocs] = useState([]);

  return (
    <div
      className="fade-up"
      style={{
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        maxWidth: 920,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <div>
        <button
          onClick={() => setRoute('employees')}
          className="btn ghost sm"
          style={{ marginBottom: 8 }}
        >
          <Icon name="chevron-left" size={13} /> Voltar
        </button>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
          Cadastrar funcionário
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          Preencha em 4 etapas. Os documentos podem ser enviados depois pelo perfil.
        </p>
      </div>

      {/* Stepper */}
      <div
        className="row"
        style={{
          gap: 0,
          padding: '16px 20px',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 12,
        }}
      >
        {steps.map((s, i) => (
          <Fragment key={i}>
            <div className="row gap-3" style={{ flex: 1 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: i <= step ? 'var(--brand)' : 'var(--surface-2)',
                  border: i <= step ? 'none' : '1px solid var(--line)',
                  color: i <= step ? 'white' : 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {i < step ? <Icon name="check" size={14} /> : i + 1}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: i === step ? 600 : 500,
                    color: i <= step ? 'var(--ink)' : 'var(--muted)',
                  }}
                >
                  {s}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted-2)' }}>
                  {i < step ? 'concluído' : i === step ? 'em andamento' : 'pendente'}
                </div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: i < step ? 'var(--brand)' : 'var(--line)',
                  margin: '0 8px',
                  maxWidth: 60,
                }}
              />
            )}
          </Fragment>
        ))}
      </div>

      <div className="card" style={{ padding: 24 }}>
        {step === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label">Nome completo *</label>
              <input className="field" placeholder="Nome completo" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Nome social</label>
              <input className="field" placeholder="Opcional" value={form.social_name} onChange={(e) => set('social_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Data de nascimento</label>
              <input className="field" type="date" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} />
            </div>
            <div>
              <label className="label">CPF</label>
              <input className="field" placeholder="000.000.000-00" value={form.cpf} onChange={(e) => set('cpf', e.target.value)} />
            </div>
            <div>
              <label className="label">RG</label>
              <input className="field" placeholder="00.000.000-X" value={form.rg} onChange={(e) => set('rg', e.target.value)} />
            </div>
            <div>
              <label className="label">Estado civil</label>
              <select className="field" value={form.civil_status} onChange={(e) => set('civil_status', e.target.value)}>
                <option>Solteiro(a)</option>
                <option>Casado(a)</option>
                <option>Divorciado(a)</option>
              </select>
            </div>
            <div>
              <label className="label">E-mail pessoal</label>
              <input className="field" type="email" value={form.email_personal} onChange={(e) => set('email_personal', e.target.value)} />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="field" placeholder="+55 11 9 0000-0000" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
          </div>
        )}
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="label">Logradouro</label>
              <input className="field" placeholder="Rua, número e complemento" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div>
              <label className="label">CEP</label>
              <input className="field" placeholder="00000-000" value={form.zip_code} onChange={(e) => set('zip_code', e.target.value)} />
            </div>
            <div>
              <label className="label">Bairro</label>
              <input className="field" value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} />
            </div>
            <div>
              <label className="label">Cidade</label>
              <input className="field" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div>
              <label className="label">UF</label>
              <select className="field" value={form.state} onChange={(e) => set('state', e.target.value)}>
                <option>SP</option>
                <option>RJ</option>
                <option>MG</option>
              </select>
            </div>
          </div>
        )}
        {step === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label">Cargo *</label>
              <input className="field" value={form.role} onChange={(e) => set('role', e.target.value)} />
            </div>
            <div>
              <label className="label">Departamento</label>
              <select className="field" value={form.dept} onChange={(e) => set('dept', e.target.value)}>
                <option>RH</option>
                <option>Financeiro</option>
                <option>Operações</option>
                <option>Tecnologia</option>
                <option>Comercial</option>
                <option>Logística</option>
                <option>Marketing</option>
                <option>Jurídico</option>
                <option>Administrativo</option>
              </select>
            </div>
            <div>
              <label className="label">Empresa</label>
              <select className="field" value={form.company} onChange={(e) => set('company', e.target.value)}>
                <option>Orion Matriz</option>
                <option>Orion Filial SP</option>
                <option>Orion Filial RJ</option>
                <option>Orion Filial MG</option>
              </select>
            </div>
            <div>
              <label className="label">Tipo de contrato</label>
              <select className="field" value={form.contract} onChange={(e) => set('contract', e.target.value)}>
                <option>CLT</option>
                <option>PJ</option>
                <option>Estagiário</option>
              </select>
            </div>
            <div>
              <label className="label">Data de admissão</label>
              <input className="field" type="date" value={form.admission} onChange={(e) => set('admission', e.target.value)} />
            </div>
            <div>
              <label className="label">Salário base</label>
              <input className="field" placeholder="R$ 0,00" value={form.salary} onChange={(e) => set('salary', e.target.value)} />
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="col gap-3">
            <label
              style={{
                padding: 24,
                border: '1.5px dashed var(--line)',
                borderRadius: 12,
                background: 'var(--surface-2)',
                textAlign: 'center',
                cursor: 'pointer',
                display: 'block'
              }}
            >
              <input 
                type="file" 
                multiple 
                style={{ display: 'none' }} 
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  const newDocs = files.map(f => ({
                    name: f.name,
                    category: 'Geral',
                    size: Math.round(f.size / 1024) + ' KB',
                    type: f.name.split('.').pop()
                  }));
                  setDocs([...docs, ...newDocs]);
                }}
              />
              <Icon name="upload" size={28} style={{ color: 'var(--brand)' }} />
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>
                Clique para selecionar os documentos
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                RG, CPF, comprovante de residência, contrato assinado
              </div>
              <div className="btn primary" style={{ marginTop: 14, display: 'inline-flex' }}>
                <Icon name="folder" size={14} /> Selecionar arquivos
              </div>
            </label>
            {docs.map((d, i) => (
              <div
                key={i}
                className="row gap-3"
                style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 8 }}
              >
                <Icon
                  name={d.name.endsWith('.pdf') ? 'pdf' : 'image'}
                  size={18}
                  style={{ color: 'var(--brand)' }}
                />
                <div className="grow">
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }} className="mono">
                    {d.size} · pronto para envio
                  </div>
                </div>
                <button className="btn sm ghost icon" onClick={() => setDocs(docs.filter((_, idx) => idx !== i))}>
                  <Icon name="trash" size={13} style={{ color: 'var(--bad)' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="row gap-2">
        <button
          className="btn"
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
          style={{ opacity: step === 0 ? 0.5 : 1 }}
        >
          <Icon name="chevron-left" size={14} /> Voltar
        </button>
        <span className="grow" />
        <button className="btn ghost">Salvar como rascunho</button>
        {step < steps.length - 1 ? (
          <button className="btn primary" onClick={() => setStep(step + 1)}>
            Próxima etapa <Icon name="chevron-right" size={14} />
          </button>
        ) : (
          <button
            className="btn primary"
            disabled={saving}
            onClick={async () => {
              if (!form.name || !form.role) {
                addToast({ kind: 'warn', msg: 'Preencha pelo menos nome e cargo.' });
                return;
              }
              setSaving(true);
              const { created, error } = await createEmployee({
                name: form.name,
                role: form.role,
                dept: form.dept,
                company: form.company,
                status: 'ativo',
                admission: form.admission || null,
                contract: form.contract || null,
                salary: form.salary ? parseFloat(form.salary.replace(/[R$\s.]/g, '').replace(',', '.')) : null,
                phone: form.phone || null,
                email_personal: form.email_personal || null,
                birth_date: form.birth_date || null,
                cpf: form.cpf || null,
                civil_status: form.civil_status || 'Não informado',
                address: form.address || null,
                neighborhood: form.neighborhood || null,
                city: form.city || null,
                state: form.state || null,
                zip_code: form.zip_code || null,
                hue: Math.floor(Math.random() * 360),
              });
              
              if (error) {
                setSaving(false);
                addToast({ kind: 'warn', msg: 'Erro ao cadastrar: ' + error.message });
              } else {
                if (created && docs.length > 0) {
                  const { error: docError } = await createDocuments(created.id, docs);
                  if (docError) {
                    addToast({ kind: 'warn', msg: 'Aviso: Erro ao enviar documentos: ' + docError.message });
                  }
                }
                setSaving(false);
                addToast({ kind: 'ok', msg: `${form.name.split(' ')[0]} cadastrado com sucesso!` });
                setRoute('employees');
              }
            }}
          >
            {saving ? <span className="pulse">Salvando…</span> : <><Icon name="check" size={14} /> Concluir cadastro</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// EMPRESAS TAB
// ============================================================
function EmpresasTab({ addToast }) {
  const { companies, loading, refetch } = useCompanies();
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const BLANK_FORM = { name: '', slug: '', address: '', number: '', logo_url: '', cnpj: '', email: '', phone: '' };
  const [form, setForm] = useState(BLANK_FORM);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const logoInputRef = useMemo(() => ({ current: null }), []);

  const slugify = (name) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setForm(BLANK_FORM);
    setLogoFile(null);
    setLogoPreview(null);
    setEditTarget(null);
    setShowNew(true);
  };

  const openEdit = (c) => {
    setForm({
      name: c.name,
      slug: c.slug || '',
      address: c.address || '',
      number: c.number || '',
      logo_url: c.logo_url || '',
      cnpj: c.cnpj || '',
      email: c.email || '',
      phone: c.phone || '',
    });
    setLogoFile(null);
    setLogoPreview(c.logo_url || null);
    setEditTarget(c);
    setShowNew(true);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async (companyId) => {
    if (!logoFile) return form.logo_url || null;
    const ext = logoFile.name.split('.').pop();
    const path = `${companyId}.${ext}`;
    const { error } = await supabase.storage
      .from('company-logos')
      .upload(path, logoFile, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('company-logos').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const slug = form.slug.trim() || slugify(form.name.trim());

      const contactFields = {
        address: form.address.trim() || null,
        number:  form.number.trim()  || null,
        cnpj:    form.cnpj.trim()    || null,
        email:   form.email.trim()   || null,
        phone:   form.phone.trim()   || null,
      };

      if (editTarget) {
        const logo_url = await uploadLogo(editTarget.id);
        const { error } = await updateCompany(editTarget.id, {
          name: form.name.trim(), slug, logo_url, ...contactFields,
        });
        if (error) throw error;
      } else {
        const { created, error } = await createCompany({
          name: form.name.trim(), slug, ...contactFields,
        });
        if (error) throw error;
        if (logoFile && created) {
          const logo_url = await uploadLogo(created.id);
          await updateCompany(created.id, { logo_url });
        }
      }

      addToast({ kind: 'ok', msg: editTarget ? 'Empresa atualizada' : 'Empresa criada' });
      setShowNew(false);
      refetch();
    } catch (err) {
      addToast({ kind: 'err', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c) => {
    const { error } = await updateCompany(c.id, { active: !c.active });
    if (error) addToast({ kind: 'err', msg: error.message });
    else refetch();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Empresas</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
            Gerencie as empresas da sua conta. Cada empresa tem seus próprios funcionários e dados.
          </div>
        </div>
        <button className="btn primary sm" onClick={openNew}>
          <Icon name="plus" size={13} /> Nova empresa
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }} className="pulse">
          Carregando…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {companies.map((c) => (
            <div key={c.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Logo ou inicial */}
              <div style={{
                width: 42, height: 42, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
                background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-700) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {c.logo_url
                  ? <img src={c.logo_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: 'var(--brand-ink)', fontWeight: 700, fontSize: 16 }}>{c.name.charAt(0).toUpperCase()}</span>
                }
              </div>
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {c.name}
                  {!c.active && (
                    <span style={{
                      fontSize: 10.5, fontWeight: 700,
                      background: 'var(--surface-2)', color: 'var(--muted)',
                      border: '1px solid var(--line)', borderRadius: 4, padding: '1px 6px',
                    }}>INATIVA</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {c.address
                    ? `${c.address}${c.number ? ', ' + c.number : ''}`
                    : `/${c.slug || '—'}`}
                </div>
              </div>
              <div className="row gap-2">
                <button className="btn ghost sm" onClick={() => openEdit(c)}>
                  <Icon name="edit" size={13} /> Editar
                </button>
                <button
                  className="btn ghost sm"
                  onClick={() => handleToggleActive(c)}
                  style={{ color: c.active ? 'var(--bad)' : 'var(--good)' }}
                >
                  <Icon name={c.active ? 'x' : 'check'} size={13} />
                  {c.active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))}
          {companies.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Nenhuma empresa cadastrada.
            </div>
          )}
        </div>
      )}

      {/* Modal nova/editar empresa */}
      {showNew && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
          onClick={() => setShowNew(false)}
        >
          <div
            style={{
              width: '100%', maxWidth: 520,
              background: 'var(--surface)', borderRadius: 14,
              boxShadow: '0 24px 60px rgba(0,0,0,.2)',
              display: 'flex', flexDirection: 'column',
              maxHeight: 'calc(100dvh - 48px)', overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '18px 22px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                {editTarget ? 'Editar empresa' : 'Nova empresa'}
              </div>
              <button className="btn ghost icon sm" onClick={() => setShowNew(false)}>
                <Icon name="x" size={15} />
              </button>
            </div>

            {/* Body scrollável */}
            <div style={{ overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Upload de logo */}
              <div>
                <label className="label">Logo da empresa</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
                  <div
                    style={{
                      width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
                      background: logoPreview ? 'transparent' : 'var(--surface-2)',
                      border: '2px dashed var(--line)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    onClick={() => logoInputRef.current?.click()}
                    title="Clique para selecionar"
                  >
                    {logoPreview
                      ? <img src={logoPreview} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Icon name="building" size={22} style={{ color: 'var(--muted)' }} />
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <button className="btn sm" onClick={() => logoInputRef.current?.click()}>
                      <Icon name="upload" size={13} /> {logoPreview ? 'Trocar imagem' : 'Selecionar logo'}
                    </button>
                    {logoPreview && (
                      <button
                        className="btn ghost sm"
                        style={{ marginLeft: 6, color: 'var(--bad)' }}
                        onClick={() => { setLogoFile(null); setLogoPreview(null); set('logo_url', ''); }}
                      >
                        Remover
                      </button>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
                      PNG, JPG ou WebP · máx 2 MB
                    </div>
                  </div>
                </div>
                <input
                  ref={(el) => { logoInputRef.current = el; }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  style={{ display: 'none' }}
                  onChange={handleLogoChange}
                />
              </div>

              {/* Nome */}
              <div>
                <label className="label">Nome da empresa *</label>
                <input
                  className="field"
                  value={form.name}
                  autoFocus
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({ ...f, name, slug: f.slug || slugify(name) }));
                  }}
                  placeholder="Ex: Empresa João LTDA"
                />
              </div>

              {/* Endereço + Número */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10 }}>
                <div>
                  <label className="label">Endereço</label>
                  <input
                    className="field"
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                    placeholder="Rua, Av., Beco…"
                  />
                </div>
                <div>
                  <label className="label">Número</label>
                  <input
                    className="field"
                    value={form.number}
                    onChange={(e) => set('number', e.target.value)}
                    placeholder="Ex: 1000"
                  />
                </div>
              </div>

              {/* CNPJ, Email, Telefone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="label">CNPJ</label>
                  <input className="field" value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} placeholder="00.000.000/0001-00" />
                </div>
                <div>
                  <label className="label">Telefone</label>
                  <input className="field" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+55 11 0000-0000" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="label">E-mail corporativo</label>
                  <input className="field" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="contato@empresa.com.br" />
                </div>
              </div>

              {/* Slug */}
              <div>
                <label className="label">Identificador (slug)</label>
                <input
                  className="field"
                  value={form.slug}
                  onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="empresa-joao"
                />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  Usado internamente. Só letras minúsculas, números e hifens.
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn" onClick={() => setShowNew(false)}>Cancelar</button>
              <button className="btn primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? 'Salvando…' : editTarget ? 'Salvar alterações' : 'Criar empresa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SETTINGS (with Permissions as a tab)
// ============================================================
export function SettingsScreen({ initialTab, addToast, setRoute, activeCompany }) {
  const [tab, setTab] = useState(initialTab || 'empresas');
  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  const tabs = [
    { id: 'empresas',   l: 'Empresas',    i: 'building' },
    { id: 'aparencia',  l: 'Aparência',   i: 'sparkle' },
    { id: 'seguranca',  l: 'Segurança',   i: 'shield' },
    { id: 'permissoes', l: 'Permissões',  i: 'key' },
    { id: 'integracao', l: 'Integrações', i: 'folder' },
  ];

  return (
    <div
      className="fade-up"
      style={{
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxWidth: 1180,
        margin: '0 auto',
        width: '100%',
      }}
    >
      <div>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
          Configurações
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          Conta, organização, segurança e permissões.
        </p>
      </div>

      {/* Tab strip */}
      <div className="row gap-2" style={{ borderBottom: '1px solid var(--line)' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              if (setRoute)
                setRoute(t.id === 'permissoes' ? 'settings-permissions' : 'settings');
            }}
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

      {tab === 'empresas' && <EmpresasTab addToast={addToast} />}

      {tab === 'aparencia' && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700 }}>Aparência</h3>
          <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--muted)' }}>
            Use o painel de <strong>Tweaks</strong> (canto inferior direito) para escolher cor
            primária, modo claro/escuro e densidade.
          </p>
          <div
            className="row gap-3"
            style={{
              padding: 14,
              background: 'var(--surface-2)',
              borderRadius: 10,
              border: '1px solid var(--line-soft)',
            }}
          >
            <Icon name="sparkle" size={18} style={{ color: 'var(--brand)' }} />
            <div className="grow" style={{ fontSize: 13 }}>
              Personalização disponível: cor primária, tema, raio dos cantos e densidade.
            </div>
          </div>
        </div>
      )}

      {tab === 'seguranca' && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Segurança</h3>
          {[
            { l: 'Autenticação em dois fatores (2FA)', s: 'Aplicativo autenticador · ativo', on: true },
            { l: 'Sessões simultâneas', s: 'Limite de 3 dispositivos por usuário', on: true },
            { l: 'Bloqueio por inatividade', s: 'Após 15 minutos sem atividade', on: true },
            { l: 'Notificar acessos suspeitos', s: 'Por e-mail e Slack', on: false },
          ].map((s, i) => (
            <div
              key={i}
              className="row gap-3"
              style={{
                padding: '14px 0',
                borderBottom: i < 3 ? '1px solid var(--line-soft)' : 'none',
              }}
            >
              <div className="grow">
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{s.l}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s.s}</div>
              </div>
              <div
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  background: s.on ? 'var(--brand)' : 'var(--line)',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background .15s',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: s.on ? 18 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                    transition: 'left .15s',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'permissoes' && <PermissionsScreen addToast={addToast} embedded={true} activeCompany={activeCompany} />}

      {tab === 'integracao' && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700 }}>Integrações</h3>
          <p style={{ margin: '0 0 18px', fontSize: 12.5, color: 'var(--muted)' }}>
            Conecte serviços externos para sincronizar dados automaticamente.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 12,
            }}
          >
            {[
              { n: 'Senior Sistemas', s: 'Folha & ponto',        on: true },
              { n: 'TOTVS Protheus',  s: 'ERP',                  on: true },
              { n: 'Gov.br',          s: 'Assinatura digital',   on: true },
              { n: 'DocuSign',        s: 'Assinatura eletrônica',on: false },
              { n: 'Slack',           s: 'Notificações',         on: false },
            ].map((it, i) => (
              <div
                key={i}
                className="row gap-3"
                style={{ padding: 14, border: '1px solid var(--line-soft)', borderRadius: 10 }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--muted)',
                  }}
                >
                  <Icon name="folder" size={15} />
                </div>
                <div className="grow">
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{it.n}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{it.s}</div>
                </div>
                <span className={`pill ${it.on ? 'ok' : ''}`} style={{ fontSize: 10.5 }}>
                  {it.on ? 'Conectado' : 'Conectar'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// RH - WARNINGS (ADVERTÊNCIAS)
// ============================================================
export function WarningsScreen({ addToast, activeCompany }) {
  const { can } = usePermissions();
  const [filter, setFilter] = useState('todas');
  const [q, setQ] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newWarn, setNewWarn] = useState({ employee_id: '', type: 'Advertência verbal', severity: 'verbal', description: '' });
  const [saving, setSaving] = useState(false);

  const { warnings: allWarnings, loading, refetch } = useAllWarnings(activeCompany?.id);
  const { employees: activeEmployees } = useEmployees({ status: 'ativo', companyId: activeCompany?.id });

  const typeLabel = { verbal: 'Verbal', escrita: 'Escrita', suspensao: 'Suspensão' };
  const typeKind  = { verbal: 'warn', escrita: 'bad', suspensao: 'bad' };

  const filtered = allWarnings.filter((w) => {
    const sev = w.severity || 'verbal';
    if (filter !== 'todas' && sev !== filter) return false;
    const searchStr = ((w.employees?.name || '') + ' ' + (w.description || '')).toLowerCase();
    if (q && !searchStr.includes(q.toLowerCase())) return false;
    return true;
  });

  const countBySeverity = (s) => allWarnings.filter((w) => (w.severity || 'verbal') === s).length;

  return (
    <>
    <div className="fade-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="grow">
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
            Advertências
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Registro formal de advertências verbais, escritas e suspensões.
          </p>
        </div>
        <div className="row gap-2">
          <button className="btn">
            <Icon name="download" size={15} /> Exportar
          </button>
          {can('RH', 'advertir') && (
            <button className="btn primary" onClick={() => setShowModal(true)}>
              <Icon name="plus" size={15} /> Nova advertência
            </button>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { l: 'Total',     v: allWarnings.length, k: 'bad' },
          { l: 'Verbais',   v: countBySeverity('verbal'),   k: 'warn' },
          { l: 'Escritas',  v: countBySeverity('escrita'),  k: 'bad' },
          { l: 'Suspensões', v: countBySeverity('suspensao'), k: 'bad' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{s.l}</div>
            <div className="row" style={{ marginTop: 6, alignItems: 'baseline', gap: 8 }}>
              <div className="mono" style={{ fontSize: 26, fontWeight: 700 }}>{s.v}</div>
              {s.k && <span className={`pill ${s.k}`} style={{ fontSize: 10 }}>•</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Filters */}
        <div className="row gap-2" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
          <input
            className="field"
            placeholder="Buscar funcionário ou motivo…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 280, height: 34, fontSize: 13 }}
          />
          <span className="grow" />
          {['todas', 'verbal', 'escrita', 'suspensao'].map((f) => (
            <button
              key={f}
              className={`btn sm ${filter === f ? 'primary' : 'ghost'}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: 'capitalize' }}
            >
              {f === 'todas' ? 'Todas' : typeLabel[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            <div className="pulse">Carregando advertências…</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Funcionário</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Tipo</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Motivo</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Data</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Aplicada por</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Severidade</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                    Nenhuma advertência encontrada.
                  </td>
                </tr>
              ) : filtered.map((w) => (
                <tr key={w.id} style={{ borderTop: '1px solid var(--line-soft)' }}>
                  <td style={{ padding: '11px 16px' }}>
                    <div className="row gap-2">
                      <Avatar name={w.employees?.name || '?'} hue={w.employees?.hue || 0} size={28} />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{w.employees?.name || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{w.employees?.dept || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span className={`pill ${typeKind[w.severity] || 'warn'}`}>{w.type}</span>
                  </td>
                  <td style={{ padding: '11px 16px', color: 'var(--ink-soft)' }}>{w.description}</td>
                  <td style={{ padding: '11px 16px' }} className="mono">
                    {new Date(w.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '11px 16px', color: 'var(--muted)' }}>{w.applied_by || '—'}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span className={`pill ${typeKind[w.severity] || 'warn'}`}>
                      <span className="dot" />{typeLabel[w.severity] || w.severity}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <button className="btn ghost icon sm"><Icon name="more-v" size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>

    {/* New warning modal — fora do fade-up para position:fixed funcionar corretamente */}
    {showModal && (
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(8px, 2vw, 24px)', overflowY: 'auto' }}
        onClick={() => setShowModal(false)}
      >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 480, padding: 24, position: 'relative', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', margin: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row" style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Nova advertência</h2>
              <span className="grow" />
              <button className="btn ghost icon sm" onClick={() => setShowModal(false)}>
                <Icon name="x" size={15} />
              </button>
            </div>
            <div className="col gap-3">
              <div>
                <label className="label">Funcionário</label>
                <select className="field" value={newWarn.employee_id} onChange={(e) => setNewWarn({ ...newWarn, employee_id: e.target.value })}>
                  <option value="">Selecionar…</option>
                  {activeEmployees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Tipo / Severidade</label>
                <select
                  className="field"
                  value={newWarn.severity}
                  onChange={(e) => {
                    const sev = e.target.value;
                    const labels = { verbal: 'Advertência verbal', escrita: 'Advertência escrita', suspensao: 'Suspensão' };
                    setNewWarn({ ...newWarn, severity: sev, type: labels[sev] });
                  }}
                >
                  <option value="verbal">Verbal</option>
                  <option value="escrita">Escrita</option>
                  <option value="suspensao">Suspensão</option>
                </select>
              </div>
              <div>
                <label className="label">Motivo</label>
                <textarea
                  className="field"
                  rows={3}
                  style={{ resize: 'vertical' }}
                  placeholder="Descreva o motivo da advertência…"
                  value={newWarn.description}
                  onChange={(e) => setNewWarn({ ...newWarn, description: e.target.value })}
                />
              </div>
            </div>
            <div className="row gap-2" style={{ marginTop: 20 }}>
              <button className="btn" onClick={() => setShowModal(false)}>Cancelar</button>
              <span className="grow" />
              <button
                className="btn primary"
                disabled={!newWarn.employee_id || !newWarn.description || saving}
                onClick={async () => {
                  setSaving(true);
                  const { error } = await createWarning({
                    employee_id: newWarn.employee_id,
                    type: newWarn.type,
                    severity: newWarn.severity,
                    description: newWarn.description,
                    date: new Date().toISOString().slice(0, 10),
                    applied_by: 'Usuário atual',
                  });
                  setSaving(false);
                  if (error) {
                    addToast({ kind: 'warn', msg: 'Erro: ' + error.message });
                  } else {
                    const empName = employees.find(e => e.id === newWarn.employee_id)?.name || newWarn.employee_id;
                    logAudit(activeCompany?.id, 'CRIOU', `Advertência: ${empName}`);
                    setShowModal(false);
                    addToast({ kind: 'ok', msg: 'Advertência registrada com sucesso!' });
                    setNewWarn({ employee_id: '', type: 'Advertência verbal', severity: 'verbal', description: '' });
                    refetch();
                  }
                }}
              >
                {saving ? <span className="pulse">Salvando…</span> : <><Icon name="check" size={14} /> Registrar advertência</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// RH - VACATIONS (FÉRIAS)
// ============================================================
export function VacationScreen({ addToast, activeCompany }) {
  const { can } = usePermissions();
  const [filter, setFilter] = useState('todas');
  const { vacations: allVacations, loading, refetch } = useAllVacations(activeCompany?.id);
  const { employees } = useEmployees({ companyId: activeCompany?.id });
  const activeEmployees = employees.filter((e) => e.status === 'ativo');

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newVacation, setNewVacation] = useState({ employee_id: '', period_start: '', period_end: '', days: 30 });
  const [docs, setDocs] = useState([]);

  const approve = async (id) => {
    const empName = allVacations.find(v => v.id === id)?.employees?.name || id;
    const { error } = await updateVacationStatus(id, 'aprovado');
    if (error) addToast({ kind: 'warn', msg: 'Erro: ' + error.message });
    else { logAudit(activeCompany?.id, 'EDITOU', `Férias aprovadas: ${empName}`); addToast({ kind: 'ok', msg: 'Férias aprovadas' }); refetch(); }
  };
  const reject = async (id) => {
    const empName = allVacations.find(v => v.id === id)?.employees?.name || id;
    const { error } = await updateVacationStatus(id, 'recusado');
    if (error) addToast({ kind: 'warn', msg: 'Erro: ' + error.message });
    else { logAudit(activeCompany?.id, 'EDITOU', `Férias recusadas: ${empName}`); addToast({ kind: 'warn', msg: 'Férias recusadas' }); refetch(); }
  };

  const statusKind = { aprovado: 'ok', pendente: 'warn', concluído: 'info', concluido: 'info', recusado: 'bad' };
  const statusLabel = { aprovado: 'Aprovado', pendente: 'Pendente', concluído: 'Concluído', concluido: 'Concluído', recusado: 'Recusado' };

  const filtered = filter === 'todas' ? allVacations : allVacations.filter((v) => v.status === filter);

  const countByStatus = (s) => allVacations.filter((v) => v.status === s).length;
  const totalDays = allVacations.reduce((a, v) => a + (v.days_count || 0), 0);

  const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

  return (
    <>
    <div className="fade-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="grow">
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Férias</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Solicitações, aprovações e programação anual de férias.
          </p>
        </div>
        <div className="row gap-2">
          <button className="btn"><Icon name="download" size={15} /> Exportar</button>
          {can('RH', 'férias') && (
            <button className="btn primary" onClick={() => setShowModal(true)}>
              <Icon name="plus" size={15} /> Nova solicitação
            </button>
          )}
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { l: 'Pendentes',  v: countByStatus('pendente'),  k: 'warn' },
          { l: 'Aprovadas',  v: countByStatus('aprovado'),  k: 'ok' },
          { l: 'Concluídas', v: countByStatus('concluído') + countByStatus('concluido'), k: 'info' },
          { l: 'Total dias (ano)', v: totalDays, k: '' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{s.l}</div>
            <div className="row" style={{ marginTop: 6, alignItems: 'baseline', gap: 8 }}>
              <div className="mono" style={{ fontSize: 26, fontWeight: 700 }}>{s.v}</div>
              {s.k && <span className={`pill ${s.k}`} style={{ fontSize: 10 }}>•</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="row gap-2" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Solicitações</span>
          <span className="grow" />
          {['todas', 'pendente', 'aprovado', 'concluído'].map((f) => (
            <button
              key={f}
              className={`btn sm ${filter === f ? 'primary' : 'ghost'}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: 'capitalize' }}
            >
              {f === 'todas' ? 'Todas' : statusLabel[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            <div className="pulse">Carregando férias…</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Funcionário</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Período</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Dias</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Solicitado em</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Aprovado por</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600 }}>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                    Nenhuma solicitação encontrada.
                  </td>
                </tr>
              ) : filtered.map((v) => (
                <tr key={v.id} style={{ borderTop: '1px solid var(--line-soft)' }}>
                  <td style={{ padding: '11px 16px' }}>
                    <div className="row gap-2">
                      <Avatar name={v.employees?.name || '?'} hue={v.employees?.hue || 0} size={28} />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{v.employees?.name || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{v.employees?.dept || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 12.5 }}>
                    <span className="mono">{fmtDate(v.period_start)}</span>
                    <span style={{ color: 'var(--muted)', margin: '0 4px' }}>→</span>
                    <span className="mono">{fmtDate(v.period_end)}</span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span className="pill">{v.days_count || 0}d</span>
                  </td>
                  <td style={{ padding: '11px 16px', color: 'var(--muted)' }} className="mono">
                    {v.created_at ? new Date(v.created_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td style={{ padding: '11px 16px', color: 'var(--muted)', fontSize: 12.5 }}>
                    {v.approved_by || <span style={{ color: 'var(--muted-2)' }}>—</span>}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span className={`pill ${statusKind[v.status] || ''}`}>
                      <span className="dot" />{statusLabel[v.status] || v.status}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    {v.status === 'pendente' && can('RH', 'férias') ? (
                      <div className="row gap-1">
                        <button className="btn sm" style={{ color: 'var(--ok)', borderColor: 'var(--ok)' }} onClick={() => approve(v.id)}>
                          <Icon name="check" size={12} /> Aprovar
                        </button>
                        <button className="btn sm ghost" onClick={() => reject(v.id)}>
                          <Icon name="x" size={12} />
                        </button>
                      </div>
                    ) : (
                      <button className="btn ghost icon sm"><Icon name="more-v" size={13} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>

    {showModal && (
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(8px, 2vw, 24px)', overflowY: 'auto' }}
        onClick={() => setShowModal(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 540, padding: 24, position: 'relative', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', margin: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row" style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Nova solicitação de férias</h2>
              <span className="grow" />
              <button className="btn ghost icon sm" onClick={() => setShowModal(false)}>
                <Icon name="x" size={15} />
              </button>
            </div>
            
            <div className="col gap-3">
              <div>
                <label className="label">Funcionário</label>
                <select 
                  className="field" 
                  value={newVacation.employee_id} 
                  onChange={(e) => setNewVacation({ ...newVacation, employee_id: e.target.value })}
                >
                  <option value="">Selecionar…</option>
                  {activeEmployees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                  <label className="label">Início</label>
                  <input
                    type="date"
                    className="field"
                    value={newVacation.period_start}
                    onChange={(e) => setNewVacation({ ...newVacation, period_start: e.target.value })}
                  />
                </div>
                <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                  <label className="label">Fim</label>
                  <input 
                    type="date" 
                    className="field" 
                    value={newVacation.period_end}
                    onChange={(e) => setNewVacation({ ...newVacation, period_end: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Dias solicitados</label>
                <input 
                  type="number" 
                  className="field" 
                  value={newVacation.days}
                  onChange={(e) => setNewVacation({ ...newVacation, days: parseInt(e.target.value) || 0 })}
                />
              </div>

              {/* Document Upload for Vacations */}
              <div style={{ marginTop: 12 }}>
                <label className="label" style={{ marginBottom: 8 }}>Documentos Anexos (Opcional)</label>
                <label
                  style={{
                    padding: 24,
                    border: '1.5px dashed var(--line)',
                    borderRadius: 12,
                    background: 'var(--surface-2)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'block'
                  }}
                >
                  <input 
                    type="file" 
                    multiple 
                    style={{ display: 'none' }} 
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      const newDocs = files.map(f => ({
                        name: f.name,
                        category: 'Férias',
                        size: Math.round(f.size / 1024) + ' KB',
                        type: f.name.split('.').pop()
                      }));
                      setDocs([...docs, ...newDocs]);
                    }}
                  />
                  <Icon name="upload" size={28} style={{ color: 'var(--brand)' }} />
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>
                    Clique para selecionar arquivos
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    Anexe formulários ou atestados referentes à solicitação
                  </div>
                </label>
                
                {docs.length > 0 && (
                  <div className="col gap-2" style={{ marginTop: 12 }}>
                    {docs.map((d, i) => (
                      <div
                        key={i}
                        className="row gap-3"
                        style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 8 }}
                      >
                        <Icon
                          name={d.name.endsWith('.pdf') ? 'pdf' : 'image'}
                          size={18}
                          style={{ color: 'var(--brand)' }}
                        />
                        <div className="grow">
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }} className="mono">
                            {d.size} · pronto
                          </div>
                        </div>
                        <button className="btn sm ghost icon" onClick={() => setDocs(docs.filter((_, idx) => idx !== i))}>
                          <Icon name="trash" size={13} style={{ color: 'var(--bad)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="row gap-2" style={{ marginTop: 24 }}>
              <button className="btn" onClick={() => setShowModal(false)}>Cancelar</button>
              <span className="grow" />
              <button
                className="btn primary"
                disabled={!newVacation.employee_id || !newVacation.period_start || saving}
                onClick={async () => {
                  setSaving(true);
                  const { created, error } = await createVacation({
                    employee_id: newVacation.employee_id,
                    period_start: newVacation.period_start,
                    period_end: newVacation.period_end || newVacation.period_start,
                    days_count: newVacation.days, // note: column might be "days" or "days_count"? Let's assume it works as it was (wait, I need to check if it's days_count or days). Oh, in DB it's `days` based on mcp output. 
                    // Actually let me use days: newVacation.days instead of days_count if needed.
                    days: newVacation.days,
                    status: 'pendente'
                  });
                  
                  if (error) {
                    addToast({ kind: 'warn', msg: 'Erro: ' + error.message });
                    setSaving(false);
                  } else {
                    if (created && docs.length > 0) {
                      const { error: docError } = await createDocuments(newVacation.employee_id, docs);
                      if (docError) {
                        addToast({ kind: 'warn', msg: 'Aviso: Erro ao anexar documentos.' });
                      }
                    }
                    const empName = activeEmployees.find(e => e.id === newVacation.employee_id)?.name || newVacation.employee_id;
                    logAudit(activeCompany?.id, 'CRIOU', `Férias: ${empName}`);
                    setShowModal(false);
                    setSaving(false);
                    addToast({ kind: 'ok', msg: 'Solicitação registrada com sucesso!' });
                    setNewVacation({ employee_id: '', period_start: '', period_end: '', days: 30 });
                    setDocs([]);
                    refetch();
                  }
                }}
              >
                {saving ? <span className="pulse">Enviando…</span> : <><Icon name="check" size={14} /> Solicitar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ORGANOGRAM
// ============================================================
function OrgNode({ node, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      {/* Node card */}
      <div style={{ position: 'relative' }}>
        <div
          style={{
            background: 'var(--surface)',
            border: `2px solid ${depth === 0 ? 'var(--brand)' : 'var(--line)'}`,
            borderRadius: 10,
            padding: '10px 14px',
            minWidth: 160,
            maxWidth: 200,
            boxShadow: depth === 0 ? '0 0 0 3px var(--brand-tint)' : 'var(--shadow-card)',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            <Avatar name={node.name} hue={node.hue} size={36} />
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.3 }}>{node.name}</div>
          <div style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 600, marginTop: 2 }}>{node.role}</div>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 1 }}>{node.dept}</div>
          {hasChildren && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                position: 'absolute',
                bottom: -12,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 22,
                height: 22,
                borderRadius: '50%',
                border: '2px solid var(--line)',
                background: 'var(--surface)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <Icon name={collapsed ? 'plus' : 'minus'} size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && !collapsed && (
        <>
          {/* Vertical line down */}
          <div style={{ width: 2, height: 28, background: 'var(--line)' }} />
          {node.children.length > 1 && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>
              {/* Horizontal bar */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: `calc(100% - 160px)`,
                  height: 2,
                  background: 'var(--line)',
                }}
              />
              <div style={{ display: 'flex', gap: 24 }}>
                {node.children.map((child, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 2, height: 20, background: 'var(--line)' }} />
                    <OrgNode node={child} depth={depth + 1} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {node.children.length === 1 && (
            <OrgNode node={node.children[0]} depth={depth + 1} />
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// PLACEHOLDER
// ============================================================
export function Placeholder({ title, desc }) {
  return (
    <div className="fade-up" style={{ padding: 24 }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>{title}</h1>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{desc}</p>
      <div className="card" style={{ marginTop: 16, padding: 56, textAlign: 'center' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 14,
            background: 'var(--brand-tint)',
            color: 'var(--brand)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <Icon name="folder" size={26} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Em breve</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          Esta seção segue o mesmo padrão visual e está pronta para receber dados reais.
        </div>
      </div>
    </div>
  );
}
