import { useState } from 'react';
import Icon from './Icon.jsx';
import { useTutorial } from '../hooks/useTutorial.js';

export const TUTORIALS = {
  dashboard: {
    title: 'Dashboard — Visão geral',
    icon: 'dashboard',
    color: '#2A5BFF',
    tips: [
      { icon: 'chart', text: 'Os KPIs do topo mostram totais em tempo real: funcionários ativos, documentos pendentes e alertas.' },
      { icon: 'users', text: 'O gráfico de admissões compara entradas e saídas dos últimos 12 meses por empresa selecionada.' },
      { icon: 'pie', text: '"Composição da equipe" detalha a distribuição por situação: ativos, férias, afastados e desligados.' },
      { icon: 'clock', text: 'A seção "Atividade recente" exibe as últimas ações registradas na trilha de auditoria.' },
      { icon: 'sparkle', text: 'Os atalhos rápidos permitem criar documentos, funcionários, advertências e muito mais com um clique.' },
    ],
  },
  employees: {
    title: 'Funcionários — Lista',
    icon: 'users',
    color: '#1F8A5B',
    tips: [
      { icon: 'search', text: 'Use a busca para encontrar funcionários por nome, cargo ou departamento instantaneamente.' },
      { icon: 'filter', text: 'Filtre por situação (ativo, férias, afastado, desligado) e por departamento ou empresa.' },
      { icon: 'user', text: 'Clique em qualquer funcionário para abrir o perfil completo com todos os seus dados.' },
      { icon: 'plus', text: 'O botão "Novo funcionário" abre um cadastro com foto, cargo, salário e informações de contato.' },
      { icon: 'check', text: 'Selecione múltiplos funcionários com os checkboxes para realizar ações em lote.' },
    ],
  },
  'employees-profile': {
    title: 'Perfil do funcionário',
    icon: 'user',
    color: '#7C3AED',
    tips: [
      { icon: 'edit', text: 'Clique em qualquer campo para editar os dados do funcionário diretamente no perfil.' },
      { icon: 'doc', text: 'A aba "Documentos" lista todos os arquivos vinculados a esse funcionário com acesso rápido.' },
      { icon: 'alert', text: 'A aba "Ocorrências" registra advertências, suspensões e outros eventos disciplinares.' },
      { icon: 'umbrella', text: 'Gerencie períodos de férias, afastamentos e licenças na aba correspondente.' },
      { icon: 'shield', text: 'O histórico do funcionário é preservado mesmo após desligamento para fins legais.' },
    ],
  },
  documents: {
    title: 'Documentos',
    icon: 'doc',
    color: '#C58A1B',
    tips: [
      { icon: 'folder', text: 'Documentos são organizados em 9 categorias: Contratos, RG/CPF, Holerites, Atestados e mais.' },
      { icon: 'upload', text: 'Imagens enviadas são comprimidas automaticamente antes do upload sem perda de qualidade perceptível.' },
      { icon: 'filter', text: 'Use os filtros para combinar categoria, período de data e busca por nome ou funcionário.' },
      { icon: 'eye', text: 'Clique no ícone de olho ou no nome do arquivo para visualizar diretamente sem baixar.' },
      { icon: 'camera', text: 'No celular, o botão "Tirar foto" permite escanear documentos diretamente pela câmera.' },
    ],
  },
  time: {
    title: 'Controle de ponto',
    icon: 'clock',
    color: '#0f766e',
    tips: [
      { icon: 'clock', text: 'Visualize todos os registros de ponto por funcionário, data e turno em uma única tela.' },
      { icon: 'filter', text: 'Filtre por período, funcionário ou empresa para localizar registros específicos rapidamente.' },
      { icon: 'alert', text: 'Inconsistências como ausências e horas extras são sinalizadas automaticamente.' },
      { icon: 'download', text: 'Exporte os registros em formato compatível com a folha de pagamento.' },
      { icon: 'edit', text: 'Registros podem ser ajustados com justificativa para manter a conformidade trabalhista.' },
    ],
  },
  rh: {
    title: 'RH — Ocorrências e avisos',
    icon: 'alert',
    color: '#C2412C',
    tips: [
      { icon: 'alert', text: 'Registre advertências verbais, escritas e suspensões vinculadas diretamente ao funcionário.' },
      { icon: 'doc', text: 'Cada ocorrência gera um documento imprimível para assinatura e arquivamento.' },
      { icon: 'clock', text: 'Avisos de vencimento de exames, contratos e férias aparecem com antecedência configurável.' },
      { icon: 'filter', text: 'Filtre ocorrências por tipo, funcionário, empresa ou período para análises específicas.' },
      { icon: 'check', text: 'Marque ocorrências como resolvidas para manter o histórico sem poluir a visão atual.' },
    ],
  },
  justice: {
    title: 'Jurídico — Processos trabalhistas',
    icon: 'shield',
    color: '#475569',
    tips: [
      { icon: 'shield', text: 'Cadastre e acompanhe processos trabalhistas com número, tipo, fase e partes envolvidas.' },
      { icon: 'doc', text: 'Vincule documentos como petições, acordos e sentenças diretamente ao processo.' },
      { icon: 'alert', text: 'Processos com prazos próximos são destacados automaticamente para não perder audiências.' },
      { icon: 'filter', text: 'Filtre por status (ativo, encerrado, acordo), tipo de ação ou funcionário reclamante.' },
      { icon: 'edit', text: 'Atualize o andamento processual com notas e registre cada movimentação do processo.' },
    ],
  },
  audit: {
    title: 'Auditoria — Trilha de eventos',
    icon: 'shield',
    color: '#0891b2',
    tips: [
      { icon: 'shield', text: 'A trilha de auditoria é imutável: cada ação realizada no sistema fica registrada permanentemente.' },
      { icon: 'filter', text: 'Filtre por período (hoje, 7 dias, 30 dias, trimestre) e busque por usuário ou ação.' },
      { icon: 'user', text: 'Cada evento registra quem fez, o quê fez, o alvo da ação, o IP e o dispositivo usado.' },
      { icon: 'alert', text: 'Os KPIs no topo destacam exportações e exclusões — eventos que exigem mais atenção.' },
      { icon: 'refresh', text: 'Clique em "Atualizar" para trazer eventos registrados após a abertura da página.' },
    ],
  },
  reports: {
    title: 'Relatórios',
    icon: 'chart',
    color: '#db2777',
    tips: [
      { icon: 'chart', text: 'Gere relatórios de headcount, folha de pagamento, ponto e documentos por empresa.' },
      { icon: 'filter', text: 'Aplique filtros de período, empresa e departamento antes de gerar o relatório.' },
      { icon: 'download', text: 'Exporte em PDF ou Excel para compartilhar com contadores e gestores externos.' },
      { icon: 'clock', text: 'Relatórios ficam disponíveis no histórico para re-download sem precisar regenerar.' },
      { icon: 'sparkle', text: 'Use os relatórios de auditoria para comprovar conformidade em fiscalizações trabalhistas.' },
    ],
  },
  clt: {
    title: 'CLT — Calculadora de direitos',
    icon: 'doc',
    color: '#0891b2',
    tips: [
      { icon: 'doc', text: 'Simule rescisões CLT com cálculo automático de FGTS, aviso prévio, férias e 13º proporcional.' },
      { icon: 'chart', text: 'A aba "Valores" apresenta tabelas de INSS, FGTS e IR atualizadas para o ano vigente.' },
      { icon: 'sparkle', text: 'Selecione o tipo de rescisão (sem justa causa, pedido de demissão, justa causa e mais) para cálculos precisos.' },
      { icon: 'doc', text: 'A aba "Direitos" resume as principais garantias trabalhistas da CLT para consulta rápida.' },
      { icon: 'alert', text: 'Os valores são estimados — sempre valide com um contador para pagamentos oficiais.' },
    ],
  },
};

export default function TutorialBanner({ screenKey }) {
  const tutorial = TUTORIALS[screenKey];
  const { isDismissed, dismiss } = useTutorial(screenKey);
  const [visible, setVisible] = useState(() => !isDismissed());
  const [hiding, setHiding] = useState(false);

  if (!tutorial || !visible) return null;

  const handleDismiss = () => {
    setHiding(true);
    dismiss();
    setTimeout(() => setVisible(false), 280);
  };

  return (
    <div
      style={{
        margin: '0 0 16px',
        borderRadius: 'var(--radius-lg, 14px)',
        border: '1px solid var(--line)',
        background: 'var(--surface)',
        overflow: 'hidden',
        opacity: hiding ? 0 : 1,
        transform: hiding ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'opacity .28s ease, transform .28s ease',
      }}
    >
      {/* accent bar */}
      <div style={{ height: 3, background: tutorial.color }} />

      <div style={{ padding: '14px 18px 16px' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: tutorial.color + '18', color: tutorial.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={tutorial.icon} size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{tutorial.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>Dicas rápidas para usar esta tela</div>
          </div>
          <button
            className="btn ghost icon sm"
            onClick={handleDismiss}
            title="Dispensar dicas"
            style={{ flexShrink: 0 }}
          >
            <Icon name="x" size={13} />
          </button>
        </div>

        {/* tips grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '6px 16px',
        }}>
          {tutorial.tips.map((tip, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{
                width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
                background: tutorial.color + '14', color: tutorial.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={tip.icon} size={11} />
              </div>
              <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{tip.text}</span>
            </div>
          ))}
        </div>

        {/* footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button
            className="btn sm"
            onClick={handleDismiss}
            style={{
              fontSize: 12,
              background: tutorial.color + '14',
              color: tutorial.color,
              borderColor: tutorial.color + '40',
            }}
          >
            Entendido, não mostrar mais
          </button>
        </div>
      </div>
    </div>
  );
}
