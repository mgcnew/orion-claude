import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

// ============================================================
// EMPRESAS
// ============================================================

export function useCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('companies')
      .select('*')
      .eq('active', true)
      .order('name');
    if (err) setError(err.message);
    else setCompanies(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { companies, loading, error, refetch: fetch };
}

export async function createCompany(data) {
  const { data: created, error } = await supabase
    .from('companies')
    .insert(data)
    .select()
    .single();
  return { created, error };
}

export async function updateCompany(id, data) {
  const { error } = await supabase
    .from('companies')
    .update(data)
    .eq('id', id);
  return { error };
}

// ============================================================
// FUNCIONÁRIOS
// ============================================================

// Lista de funcionários com filtro opcional por status, busca textual, empresa e datas
export function useEmployees({ status, search, companyId, admissionFrom, admissionTo } = {}) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('employees')
      .select('*')
      .order('name');

    if (status && status !== 'todos') {
      query = query.eq('status', status);
    }

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    if (admissionFrom) {
      query = query.gte('admission', admissionFrom);
    }

    if (admissionTo) {
      query = query.lte('admission', admissionTo);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,role.ilike.%${search}%,dept.ilike.%${search}%`
      );
    }

    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setEmployees(data ?? []);
    setLoading(false);
  }, [status, search, companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { employees, loading, error, refetch: fetch };
}

// Funcionário individual por ID
export function useEmployee(id) {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setEmployee(data);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { employee, loading, error, refetch: fetch };
}

// Contagens por status (para os tabs e KPIs)
export function useEmployeeCounts(companyId) {
  const [counts, setCounts] = useState({ todos: 0, ativo: 0, férias: 0, afastado: 0, desligado: 0 });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('employees').select('status');
    if (companyId) query = query.eq('company_id', companyId);
    const { data } = await query;
    if (!data) { setLoading(false); return; }
    const c = { todos: data.length, ativo: 0, férias: 0, afastado: 0, desligado: 0 };
    data.forEach((e) => { if (c[e.status] !== undefined) c[e.status]++; });
    setCounts(c);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { counts, loading, refetch: fetch };
}

// Inserir novo funcionário
export async function createEmployee(data) {
  const { data: created, error } = await supabase
    .from('employees')
    .insert(data)
    .select()
    .single();

  if (created) {
    await supabase.from('employee_history').insert({
      employee_id: created.id,
      date: created.admission || created.created_at.split('T')[0],
      type: 'other',
      title: 'Admissão',
      description: 'Entrada na empresa'
    });
  }

  return { created, error };
}

// Atualizar funcionário
export async function updateEmployee(id, data) {
  const { error } = await supabase
    .from('employees')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id);
  return { error };
}

// Atualizar status de um funcionário
export async function updateEmployeeStatus(id, status) {
  const { error } = await supabase
    .from('employees')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  return { error };
}

// Advertências de um funcionário
export function useEmployeeWarnings(employeeId) {
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    supabase
      .from('employee_warnings')
      .select('*')
      .eq('employee_id', employeeId)
      .order('date', { ascending: false })
      .then(({ data }) => {
        setWarnings(data ?? []);
        setLoading(false);
      });
  }, [employeeId]);

  return { warnings, loading };
}

// Férias de um funcionário
export function useEmployeeVacations(employeeId) {
  const [vacations, setVacations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    supabase
      .from('employee_vacations')
      .select('*')
      .eq('employee_id', employeeId)
      .order('period_start', { ascending: false })
      .then(({ data }) => {
        setVacations(data ?? []);
        setLoading(false);
      });
  }, [employeeId]);

  return { vacations, loading };
}

// Documentos de um funcionário
export function useEmployeeDocuments(employeeId) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(() => {
    if (!employeeId) return;
    setLoading(true);
    supabase
      .from('documents')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setDocuments(data ?? []);
        setLoading(false);
      });
  }, [employeeId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { documents, loading, refetch: fetch };
}

// Todos os documentos
export function useAllDocuments(companyId) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('documents')
      .select('*, employees(id, name)')
      .order('created_at', { ascending: false });
    if (companyId) query = query.eq('company_id', companyId);

    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setDocuments(data ?? []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { documents, loading, error, refetch: fetch };
}

// ============================================================
// HOOKS GLOBAIS — para telas de RH (Advertências e Férias)
// ============================================================

// Todas as advertências com dados do funcionário
export function useAllWarnings(companyId) {
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('employee_warnings')
      .select('*, employees!inner(id, name, dept, hue, company_id)')
      .order('date', { ascending: false });
    if (companyId) query = query.eq('employees.company_id', companyId);

    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setWarnings(data ?? []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { warnings, loading, error, refetch: fetch };
}

// Inserir nova advertência
export async function createWarning(data) {
  const { data: created, error } = await supabase
    .from('employee_warnings')
    .insert(data)
    .select('*, employees(id, name, dept, hue)')
    .single();
  return { created, error };
}

// Todas as férias (períodos aquisitivos) com dados do funcionário
export function useAllVacations(companyId) {
  const [vacations, setVacations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('employee_vacations')
      .select('*, employees!inner(id, name, dept, hue, company_id)')
      .order('period_start', { ascending: false });
    if (companyId) query = query.eq('employees.company_id', companyId);

    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setVacations(data ?? []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { vacations, loading, error, refetch: fetch };
}

// ============================================================
// BENEFÍCIOS
// ============================================================
export function useAllBenefits(companyId) {
  const [benefits, setBenefits] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('employee_benefits')
      .select('*, employees!inner(id, name, dept, hue, company_id)')
      .order('created_at', { ascending: false });
    if (companyId) query = query.eq('company_id', companyId);
    const { data } = await query;
    setBenefits(data ?? []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { benefits, loading, refetch: fetch };
}

export async function createBenefit(data) {
  const { data: created, error } = await supabase
    .from('employee_benefits')
    .insert(data)
    .select('*, employees(id, name, dept, hue)')
    .single();
  return { created, error };
}

export async function updateBenefitStatus(id, status) {
  const { error } = await supabase
    .from('employee_benefits')
    .update({ status })
    .eq('id', id);
  return { error };
}

export async function deleteBenefit(id) {
  const { error } = await supabase.from('employee_benefits').delete().eq('id', id);
  return { error };
}

// Atualizar status de férias
export async function updateVacationStatus(id, status) {
  const { error } = await supabase
    .from('employee_vacations')
    .update({ status })
    .eq('id', id);
  return { error };
}

// Inserir nova solicitação de férias
export async function createVacation(data) {
  const { data: created, error } = await supabase
    .from('employee_vacations')
    .insert(data)
    .select('*, employees(id, name, dept, hue)')
    .single();
  return { created, error };
}

// ============================================================
// CHECKLIST DE ADMISSÃO (onboarding_docs)
// ============================================================

export function useOnboardingDocs(employeeId) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(() => {
    if (!employeeId) return;
    setLoading(true);
    supabase
      .from('onboarding_docs')
      .select('*, documents(id, name, file_url)')
      .eq('employee_id', employeeId)
      .order('created_at')
      .then(({ data }) => { setDocs(data ?? []); setLoading(false); });
  }, [employeeId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { docs, loading, refetch: fetch };
}

export async function createOnboardingDocs(employee_id, items) {
  if (!items || items.length === 0) return { error: null };
  const rows = items.map(item => ({
    employee_id,
    name: item.name,
    category: item.category || 'contratos',
    required: item.required !== false,
    status: 'pending',
  }));
  const { error } = await supabase.from('onboarding_docs').insert(rows);
  return { error };
}

export async function markOnboardingDocUploaded(id, documentId) {
  const { error } = await supabase
    .from('onboarding_docs')
    .update({ status: 'uploaded', document_id: documentId })
    .eq('id', id);
  return { error };
}

// Retorna { pendingByEmployee: Map<empId, count>, totalPending: number }
export function useAllPendingOnboarding() {
  const [pendingByEmployee, setPendingByEmployee] = useState({});
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('onboarding_docs')
      .select('employee_id')
      .eq('status', 'pending');
    const map = {};
    (data ?? []).forEach(r => { map[r.employee_id] = (map[r.employee_id] || 0) + 1; });
    setPendingByEmployee(map);
    setTotalPending(data?.length ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { pendingByEmployee, totalPending, loading, refetch: fetch };
}

// Inserir documentos associados a um funcionário
export async function createDocuments(employee_id, docs, uploaded_by = null, company_id = null) {
  if (!docs || docs.length === 0) return { data: null, error: null };
  const docsData = docs.map(d => ({
    employee_id,
    company_id,
    name: d.name,
    category: d.category || 'contratos',
    size: d.size || '0 KB',
    type: d.type || 'pdf',
    status: 'ok',
    uploaded_by,
  }));
  const { data, error } = await supabase.from('documents').insert(docsData);
  return { data, error };
}

// Histórico de um funcionário
export function useEmployeeHistory(employeeId) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    supabase
      .from('employee_history')
      .select('*')
      .eq('employee_id', employeeId)
      .order('date', { ascending: false })
      .then(({ data }) => {
        setHistory(data ?? []);
        setLoading(false);
      });
  }, [employeeId]);

  return { history, loading };
}

// Entradas de ponto de um mês (por funcionário ou todos)
export function useMonthEntries(employeeId, monthYear) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(() => {
    if (!monthYear) return;
    setLoading(true);
    const [y, m] = monthYear.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    let q = supabase
      .from('time_entries')
      .select('*, employees(id, name, hue, dept)')
      .gte('date', `${monthYear}-01`)
      .lte('date', `${monthYear}-${String(lastDay).padStart(2, '0')}`)
      .order('date');
    if (employeeId) q = q.eq('employee_id', employeeId);
    q.then(({ data }) => { setEntries(data ?? []); setLoading(false); });
  }, [employeeId, monthYear]);

  useEffect(() => { fetch(); }, [fetch]);
  return { entries, loading, refetch: fetch };
}

export async function createTimeEntry(data) {
  const { data: created, error } = await supabase
    .from('time_entries')
    .insert(data)
    .select()
    .single();
  return { created, error };
}

// Ponto de um funcionário
export function useEmployeeTimeEntries(employeeId) {
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(() => {
    if (!employeeId) return;
    setLoading(true);
    supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', employeeId)
      .order('date', { ascending: false })
      .then(({ data }) => {
        setTimeEntries(data ?? []);
        setLoading(false);
      });
  }, [employeeId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { timeEntries, loading, refetch: fetch };
}

export async function clockIn(employeeId) {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  // Create an entry for today
  const { data, error } = await supabase.from('time_entries').insert({
    employee_id: employeeId,
    date: today,
    time_in: now,
    status: 'ok'
  });
  return { data, error };
}

export async function clockOut(employeeId, entryId) {
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  const { data, error } = await supabase.from('time_entries')
    .update({ time_out: now })
    .eq('id', entryId);
  return { data, error };
}

// Atividades (Audit log)
export function useActivities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setActivities(data ?? []);
        setLoading(false);
      });
  }, []);

  return { activities, loading };
}

// Perfis (User roles)
export function useProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('profiles')
      .select('*')
      .order('name')
      .then(({ data }) => {
        setProfiles(data ?? []);
        setLoading(false);
      });
  }, []);

  return { profiles, loading };
}

// Todos os pontos (Para visão da equipe)
export function useAllTimeEntries(dateStr) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dateStr) return;
    setLoading(true);
    supabase
      .from('time_entries')
      .select('*, employees(id, name, hue)')
      .eq('date', dateStr)
      .then(({ data }) => {
        setEntries(data ?? []);
        setLoading(false);
      });
  }, [dateStr]);

  return { entries, loading };
}

export function useAllTimecards(companyId) {
  const [timecards, setTimecards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      let query = supabase
        .from('timecards')
        .select('*, employees!inner(name, company_id)')
        .order('created_at', { ascending: false });
      if (companyId) query = query.eq('employees.company_id', companyId);
      const { data, error } = await query;
      if (!error && data) setTimecards(data);
      setLoading(false);
    }
    load();
  }, [companyId]);

  return { timecards, loading, setTimecards };
}

export async function createTimecard(data) {
  const { data: res, error } = await supabase
    .from('timecards')
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return res;
}

// ============================================================
// AUDITORIA
// ============================================================

export function useAuditLog({ companyId, days = 30 } = {}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    let query = supabase
      .from('audit_log')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500);
    if (companyId) query = query.eq('company_id', companyId);
    const { data } = await query;
    setLogs(data ?? []);
    setLoading(false);
  }, [companyId, days]);

  useEffect(() => { fetch(); }, [fetch]);
  return { logs, loading, refetch: fetch };
}

export async function addAuditEntry({ company_id, who, actor_id, action, target, ip, device }) {
  await supabase.from('audit_log').insert({ company_id, who, actor_id, action, target, ip, device });
}

export async function logAudit(company_id, action, target) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('audit_log').insert({
      company_id: company_id || null,
      who: user?.user_metadata?.name || user?.email || 'Sistema',
      actor_id: user?.id || null,
      action,
      target: target || null,
    });
  } catch (_) {}
}

// ============================================================
// JUSTIÇA — Processos trabalhistas
// ============================================================

export function useLaborCases(companyId) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('labor_cases').select('*').order('created_at', { ascending: false });
    if (companyId) query = query.eq('company_id', companyId);
    const { data } = await query;
    setCases(data ?? []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { cases, loading, refetch: fetch };
}

export async function createLaborCase(data) {
  const { data: created, error } = await supabase.from('labor_cases').insert(data).select().single();
  return { created, error };
}

export async function updateLaborCase(id, data) {
  const { error } = await supabase.from('labor_cases').update(data).eq('id', id);
  return { error };
}

// JUSTIÇA — Histórico de documentos gerados
export function useJusticeHistory(companyId) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('justice_history')
      .select('*, employees(name)')
      .order('created_at', { ascending: false });
    if (companyId) query = query.eq('company_id', companyId);
    const { data } = await query;
    setHistory(data ?? []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { history, loading, refetch: fetch };
}

export async function createJusticeHistoryEntry(data) {
  const { error } = await supabase.from('justice_history').insert(data);
  return { error };
}

// ============================================================
// CONVITES
// ============================================================

export function usePendingInvites() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('pending_invites')
      .select('*')
      .order('created_at', { ascending: false });
    setInvites(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { invites, loading, refetch: fetch };
}

export async function sendInvite({ email, role, companyIds }) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(
    `${supabase.supabaseUrl}/functions/v1/send-invite`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': supabase.supabaseKey,
        'origin': window.location.origin,
      },
      body: JSON.stringify({ email, role, companyIds }),
    }
  );
  const data = await res.json();
  if (!res.ok) return { data: null, error: { message: data.error ?? 'Erro ao enviar convite' } };
  return { data, error: null };
}

export async function deleteInvite(id) {
  const { error } = await supabase.from('pending_invites').delete().eq('id', id);
  return { error };
}

export function usePendingInvitesByCompany(companyId) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!companyId) { setInvites([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('pending_invites')
      .select('*')
      .order('created_at', { ascending: false });
    // Filter client-side: invite must include this company
    setInvites((data ?? []).filter(inv => inv.company_ids?.includes(companyId)));
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { invites, loading, refetch: fetch };
}

// ============================================================
// PERMISSÕES
// ============================================================

export function useCompanyUsers(companyId) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!companyId) { setMembers([]); setLoading(false); return; }
    setLoading(true);
    const { data: ucs } = await supabase
      .from('user_companies')
      .select('user_id, role, grants')
      .eq('company_id', companyId);
    if (!ucs || ucs.length === 0) { setMembers([]); setLoading(false); return; }
    const ids = ucs.map(u => u.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_hue, active')
      .in('id', ids);
    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));
    setMembers(ucs.map(uc => ({ ...uc, profile: profileMap[uc.user_id] ?? null })));
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { members, loading, refetch: fetch };
}

export async function updateUserCompany(userId, companyId, { role, grants }) {
  const { error } = await supabase
    .from('user_companies')
    .update({ role, grants })
    .eq('user_id', userId)
    .eq('company_id', companyId);
  return { error };
}

// Verifica se um e-mail já tem perfil no sistema
export async function findProfileByEmail(email) {
  const { data } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_hue')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  return data ?? null;
}

// Promove diretamente um usuário existente para uma empresa (sem convite)
export async function promoteUserToCompany(userId, companyId, role = 'Operacional') {
  const { error } = await supabase
    .from('user_companies')
    .upsert({ user_id: userId, company_id: companyId, role, grants: {} }, { onConflict: 'user_id,company_id' });
  return { error };
}

// Remove acesso de um usuário a uma empresa
export async function revokeUserCompany(userId, companyId) {
  const { error } = await supabase
    .from('user_companies')
    .delete()
    .eq('user_id', userId)
    .eq('company_id', companyId);
  return { error };
}

// Vincula employee.user_id após promoção/convite aceito
export async function linkEmployeeUser(employeeId, userId) {
  const { error } = await supabase
    .from('employees')
    .update({ user_id: userId })
    .eq('id', employeeId);
  return { error };
}
