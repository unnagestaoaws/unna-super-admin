import { apiService } from './api';

export interface AsaasFatura {
  id: string;
  status: string;
  value: number;
  netValue?: number;
  billingType?: string;
  dueDate?: string;
  paymentDate?: string | null;
  description?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  transactionReceiptUrl?: string | null;
  dateCreated?: string;
}

export interface FaturasFiltros {
  limit?: number;
  offset?: number;
  status?: string;
  billingType?: string;
  vencimentoInicio?: string; // YYYY-MM-DD
  vencimentoFim?: string;    // YYYY-MM-DD
  pagamentoInicio?: string;
  pagamentoFim?: string;
}

export interface EmpresaFaturas {
  empresaId: string;
  nome_negocio: string;
  /** Gateway da assinatura. Na Woovi, `customerId` é o id da assinatura lá. */
  gateway?: 'asaas' | 'woovi';
  customerId: string | null;
  faturas: AsaasFatura[];
  hasMore: boolean;
  totalCount: number;
  message?: string;
}

export interface DashboardStats {
  totalEmpresas: number;
  totalUsuarios: number;
  totalAssinaturas: number;
  receitaMensal: number;
  receitaAnual: number;
  assinaturasAtivas: number;
  assinaturasTrial: number;
  assinaturasCanceladas: number;
  empresasEsteMes: number;
  usuariosEsteMes: number;
  usuariosOnline: number;
  version: string;
}

export interface OnlineUser {
  id: string;
  nome: string;
  email: string;
  role: string;
  empresa?: {
    nome_negocio: string;
    assinatura?: {
      status: 'ACTIVE' | 'TRIAL' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
      data_fim?: string | null;
      plano?: {
        nome: string;
      } | null;
    } | null;
  };
  ultimo_login?: string;
}

export interface EngagementStats {
  id: string;
  nome_negocio: string;
  email: string;
  telefone: string | null;
  plano: string;
  statusAssinatura: string;
  ultimoLogin: string | null;
  ultimoAgendamento: string | null;
  ultimaTransacao: string | null;
  ultimaAtividade: string | null;
  registered_at: string;
}

export interface EmpresasStats {
  total: number;
  esteMes: number;
  ativas: number;
}

export interface AssinaturasStats {
  ativas: number;
  trial: number;
  canceladas: number;
  total: number;
}

export interface ReceitaStats {
  mensal: number;
  anual: number;
  crescimentoMensal: number;
}

export interface LoginLog {
  id: string;
  sucesso: boolean;
  motivo: string;
  metodo: string;
  identificador: string | null;
  mensagem: string | null;
  detalhes?: any;
  usuarioId: string | null;
  empresaId: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  usuario?: {
    id: string;
    nome: string;
    email: string | null;
    role: string;
  } | null;
  empresa?: {
    id: string;
    nome_negocio: string;
  } | null;
}

export interface CronLog {
  id: string;
  job_name: string;
  status: 'running' | 'success' | 'failed';
  started_at: string;
  finished_at?: string;
  duration_ms?: number;
  details?: any;
  error_message?: string;
  created_at: string;
}

export interface WorkerHealth {
  status: 'online' | 'offline';
  message?: string;
  uptime?: number;
  version?: string;
  memoryUsage?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

export interface AccountDeletionRequest {
  id: string;
  protocolo: string;
  createdAt: string;
  ip: string | null;
  userAgent: string | null;
  motivo: string | null;
  prazoInformadoHoras: number | null;
  cientePrazo: boolean;
  cienteIrreversivel: boolean;
  usuario: {
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
    role: string;
  } | null;
  empresa: {
    id: string;
    nome_negocio: string;
    email: string | null;
    cnpj: string | null;
    assinatura: {
      status: string;
      plano: {
        nome: string;
      } | null;
    } | null;
  } | null;
}

export interface AccountDeletionRequestsResponse {
  data: AccountDeletionRequest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

class SuperAdminService {
  async impersonarEmpresa(empresaId: string): Promise<import('./impersonation.service').ImpersonationResponse> {
    try {
      return await apiService.post<import('./impersonation.service').ImpersonationResponse>(
        `/super-admin/impersonate/${empresaId}`,
        {}
      );
    } catch (error) {
      console.error('Erro ao impersonar empresa:', error);
      throw error;
    }
  }

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await apiService.get<DashboardStats>('/super-admin/dashboard-stats');
      return response;
    } catch (error) {
      console.error('Erro ao buscar estatísticas do dashboard:', error);
      throw error;
    }
  }

  async getEmpresasStats(): Promise<EmpresasStats> {
    try {
      const response = await apiService.get<EmpresasStats>('/super-admin/empresas-stats');
      return response;
    } catch (error) {
      console.error('Erro ao buscar estatísticas de empresas:', error);
      throw error;
    }
  }

  async getAssinaturasStats(): Promise<AssinaturasStats> {
    try {
      const response = await apiService.get<AssinaturasStats>('/super-admin/assinaturas-stats');
      return response;
    } catch (error) {
      console.error('Erro ao buscar estatísticas de assinaturas:', error);
      throw error;
    }
  }

  async getReceitaStats(): Promise<ReceitaStats> {
    try {
      const response = await apiService.get<ReceitaStats>('/super-admin/receita-stats');
      return response;
    } catch (error) {
      console.error('Erro ao buscar estatísticas de receita:', error);
      throw error;
    }
  }

  async getWebhookLogs(params: {
    page?: number;
    limit?: number;
    event?: string;
    processed?: boolean;
    empresaId?: string;
  }): Promise<{
    logs: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.event) queryParams.append('event', params.event);
      if (params.processed !== undefined) queryParams.append('processed', params.processed.toString());
      if (params.empresaId) queryParams.append('empresaId', params.empresaId);

      const response = await apiService.get<{
        logs: any[];
        pagination: any;
      }>(`/super-admin/webhook-logs?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar logs de webhook:', error);
      throw error;
    }
  }

  async getRegistrosPorDia(dataInicio: string, dataFim: string): Promise<Array<{ data: string; quantidade: number; acumulado: number }>> {
    try {
      const response = await apiService.get<Array<{ data: string; quantidade: number; acumulado: number }>>(
        `/super-admin/registros-por-dia?dataInicio=${dataInicio}&dataFim=${dataFim}`
      );
      return response;
    } catch (error) {
      console.error('Erro ao buscar registros por dia:', error);
      throw error;
    }
  }

  async getOnlineUsers(): Promise<OnlineUser[]> {
    try {
      const response = await apiService.get<OnlineUser[]>('/super-admin/online-users');
      return response;
    } catch (error) {
      console.error('Erro ao buscar usuários online:', error);
      throw error;
    }
  }

  async getLoginLogs(params: {
    page?: number;
    limit?: number;
    motivo?: string;
    metodo?: string;
    identificador?: string;
    empresaId?: string;
  }): Promise<{
    data: LoginLog[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.motivo) queryParams.append('motivo', params.motivo);
    if (params.metodo) queryParams.append('metodo', params.metodo);
    if (params.identificador) queryParams.append('identificador', params.identificador);
    if (params.empresaId) queryParams.append('empresaId', params.empresaId);

    return apiService.get<{
      data: LoginLog[];
      pagination: any;
    }>(`/super-admin/login-logs?${queryParams.toString()}`);
  }

  async getCronLogs(params: {
    page?: number;
    limit?: number;
    job?: string;
    status?: string;
  }): Promise<{
    data: CronLog[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.job) queryParams.append('job', params.job);
      if (params.status) queryParams.append('status', params.status);

      const response = await apiService.get<{
        data: CronLog[];
        pagination: any;
      }>(`/super-admin/cron-logs?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar logs de cron:', error);
      throw error;
    }
  }

  async getAccountDeletionRequests(params: {
    page?: number;
    limit?: number;
  } = {}): Promise<AccountDeletionRequestsResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const qs = queryParams.toString();
      const response = await apiService.get<AccountDeletionRequestsResponse>(
        `/super-admin/account-deletion-requests${qs ? `?${qs}` : ''}`
      );
      return response;
    } catch (error) {
      console.error('Erro ao buscar solicitações LGPD de exclusão:', error);
      throw error;
    }
  }

  async getWorkerHealth(): Promise<WorkerHealth> {
    try {
      const response = await apiService.get<WorkerHealth>('/super-admin/worker-health');
      return response;
    } catch (error) {
      console.error('Erro ao buscar health do worker:', error);
      return { status: 'offline', message: 'Worker microservice is not responding' };
    }
  }

  async getClientes(params: {
    empresaId: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    data: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('empresaId', params.empresaId);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);

      const response = await apiService.get<{
        data: any[];
        pagination: any;
      }>(`/super-admin/clientes?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      throw error;
    }
  }

  async removeCliente(id: string): Promise<void> {
    try {
      await apiService.delete(`/super-admin/clientes/${id}`);
    } catch (error) {
      console.error('Erro ao remover cliente:', error);
      throw error;
    }
  }

  async bulkRemoveClientes(empresaId: string): Promise<{ count: number }> {
    try {
      const response = await apiService.delete<{ count: number }>(`/super-admin/clientes/bulk/${empresaId}`);
      return response;
    } catch (error) {
      console.error('Erro ao remover clientes em massa:', error);
      throw error;
    }
  }

  async getAgendamentosEmpresa(empresaId: string, data: string): Promise<any[]> {
    try {
      const response = await apiService.get<any[]>(`/super-admin/empresas/${empresaId}/agendamentos?data=${data}`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar agendamentos da empresa:', error);
      throw error;
    }
  }

  async getFaturasEmpresa(empresaId: string, filtros: FaturasFiltros = {}): Promise<EmpresaFaturas> {
    try {
      const params = new URLSearchParams();
      params.set('limit', String(filtros.limit ?? 50));
      params.set('offset', String(filtros.offset ?? 0));
      if (filtros.status) params.set('status', filtros.status);
      if (filtros.billingType) params.set('billingType', filtros.billingType);
      if (filtros.vencimentoInicio) params.set('vencimentoInicio', filtros.vencimentoInicio);
      if (filtros.vencimentoFim) params.set('vencimentoFim', filtros.vencimentoFim);
      if (filtros.pagamentoInicio) params.set('pagamentoInicio', filtros.pagamentoInicio);
      if (filtros.pagamentoFim) params.set('pagamentoFim', filtros.pagamentoFim);

      const response = await apiService.get<EmpresaFaturas>(
        `/super-admin/empresas/${empresaId}/faturas?${params.toString()}`
      );
      return response;
    } catch (error) {
      console.error('Erro ao buscar faturas da empresa:', error);
      throw error;
    }
  }

  async getEngagementStats(): Promise<EngagementStats[]> {
    try {
      const response = await apiService.get<EngagementStats[]>('/super-admin/engagement-stats');
      return response;
    } catch (error) {
      console.error('Erro ao buscar estatísticas de engajamento:', error);
      throw error;
    }
  }

  async getClienteProfile(id: string, startDate?: string, endDate?: string): Promise<any> {
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      const response = await apiService.get<any>(`/super-admin/clientes/${id}/profile?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar perfil do cliente:', error);
      throw error;
    }
  }

  async syncPermissions(): Promise<any> {
    try {
      const response = await apiService.post<any>('/super-admin/sync-permissions', {});
      return response;
    } catch (error) {
      console.error('Erro ao sincronizar permissões:', error);
      throw error;
    }
  }
}

export const superAdminService = new SuperAdminService();
