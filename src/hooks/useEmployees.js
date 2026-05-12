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
export function useEmployeeCounts() {
  const [counts, setCounts] = useState({ todos: 0, ativo: 0, férias: 0, afastado: 0, desligado: 0 });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('employees').select('status');
    if (!data) { setLoading(false); return; }
    const c = { todos: data.length, ativo: 0, férias: 0, afastado: 0, desligado: 0 };
    data.forEach((e) => { if (c[e.status] !== undefined) c[e.status]++; });
    setCounts(c);
    setLoading(false);
  }, []);

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
export function useAllDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('documents')
      .select('*, employees(id, name)')
      .order('created_at', { ascending: false });

    if (err) setError(err.message);
    else setDocuments(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { documents, loading, error, refetch: fetch };
}

// ============================================================
// HOOKS GLOBAIS — para telas de RH (Advertências e Férias)
// ============================================================

// Todas as advertências com dados do funcionário
export function useAllWarnings() {
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('employee_warnings')
      .select('*, employees(id, name, dept, hue)')
      .order('date', { ascending: false });

    if (err) setError(err.message);
    else setWarnings(data ?? []);
    setLoading(false);
  }, []);

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
export function useAllVacations() {
  const [vacations, setVacations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('employee_vacations')
      .select('*, employees(id, name, dept, hue)')
      .order('period_start', { ascending: false });

    if (err) setError(err.message);
    else setVacations(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { vacations, loading, error, refetch: fetch };
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

// Inserir documentos associados a um funcionário
export async function createDocuments(employee_id, docs, uploaded_by = null) {
  if (!docs || docs.length === 0) return { data: null, error: null };
  const docsData = docs.map(d => ({
    employee_id,
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

export function useAllTimecards() {
  const [timecards, setTimecards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('timecards')
        .select('*, employees(name)')
        .order('created_at', { ascending: false });
      if (!error && data) setTimecards(data);
      setLoading(false);
    }
    load();
  }, []);

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
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('pending_invites')
    .insert({ email, role, company_ids: companyIds, invited_by: user?.id })
    .select()
    .single();
  return { data, error };
}
