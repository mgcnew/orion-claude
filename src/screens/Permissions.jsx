import { useState, useEffect } from 'react';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import {
  useCompanies,
  useEmployees,
  useCompanyUsers,
  updateUserCompany,
  usePendingInvitesByCompany,
  deleteInvite,
  findProfileByEmail,
  promoteUserToCompany,
  linkEmployeeUser,
  revokeUserCompany,
  logAudit,
} from '../hooks/useEmployees.js';
import { MODULES, ROLES, ROLE_TEMPLATES } from '../lib/permissions.jsx';
import { SendInviteModal } from './Auth.jsx';

const OWNER_ID = '__owner__';

const permStyle = `
  .perm-grid { display:grid; grid-template-columns:290px 1fr; gap:16px; }
  .perm-back { display:none; }
  @media (max-width:768px) {
    .perm-grid     { display:flex; flex-direction:column; }
    .perm-hide-mob { display:none !important; }
    .perm-back     { display:inline-flex; margin-bottom:12px; }
  }
`;

export default function PermissionsScreen({ addToast, embedded, activeCompany: propCompany }) {
  const { companies } = useCompanies();
  const [localCompanyId, setLocalCompanyId] = useState(propCompany?.id ?? null);
  const companyId = propCompany?.id ?? localCompanyId;

  const { members, loading: membersLoading, refetch } = useCompanyUsers(companyId);
  const { invites, refetch: refetchInvites } = usePendingInvitesByCompany(companyId);

  const [activeId, setActiveId] = useState(null);
  const [localGrants, setLocalGrants] = useState({});
  const [localRole, setLocalRole] = useState('Operacional');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [promoting, setPromoting] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const [showWithoutAccess, setShowWithoutAccess] = useState(false);

  const { employees: companyEmployees } = useEmployees({ companyId });

  const selected = activeId && activeId !== OWNER_ID ? members.find(m => m.user_id === activeId) : null;
  const selectedInvite = activeId && !selected && activeId !== OWNER_ID ? invites.find(i => i.id === activeId) : null;

  useEffect(() => {
    if (selected) {
      setLocalGrants(selected.grants ?? {});
      setLocalRole(selected.role ?? 'Operacional');
    }
  }, [activeId, selected]);

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
      const { error } = await promoteUserToCompany(profile.id, companyId);
      if (error) { addToast({ kind: 'warn', msg: 'Erro ao promover: ' + error.message }); return; }
      await linkEmployeeUser(emp.id, profile.id);
      logAudit(companyId, 'CRIOU', `Acesso direto: ${emp.name}`);
      addToast({ kind: 'ok', msg: `${emp.name} adicionado com sucesso!` });
      refetch();
    } else {
      setInviteEmail(emp.email_personal);
      setShowInviteModal(true);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  return (
    <>
    <style>{permStyle}</style>
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

      {!companyId ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
          <Icon name="building" size={28} style={{ marginBottom: 10, opacity: 0.35 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>Selecione uma empresa acima</div>
          <div style={{ fontSize: 12.5, marginTop: 6 }}>As permissões são individuais por empresa.</div>
        </div>
      ) : (
        <div className="perm-grid">
          <div className={`card${activeId ? ' perm-hide-mob' : ''}`} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
              <input className="field" placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)} style={{ height: 33, fontSize: 13 }} />
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
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

              {employeesWithoutAccess.length > 0 && (
                <>
                  <button
                    onClick={() => setShowWithoutAccess(v => !v)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '9px 13px', border: 'none', borderTop: '1px solid var(--line)',
                      background: showWithoutAccess ? 'var(--surface-2)' : 'transparent',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <Icon name="users" size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>
                      {employeesWithoutAccess.length} funcionário{employeesWithoutAccess.length !== 1 ? 's' : ''} sem acesso
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                      background: 'var(--surface-2)', color: 'var(--muted-2)', border: '1px solid var(--line)',
                    }}>
                      {showWithoutAccess ? 'Recolher' : 'Gerenciar'}
                    </span>
                  </button>

                  {showWithoutAccess && employeesWithoutAccess.map((emp) => (
                    <div
                      key={emp.id}
                      style={{
                        display: 'flex', gap: 10, alignItems: 'center',
                        padding: '9px 13px', borderBottom: '1px solid var(--line-soft)',
                        background: 'var(--surface-2)',
                      }}
                    >
                      <Avatar name={emp.name} size={30} hue={emp.hue ?? 215} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email_personal || '—'}</div>
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

            <div style={{ padding: 10, borderTop: '1px solid var(--line)' }}>
              <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setInviteEmail(''); setShowInviteModal(true); }}>
                <Icon name="plus" size={14} /> Convidar usuário
              </button>
            </div>
          </div>

          <div className={!activeId ? 'perm-hide-mob' : ''}>
          <button className="btn ghost sm perm-back" onClick={() => setActiveId(null)}>
            <Icon name="chevron-left" size={14} /> Voltar
          </button>
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
    </>
  );
}
