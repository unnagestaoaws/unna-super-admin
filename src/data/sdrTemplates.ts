// Scripts de recuperação de leads (SDR).
// Regra: mensagens curtas, tom direto, sempre com pergunta ou CTA no final.
// Placeholders suportados: {nome}, {plano}, {data}.

export type SdrSegmentKey =
  | 'trial'
  | 'pendente'
  | 'cancelado_recente'
  | 'cancelado_antigo'
  | 'sem_assinatura';

export interface SdrTemplateMessage {
  /** Rótulo curto do momento do funil (ex.: "Abertura", "Follow-up 48h"). */
  label: string;
  /** Quando usar esta mensagem (condição / gatilho). Opcional. */
  quando?: string;
  /** Texto da mensagem, com placeholders {nome} {plano} {data}. */
  texto: string;
}

export interface SdrSegment {
  key: SdrSegmentKey;
  titulo: string;
  diagnostico: string;
  oferta: string;
  mensagens: SdrTemplateMessage[];
}

export const SDR_SEGMENTS: Record<SdrSegmentKey, SdrSegment> = {
  trial: {
    key: 'trial',
    titulo: 'Trial não convertido',
    diagnostico: 'Não é objeção de preço, é falta de ativação/valor percebido a tempo.',
    oferta: 'Tempo extra + ajuda de setup. Nunca desconto aqui.',
    mensagens: [
      {
        label: 'Abertura',
        texto:
          'Oi {nome}! Vi que você testou a Unna há um tempo mas não deu continuidade, tudo certo? Rolou alguma dificuldade pra configurar ou foi falta de tempo mesmo?',
      },
      {
        label: 'Oferta de setup',
        quando: 'Se responder "sem tempo" ou "não usei direito"',
        texto:
          'Entendo total. Que tal eu reabrir seu teste por mais 7 dias e a gente configura junto numa call rápida de 15 min? Você só usa, eu cuido da parte chata.',
      },
      {
        label: 'Follow-up 48h',
        quando: 'Sem resposta em 48h',
        texto:
          '{nome}, só reforçando: se quiser retomar o teste da Unna é só me chamar aqui, sem compromisso. 👍',
      },
    ],
  },
  pendente: {
    key: 'pendente',
    titulo: 'Pendente (pagamento falhou)',
    diagnostico: 'Não é churn de verdade, é fricção de cobrança. O cliente pode nem saber que perdeu acesso.',
    oferta: 'Nenhuma. Só resolver o pagamento, com urgência.',
    mensagens: [
      {
        label: 'Abertura',
        texto:
          'Oi {nome}, aqui é da Unna! Seu pagamento do plano {plano} não passou e seu acesso pode ser suspenso. Consegue atualizar o cartão agora? Te mando o link.',
      },
      {
        label: 'Follow-up 24h',
        quando: 'Sem resposta em 24h',
        texto:
          '{nome}, seu acesso à Unna ainda está pendente por causa do pagamento. Posso te ajudar a resolver agora? Leva 2 minutos.',
      },
      {
        label: 'Follow-up 72h',
        quando: 'Sem resposta em 72h. Urgência real, sem ameaça.',
        texto:
          '{nome}, não quero que você perca seus dados de agendamento por causa disso. Bora resolver? Qualquer dúvida no pagamento me chama que eu ajudo.',
      },
    ],
  },
  cancelado_recente: {
    key: 'cancelado_recente',
    titulo: 'Cancelado recente (até ~60 dias)',
    diagnostico: 'Motivo ainda fresco. Vale oferta pontual como gatilho de decisão.',
    oferta: 'Desconto de reativação com prazo curto (ex.: 20% no primeiro mês de volta).',
    mensagens: [
      {
        label: 'Abertura',
        texto:
          'Oi {nome}! Notei que você cancelou a Unna recentemente, posso perguntar o que pesou na decisão? Preço, uso, ou trocou de sistema?',
      },
      {
        label: 'Resposta: preço',
        quando: 'Se responder "preço"',
        texto:
          'Faz sentido. Separei uma condição pra você voltar: 20% de desconto no primeiro mês, plano {plano}. Válido até {data}. Topa reativar?',
      },
      {
        label: 'Resposta: não usava',
        quando: 'Se responder "não estava usando"',
        texto:
          'Entendi. O que mais trava o uso costuma ser a configuração inicial. Se eu te ajudar a deixar tudo redondo (agenda, clientes, financeiro), faz sentido tentar de novo?',
      },
      {
        label: 'Follow-up 48h',
        quando: 'Sem resposta em 48h',
        texto:
          '{nome}, deixo aqui a condição de reativação aberta até {data} caso queira retomar. Sem pressão. 🙂',
      },
    ],
  },
  cancelado_antigo: {
    key: 'cancelado_antigo',
    titulo: 'Cancelado / Expirado antigo (3+ meses)',
    diagnostico: 'Maior risco de queimar a lista. Não oferte de cara, pergunte primeiro.',
    oferta: 'Só depois de entender o motivo, e só se for genuinamente relevante pra ele.',
    mensagens: [
      {
        label: 'Abertura (só pergunta)',
        texto:
          'Oi {nome}, tudo bem? Aqui é da Unna. Faz um tempo que você não usa o sistema, só queria entender rapidinho o que rolou, saiu por algum motivo específico?',
      },
      {
        label: 'Resposta: achei caro',
        quando: 'Oferecer o plano Starter como porta de entrada, não desconto no plano antigo.',
        texto:
          'Faz total sentido. Temos o plano Starter por R$49,90, que é uma porta de entrada mais leve. Quer que eu te mostre o que ele já cobre?',
      },
      {
        label: 'Resposta: não usava',
        quando: 'Confirmar se ainda tem o salão ativo antes de ofertar.',
        texto:
          'Entendi. Você ainda está com o salão ativo? Se sim, posso te ajudar a recomeçar do zero com um onboarding assistido, sem você perder tempo.',
      },
      {
        label: 'Resposta: fui pra concorrente',
        quando: 'Registrar o que ele sentiu falta (dado de produto) antes de ofertar.',
        texto:
          'Show, obrigado por contar. Posso te perguntar o que sentiu falta na Unna? Isso ajuda demais a gente a melhorar, e quem sabe já tem novidade nesse ponto.',
      },
      {
        label: 'Follow-up 72h',
        quando: 'Sem resposta em 72h. Última tentativa, tom leve.',
        texto:
          '{nome}, sem problema se não for o momento! Fico à disposição se quiser voltar a usar a Unna no futuro. Abraço 👋',
      },
    ],
  },
  sem_assinatura: {
    key: 'sem_assinatura',
    titulo: 'Sem assinatura (cadastrou, nunca ativou trial)',
    diagnostico: 'Interesse existiu (cadastrou), mas nunca chegou a experimentar.',
    oferta: 'Remover fricção de início, trial guiado.',
    mensagens: [
      {
        label: 'Boas-vindas',
        quando: 'Logo após o cadastro, antes de qualquer contato comercial.',
        texto:
          'Olá {nome}! Tudo bem? 💜\n\nSeja muito bem-vindo(a) à Unna, a plataforma feita para descomplicar a gestão do seu negócio de beleza!\nEstamos muito felizes em ter você aqui.\nA partir de agora, você está a um passo de dar adeus ao caderninho e ter o controle total da sua agenda, financeiro e comissões em um só lugar.\n\nSe precisar de qualquer ajuda para dar os primeiros passos ou configurar sua conta, nosso time de suporte está totalmente à disposição por aqui.\nÉ só chamar!\n\nAbraços,\nEquipe Unna',
      },
      {
        label: 'Boas-vindas (dor da rotina)',
        quando: 'Variação para quem já tem salão/clínica rodando.',
        texto:
          'Oi {nome}, que bom ter você com a gente!\n\nSabemos que a rotina em um salão ou clínica de estética é corrida e que a falta de tempo ou clientes que faltam sem avisar geram muita dor de cabeça.\n\nA Unna nasceu justamente para devolver a leveza ao seu trabalho e potencializar seus resultados.\nQueremos ver o seu negócio crescer!\n\nSe tiver qualquer dúvida sobre como usar a agenda, integrar seu WhatsApp ou mexer no painel, não hesite em nos mandar uma mensagem.\nO nosso suporte está aqui para te ajudar no que for preciso.\n\nBom trabalho e conte com a Unna! 🚀',
      },
      {
        label: 'Boas-vindas (convite ao setup)',
        quando: 'Variação com CTA de configuração em 10 minutos.',
        texto:
          'Olá, {nome}!\nObrigado pelo interesse na Unna!\n\nVocê acaba de escolher o caminho mais simples e completo para gerenciar seu espaço de beleza.\n\nVocê sabia que pode configurar sua agenda e o financeiro em menos de 10 minutos?\nPara que sua experiência seja perfeita, lembre-se: nosso suporte está 100% à disposição.\n\nSe surgir qualquer dúvida durante o seu teste ou se precisar de ajuda para entender os planos, basta responder a esta mensagem.\n\nVamos juntos crescer o seu negócio!\n✨ Time Unna',
      },
    ],
  },
};

/** Ordem de prioridade de disparo (ROI/esforço). */
export const SDR_SEGMENT_ORDER: SdrSegmentKey[] = [
  'pendente',
  'trial',
  'cancelado_recente',
  'sem_assinatura',
  'cancelado_antigo',
];

/**
 * Descobre o segmento de abordagem a partir do lead.
 * Cancelado/Expirado é dividido por idade (<= 60 dias = recente).
 */
export function detectSegment(params: {
  assinaturaStatus?: string | null;
  temAssinatura: boolean;
  diasDesdeFim?: number | null;
}): SdrSegmentKey {
  const { assinaturaStatus, temAssinatura, diasDesdeFim } = params;
  if (!temAssinatura) return 'sem_assinatura';
  switch (assinaturaStatus) {
    case 'TRIAL':
      return 'trial';
    case 'PENDING':
      return 'pendente';
    case 'CANCELLED':
    case 'EXPIRED':
      return diasDesdeFim != null && diasDesdeFim <= 60
        ? 'cancelado_recente'
        : 'cancelado_antigo';
    default:
      // ACTIVE ou desconhecido: sem segmento óbvio, cai no mais conservador.
      return 'cancelado_antigo';
  }
}

/** Substitui os placeholders {nome} {plano} {data} no texto. */
export function fillTemplate(
  texto: string,
  vars: { nome?: string | null; plano?: string | null; data?: string | null },
): string {
  return texto
    .replace(/\{nome\}/g, vars.nome?.trim() || 'tudo bem')
    .replace(/\{plano\}/g, vars.plano?.trim() || 'seu plano')
    .replace(/\{data\}/g, vars.data?.trim() || 'o fim da semana');
}
