import { apiService } from './api';

/**
 * Uso do sistema por empresa (super admin).
 *
 * A contagem é gravada em lote pelo UsoRotaInterceptor do backend e só conta
 * request autenticado com empresa — site público, webhooks e crons ficam de
 * fora, então o volume aqui não é o volume total da API. É métrica de adoção,
 * não auditoria: um flush perdido some com o lote.
 */

export interface FiltroUso {
  /** YYYY-MM-DD */
  de?: string;
  /** YYYY-MM-DD */
  ate?: string;
  empresaId?: string;
  origem?: string;
  metodo?: string;
  busca?: string;
  limit?: number;
}

export interface PeriodoUso {
  de: string;
  ate: string;
}

export interface UsoTotais {
  chamadas: number;
  erros: number;
  empresas: number;
  rotas: number;
}

export interface UsoDia {
  dia: string;
  total: number;
  erros: number;
  empresas: number;
}

export interface UsoOrigem {
  origem: string;
  total: number;
  empresas: number;
}

export interface UsoResumo {
  periodo: PeriodoUso;
  totais: UsoTotais;
  porDia: UsoDia[];
  porOrigem: UsoOrigem[];
}

export interface UsoRota {
  metodo: string;
  rota: string;
  total: number;
  erros: number;
  empresas: number;
  ultimo_dia: string;
}

export interface UsoEmpresa {
  empresaId: string;
  nome: string | null;
  status: string | null;
  total: number;
  erros: number;
  rotas: number;
  dias_ativos: number;
  ultimo_dia: string;
}

export interface UsoDetalheEmpresa {
  empresa: { id: string; nome_negocio: string; status: string } | null;
  periodo: PeriodoUso;
  dados: UsoRota[];
}

const BASE = '/super-admin/uso-rotas';

class UsoRotaService {
  async resumo(filtro: FiltroUso = {}): Promise<UsoResumo> {
    return await apiService.get<UsoResumo>(BASE + '/resumo', { params: filtro as Record<string, unknown> });
  }

  async porRota(filtro: FiltroUso = {}): Promise<{ periodo: PeriodoUso; dados: UsoRota[] }> {
    return await apiService.get<{ periodo: PeriodoUso; dados: UsoRota[] }>(BASE + '/rotas', {
      params: filtro as Record<string, unknown>,
    });
  }

  async porEmpresa(filtro: FiltroUso = {}): Promise<{ periodo: PeriodoUso; dados: UsoEmpresa[] }> {
    return await apiService.get<{ periodo: PeriodoUso; dados: UsoEmpresa[] }>(BASE + '/empresas', {
      params: filtro as Record<string, unknown>,
    });
  }

  async detalheEmpresa(empresaId: string, filtro: FiltroUso = {}): Promise<UsoDetalheEmpresa> {
    return await apiService.get<UsoDetalheEmpresa>(`${BASE}/empresas/${empresaId}`, {
      params: filtro as Record<string, unknown>,
    });
  }
}

export const usoRotaService = new UsoRotaService();
