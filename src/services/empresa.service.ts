import { apiService } from './api';

export interface Endereco {
  id?: string;
  cep: string;
  logradouro: string;
  numero?: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais?: string;
}

export interface MaquinaCartao {
  id: string;
  nome: string;
  debito: number;
  credito: number;
}

/**
 * Lista as maquininhas configuradas em `empresa.configuracoes.maquinas`.
 * Fallback retrocompatível: se só houver o formato antigo `taxas_maquina`,
 * trata-o como uma única máquina.
 */
export const getMaquinas = (config: any): MaquinaCartao[] => {
  const maquinas = config?.maquinas;
  if (Array.isArray(maquinas) && maquinas.length > 0) {
    return maquinas.map((m: any) => ({
      id: String(m?.id ?? ''),
      nome: String(m?.nome ?? 'Maquininha'),
      debito: Number(m?.debito) || 0,
      credito: Number(m?.credito) || 0,
    }));
  }
  const legado = config?.taxas_maquina;
  if (legado) {
    return [{ id: 'legacy', nome: 'Maquininha', debito: Number(legado?.debito) || 0, credito: Number(legado?.credito) || 0 }];
  }
  return [];
};

/** Resolve o percentual de taxa da máquina escolhida (ou padrão) para um método de cartão. */
export const resolverTaxaMaquina = (config: any, metodo: string, maquinaId?: string): number => {
  const maquinas = getMaquinas(config);
  if (maquinas.length === 0) return 0;
  const maquina = (maquinaId && maquinas.find(m => m.id === maquinaId)) || maquinas[0];
  const mp = (metodo || '').toLowerCase();
  const isDebito = mp.includes('debito') || mp.includes('débito');
  return isDebito ? maquina.debito : maquina.credito;
};

export interface Empresa {
  id: string;
  nome_negocio: string;
  telefone?: string;
  email?: string;
  endereco?: Endereco;
  cnpj?: string;
  configuracoes: any;
  status: string;
  createdAt: string;
  updatedAt: string;
  registered_at?: string;
  slug?: string;
  avatar_url?: string;
}

export interface CreateEmpresaData {
  nome_negocio: string;
  email?: string;
  telefone?: string;
  /** No modal de superadmin o endereço é string livre; na API pode ser objeto. */
  endereco?: Endereco | string;
  cnpj?: string;
  configuracoes?: any;
  slug?: string;
}

export interface UpdateEmpresaData {
  nome_negocio?: string;
  email?: string;
  telefone?: string;
  endereco?: Endereco | string;
  cnpj?: string;
  configuracoes?: any;
  status?: string;
  slug?: string;
}

export interface RegisterEmpresaData {
  empresa: {
    nome_negocio: string;
    telefone?: string;
    endereco?: string;
    cnpj?: string;
  };
  admin: {
    nome_admin: string;
    email_admin?: string;
    telefone_admin?: string;
    senha?: string;
    auth_provider?: string;
    googleId?: string;
    appleId?: string;
    termos_aceitos?: boolean;
  };
  /** Atribuição de marketing (first-touch): gclid/utm_* capturados do anúncio. */
  marketing?: {
    gclid?: string;
    gbraid?: string;
    wbraid?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    landing_url?: string;
    referrer?: string;
  };
}

/** Linha de breakdown do relatório de atribuição (por fonte ou por campanha). */
export interface AtribuicaoGrupo {
  valor: string;
  total: number;
  adDriven: number;
  google: number;
  meta: number;
  ativas: number;
}

export interface CadastroAtribuido {
  id: string;
  nome_negocio: string;
  createdAt: string;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  fbclid?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  assinatura_status?: 'ACTIVE' | 'TRIAL' | 'PENDING' | 'CANCELLED' | 'EXPIRED' | null;
}

export interface RelatorioAtribuicao {
  periodo: { inicio: string | null; fim: string | null };
  resumo: {
    total_cadastros: number;
    atribuiveis_a_anuncio: number;
    atribuiveis_google: number;
    atribuiveis_meta: number;
    com_utm: number;
    sem_atribuicao: number;
    assinaturas_ativas: number;
    ativas_de_anuncio: number;
    ativas_google: number;
    ativas_meta: number;
  };
  por_fonte: AtribuicaoGrupo[];
  por_campanha: AtribuicaoGrupo[];
  cadastros: CadastroAtribuido[];
}

class EmpresaService {
  async getEmpresas(params?: { 
    page?: number; 
    limit?: number; 
    search?: string;
    status?: string;
    subscriptionStatus?: string;
  }): Promise<{ data: Empresa[]; total: number; pages: number }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status && params.status !== 'all') queryParams.append('status', params.status);
    if (params?.subscriptionStatus && params.subscriptionStatus !== 'all') queryParams.append('subscriptionStatus', params.subscriptionStatus);

    return await apiService.get<{ data: Empresa[]; total: number; pages: number }>(`/empresas?${queryParams.toString()}`);
  }

  async getEmpresa(id: string, signal?: AbortSignal): Promise<Empresa> {
    return await apiService.get<Empresa>(`/empresas/${id}`, { signal });
  }

  async createEmpresa(data: CreateEmpresaData): Promise<Empresa> {
    return await apiService.post<Empresa>('/empresas', data);
  }

  async updateEmpresa(id: string, data: UpdateEmpresaData): Promise<Empresa> {
    return await apiService.put<Empresa>(`/empresas/${id}`, data);
  }

  async deleteEmpresa(id: string): Promise<void> {
    await apiService.delete(`/empresas/${id}`);
  }

  async registerEmpresa(data: RegisterEmpresaData): Promise<any> {
    return await apiService.post<any>('/empresas/register', data);
  }

  async gerarSlug(id: string): Promise<{ slug: string }> {
    return await apiService.post<{ slug: string }>(`/empresas/${id}/gerar-slug`, {});
  }

  async atualizarSlug(id: string, slug: string): Promise<{ slug: string; aviso?: string }> {
    return await apiService.put<{ slug: string; aviso?: string }>(`/empresas/${id}/slug`, { slug });
  }

  async verificarSlug(slug: string, empresaId?: string): Promise<{ disponivel: boolean; mensagem?: string }> {
    const params = empresaId ? `?empresaId=${empresaId}` : '';
    return await apiService.get<{ disponivel: boolean; mensagem?: string }>(`/empresas/verificar-slug/${slug}${params}`);
  }

  async uploadFotoEstabelecimento(id: string, file: File, index: number): Promise<{ url: string }> {
    return await apiService.uploadFile<{ url: string }>(`/empresas/${id}/upload-foto?index=${index}`, file);
  }

  async deleteFotoEstabelecimento(id: string, index: number): Promise<{ success: boolean }> {
    return await apiService.delete(`/empresas/${id}/foto/${index}`) as any;
  }

  async purgeEmpresa(id: string): Promise<void> {
    await apiService.delete(`/super-admin/empresas/${id}/purge`);
  }

  /**
   * Relatório de atribuição de marketing (superadmin).
   * Fonte de verdade para comparar com Google Ads e Meta: quantos cadastros do
   * período têm click-id de anúncio. Datas no formato YYYY-MM-DD.
   */
  async getRelatorioAtribuicao(params?: {
    inicio?: string;
    fim?: string;
  }): Promise<RelatorioAtribuicao> {
    const queryParams = new URLSearchParams();
    if (params?.inicio) queryParams.append('inicio', params.inicio);
    if (params?.fim) queryParams.append('fim', params.fim);
    const qs = queryParams.toString();
    return await apiService.get<RelatorioAtribuicao>(
      `/empresas/relatorio-atribuicao${qs ? `?${qs}` : ''}`,
    );
  }
}

export const empresaService = new EmpresaService(); 