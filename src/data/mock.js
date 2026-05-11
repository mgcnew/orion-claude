// Mock data for the Orion Gestão prototype.

export const employees = [
  { id: 1,  name: 'Mariana Sales Oliveira',     role: 'Gerente de RH',          dept: 'Recursos Humanos', company: 'Orion Matriz',    status: 'ativo',     lastSeen: 'há 4 min',   pending: 0, admission: '2019-03-12', initials: 'MS', hue: 215 },
  { id: 2,  name: 'Rafael Carneiro Lima',       role: 'Analista Fiscal Sr.',    dept: 'Financeiro',       company: 'Orion Matriz',    status: 'ativo',     lastSeen: 'há 12 min',  pending: 2, admission: '2021-06-01', initials: 'RC', hue: 28  },
  { id: 3,  name: 'Beatriz Almeida Souza',      role: 'Coord. Operacional',     dept: 'Operações',        company: 'Orion Filial SP', status: 'férias',    lastSeen: 'há 6 dias',  pending: 0, admission: '2018-09-22', initials: 'BA', hue: 145 },
  { id: 4,  name: 'Diego Pacheco Ferraz',       role: 'Auxiliar Administrativo',dept: 'Administrativo',   company: 'Orion Filial RJ', status: 'afastado',  lastSeen: 'há 22 dias', pending: 4, admission: '2022-02-14', initials: 'DP', hue: 350 },
  { id: 5,  name: 'Camila Rocha Barros',        role: 'Supervisora de Loja',    dept: 'Comercial',        company: 'Orion Filial MG', status: 'ativo',     lastSeen: 'agora',      pending: 1, admission: '2020-11-04', initials: 'CR', hue: 268 },
  { id: 6,  name: 'Henrique Tavares Melo',      role: 'Desenvolvedor Pleno',    dept: 'Tecnologia',       company: 'Orion Matriz',    status: 'ativo',     lastSeen: 'há 2 h',     pending: 0, admission: '2023-01-09', initials: 'HT', hue: 195 },
  { id: 7,  name: 'Luiza Andrade Pires',        role: 'Estagiária Jurídico',    dept: 'Jurídico',         company: 'Orion Matriz',    status: 'ativo',     lastSeen: 'há 38 min',  pending: 3, admission: '2024-08-19', initials: 'LA', hue: 12  },
  { id: 8,  name: 'Marcos Vinicius Reis',       role: 'Motorista',              dept: 'Logística',        company: 'Orion Filial SP', status: 'ativo',     lastSeen: 'há 1 h',      pending: 0, admission: '2017-04-30', initials: 'MV', hue: 90  },
  { id: 9,  name: 'Patricia Nobre Vasconcelos', role: 'Analista de Folha',      dept: 'Recursos Humanos', company: 'Orion Matriz',    status: 'ativo',     lastSeen: 'há 9 min',   pending: 1, admission: '2019-12-02', initials: 'PN', hue: 320 },
  { id: 10, name: 'Thiago Albuquerque',         role: 'Vendedor',               dept: 'Comercial',        company: 'Orion Filial MG', status: 'desligado', lastSeen: 'há 3 meses', pending: 0, admission: '2016-07-15', initials: 'TA', hue: 60  },
  { id: 11, name: 'Isabela Mota Cardoso',       role: 'Designer',               dept: 'Marketing',        company: 'Orion Matriz',    status: 'ativo',     lastSeen: 'há 1 dia',    pending: 0, admission: '2022-10-10', initials: 'IM', hue: 285 },
  { id: 12, name: 'Felipe Coutinho Braga',      role: 'Auxiliar de Estoque',    dept: 'Logística',        company: 'Orion Filial RJ', status: 'ativo',     lastSeen: 'há 18 min',  pending: 2, admission: '2021-03-08', initials: 'FC', hue: 165 },
];

export const documentCategories = [
  { id: 'contratos',    name: 'Contratos',      count: 248,  color: '#2A5BFF', icon: 'doc' },
  { id: 'rg-cpf',       name: 'RG / CPF',       count: 412,  color: '#1F8A5B', icon: 'user' },
  { id: 'holerites',    name: 'Holerites',      count: 1872, color: '#C58A1B', icon: 'pdf' },
  { id: 'atestados',    name: 'Atestados',      count: 96,   color: '#C2412C', icon: 'image' },
  { id: 'advertencias', name: 'Advertências',   count: 31,   color: '#a855f7', icon: 'alert' },
  { id: 'ferias',       name: 'Férias',         count: 144,  color: '#0891b2', icon: 'umbrella' },
  { id: 'juridico',     name: 'Jurídico',       count: 58,   color: '#475569', icon: 'shield' },
  { id: 'exames',       name: 'Exames Médicos', count: 187,  color: '#db2777', icon: 'fingerprint' },
];

export const documents = [
  { name: 'Contrato_RafaelCarneiro.pdf',   cat: 'contratos',    size: '1.2 MB', who: 'Mariana S.', date: 'Hoje, 09:42', type: 'pdf',   status: 'ok' },
  { name: 'RG_BeatrizAlmeida.jpg',          cat: 'rg-cpf',       size: '820 KB', who: 'Beatriz A.', date: 'Hoje, 08:14', type: 'image', status: 'ok' },
  { name: 'Holerite_Outubro_2026.pdf',      cat: 'holerites',    size: '640 KB', who: 'Sistema',    date: 'Ontem 23:00', type: 'pdf',   status: 'ok' },
  { name: 'Atestado_DiegoPacheco_22d.pdf',  cat: 'atestados',    size: '310 KB', who: 'Diego P.',   date: 'Ontem 17:21', type: 'pdf',   status: 'warn' },
  { name: 'Advertencia_HT_Atraso.pdf',      cat: 'advertencias', size: '120 KB', who: 'Mariana S.', date: '07 mai',      type: 'pdf',   status: 'bad' },
  { name: 'Acordo_Rescisao_TA.pdf',         cat: 'juridico',     size: '1.8 MB', who: 'Jurídico',   date: '06 mai',      type: 'pdf',   status: 'ok' },
  { name: 'Exame_Admissional_LuizaA.pdf',   cat: 'exames',       size: '540 KB', who: 'Luiza A.',   date: '05 mai',      type: 'pdf',   status: 'ok' },
  { name: 'Solicitacao_Ferias_BA.pdf',      cat: 'ferias',       size: '210 KB', who: 'Beatriz A.', date: '04 mai',      type: 'pdf',   status: 'ok' },
  { name: 'CPF_FelipeCoutinho.pdf',         cat: 'rg-cpf',       size: '180 KB', who: 'Felipe C.',  date: '03 mai',      type: 'pdf',   status: 'ok' },
  { name: 'Termo_Confidencialidade_HT.pdf', cat: 'contratos',    size: '420 KB', who: 'Jurídico',   date: '02 mai',      type: 'pdf',   status: 'ok' },
];

export const activities = [
  { who: 'Mariana S.',  what: 'fez upload de 4 documentos em',      where: 'Contratos',            when: 'há 6 min', kind: 'upload' },
  { who: 'Sistema',     what: 'gerou os holerites de outubro para', where: '248 funcionários',     when: 'há 1 h',   kind: 'system' },
  { who: 'Rafael C.',   what: 'registrou ponto de saída em',        where: 'Orion Matriz',         when: 'há 1 h',   kind: 'clock' },
  { who: 'Beatriz A.',  what: 'solicitou férias para',              where: '12 / 06 — 26 / 06',    when: 'há 2 h',   kind: 'umbrella' },
  { who: 'Patricia N.', what: 'aplicou advertência verbal a',       where: 'Henrique Tavares',     when: 'há 3 h',   kind: 'alert' },
  { who: 'Diego P.',    what: 'enviou atestado médico de',          where: '22 dias',              when: 'há 5 h',   kind: 'doc' },
  { who: 'Camila R.',   what: 'aprovou 14 horas extras em',         where: 'Orion Filial MG',      when: 'há 6 h',   kind: 'check' },
];

export const auditLog = [
  { who: 'Mariana Oliveira', action: 'EDITOU',  target: 'Funcionário · Rafael Carneiro',           ip: '189.45.22.10', device: 'MacBook · Safari',     when: 'Hoje, 09:42:11' },
  { who: 'Mariana Oliveira', action: 'UPLOAD',  target: 'Documento · Contrato_RafaelCarneiro.pdf', ip: '189.45.22.10', device: 'MacBook · Safari',     when: 'Hoje, 09:41:58' },
  { who: 'Henrique Tavares', action: 'ACESSOU', target: 'Módulo · Documentos',                     ip: '200.10.84.12', device: 'Windows · Chrome',     when: 'Hoje, 09:38:22' },
  { who: 'Sistema',          action: 'GEROU',   target: 'Holerites · Outubro 2026 (248)',          ip: '—',            device: 'Job · scheduler-prod', when: 'Hoje, 08:00:00' },
  { who: 'Beatriz Almeida',  action: 'EXPORT',  target: 'Relatório · Folha_Out_2026.xlsx',         ip: '177.90.11.42', device: 'iPhone · iOS App',     when: 'Ontem, 18:14:09' },
  { who: 'Diego Pacheco',    action: 'LOGIN',   target: 'Sessão iniciada',                         ip: '201.55.7.211', device: 'Android · App',        when: 'Ontem, 17:21:33' },
  { who: 'Patricia Nobre',   action: 'EXCLUIU', target: 'Documento · rascunho_v2.pdf',             ip: '189.45.22.10', device: 'MacBook · Chrome',     when: 'Ontem, 14:02:55' },
  { who: 'Mariana Oliveira', action: 'ASSINOU', target: 'Contrato · Henrique Tavares',             ip: '189.45.22.10', device: 'MacBook · Safari',     when: '07 mai, 10:30:12' },
];

export const warnings = [
  { id: 1, emp: 'Henrique Tavares Melo',      dept: 'Tecnologia',       type: 'escrita',   reason: 'Atraso recorrente',              date: '07 mai 2026', appliedBy: 'Patricia Nobre',    status: 'ativa',   hue: 195 },
  { id: 2, emp: 'Diego Pacheco Ferraz',        dept: 'Administrativo',   type: 'suspensão', reason: 'Falta injustificada (3 dias)',    date: '02 mai 2026', appliedBy: 'Mariana Oliveira',  status: 'ativa',   hue: 350 },
  { id: 3, emp: 'Felipe Coutinho Braga',       dept: 'Logística',        type: 'verbal',    reason: 'Uso indevido de equipamento',    date: '28 abr 2026', appliedBy: 'Patricia Nobre',    status: 'ativa',   hue: 165 },
  { id: 4, emp: 'Thiago Albuquerque',          dept: 'Comercial',        type: 'escrita',   reason: 'Descumprimento de metas',        date: '15 abr 2026', appliedBy: 'Camila Rocha',      status: 'expirada', hue: 60 },
  { id: 5, emp: 'Marcos Vinicius Reis',        dept: 'Logística',        type: 'verbal',    reason: 'Comunicação inadequada',         date: '10 abr 2026', appliedBy: 'Mariana Oliveira',  status: 'expirada', hue: 90 },
  { id: 6, emp: 'Rafael Carneiro Lima',        dept: 'Financeiro',       type: 'verbal',    reason: 'Atraso na entrega de relatório', date: '01 abr 2026', appliedBy: 'Patricia Nobre',    status: 'expirada', hue: 28 },
];

export const vacations = [
  { id: 1, emp: 'Beatriz Almeida Souza',       dept: 'Operações',        start: '15 mai 2026', end: '28 mai 2026', days: 14, requestedAt: '02 mai 2026', approvedBy: 'Mariana Oliveira',  status: 'aprovado', hue: 145 },
  { id: 2, emp: 'Rafael Carneiro Lima',         dept: 'Financeiro',       start: '01 jun 2026', end: '30 jun 2026', days: 30, requestedAt: '08 mai 2026', approvedBy: null,                status: 'pendente', hue: 28 },
  { id: 3, emp: 'Marcos Vinicius Reis',         dept: 'Logística',        start: '16 jun 2026', end: '05 jul 2026', days: 20, requestedAt: '07 mai 2026', approvedBy: null,                status: 'pendente', hue: 90 },
  { id: 4, emp: 'Luiza Andrade Pires',          dept: 'Jurídico',         start: '04 ago 2026', end: '17 ago 2026', days: 14, requestedAt: '05 mai 2026', approvedBy: 'Mariana Oliveira',  status: 'aprovado', hue: 12 },
  { id: 5, emp: 'Thiago Albuquerque',           dept: 'Comercial',        start: '10 mar 2026', end: '24 mar 2026', days: 15, requestedAt: '20 fev 2026', approvedBy: 'Camila Rocha',      status: 'concluído', hue: 60 },
  { id: 6, emp: 'Isabela Mota Cardoso',         dept: 'Marketing',        start: '22 set 2026', end: '05 out 2026', days: 14, requestedAt: '09 mai 2026', approvedBy: null,                status: 'pendente', hue: 285 },
];

export const orgChart = {
  name: 'Ana Rodrigues',
  role: 'CEO',
  dept: 'Diretoria',
  hue: 265,
  children: [
    {
      name: 'Mariana Sales Oliveira',
      role: 'Gerente de RH',
      dept: 'Recursos Humanos',
      hue: 215,
      children: [
        { name: 'Patricia Nobre Vasconcelos', role: 'Analista de Folha',   dept: 'RH',      hue: 320, children: [] },
        { name: 'Luiza Andrade Pires',        role: 'Estagiária Jurídico', dept: 'Jurídico', hue: 12,  children: [] },
      ],
    },
    {
      name: 'Beatriz Almeida Souza',
      role: 'Coord. Operacional',
      dept: 'Operações',
      hue: 145,
      children: [
        { name: 'Camila Rocha Barros',   role: 'Supervisora de Loja',     dept: 'Comercial',    hue: 268, children: [
          { name: 'Thiago Albuquerque', role: 'Vendedor', dept: 'Comercial', hue: 60, children: [] },
        ]},
        { name: 'Diego Pacheco Ferraz',  role: 'Auxiliar Administrativo', dept: 'Administrativo', hue: 350, children: [] },
      ],
    },
    {
      name: 'Rafael Carneiro Lima',
      role: 'Analista Fiscal Sr.',
      dept: 'Financeiro',
      hue: 28,
      children: [],
    },
    {
      name: 'Henrique Tavares Melo',
      role: 'Desenvolvedor Pleno',
      dept: 'Tecnologia',
      hue: 195,
      children: [
        { name: 'Isabela Mota Cardoso', role: 'Designer', dept: 'Marketing', hue: 285, children: [] },
      ],
    },
    {
      name: 'Marcos Vinicius Reis',
      role: 'Motorista',
      dept: 'Logística',
      hue: 90,
      children: [
        { name: 'Felipe Coutinho Braga', role: 'Auxiliar de Estoque', dept: 'Logística', hue: 165, children: [] },
      ],
    },
  ],
};

// Numeric series for sparklines & bars
export const admissionsSeries = [4, 7, 5, 9, 6, 11, 8, 13, 10, 14, 12, 16];
export const absencesSeries = [12, 9, 14, 8, 11, 7, 13, 6, 9, 5, 8, 6];
export const hoursWeek = [
  { d: 'Seg', a: 8.0, e: 1.5 },
  { d: 'Ter', a: 8.2, e: 0.8 },
  { d: 'Qua', a: 7.8, e: 2.1 },
  { d: 'Qui', a: 8.5, e: 1.2 },
  { d: 'Sex', a: 8.1, e: 0.6 },
  { d: 'Sáb', a: 4.0, e: 0.0 },
];

export const permissionsModules = [
  { module: 'Funcionários', perms: ['ver', 'criar', 'editar', 'arquivar', 'exportar'] },
  { module: 'Documentos',   perms: ['ver', 'upload', 'baixar', 'excluir', 'compartilhar'] },
  { module: 'Ponto',        perms: ['ver', 'registrar', 'ajustar', 'aprovar h.ext', 'exportar'] },
  { module: 'RH',           perms: ['advertir', 'férias', 'benefícios', 'avaliar', 'holerites'] },
  { module: 'Relatórios',   perms: ['funcionários', 'ponto', 'jurídico', 'auditoria', 'exportar'] },
  { module: 'Administração',perms: ['usuários', 'permissões', 'convites', 'logs', 'config'] },
];

export const userRoles = [
  { name: 'Mariana Oliveira',  role: 'Administrador', email: 'mariana@orion.com.br',  active: true },
  { name: 'Patricia Nobre',    role: 'RH',            email: 'patricia@orion.com.br', active: true },
  { name: 'Camila Rocha',      role: 'Supervisor',    email: 'camila@orion.com.br',   active: true },
  { name: 'Felipe Coutinho',   role: 'Auxiliar Adm.', email: 'felipe@orion.com.br',   active: true },
  { name: 'Tiago Albuquerque', role: 'Operacional',   email: 'tiago@orion.com.br',    active: false },
];
