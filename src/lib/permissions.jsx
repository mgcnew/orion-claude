import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase.js';

// ── Módulos e permissões do sistema ──────────────────────────
export const MODULES = [
  { module: 'Funcionários', perms: ['ver', 'criar', 'editar', 'arquivar', 'exportar'] },
  { module: 'Documentos',   perms: ['ver', 'upload', 'baixar', 'excluir', 'compartilhar'] },
  { module: 'Ponto',        perms: ['ver', 'registrar', 'ajustar', 'aprovar h.ext', 'exportar'] },
  { module: 'RH',           perms: ['advertir', 'férias', 'benefícios', 'avaliar', 'holerites'] },
  { module: 'Relatórios',   perms: ['funcionários', 'ponto', 'jurídico', 'auditoria', 'exportar'] },
  { module: 'Administração',perms: ['usuários', 'permissões', 'convites', 'logs', 'config'] },
];

export const ROLES = ['Administrador', 'RH', 'Supervisor', 'Operacional'];

// ── Templates padrão por papel ────────────────────────────────
export const ROLE_TEMPLATES = {
  Administrador: Object.fromEntries(
    MODULES.flatMap(m => m.perms.map(p => [`${m.module}.${p}`, true]))
  ),
  RH: {
    'Funcionários.ver': true,  'Funcionários.criar': true,   'Funcionários.editar': true,  'Funcionários.arquivar': true,  'Funcionários.exportar': true,
    'Documentos.ver': true,    'Documentos.upload': true,    'Documentos.baixar': true,    'Documentos.excluir': false,    'Documentos.compartilhar': true,
    'Ponto.ver': true,         'Ponto.registrar': true,      'Ponto.ajustar': true,        'Ponto.aprovar h.ext': true,    'Ponto.exportar': true,
    'RH.advertir': true,       'RH.férias': true,            'RH.benefícios': true,        'RH.avaliar': true,             'RH.holerites': true,
    'Relatórios.funcionários': true, 'Relatórios.ponto': true, 'Relatórios.jurídico': false, 'Relatórios.auditoria': false, 'Relatórios.exportar': true,
    'Administração.usuários': false, 'Administração.permissões': false, 'Administração.convites': false, 'Administração.logs': false, 'Administração.config': false,
  },
  Supervisor: {
    'Funcionários.ver': true,  'Funcionários.criar': false,  'Funcionários.editar': false, 'Funcionários.arquivar': false, 'Funcionários.exportar': true,
    'Documentos.ver': true,    'Documentos.upload': false,   'Documentos.baixar': true,    'Documentos.excluir': false,    'Documentos.compartilhar': false,
    'Ponto.ver': true,         'Ponto.registrar': true,      'Ponto.ajustar': false,       'Ponto.aprovar h.ext': true,    'Ponto.exportar': true,
    'RH.advertir': false,      'RH.férias': true,            'RH.benefícios': false,       'RH.avaliar': true,             'RH.holerites': false,
    'Relatórios.funcionários': true, 'Relatórios.ponto': true, 'Relatórios.jurídico': false, 'Relatórios.auditoria': false, 'Relatórios.exportar': true,
    'Administração.usuários': false, 'Administração.permissões': false, 'Administração.convites': false, 'Administração.logs': false, 'Administração.config': false,
  },
  Operacional: {
    'Funcionários.ver': true,  'Funcionários.criar': false,  'Funcionários.editar': false, 'Funcionários.arquivar': false, 'Funcionários.exportar': false,
    'Documentos.ver': true,    'Documentos.upload': false,   'Documentos.baixar': true,    'Documentos.excluir': false,    'Documentos.compartilhar': false,
    'Ponto.ver': true,         'Ponto.registrar': true,      'Ponto.ajustar': false,       'Ponto.aprovar h.ext': false,   'Ponto.exportar': false,
    'RH.advertir': false,      'RH.férias': true,            'RH.benefícios': false,       'RH.avaliar': false,            'RH.holerites': false,
    'Relatórios.funcionários': false, 'Relatórios.ponto': false, 'Relatórios.jurídico': false, 'Relatórios.auditoria': false, 'Relatórios.exportar': false,
    'Administração.usuários': false, 'Administração.permissões': false, 'Administração.convites': false, 'Administração.logs': false, 'Administração.config': false,
  },
};

// ── Resolução efetiva de uma permissão ────────────────────────
function resolve(module, perm, { isOwner, role, grants }) {
  if (isOwner) return true;
  if (role === 'Administrador') return true;
  const key = `${module}.${perm}`;
  if (grants[key] !== undefined) return Boolean(grants[key]);
  const tpl = ROLE_TEMPLATES[role] ?? ROLE_TEMPLATES.Operacional;
  return tpl[key] ?? false;
}

// ── Context ───────────────────────────────────────────────────
const PermissionsContext = createContext({
  can: () => true,
  isOwner: true,
  role: 'Administrador',
  loading: false,
});

export function usePermissions() {
  return useContext(PermissionsContext);
}

// ── Provider ──────────────────────────────────────────────────
export function PermissionsProvider({ children, userId, activeCompanyId, ownedCompanyIds }) {
  const [state, setState] = useState({ role: 'Operacional', grants: {}, loading: true });

  const isOwner = Boolean(activeCompanyId && ownedCompanyIds?.includes(activeCompanyId));
  const noCompany = !activeCompanyId;

  useEffect(() => {
    if (!userId) {
      setState({ role: 'Operacional', grants: {}, loading: false });
      return;
    }
    if (!activeCompanyId || isOwner) {
      setState({ role: 'Administrador', grants: {}, loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      setState(s => ({ ...s, loading: true }));
      const { data } = await supabase
        .from('user_companies')
        .select('role, grants')
        .eq('user_id', userId)
        .eq('company_id', activeCompanyId)
        .maybeSingle();
      if (!cancelled) {
        setState({ role: data?.role ?? 'Operacional', grants: data?.grants ?? {}, loading: false });
      }
    })();
    return () => { cancelled = true; };
  }, [userId, activeCompanyId, isOwner]);

  const can = useCallback((module, perm) => {
    if (noCompany) return true;
    return resolve(module, perm, { isOwner, role: state.role, grants: state.grants });
  }, [isOwner, noCompany, state.role, state.grants]);

  return (
    <PermissionsContext.Provider value={{ can, isOwner, role: state.role, loading: state.loading }}>
      {children}
    </PermissionsContext.Provider>
  );
}
