import { useState, useMemo, useRef, useEffect } from 'react';
import Icon from '../components/Icon.jsx';
import TutorialBanner from '../components/TutorialBanner.jsx';

const cltStyle = `
  .clt-page      { padding: clamp(14px, 4vw, 28px); }
  .clt-tabs      { display:flex; overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; border-bottom:1px solid var(--line); }
  .clt-tabs::-webkit-scrollbar { display:none; }
  .clt-sim       { display:grid; grid-template-columns:320px 1fr; gap:20px; align-items:start; }
  .clt-search    { width:280px; }
  .clt-tipo-btns { display:flex; flex-direction:column; gap:6px; }
  .clt-tipo-drop { display:none; }
  .clt-val-table { overflow-x:auto; }
  @media (max-width:768px) {
    .clt-sim       { grid-template-columns:1fr; }
    .clt-search    { width:100% !important; }
    .clt-header    { flex-direction:column; align-items:stretch !important; gap:10px !important; }
    .clt-tipo-btns { display:none; }
    .clt-tipo-drop { display:block; }
  }
`;

// ============================================================
// DATA
// ============================================================

const CLT_CATEGORIAS = [
  {
    id: 'jornada', label: 'Jornada de Trabalho', icon: 'clock',
    items: [
      { title: 'Jornada máxima diária', desc: 'O empregado não pode trabalhar mais de 8 horas por dia, salvo acordo de compensação ou horas extras expressamente acordadas.', artigo: 'Art. 58, CLT', tipo: 'obrigatorio', kw: 'horas jornada diária 8' },
      { title: 'Jornada semanal máxima', desc: 'A semana de trabalho não pode ultrapassar 44 horas. Horas além desse limite devem ser compensadas ou pagas como extra.', artigo: 'Art. 58, CLT', tipo: 'obrigatorio', kw: 'horas jornada semanal 44' },
      { title: 'Horas extras', desc: 'É permitido até 2 horas extras por dia mediante acordo individual ou coletivo. O limite de 2h/dia não pode ser ultrapassado, salvo força maior.', artigo: 'Art. 59, CLT', tipo: 'condicional', kw: 'hora extra overtime 2 horas' },
      { title: 'Adicional de hora extra — mínimo 50%', desc: 'Cada hora extra deve ser paga com acréscimo de no mínimo 50% sobre o valor da hora normal. Convenções coletivas podem fixar percentuais maiores.', artigo: 'Art. 59 §1º, CLT', tipo: 'obrigatorio', kw: 'adicional hora extra 50%' },
      { title: 'Hora extra em domingo e feriado — 100%', desc: 'O trabalho em domingos e feriados não compensado deve ser remunerado com 100% de adicional sobre a hora normal.', artigo: 'Art. 67 e 70, CLT; Lei 605/49', tipo: 'obrigatorio', kw: 'domingo feriado 100% adicional' },
      { title: 'Adicional noturno — 20%', desc: 'Todo trabalho realizado entre 22h e 5h tem direito a adicional de 20% sobre o valor da hora diurna.', artigo: 'Art. 73, CLT', tipo: 'obrigatorio', kw: 'noturno noite adicional 20%' },
      { title: 'Hora noturna reduzida', desc: 'A hora noturna tem duração de 52 minutos e 30 segundos — não 60 minutos. O trabalhador noturno recebe por mais horas do que efetivamente trabalha.', artigo: 'Art. 73 §1º, CLT', tipo: 'obrigatorio', kw: 'noturno 52 minutos hora reduzida' },
      { title: 'Intervalo intrajornada', desc: 'Em jornadas acima de 6 horas: mínimo 1 hora de intervalo para refeição. Entre 4 e 6 horas: mínimo 15 minutos. Esse intervalo não é computado como trabalho.', artigo: 'Art. 71, CLT', tipo: 'obrigatorio', kw: 'intervalo almoço refeição descanso intrajornada' },
      { title: 'Intervalo interjornada — 11 horas', desc: 'Entre o fim de uma jornada e o início da próxima, deve haver no mínimo 11 horas consecutivas de descanso.', artigo: 'Art. 66, CLT', tipo: 'obrigatorio', kw: 'intervalo interjornada 11 horas descanso' },
      { title: 'Descanso Semanal Remunerado (DSR)', desc: 'Todo trabalhador tem direito a um dia de folga por semana, preferencialmente aos domingos. Esse dia é remunerado normalmente.', artigo: 'Art. 67, CLT; Lei 605/49', tipo: 'obrigatorio', kw: 'folga DSR domingo semanal remunerado' },
      { title: 'Banco de horas', desc: 'Horas extras podem ser compensadas em folgas em vez de pagamento, desde que haja acordo escrito. Convenção coletiva pode ampliar o prazo de compensação.', artigo: 'Art. 59 §2º, CLT', tipo: 'condicional', kw: 'banco horas compensação folga acordo' },
      { title: 'Escala 12x36', desc: 'Jornada de 12 horas seguidas de 36 horas de descanso, permitida por convenção coletiva ou acordo individual para profissionais de saúde e segurança.', artigo: 'Art. 59-A, CLT', tipo: 'condicional', kw: '12x36 escala plantão' },
      { title: 'Teletrabalho / Home Office', desc: 'Trabalho fora das dependências da empresa é regulamentado. O empregador deve custear os equipamentos e infraestrutura necessários, salvo acordo em contrário.', artigo: 'Art. 75-B a 75-E, CLT', tipo: 'condicional', kw: 'home office teletrabalho remoto' },
      { title: 'Intervalo para amamentação', desc: 'A mãe trabalhadora tem direito a dois intervalos de 30 minutos por dia para amamentar, até o filho completar 6 meses. O período pode ser estendido por recomendação médica.', artigo: 'Art. 396, CLT', tipo: 'obrigatorio', kw: 'amamentação lactante mãe bebê 6 meses' },
    ],
  },
  {
    id: 'remuneracao', label: 'Remuneração', icon: 'briefcase',
    items: [
      { title: 'Salário mínimo nacional', desc: 'Nenhum trabalhador pode receber menos que o salário mínimo estabelecido por lei. Em 2025, o valor é de R$ 1.518,00.', artigo: 'Art. 76, CLT', tipo: 'obrigatorio', kw: 'salário mínimo piso 1518' },
      { title: '13º salário', desc: 'Todo empregado tem direito ao 13º salário, equivalente a 1/12 do salário por mês trabalhado. 1ª parcela até 30/novembro; 2ª parcela até 20/dezembro.', artigo: 'Lei 4.090/62; Art. 7º VIII, CF/88', tipo: 'obrigatorio', kw: '13 décimo terceiro gratificação natalina' },
      { title: 'FGTS — 8% mensal', desc: 'O empregador deposita mensalmente 8% do salário bruto em conta vinculada na Caixa Econômica Federal. O saldo pode ser sacado em demissão sem justa causa, aposentadoria, compra de imóvel, entre outros.', artigo: 'Lei 8.036/90', tipo: 'obrigatorio', kw: 'FGTS fundo garantia 8%' },
      { title: 'Vale-transporte', desc: 'O empregador custeia o deslocamento casa-trabalho. O desconto no salário do empregado é limitado a 6% do salário bruto; o excedente é por conta da empresa.', artigo: 'Lei 7.418/85; Dec. 95.247/87', tipo: 'obrigatorio', kw: 'vale-transporte VT transporte condução' },
      { title: 'Adicional de insalubridade', desc: 'Trabalhadores expostos a agentes nocivos têm direito a adicional calculado sobre o salário mínimo: 40% (grau máximo), 20% (médio) ou 10% (mínimo), conforme laudo técnico.', artigo: 'Art. 192, CLT', tipo: 'condicional', kw: 'insalubridade adicional NR-15' },
      { title: 'Adicional de periculosidade — 30%', desc: 'Trabalhadores expostos a risco à vida (explosivos, inflamáveis, eletricidade, motocicleta) têm direito a adicional de 30% sobre o salário base, confirmado por laudo técnico.', artigo: 'Art. 193, CLT', tipo: 'condicional', kw: 'periculosidade risco 30% NR-16' },
      { title: 'Participação nos Lucros (PLR)', desc: 'As empresas podem pagar PLR aos empregados por negociação coletiva. O valor é isento de encargos trabalhistas e tem tributação diferenciada no IRRF.', artigo: 'Lei 10.101/00', tipo: 'condicional', kw: 'PLR lucros participação bônus' },
      { title: 'Comissões e gorjetas', desc: 'Comissões e gorjetas integram a remuneração e incidem sobre FGTS, INSS, férias e 13º. A gorjeta embutida na conta tem natureza salarial.', artigo: 'Art. 457, CLT', tipo: 'condicional', kw: 'comissão gorjeta variável' },
      { title: 'Equiparação salarial', desc: 'Trabalhadores que exercem a mesma função para o mesmo empregador, com mesma produtividade e perfeição técnica, têm direito ao mesmo salário, independentemente de gênero ou origem.', artigo: 'Art. 461, CLT', tipo: 'condicional', kw: 'equiparação salarial isonomia igualdade' },
      { title: 'Salário-família', desc: 'Trabalhadores de baixa renda com filhos até 14 anos (ou inválidos) têm direito a um valor mensal por filho, pago pelo empregador e compensado com a Previdência.', artigo: 'Art. 65, CLT; Lei 8.213/91', tipo: 'condicional', kw: 'salário-família filho benefício' },
      { title: 'Descontos permitidos em folha', desc: 'O empregador só pode descontar: adiantamentos, vale-transporte (até 6%), INSS, IRRF, pensão alimentícia judicial e danos causados por culpa ou dolo do empregado (se previsto em contrato).', artigo: 'Art. 462, CLT', tipo: 'condicional', kw: 'desconto folha salário INSS IRRF' },
      { title: 'Reajuste salarial', desc: 'A CLT não prevê reajuste automático. O aumento é negociado via convenção coletiva, acordo coletivo ou por livre negociação. O piso da categoria, quando existente, deve sempre ser respeitado.', artigo: 'Convenções Coletivas de Trabalho', tipo: 'condicional', kw: 'reajuste aumento convenção coletiva' },
    ],
  },
  {
    id: 'ferias', label: 'Férias & Descanso', icon: 'umbrella',
    items: [
      { title: 'Férias anuais — 30 dias', desc: 'Após 12 meses de trabalho (período aquisitivo), o empregado tem direito a 30 dias corridos de férias remuneradas.', artigo: 'Art. 129, CLT', tipo: 'obrigatorio', kw: 'férias 30 dias anuais' },
      { title: 'Abono constitucional de 1/3', desc: 'Além do salário normal, o empregado recebe mais 1/3 do valor durante as férias. Esse adicional é garantido pela Constituição e não pode ser suprimido.', artigo: 'Art. 7º XVII, CF/88', tipo: 'obrigatorio', kw: '1/3 terço constitucional abono férias' },
      { title: 'Período aquisitivo — 12 meses', desc: 'O direito às férias é adquirido após 12 meses de trabalho. Faltas injustificadas podem reduzir os dias (até 6 faltas: 30 dias; 7–14: 24 dias; 15–23: 18 dias; 24–32: 12 dias; +32 faltas: perde as férias).', artigo: 'Art. 130, CLT', tipo: 'obrigatorio', kw: 'aquisitivo período faltas 12 meses' },
      { title: 'Prazo máximo para concessão', desc: 'O empregador tem até 12 meses após o fim do período aquisitivo para conceder as férias. Se não conceder nesse prazo, deve pagá-las em dobro.', artigo: 'Art. 134 e 137, CLT', tipo: 'obrigatorio', kw: 'concessivo prazo férias dobro' },
      { title: 'Aviso prévio de férias', desc: 'O empregador deve comunicar ao empregado a data de início das férias com no mínimo 30 dias de antecedência, por escrito.', artigo: 'Art. 135, CLT', tipo: 'obrigatorio', kw: 'aviso comunicação férias 30 dias antecedência' },
      { title: 'Pagamento antes das férias', desc: 'O salário das férias (incluindo o 1/3) deve ser pago até 2 dias antes do início do período de gozo, não junto com o salário do mês.', artigo: 'Art. 145, CLT', tipo: 'obrigatorio', kw: 'pagamento férias antes 2 dias' },
      { title: 'Férias proporcionais na rescisão', desc: 'Na rescisão sem justa causa, pedido de demissão e acordo mútuo, o empregado recebe proporcionalmente os dias de férias do período aquisitivo em andamento.', artigo: 'Art. 146, CLT', tipo: 'obrigatorio', kw: 'férias proporcionais rescisão' },
      { title: 'Venda de 1/3 das férias (abono pecuniário)', desc: 'O empregado pode converter até 1/3 dos seus dias de férias em dinheiro. O pedido deve ser feito até 15 dias antes do início das férias e depende de concordância do empregador.', artigo: 'Art. 143, CLT', tipo: 'condicional', kw: 'abono pecuniário venda conversão férias' },
      { title: 'Fracionamento em até 3 períodos', desc: 'Com acordo do empregado, as férias podem ser divididas em até 3 períodos. Um deles não pode ser inferior a 14 dias corridos; os demais não podem ser inferiores a 5 dias cada.', artigo: 'Art. 134 §1º, CLT', tipo: 'condicional', kw: 'fracionamento férias períodos parcelas' },
      { title: 'Férias coletivas', desc: 'O empregador pode conceder férias a todos os empregados ou a setores inteiros simultaneamente. Deve comunicar ao sindicato com 15 dias de antecedência e ao Ministério do Trabalho.', artigo: 'Art. 139, CLT', tipo: 'condicional', kw: 'férias coletivas recesso suspensão' },
    ],
  },
  {
    id: 'licencas', label: 'Licenças', icon: 'calendar',
    items: [
      { title: 'Licença-maternidade — 120 dias', desc: 'A trabalhadora gestante tem direito a 120 dias de licença remunerada, com início 28 dias antes do parto ou na data do nascimento. A remuneração é paga pelo empregador e compensada com a Previdência.', artigo: 'Art. 392, CLT; Art. 7º XVIII, CF/88', tipo: 'obrigatorio', kw: 'maternidade gestante gravidez licença 120 dias' },
      { title: 'Licença-maternidade estendida — 180 dias', desc: 'Empresas do Programa Empresa Cidadã prorrogam a licença por mais 60 dias, chegando a 180 dias. Em contrapartida, têm incentivo fiscal.', artigo: 'Lei 11.770/08', tipo: 'condicional', kw: 'maternidade 180 dias empresa cidadã extensão' },
      { title: 'Licença-paternidade — 5 dias', desc: 'O pai tem direito a 5 dias corridos de licença remunerada a partir do nascimento ou adoção do filho.', artigo: 'Art. 7º XIX, CF/88; Art. 10 §1º, ADCT', tipo: 'obrigatorio', kw: 'paternidade pai nascimento 5 dias' },
      { title: 'Licença-paternidade estendida — 20 dias', desc: 'Empresas do Programa Empresa Cidadã podem conceder 20 dias de licença-paternidade (5 + 15 adicionais).', artigo: 'Lei 11.770/08 (Lei 13.257/16)', tipo: 'condicional', kw: 'paternidade 20 dias empresa cidadã' },
      { title: 'Estabilidade da gestante', desc: 'A empregada grávida não pode ser demitida sem justa causa desde a confirmação da gravidez até 5 meses após o parto. A proteção vale mesmo que a empresa não soubesse da gravidez.', artigo: 'Art. 10 II b, ADCT', tipo: 'obrigatorio', kw: 'estabilidade gestante gravidez demissão proteção' },
      { title: 'Licença por casamento — 3 dias', desc: 'O trabalhador tem direito a 3 dias consecutivos de licença remunerada no caso de casamento civil ou religioso.', artigo: 'Art. 473 I, CLT', tipo: 'obrigatorio', kw: 'casamento licença gala 3 dias' },
      { title: 'Licença por falecimento — 2 dias', desc: 'Em caso de falecimento de cônjuge, pai, mãe, filho, irmão ou dependente econômico, o trabalhador tem direito a 2 dias corridos de licença remunerada.', artigo: 'Art. 473 II, CLT', tipo: 'obrigatorio', kw: 'falecimento morte óbito licença luto 2 dias' },
      { title: 'Licença para doação de sangue — 1 dia', desc: 'O trabalhador tem direito a 1 dia de licença por ano para realizar doação voluntária de sangue em banco de sangue ou entidade assistencial.', artigo: 'Art. 473 IV, CLT', tipo: 'obrigatorio', kw: 'sangue doação licença 1 dia' },
      { title: 'Licença por acidente de trabalho', desc: 'Os primeiros 15 dias de afastamento por acidente são pagos pelo empregador. A partir do 16º dia, o INSS paga o benefício. O empregado tem estabilidade de 12 meses após o retorno ao trabalho.', artigo: 'Art. 19, Lei 8.213/91', tipo: 'obrigatorio', kw: 'acidente trabalho afastamento INSS estabilidade' },
      { title: 'Licença por doença (atestado médico)', desc: 'Os primeiros 15 dias de afastamento por doença são pagos pelo empregador. A partir do 16º dia, o trabalhador recebe auxílio-doença do INSS (benefício B-31).', artigo: 'Art. 476, CLT; Art. 60, Lei 8.213/91', tipo: 'condicional', kw: 'atestado doença afastamento INSS auxílio' },
      { title: 'Licença para serviço militar', desc: 'O trabalhador convocado para o serviço militar obrigatório tem o contrato suspenso e direito ao retorno ao emprego até 30 dias após a baixa.', artigo: 'Art. 472, CLT', tipo: 'obrigatorio', kw: 'militar exército serviço convocação' },
      { title: 'Licença por adoção', desc: 'Pais adotantes têm os mesmos direitos de licença da maternidade e paternidade, inclusive a extensão pelo Programa Empresa Cidadã.', artigo: 'Lei 12.873/13', tipo: 'obrigatorio', kw: 'adoção licença maternidade paternidade' },
      { title: 'Licença para alistamento eleitoral', desc: 'O trabalhador tem direito a 2 dias para alistamento eleitoral ou justificativa de voto, sem desconto no salário.', artigo: 'Art. 473 V, CLT', tipo: 'obrigatorio', kw: 'alistamento eleitoral voto licença 2 dias' },
    ],
  },
  {
    id: 'rescisao', label: 'Rescisão', icon: 'doc',
    items: [
      { title: 'Aviso prévio proporcional', desc: 'O aviso prévio é de no mínimo 30 dias. Acrescenta-se 3 dias por ano completo trabalhado, chegando a no máximo 90 dias. Pode ser trabalhado ou indenizado pelo empregador.', artigo: 'Art. 487, CLT; Lei 12.506/11', tipo: 'obrigatorio', kw: 'aviso prévio 30 dias proporcional' },
      { title: 'Multa FGTS de 40% — demissão sem justa causa', desc: 'Na demissão sem justa causa, o empregador paga multa de 40% sobre todo o saldo do FGTS do trabalhador. O valor vai direto para o empregado.', artigo: 'Art. 18 §1º, Lei 8.036/90', tipo: 'obrigatorio', kw: 'multa FGTS 40% demissão' },
      { title: 'Multa FGTS de 20% — acordo mútuo', desc: 'No acordo mútuo (Art. 484-A), a multa do FGTS cai para 20%. O trabalhador pode sacar 80% do saldo acumulado.', artigo: 'Art. 484-A, CLT', tipo: 'condicional', kw: 'acordo mútuo multa FGTS 20% 484-A' },
      { title: 'Seguro-desemprego', desc: 'O trabalhador demitido sem justa causa tem direito ao seguro-desemprego, desde que cumpra os requisitos de tempo de carteira assinada. O número de parcelas varia com o tempo empregado.', artigo: 'Lei 7.998/90', tipo: 'condicional', kw: 'seguro-desemprego parcelas demissão' },
      { title: 'Prazo para pagamento rescisório — 10 dias', desc: 'Todas as verbas rescisórias devem ser pagas em até 10 dias corridos após o término do contrato. O descumprimento gera multa de 1 salário em favor do trabalhador.', artigo: 'Art. 477 §6º, CLT', tipo: 'obrigatorio', kw: 'prazo rescisão 10 dias pagamento multa' },
      { title: 'Férias vencidas na rescisão', desc: 'Férias de período aquisitivo completo não gozadas devem ser pagas na rescisão com o acréscimo de 1/3, independentemente do motivo da demissão — inclusive justa causa.', artigo: 'Art. 146, CLT', tipo: 'obrigatorio', kw: 'férias vencidas rescisão' },
      { title: '13º salário proporcional', desc: 'Na rescisão sem justa causa, acordo mútuo e pedido de demissão, o empregado recebe o 13º proporcional aos meses trabalhados no ano corrente.', artigo: 'Lei 4.090/62; Art. 7º VIII, CF/88', tipo: 'obrigatorio', kw: '13 proporcional rescisão gratificação' },
      { title: 'Estabilidade do membro da CIPA', desc: 'O representante eleito para a CIPA não pode ser demitido sem justa causa desde o registro da candidatura até 1 ano após o fim do mandato.', artigo: 'Art. 10 II a, ADCT', tipo: 'condicional', kw: 'CIPA estabilidade eleito mandato' },
      { title: 'Estabilidade após acidente de trabalho', desc: 'O empregado que retorna de afastamento por acidente de trabalho ou doença ocupacional tem estabilidade de 12 meses após a alta médica.', artigo: 'Art. 118, Lei 8.213/91', tipo: 'condicional', kw: 'estabilidade acidente doença ocupacional 12 meses' },
      { title: 'Justa causa — motivos previstos em lei', desc: 'A demissão por justa causa exige um dos motivos do Art. 482: improbidade, incontinência, negociação habitual, condenação criminal, desídia, embriaguez, violação de segredo, indisciplina, abandono de emprego, ato lesivo à honra, ofensa física ou prática de jogos de azar.', artigo: 'Art. 482, CLT', tipo: 'condicional', kw: 'justa causa demissão motivos falta grave 482' },
      { title: 'Abandono de emprego', desc: 'Considera-se abandono de emprego a ausência injustificada por mais de 30 dias consecutivos. É motivo de demissão por justa causa, mas o empregador deve notificar o trabalhador antes de formalizar.', artigo: 'Art. 482 i, CLT', tipo: 'condicional', kw: 'abandono emprego falta ausência 30 dias' },
    ],
  },
  {
    id: 'saude', label: 'Segurança & Saúde', icon: 'shield',
    items: [
      { title: 'EPI — fornecimento obrigatório e gratuito', desc: 'O empregador é obrigado a fornecer gratuitamente os EPIs adequados ao risco de cada função. O empregado é obrigado a usá-los. A recusa ao uso pode ser justa causa.', artigo: 'Art. 166 e 158, CLT', tipo: 'obrigatorio', kw: 'EPI proteção capacete luva segurança' },
      { title: 'Exame admissional', desc: 'Todo novo empregado deve passar por exame médico antes de iniciar as atividades, para confirmar aptidão para a função. O custo é do empregador.', artigo: 'NR-7; Art. 168, CLT', tipo: 'obrigatorio', kw: 'admissional exame médico ASO' },
      { title: 'Exame periódico', desc: 'Empregados devem realizar exames de saúde periodicamente, com frequência definida conforme o risco da atividade e a faixa etária.', artigo: 'NR-7; Art. 168, CLT', tipo: 'obrigatorio', kw: 'periódico exame saúde ASO' },
      { title: 'Exame demissional', desc: 'Na rescisão do contrato, o empregado realiza exame para verificar seu estado de saúde ao sair. Responsabilidade e custo são do empregador.', artigo: 'NR-7; Art. 168, CLT', tipo: 'obrigatorio', kw: 'demissional exame rescisão ASO' },
      { title: 'PCMSO — Programa de Controle Médico de Saúde Ocupacional', desc: 'Todas as empresas com empregados CLT são obrigadas a manter o PCMSO, que estabelece vigilância e controle da saúde dos trabalhadores com base nos riscos de cada função.', artigo: 'NR-7', tipo: 'obrigatorio', kw: 'PCMSO saúde ocupacional programa médico' },
      { title: 'PGR — Programa de Gerenciamento de Riscos', desc: 'O PGR (que substituiu o PPRA em 2022) exige que as empresas identifiquem, avaliem e controlem todos os riscos presentes no ambiente de trabalho.', artigo: 'NR-1', tipo: 'obrigatorio', kw: 'PGR PPRA risco gerenciamento NR-1' },
      { title: 'CIPA — Comissão Interna de Prevenção de Acidentes', desc: 'Empresas com 20 ou mais empregados são obrigadas a constituir a CIPA, com representantes eleitos pelos empregados e indicados pelo empregador, para prevenir acidentes.', artigo: 'Art. 163 a 165, CLT; NR-5', tipo: 'condicional', kw: 'CIPA comissão prevenção acidentes 20 funcionários' },
      { title: 'CAT — Comunicação de Acidente de Trabalho', desc: 'Todo acidente de trabalho ou doença ocupacional deve ser comunicado ao INSS por CAT até o 1º dia útil após o acidente. Em caso de morte, a comunicação é imediata.', artigo: 'Art. 22, Lei 8.213/91', tipo: 'obrigatorio', kw: 'CAT acidente comunicação INSS' },
      { title: 'Ergonomia — NR-17', desc: 'O empregador deve adaptar as condições de trabalho às características dos trabalhadores, garantindo conforto postural, iluminação adequada e ausência de sobrecarga física.', artigo: 'NR-17', tipo: 'obrigatorio', kw: 'ergonomia NR-17 posto trabalho conforto' },
      { title: 'Laudo técnico para insalubridade e periculosidade', desc: 'A exposição a condições insalubres ou perigosas deve ser confirmada por laudo de engenheiro ou médico do trabalho habilitado. Sem laudo, não há base legal para o adicional.', artigo: 'Art. 190 e 195, CLT', tipo: 'condicional', kw: 'laudo técnico insalubridade periculosidade NR-15 NR-16' },
    ],
  },
  {
    id: 'deveres', label: 'Deveres do Trabalhador', icon: 'alert',
    items: [
      { title: 'Cumprir a jornada contratada', desc: 'O trabalhador deve comparecer ao trabalho e cumprir o horário estabelecido. Faltas injustificadas podem gerar desconto no salário e, se reiteradas, demissão por desídia.', artigo: 'Art. 482 e, CLT', tipo: 'dever', kw: 'jornada pontualidade horário falta' },
      { title: 'Obedecer às ordens legítimas do empregador', desc: 'O trabalhador deve acatar as determinações do empregador relacionadas à função, desde que não contrariem a lei, a moral ou o contrato de trabalho.', artigo: 'Art. 482 h, CLT', tipo: 'dever', kw: 'obediência ordens hierarquia chefia' },
      { title: 'Assiduidade e pontualidade', desc: 'A frequência regular e o respeito ao horário são obrigações do trabalhador. Faltas e atrasos reiterados sem justificativa configuram desídia, que é motivo de justa causa.', artigo: 'Art. 482 e, CLT', tipo: 'dever', kw: 'assiduidade pontualidade falta atraso desídia' },
      { title: 'Guardar sigilo profissional', desc: 'O trabalhador não pode divulgar informações confidenciais da empresa — dados de clientes, processos, estratégias ou senhas. A violação pode gerar justa causa e responsabilidade civil.', artigo: 'Art. 482 g, CLT', tipo: 'dever', kw: 'sigilo confidencialidade segredo dados' },
      { title: 'Dar aviso prévio ao pedir demissão', desc: 'Ao pedir demissão, o trabalhador deve comunicar o empregador com no mínimo 30 dias de antecedência. Se não cumprir, o empregador pode descontar os dias faltantes do acerto final.', artigo: 'Art. 487, CLT', tipo: 'dever', kw: 'aviso prévio demissão pedido 30 dias' },
      { title: 'Zelar pelo patrimônio da empresa', desc: 'O trabalhador deve cuidar dos equipamentos, ferramentas e instalações. Danos causados com culpa ou dolo podem ser descontados do salário, se previsto em contrato.', artigo: 'Art. 482 c, CLT', tipo: 'dever', kw: 'patrimônio equipamento dano responsabilidade' },
      { title: 'Manter respeito e urbanidade', desc: 'O trabalhador deve tratar colegas, superiores e clientes com respeito. Ofensas físicas ou verbais, assédio e atos de violência são motivos imediatos de justa causa.', artigo: 'Art. 482 j e k, CLT', tipo: 'dever', kw: 'respeito assédio ofensa urbanidade violência' },
      { title: 'Usar os EPIs fornecidos', desc: 'O trabalhador é obrigado a usar os equipamentos de proteção fornecidos pelo empregador. A recusa injustificada pode resultar em advertência, suspensão ou justa causa.', artigo: 'Art. 158, CLT', tipo: 'dever', kw: 'EPI equipamento proteção uso obrigatório' },
      { title: 'Comunicar acidentes ao empregador', desc: 'Ao sofrer ou testemunhar um acidente de trabalho, o trabalhador deve comunicar imediatamente ao empregador ou responsável pela segurança, para que a CAT seja emitida.', artigo: 'Art. 22, Lei 8.213/91', tipo: 'dever', kw: 'acidente comunicação segurança CAT' },
      { title: 'Proibição de atos de improbidade', desc: 'Desonestidade, roubo, fraude ou qualquer ato de má-fé contra a empresa ou colegas constituem justa causa imediata, sem necessidade de advertências prévias.', artigo: 'Art. 482 a, CLT', tipo: 'dever', kw: 'improbidade fraude roubo desonestidade justa causa' },
      { title: 'Proibição de embriaguez no serviço', desc: 'Comparecer ao trabalho em estado de embriaguez — por álcool ou outras substâncias — é motivo de justa causa. A embriaguez habitual fora do trabalho também pode ser considerada.', artigo: 'Art. 482 f, CLT', tipo: 'dever', kw: 'embriaguez álcool drogas justa causa' },
      { title: 'Não concorrência (quando contratual)', desc: 'Quando previsto em contrato, o trabalhador não pode exercer atividades concorrentes durante o vínculo. Cláusulas de não-concorrência pós-emprego têm validade limitada em tempo e espaço geográfico.', artigo: 'Art. 482 c, CLT', tipo: 'condicional', kw: 'não-concorrência concorrência contrato' },
    ],
  },
];

const TIPO_META = {
  obrigatorio: { label: 'Obrigatório', cls: 'ok' },
  condicional: { label: 'Condicional', cls: 'warn' },
  dever:       { label: 'Dever do trabalhador', cls: 'info' },
};

const VALORES_VIGENTES = [
  {
    cat: 'Salário & Renda', itens: [
      { label: 'Salário mínimo nacional',    valor: 'R$ 1.518,00',    ref: 'Portaria MTE 3.659/24',    vig: 'Jan/2025' },
      { label: 'Teto de contribuição INSS',  valor: 'R$ 7.786,02',    ref: 'Portaria MPS 1.730/24',    vig: 'Jan/2025' },
      { label: 'Piso do seguro-desemprego',  valor: 'R$ 1.518,00',    ref: 'Resolução Codefat 988/25', vig: 'Jan/2025' },
    ],
  },
  {
    cat: 'Tabela INSS (empregado — progressiva)', obs: 'Cada faixa incide apenas sobre a parcela do salário que se enquadra nela, igual ao IRRF.',
    itens: [
      { label: 'Até R$ 1.518,00',                    valor: '7,5%',  ref: 'Art. 198, Lei 8.212/91' },
      { label: 'R$ 1.518,01 a R$ 2.793,88',          valor: '9%',    ref: 'Art. 198, Lei 8.212/91' },
      { label: 'R$ 2.793,89 a R$ 4.190,83',          valor: '12%',   ref: 'Art. 198, Lei 8.212/91' },
      { label: 'R$ 4.190,84 a R$ 7.786,02',          valor: '14%',   ref: 'Art. 198, Lei 8.212/91' },
    ],
  },
  {
    cat: 'Tabela IRRF (assalariado)', obs: 'Dedução por dependente: R$ 189,59/mês.',
    itens: [
      { label: 'Até R$ 2.259,20',               valor: 'Isento',               ref: 'RIR/2018' },
      { label: 'R$ 2.259,21 a R$ 2.826,65',     valor: '7,5% − R$ 169,44',    ref: 'RIR/2018' },
      { label: 'R$ 2.826,66 a R$ 3.751,05',     valor: '15% − R$ 381,44',     ref: 'RIR/2018' },
      { label: 'R$ 3.751,06 a R$ 4.664,68',     valor: '22,5% − R$ 662,77',   ref: 'RIR/2018' },
      { label: 'Acima de R$ 4.664,68',          valor: '27,5% − R$ 896,00',   ref: 'RIR/2018' },
    ],
  },
  {
    cat: 'FGTS & Rescisão', itens: [
      { label: 'Depósito mensal FGTS',                valor: '8% do salário bruto',    ref: 'Lei 8.036/90' },
      { label: 'FGTS — aprendiz',                     valor: '2% do salário bruto',    ref: 'Lei 10.097/00' },
      { label: 'Multa rescisória sem justa causa',    valor: '40% do saldo FGTS',      ref: 'Art. 18 §1º, Lei 8.036/90' },
      { label: 'Multa rescisória — acordo mútuo',     valor: '20% do saldo FGTS',      ref: 'Art. 484-A, CLT' },
    ],
  },
  {
    cat: 'Adicionais & Benefícios', itens: [
      { label: 'Hora extra mínima',                   valor: '+ 50% sobre hora normal',     ref: 'Art. 59 §1º, CLT' },
      { label: 'Hora extra (domingo/feriado)',         valor: '+ 100%',                      ref: 'Art. 70, CLT' },
      { label: 'Adicional noturno (22h–5h)',           valor: '+ 20% sobre hora diurna',     ref: 'Art. 73, CLT' },
      { label: 'Insalubridade — grau mínimo',         valor: '10% do salário mínimo',       ref: 'Art. 192, CLT' },
      { label: 'Insalubridade — grau médio',          valor: '20% do salário mínimo',       ref: 'Art. 192, CLT' },
      { label: 'Insalubridade — grau máximo',         valor: '40% do salário mínimo',       ref: 'Art. 192, CLT' },
      { label: 'Periculosidade',                      valor: '30% do salário base',         ref: 'Art. 193, CLT' },
      { label: 'Vale-transporte — desconto máximo',   valor: '6% do salário bruto',         ref: 'Lei 7.418/85' },
    ],
  },
];

// ============================================================
// RESCISÃO — REGRAS POR TIPO
// ============================================================
const RESCISAO_TIPOS = [
  {
    id: 'sem-jc', label: 'Demissão sem justa causa',
    desc: 'Empregador decide encerrar o contrato sem motivo disciplinar',
    cor: 'var(--bad)',
    verbas: [
      { nome: 'Saldo de salário',           devido: true,  obs: 'Dias trabalhados no mês' },
      { nome: 'Aviso prévio',               devido: true,  obs: 'Pago pelo empregador (indenizado ou trabalhado)' },
      { nome: '13º proporcional',           devido: true,  obs: 'Meses trabalhados no ano ÷ 12' },
      { nome: 'Férias proporcionais + 1/3', devido: true,  obs: 'Meses do período aquisitivo atual' },
      { nome: 'Férias vencidas + 1/3',      devido: true,  obs: 'Se houver período anterior não gozado' },
      { nome: 'Multa FGTS — 40%',           devido: true,  obs: 'Sobre saldo total acumulado' },
      { nome: 'Saque do FGTS',              devido: true,  obs: '100% do saldo' },
      { nome: 'Seguro-desemprego',          devido: true,  obs: 'Se cumprir requisitos de tempo' },
    ],
  },
  {
    id: 'com-jc', label: 'Demissão com justa causa',
    desc: 'Empregador demite por falta grave prevista no Art. 482',
    cor: 'var(--bad)',
    verbas: [
      { nome: 'Saldo de salário',           devido: true,  obs: 'Dias trabalhados no mês' },
      { nome: 'Aviso prévio',               devido: false, obs: 'Não devido' },
      { nome: '13º proporcional',           devido: false, obs: 'Não devido' },
      { nome: 'Férias proporcionais + 1/3', devido: false, obs: 'Perde o direito às proporcionais' },
      { nome: 'Férias vencidas + 1/3',      devido: true,  obs: 'Direito adquirido — não pode ser suprimido' },
      { nome: 'Multa FGTS — 40%',           devido: false, obs: 'Não devido' },
      { nome: 'Saque do FGTS',              devido: false, obs: 'Não pode sacar (saldo fica na conta)' },
      { nome: 'Seguro-desemprego',          devido: false, obs: 'Não devido' },
    ],
  },
  {
    id: 'pedido', label: 'Pedido de demissão',
    desc: 'Empregado decide sair por vontade própria',
    cor: 'var(--brand)',
    verbas: [
      { nome: 'Saldo de salário',           devido: true,  obs: 'Dias trabalhados no mês' },
      { nome: 'Aviso prévio',               devido: false, obs: 'Trabalhador deve dar 30 dias; se não cumprir, valor é descontado' },
      { nome: '13º proporcional',           devido: true,  obs: 'Meses trabalhados no ano ÷ 12' },
      { nome: 'Férias proporcionais + 1/3', devido: true,  obs: 'Meses do período aquisitivo atual' },
      { nome: 'Férias vencidas + 1/3',      devido: true,  obs: 'Se houver período anterior não gozado' },
      { nome: 'Multa FGTS — 40%',           devido: false, obs: 'Não devido' },
      { nome: 'Saque do FGTS',              devido: false, obs: 'Não pode sacar em pedido de demissão comum' },
      { nome: 'Seguro-desemprego',          devido: false, obs: 'Não devido' },
    ],
  },
  {
    id: 'acordo', label: 'Acordo mútuo — Art. 484-A',
    desc: 'Empregador e empregado concordam em encerrar o contrato',
    cor: 'var(--ok)',
    verbas: [
      { nome: 'Saldo de salário',           devido: true,  obs: 'Dias trabalhados no mês' },
      { nome: 'Aviso prévio — 50%',         devido: true,  obs: 'Metade do valor é paga pelo empregador' },
      { nome: '13º proporcional',           devido: true,  obs: 'Meses trabalhados no ano ÷ 12' },
      { nome: 'Férias proporcionais + 1/3', devido: true,  obs: 'Meses do período aquisitivo atual' },
      { nome: 'Férias vencidas + 1/3',      devido: true,  obs: 'Se houver período anterior não gozado' },
      { nome: 'Multa FGTS — 20%',           devido: true,  obs: 'Metade dos 40% normais' },
      { nome: 'Saque do FGTS — 80%',        devido: true,  obs: '80% do saldo (não 100%)' },
      { nome: 'Seguro-desemprego',          devido: false, obs: 'Não devido no acordo mútuo' },
    ],
  },
  {
    id: 'experiencia', label: 'Término de contrato de experiência',
    desc: 'Empregador decide não efetivar ao fim do período de experiência',
    cor: 'var(--warn)',
    verbas: [
      { nome: 'Saldo de salário',           devido: true,  obs: 'Dias trabalhados no mês' },
      { nome: 'Aviso prévio / indenização', devido: true,  obs: '50% dos dias restantes do contrato — Art. 479' },
      { nome: '13º proporcional',           devido: true,  obs: 'Meses trabalhados' },
      { nome: 'Férias proporcionais + 1/3', devido: true,  obs: 'Meses do período de experiência' },
      { nome: 'Férias vencidas + 1/3',      devido: false, obs: 'Improvável em contrato de experiência' },
      { nome: 'Multa FGTS — 40%',           devido: true,  obs: 'Sobre saldo acumulado' },
      { nome: 'Saque do FGTS',              devido: true,  obs: '100% do saldo' },
      { nome: 'Seguro-desemprego',          devido: false, obs: 'Geralmente não atinge o tempo mínimo' },
    ],
  },
];

function calcRescisao({ salario, admissao, diasTrabalhados, temFeriasVencidas, saldoFgts }) {
  if (!salario || !admissao) return null;
  const hoje = new Date();
  const adm = new Date(admissao);
  const diffMs = hoje - adm;
  const diffDias = Math.floor(diffMs / 86400000);
  const anosCompletos = Math.floor(diffDias / 365);
  const mesesTotais = Math.floor(diffDias / 30);

  const anoAtual = hoje.getFullYear();
  const admAno = adm.getFullYear();
  let meses13 = admAno === anoAtual
    ? hoje.getMonth() - adm.getMonth() + (hoje.getDate() >= 15 ? 1 : 0)
    : hoje.getMonth() + (hoje.getDate() >= 15 ? 1 : 0);
  meses13 = Math.max(0, Math.min(meses13, 12));

  const ultimoAniversario = new Date(adm);
  ultimoAniversario.setFullYear(anoAtual);
  if (ultimoAniversario > hoje) ultimoAniversario.setFullYear(anoAtual - 1);
  const diffFeriasMs = hoje - ultimoAniversario;
  let mesesFerias = Math.floor(diffFeriasMs / (30 * 86400000));
  mesesFerias = Math.max(0, Math.min(mesesFerias, 12));

  const diasAviso = Math.min(30 + anosCompletos * 3, 90);
  const fgtsEstimado = saldoFgts || (salario * 0.08 * mesesTotais);
  const valorHora = salario / 220;

  return {
    saldo:              (salario / 30) * (diasTrabalhados || 30),
    aviso:              (salario / 30) * diasAviso,
    avisoMetade:        (salario / 30) * diasAviso * 0.5,
    decimo13:           (salario / 12) * meses13,
    feriasProporcionais:(salario / 12) * mesesFerias * (4 / 3),
    feriasVencidas:     temFeriasVencidas ? salario * (4 / 3) : 0,
    multaFgts40:        fgtsEstimado * 0.40,
    multaFgts20:        fgtsEstimado * 0.20,
    saldoFgts:          fgtsEstimado,
    anosCompletos,
    diasAviso,
    meses13,
    mesesFerias,
  };
}

// ============================================================
// COMPONENTS
// ============================================================

function BadgeTipo({ tipo }) {
  const m = TIPO_META[tipo];
  if (!m) return null;
  return <span className={`pill ${m.cls}`} style={{ fontSize: 10.5, flexShrink: 0 }}>{m.label}</span>;
}

function ItemCard({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--surface)',
        transition: 'box-shadow .15s',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', padding: '12px 14px',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{item.title}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{item.artigo}</div>
        </div>
        <BadgeTipo tipo={item.tipo} />
        <Icon name="chevron-down" size={14} style={{ color: 'var(--muted-2)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', marginTop: 2 }} />
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.65 }}>{item.desc}</p>
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, padding: '3px 8px', color: 'var(--muted)', fontWeight: 600 }}>
              {item.artigo}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function CatDropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const selected = options.find(o => o.value === value) || options[0];
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 36, padding: '0 12px', borderRadius: 8,
          border: `1px solid ${open ? 'var(--brand)' : 'var(--line)'}`,
          background: 'var(--surface-2)', color: 'var(--ink)',
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
          whiteSpace: 'nowrap', transition: 'border-color .12s',
        }}
      >
        {selected.icon && <Icon name={selected.icon} size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />}
        <span style={{ flex: 1 }}>{selected.label}</span>
        <Icon name="chevron-down" size={12} style={{ color: 'var(--muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          minWidth: '100%', background: 'var(--surface)',
          border: '1px solid var(--line)', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 200,
          overflow: 'hidden', maxHeight: 320, overflowY: 'auto',
        }}>
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 14px', border: 'none', textAlign: 'left',
                background: value === o.value ? 'var(--brand-tint)' : 'transparent',
                color: value === o.value ? 'var(--brand)' : 'var(--ink)',
                fontSize: 13, fontWeight: value === o.value ? 600 : 400, cursor: 'pointer',
              }}
              onMouseEnter={e => { if (value !== o.value) e.currentTarget.style.background = 'var(--hover)'; }}
              onMouseLeave={e => { if (value !== o.value) e.currentTarget.style.background = 'transparent'; }}
            >
              {o.icon && <Icon name={o.icon} size={13} style={{ color: value === o.value ? 'var(--brand)' : 'var(--muted)', flexShrink: 0 }} />}
              <span style={{ flex: 1 }}>{o.label}</span>
              {value === o.value && <Icon name="check" size={13} style={{ color: 'var(--brand)', flexShrink: 0 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DireitosTab({ search }) {
  const [catAtiva, setCatAtiva] = useState('todas');

  const resultados = useMemo(() => {
    const q = search.toLowerCase().trim();
    return CLT_CATEGORIAS.map(cat => ({
      ...cat,
      items: cat.items.filter(it =>
        !q ||
        it.title.toLowerCase().includes(q) ||
        it.desc.toLowerCase().includes(q) ||
        it.kw.toLowerCase().includes(q) ||
        it.artigo.toLowerCase().includes(q)
      ),
    })).filter(cat => cat.items.length > 0);
  }, [search]);

  const exibir = catAtiva === 'todas' ? resultados : resultados.filter(c => c.id === catAtiva);
  const totalItens = resultados.reduce((s, c) => s + c.items.length, 0);

  const catOptions = [
    { value: 'todas', label: `Todas as categorias (${totalItens})`, icon: 'scale' },
    ...resultados.map(cat => ({ value: cat.id, label: `${cat.label} (${cat.items.length})`, icon: cat.icon })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Filtro de categorias */}
      <CatDropdown
        value={catAtiva}
        onChange={setCatAtiva}
        options={catOptions}
      />

      {exibir.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>
          Nenhum resultado para "{search}"
        </div>
      )}

      {exibir.map(cat => (
        <div key={cat.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--brand-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
              <Icon name={cat.icon} size={15} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{cat.label}</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{cat.items.length} {cat.items.length === 1 ? 'item' : 'itens'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cat.items.map((item, i) => <ItemCard key={i} item={item} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function SimuladorTab() {
  const [tipo, setTipo] = useState('sem-jc');
  const [salario, setSalario] = useState('');
  const [admissao, setAdmissao] = useState('');
  const [diasTrabalhados, setDiasTrabalhados] = useState('30');
  const [temFeriasVencidas, setTemFeriasVencidas] = useState(false);
  const [saldoFgtsManual, setSaldoFgtsManual] = useState('');

  const tipoAtual = RESCISAO_TIPOS.find(t => t.id === tipo);
  const calc = calcRescisao({
    salario: parseFloat(salario),
    admissao,
    diasTrabalhados: parseInt(diasTrabalhados),
    temFeriasVencidas,
    saldoFgts: saldoFgtsManual ? parseFloat(saldoFgtsManual) : null,
  });

  const fmt = (v) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '—';

  function calcTotal() {
    if (!calc) return 0;
    const v = tipoAtual.verbas;
    let total = 0;
    if (v.find(x => x.nome === 'Saldo de salário')?.devido) total += calc.saldo;
    if (v.find(x => x.nome.startsWith('Aviso prévio') && x.nome !== 'Aviso prévio / indenização')?.devido) {
      if (tipo === 'acordo') total += calc.avisoMetade;
      else total += calc.aviso;
    }
    if (v.find(x => x.nome === 'Aviso prévio / indenização')?.devido) total += calc.avisoMetade;
    if (v.find(x => x.nome === '13º proporcional')?.devido) total += calc.decimo13;
    if (v.find(x => x.nome === 'Férias proporcionais + 1/3')?.devido) total += calc.feriasProporcionais;
    if (v.find(x => x.nome === 'Férias vencidas + 1/3')?.devido && temFeriasVencidas) total += calc.feriasVencidas;
    if (v.find(x => x.nome.includes('40%'))?.devido) total += calc.multaFgts40;
    if (v.find(x => x.nome.includes('20%'))?.devido) total += calc.multaFgts20;
    return total;
  }

  function calcValorVerba(nome) {
    if (!calc) return null;
    if (nome === 'Saldo de salário') return calc.saldo;
    if (nome === 'Aviso prévio') return calc.aviso;
    if (nome === 'Aviso prévio — 50%') return calc.avisoMetade;
    if (nome === 'Aviso prévio / indenização') return calc.avisoMetade;
    if (nome === '13º proporcional') return calc.decimo13;
    if (nome === 'Férias proporcionais + 1/3') return calc.feriasProporcionais;
    if (nome === 'Férias vencidas + 1/3') return temFeriasVencidas ? calc.feriasVencidas : 0;
    if (nome.includes('Multa FGTS — 40%')) return calc.multaFgts40;
    if (nome.includes('Multa FGTS — 20%')) return calc.multaFgts20;
    if (nome.includes('Saque do FGTS — 80%')) return calc.saldoFgts * 0.8;
    if (nome.includes('Saque do FGTS')) return calc.saldoFgts;
    return null;
  }

  const totalEstimado = calcTotal();

  return (
    <div className="clt-sim">
      {/* Formulário */}
      <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: 'var(--muted-2)', textTransform: 'uppercase' }}>
          Dados da rescisão
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Tipo de rescisão</label>
          {/* mobile: dropdown */}
          <div className="clt-tipo-drop">
            <CatDropdown
              value={tipo}
              onChange={setTipo}
              options={RESCISAO_TIPOS.map(t => ({ value: t.id, label: t.label, icon: 'doc' }))}
            />
          </div>
          {/* desktop: botões verticais */}
          <div className="clt-tipo-btns">
            {RESCISAO_TIPOS.map(t => (
              <button
                key={t.id}
                onClick={() => setTipo(t.id)}
                style={{
                  textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: `1px solid ${tipo === t.id ? 'var(--brand)' : 'var(--line)'}`,
                  background: tipo === t.id ? 'var(--brand-tint)' : 'var(--surface-2)', cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 600, color: tipo === t.id ? 'var(--brand)' : 'var(--ink)' }}>{t.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Salário bruto (R$)</label>
          <input className="field" type="number" placeholder="Ex: 3500" value={salario} onChange={e => setSalario(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Data de admissão</label>
          <input className="field" type="date" value={admissao} onChange={e => setAdmissao(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Dias trabalhados no mês corrente</label>
          <input className="field" type="number" min="1" max="31" value={diasTrabalhados} onChange={e => setDiasTrabalhados(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Saldo FGTS acumulado (opcional)</label>
          <input className="field" type="number" placeholder="Deixe em branco para estimar" value={saldoFgtsManual} onChange={e => setSaldoFgtsManual(e.target.value)} style={{ width: '100%' }} />
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Se não informado, o sistema estima com base no salário e tempo de serviço.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" id="ferias-v" checked={temFeriasVencidas} onChange={e => setTemFeriasVencidas(e.target.checked)} />
          <label htmlFor="ferias-v" style={{ fontSize: 13, cursor: 'pointer' }}>Possui férias vencidas não gozadas</label>
        </div>
      </div>

      {/* Resultado */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {calc ? (
          <>
            <div className="card" style={{ padding: 16, background: 'var(--brand-tint)', border: '1px solid var(--brand)' }}>
              <div style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                Total estimado a receber
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--brand)' }}>{fmt(totalEstimado)}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
                {calc.anosCompletos} {calc.anosCompletos === 1 ? 'ano' : 'anos'} e {Math.floor(((new Date() - new Date(admissao)) / 86400000 - calc.anosCompletos * 365) / 30)} meses de serviço · aviso prévio de {calc.diasAviso} dias
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: 'var(--muted-2)', textTransform: 'uppercase', marginBottom: 14 }}>
                Detalhamento — {tipoAtual.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {tipoAtual.verbas.map((v, i) => {
                  const valor = calcValorVerba(v.nome);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < tipoAtual.verbas.length - 1 ? '1px solid var(--line)' : 'none' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: v.devido ? 'var(--ok-tint, #dcfce7)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <Icon name={v.devido ? 'check' : 'x'} size={11} style={{ color: v.devido ? 'var(--ok)' : 'var(--muted-2)' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: v.devido ? 'var(--ink)' : 'var(--muted)' }}>{v.nome}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{v.obs}</div>
                      </div>
                      {v.devido && valor != null && valor > 0 && (
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', flexShrink: 0 }}>{fmt(valor)}</div>
                      )}
                      {!v.devido && (
                        <div style={{ fontSize: 12, color: 'var(--muted-2)', flexShrink: 0 }}>—</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                <strong>Atenção:</strong> Os valores são estimativas com base nos dados informados. Impostos (INSS e IRRF) incidem sobre algumas verbas e devem ser considerados no cálculo final. Consulte um profissional de RH para o cálculo definitivo.
              </div>
            </div>
          </>
        ) : (
          <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
            <Icon name="doc" size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Preencha os dados ao lado</div>
            <div style={{ fontSize: 12.5, marginTop: 6 }}>O simulador calculará todas as verbas devidas conforme o tipo de rescisão selecionado.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ValoresTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card" style={{ padding: 14, background: 'var(--brand-tint)', border: '1px solid var(--brand)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
        <Icon name="info" size={16} style={{ color: 'var(--brand)', flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, color: 'var(--brand)' }}>Valores vigentes em 2025. Atualizados conforme legislação e portarias publicadas até janeiro/2025.</span>
      </div>
      {VALORES_VIGENTES.map((grupo, gi) => (
        <div key={gi} className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: grupo.obs ? 4 : 14 }}>{grupo.cat}</div>
          {grupo.obs && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{grupo.obs}</div>}
          <div className="clt-val-table">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {grupo.itens.map((it, ii) => (
                  <tr key={ii} style={{ borderBottom: ii < grupo.itens.length - 1 ? '1px solid var(--line)' : 'none' }}>
                    <td style={{ padding: '9px 8px', color: 'var(--ink-soft)' }}>{it.label}</td>
                    <td style={{ padding: '9px 8px', fontWeight: 700, color: 'var(--ink)', textAlign: 'right', whiteSpace: 'nowrap' }}>{it.valor}</td>
                    <td style={{ padding: '9px 8px', color: 'var(--muted)', fontSize: 11.5, textAlign: 'right', whiteSpace: 'nowrap' }}>{it.ref}</td>
                    {it.vig && <td style={{ padding: '9px 8px' }}><span className="pill ok" style={{ fontSize: 10 }}>{it.vig}</span></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================
const TABS = [
  { id: 'direitos',   label: 'Direitos & Benefícios',  icon: 'scale' },
  { id: 'simulador',  label: 'Simulador de Rescisão',  icon: 'doc' },
  { id: 'valores',    label: 'Valores Vigentes',        icon: 'chart' },
];

export default function CLTScreen() {
  const [tab, setTab] = useState('direitos');
  const [search, setSearch] = useState('');

  return (
    <>
    <style>{cltStyle}</style>
    <div className="fade-up clt-page" style={{ maxWidth: 1180, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <TutorialBanner screenKey="clt" />
      <div className="clt-header" style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>CLT & Direitos</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Referência completa de direitos, deveres e verbas rescisórias da legislação trabalhista brasileira.
          </p>
        </div>
        {tab === 'direitos' && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Icon name="search" size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
            <input
              className="field clt-search"
              placeholder="Buscar por palavra-chave ou artigo…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, background: 'var(--surface-2)' }}
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="clt-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 14px', border: 'none', background: 'transparent',
              color: tab === t.id ? 'var(--brand)' : 'var(--muted)',
              fontSize: 13, fontWeight: tab === t.id ? 700 : 500, cursor: 'pointer',
              borderBottom: `2px solid ${tab === t.id ? 'var(--brand)' : 'transparent'}`,
              marginBottom: -1, whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            <Icon name={t.icon} size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'direitos'  && <DireitosTab search={search} />}
      {tab === 'simulador' && <SimuladorTab />}
      {tab === 'valores'   && <ValoresTab />}
    </div>
    </>
  );
}
