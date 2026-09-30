import { apiService } from './api';

export interface SdrRecuperacaoStats {
  emRecuperacao: number;
  reativacoes: number;
  cuponsGerados: number;
  cuponsResgatados: number;
  suspensosNoMes: number;
}

export interface SdrFunilStats {
  total: number;
  disparados: number;
  entregues: number;
  lidos: number;
  responderam: number;
  falhas: number;
  novos: number;
  contatados: number;
  emNegociacao: number;
  convertidos: number;
  perdidos: number;
  pipeline: {
    NOVO: number;
    CONTATADO: number;
    EM_NEGOCIACAO: number;
    RECUPERADO: number;
    PERDIDO: number;
  };
}

export interface SdrDashboardStats {
  trialsAtivos: number;
  expirados: number;
  cancelados: number;
  pendentes: number;
  recuperadosEsteMes: number;
  contatosHoje: number;
  totalEmpresas: number;
  todos?: number;
  recuperacao?: SdrRecuperacaoStats;
  segmentos?: Record<string, number>;
  funil?: SdrFunilStats;
}

export type StatusAlcance =
  | 'nao_enviado'
  | 'pendente'
  | 'enviado'
  | 'entregue'
  | 'lido'
  | 'respondeu'
  | 'falha';

export interface SdrLeadAlcance {
  status: StatusAlcance;
  enviadoEm: string | null;
  entregueEm: string | null;
  lidoEm: string | null;
  respondeuEm: string | null;
  falha: string | null;
}

export interface SdrLeadAssinatura {
  status: string;
  plano: string;
  plano_tipo: string;
  data_inicio: string;
  data_fim: string | null;
  valor_pago: number | null;
}

export interface SdrLeadAdmin {
  nome: string;
  email: string | null;
  telefone: string | null;
  ultimo_login: string | null;
}

export interface SdrLeadTracking {
  status: string;
  ultimo_contato: string | null;
  resultado: string | null;
  proximo_contato: string | null;
  notas: string | null;
}

/** Segmentos de abordagem — espelham `SDR_SEGMENTS` em `data/sdrTemplates.ts`. */
export type SegmentoLead =
  | 'trial'
  | 'pendente'
  | 'cancelado_recente'
  | 'cancelado_antigo'
  | 'sem_assinatura';

export interface SdrLeadRecuperacao {
  /** 'regua' = automática (termina em suspensão) · 'winback' = campanha manual */
  trilha: 'regua' | 'winback';
  status: 'ATIVO' | 'CONVERTIDO' | 'RECUSADO' | 'SUSPENSO';
  segmento: SegmentoLead | null;
  etapa_atual: string | null;
  acesso_fim: string | null;
  suspender_em: string | null;
  dias_ate_suspensao: number | null;
  cupom: {
    codigo: string;
    valor: number;
    expira_em: string | null;
    resgatado_em: string | null;
  } | null;
}

export interface SdrLead {
  id: string;
  nome_negocio: string;
  email: string | null;
  telefone: string | null;
  registered_at: string;
  status: string;
  assinatura: SdrLeadAssinatura | null;
  admin: SdrLeadAdmin | null;
  sdr: SdrLeadTracking;
  recuperacao: SdrLeadRecuperacao | null;
  suspenso_em: string | null;
  trial_estendido_em: string | null;
  segmento?: SegmentoLead | 'novos';
  alcance?: SdrLeadAlcance;
}

export interface WinbackCandidato {
  empresaId: string;
  nomeEmpresa: string;
  nomeAdmin: string | null;
  telefone: string;
  segmento: SegmentoLead;
  assinaturaStatus: string | null;
  acessoFim: string | null;
}

export interface PreviaWinback {
  /** Elegíveis no segmento inteiro, independente do `limit` pedido. */
  total: number;
  /** Início da fatia devolvida. */
  offset: number;
  /** Lote atual, do contato mais recente para o mais antigo. */
  candidatos: WinbackCandidato[];
}

export interface WinbackDestinatario {
  id: string;
  empresaId: string | null;
  telefone: string;
  nomeDestinatario: string | null;
  nomeEmpresa: string | null;
  status: string;
  erro: string | null;
  enviadoEm: string | null;
  ack_code: number | null;
  entregueEm: string | null;
  lidoEm: string | null;
  falhaEntrega: string | null;
  respondeuEm: string | null;
  /** Texto da primeira resposta (ou rótulo do botão clicado). */
  respostaTexto: string | null;
  respostas: WinbackRespostaInbound[];
  alcance: StatusAlcance;
}

export interface WinbackRespostaInbound {
  em: string;
  texto: string | null;
  tipo: string;
}

export interface WinbackCampanhaResumo {
  id: string;
  mensagem: string;
  templateName: string | null;
  status: string;
  total: number;
  enviados: number;
  falhas: number;
  createdAt: string;
  entregues: number;
  lidos: number;
  respondidos: number;
  naoEntregues: number;
}

export interface WinbackCampanhaDetalhe extends WinbackCampanhaResumo {
  destinatarios: WinbackDestinatario[];
}

export interface SdrTrackingEntry {
  id: string;
  status: string;
  tipo_contato: string | null;
  resultado: string | null;
  notas: string | null;
  proximo_contato: string | null;
  createdAt: string;
  sdrNome: string;
}

class SdrServiceApi {
  async getDashboardStats(params?: {
    segmento?: string;
    dataInicio?: string;
    dataFim?: string;
  }): Promise<SdrDashboardStats> {
    const query = new URLSearchParams();
    if (params?.segmento) query.set('segmento', params.segmento);
    if (params?.dataInicio) query.set('dataInicio', params.dataInicio);
    if (params?.dataFim) query.set('dataFim', params.dataFim);
    const qs = query.toString();
    return apiService.get<SdrDashboardStats>(`/sdr/dashboard-stats${qs ? `?${qs}` : ''}`);
  }

  async getLeads(params: {
    page?: number;
    limit?: number;
    search?: string;
    subscriptionStatus?: string;
    sdrStatus?: string;
    recuperacaoStatus?: string;
    segmento?: string;
    dataInicio?: string;
    dataFim?: string;
    alcance?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: SdrLead[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.subscriptionStatus) query.set('subscriptionStatus', params.subscriptionStatus);
    if (params.sdrStatus) query.set('sdrStatus', params.sdrStatus);
    if (params.recuperacaoStatus) query.set('recuperacaoStatus', params.recuperacaoStatus);
    if (params.segmento) query.set('segmento', params.segmento);
    if (params.dataInicio) query.set('dataInicio', params.dataInicio);
    if (params.dataFim) query.set('dataFim', params.dataFim);
    if (params.alcance) query.set('alcance', params.alcance);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);
    return apiService.get(`/sdr/leads?${query.toString()}`);
  }

  async getTrackingHistory(empresaId: string): Promise<SdrTrackingEntry[]> {
    return apiService.get<SdrTrackingEntry[]>(`/sdr/leads/${empresaId}/tracking`);
  }

  async createTracking(empresaId: string, data: {
    status?: string;
    tipo_contato?: string;
    resultado?: string;
    notas?: string;
    proximo_contato?: string;
  }): Promise<any> {
    return apiService.post(`/sdr/leads/${empresaId}/tracking`, data);
  }

  /**
   * Envia a abordagem pela sessão WhatsApp do suporte (WAHA) e registra o contato.
   * O backend avança NOVO → CONTATADO; demais status do pipeline são mantidos.
   */
  async enviarAbordagem(empresaId: string, data: { texto: string; rotulo?: string }): Promise<{
    success: boolean;
    telefone: string;
    messageId: string | null;
  }> {
    return apiService.post(`/sdr/leads/${empresaId}/enviar-abordagem`, data);
  }

  async updateLeadStatus(empresaId: string, data: { status: string; notas?: string }): Promise<any> {
    return apiService.patch(`/sdr/leads/${empresaId}/status`, data);
  }

  async getLeadDetail(empresaId: string): Promise<any> {
    return apiService.get(`/sdr/leads/${empresaId}/detail`);
  }

  // ---- Régua de recuperação ----

  /** Prévia da base histórica elegível a um segmento (trilha winback). */
  async getWinbackCandidatos(
    segmento: SegmentoLead,
    limit = 50,
    datas?: { dataInicio?: string; dataFim?: string },
    offset = 0,
  ): Promise<PreviaWinback> {
    const query = new URLSearchParams({ segmento, limit: String(limit), offset: String(offset) });
    if (datas?.dataInicio) query.set('dataInicio', datas.dataInicio);
    if (datas?.dataFim) query.set('dataFim', datas.dataFim);
    return apiService.get<PreviaWinback>(`/recuperacao/winback/candidatos?${query.toString()}`);
  }

  /** Enfileira a campanha. O envio é do dispatcher — respeita janela e ritmo. */
  async dispararWinback(segmento: SegmentoLead, empresaIds: string[]): Promise<{ notificacaoId: string; total: number }> {
    return apiService.post('/recuperacao/winback/disparar', { segmento, empresaIds });
  }

  async getCampanhasWinback(limit = 10): Promise<WinbackCampanhaResumo[]> {
    return apiService.get(`/recuperacao/winback/campanhas?limit=${limit}`);
  }

  async getCampanhaWinback(id: string): Promise<WinbackCampanhaDetalhe> {
    return apiService.get(`/recuperacao/winback/campanhas/${id}`);
  }

  async estenderAcesso(empresaId: string, dias?: number): Promise<any> {
    return apiService.patch(`/recuperacao/leads/${empresaId}/estender`, { dias });
  }

  async removerDaRecuperacao(empresaId: string, status: 'CONVERTIDO' | 'RECUSADO' = 'RECUSADO'): Promise<any> {
    return apiService.patch(`/recuperacao/leads/${empresaId}/remover`, { status });
  }

  async suspenderEmpresa(empresaId: string, motivo?: string): Promise<any> {
    return apiService.patch(`/sdr/leads/${empresaId}/suspender`, { motivo });
  }

  async reativarEmpresa(empresaId: string): Promise<any> {
    return apiService.patch(`/sdr/leads/${empresaId}/reativar`, {});
  }
}

export const sdrService = new SdrServiceApi();
