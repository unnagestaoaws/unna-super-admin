import { apiService } from './api'

export type StatusSubconta =
  | 'nao_solicitado'
  | 'pendente'
  | 'solicitado'
  | 'criando_conta'
  | 'em_analise'
  | 'em_analise_asaas'
  | 'ativo'
  | 'aprovado'
  | 'rejeitado'
  | 'rejeitado_unna'
  | 'rejeitado_asaas'
  | 'desabilitado'

export interface SubcontaResumo {
  empresaId: string
  status: StatusSubconta
  nome_empresa?: string | null
  email?: string | null
  solicitado_em?: string | null
  analisado_em?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  motivo_pendencia?: string | null
  status_comercial?: string | null
  status_documentacao?: string | null
  status_conta_bancaria?: string | null
  empresa?: {
    nome_negocio?: string | null
    email?: string | null
  } | null
}

type SolicitacoesResposta = SubcontaResumo[] | { solicitacoes: SubcontaResumo[] }

const normalizarLista = (resposta: SolicitacoesResposta): SubcontaResumo[] =>
  Array.isArray(resposta) ? resposta : resposta.solicitacoes || []

class UnnaPayAdminService {
  async listar(): Promise<SubcontaResumo[]> {
    const resposta = await apiService.get<SolicitacoesResposta>('/super-admin/asaas-recebimento/solicitacoes')
    return normalizarLista(resposta)
  }

  aprovar(empresaId: string): Promise<SubcontaResumo> {
    return apiService.post<SubcontaResumo>(`/super-admin/asaas-recebimento/${empresaId}/aprovar`)
  }

  sincronizar(empresaId: string): Promise<SubcontaResumo> {
    return apiService.post<SubcontaResumo>(`/super-admin/asaas-recebimento/${empresaId}/sincronizar`)
  }
}

export const unnaPayAdminService = new UnnaPayAdminService()
