import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

// Lista de funcionários com filtro opcional por status e busca textual
export function useEmployees({ status, search } = {}) {
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

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,role.ilike.%${search}%,dept.ilike.%${search}%`
      );
    }

    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setEmployees(data ?? []);
    setLoading(false);
  }, [status, search]);

  useEffect(() => { fetch(); }, [fetch]);

  return { employees, loading, error, refetch: fetch };
}

// Funcionário individual por ID
export function useEmployee(id) {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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

  return { employee, loading, error };
}

// Contagens por status (para os tabs e KPIs)
export function useEmployeeCounts() {
  const [counts, setCounts] = useState({ todos: 0, ativo: 0, férias: 0, afastado: 0, desligado: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('employees')
      .select('status')
      .then(({ data }) => {
        if (!data) return;
        const c = { todos: data.length, ativo: 0, férias: 0, afastado: 0, desligado: 0 };
        data.forEach((e) => { if (c[e.status] !== undefined) c[e.status]++; });
        setCounts(c);
        setLoading(false);
      });
  }, []);

  return { counts, loading };
}

// Inserir novo funcionário
export async function createEmployee(data) {
  const { data: created, error } = await supabase
    .from('employees')
    .insert(data)
    .select()
    .single();
  return { created, error };
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
