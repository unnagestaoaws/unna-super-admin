import { apiService } from './api';

/**
 * Mensagens transacionais de WhatsApp de todas as empresas (super admin).
 *
 * A fonte é a `whatsapp_outbox` — é ela que guarda o provedor real (waha,
 * evolution ou official/WABA), as tentativas e o erro. Notificação em massa e
 * as conversas do Atendimento não aparecem aqui: têm modelo próprio.
 */

export type ProviderWhatsapp = 'waha' | 'evolution' | 'official';

export interface FiltroMensagens {
  /** YYYY-MM-DD */
  de?: string;
  /** YYYY-MM-DD */
  ate?: string;
  empresaId?: string;
  provider?: string;
  status?: string;
  tipo?: string;
  destinatario?: string;
  page?: number;
  limit?: number;
}

export interface AckMensagem {
  code: number | null;
  status: string | null;
  at: string | null;
}

export interface MensagemWhatsapp {
  id: string;
  empresaId: string;
  empresa: string | null;
  tipo: string;
  destinatario: string;
  canal: string;
  provider: string | null;
  status: string;
  tentativas: number;
  maxTentativas: number;
  providerMessageId: string | null;
  ultimoErro: string | null;
  ultimoErroCodigo: string | null;
  createdAt: string;
  aceitoEm: string | null;
  entregueEm: string | null;
  lidoEm: string | null;
  falhouEm: string | null;
  messageLogId: string | null;
  ack: AckMensagem | null;
}

export interface PaginacaoMensagens {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListaMensagens {
  data: MensagemWhatsapp[];
  pagination: PaginacaoMensagens;
}

export interface ResumoMensagens {
  total: number;
  porStatus: { status: string; total: number }[];
  porProvider: { provider: string; total: number }[];
  porTipo: { tipo: string; total: number }[];
}

export interface TentativaEnvio {
  id: string;
  numero: number;
  provider: string | null;
  status: string;
  iniciadoEm: string;
  finalizadoEm: string | null;
  duracaoMs: number | null;
  providerResponse: unknown;
  erro: string | null;
  erroCodigo: string | null;
}

export interface DetalheMensagem extends Omit<MensagemWhatsapp, 'empresa' | 'ack'> {
  payload: unknown;
  idempotencyKey: string;
  prioridade: number;
  proximaTentativaEm: string | null;
  empresa: { id: string; nome_negocio: string } | null;
  tentativasEnvio: TentativaEnvio[];
  messageLog: Record<string, unknown> | null;
}

const BASE = '/super-admin/mensagens-whatsapp';

class MensagemWhatsappService {
  async listar(filtro: FiltroMensagens = {}): Promise<ListaMensagens> {
    return await apiService.get<ListaMensagens>(BASE, { params: filtro as Record<string, unknown> });
  }

  async resumo(filtro: FiltroMensagens = {}): Promise<ResumoMensagens> {
    return await apiService.get<ResumoMensagens>(`${BASE}/resumo`, {
      params: filtro as Record<string, unknown>,
    });
  }

  async detalhar(id: string): Promise<DetalheMensagem> {
    return await apiService.get<DetalheMensagem>(`${BASE}/${id}`);
  }
}

export const mensagemWhatsappService = new MensagemWhatsappService();
