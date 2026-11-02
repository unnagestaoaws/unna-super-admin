import type { EmpresaPanorama, SituacaoAssinatura } from '@/services/super-admin.service';

export const ROTULO_SITUACAO: Record<SituacaoAssinatura, string> = {
  TRIAL: 'Trial',
  CHECKOUT_PENDENTE: 'Checkout pendente',
  CANCELADA_COM_ACESSO: 'Cancelada, com acesso',
  CANCELADA: 'Cancelada',
  BLOQUEADA: 'Bloqueada',
  EM_DIA: 'Em dia',
  GRACA: 'Período de graça',
};

/** Badge da situação (texto escuro sobre fundo claro: a cor nunca é a única pista). */
export const COR_SITUACAO: Record<SituacaoAssinatura, string> = {
  TRIAL: 'bg-blue-100 text-blue-800',
  CHECKOUT_PENDENTE: 'bg-gray-100 text-gray-700',
  CANCELADA_COM_ACESSO: 'bg-purple-100 text-purple-800',
  CANCELADA: 'bg-gray-100 text-gray-700',
  BLOQUEADA: 'bg-red-100 text-red-800',
  EM_DIA: 'bg-green-100 text-green-800',
  GRACA: 'bg-amber-100 text-amber-800',
};

/**
 * Cores das marcas nos gráficos de pagantes, empilhadas nesta ordem. Validada
 * (dataviz `validate_palette.js`, modo claro): verde e âmbar lado a lado ficam
 * no limite para protanopia, por isso o roxo vai no meio.
 */
export const SERIE_PAGANTES: Array<{ chave: 'EM_DIA' | 'CANCELADA_COM_ACESSO' | 'GRACA'; cor: string }> = [
  { chave: 'EM_DIA', cor: '#16a34a' },
  { chave: 'CANCELADA_COM_ACESSO', cor: '#9333ea' },
  { chave: 'GRACA', cor: '#d97706' },
];

const DIA_MS = 24 * 60 * 60 * 1000;

export const formatarData = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';

/** "Hoje", "Ontem", "Há N dias" ou "Nunca". */
export function haQuantoTempo(iso: string | null, agora: Date = new Date()): string {
  if (!iso) return 'Nunca';
  const dias = Math.floor((agora.getTime() - new Date(iso).getTime()) / DIA_MS);
  if (dias <= 0) return 'Hoje';
  if (dias === 1) return 'Ontem';
  return `Há ${dias} dias`;
}

/** Rótulo com o detalhe que a situação pede: há quanto tempo, até quando. */
export function rotuloDetalhado(e: EmpresaPanorama): string {
  if (e.situacao === 'BLOQUEADA') {
    return e.diasBloqueada ? `Bloqueada há ${e.diasBloqueada} dias` : 'Bloqueada (estorno/cobrança apagada)';
  }
  if (e.situacao === 'CANCELADA_COM_ACESSO') return `Cancelada, acesso até ${formatarData(e.dataFim)}`;
  if (e.situacao === 'GRACA' && e.dataFim) {
    const horas = Math.max(0, Math.floor((Date.now() - new Date(e.dataFim).getTime()) / 3_600_000));
    return `Graça · venceu há ${horas}h`;
  }
  return ROTULO_SITUACAO[e.situacao];
}

/** Recuperável com contato: graça ou bloqueada há até 30 dias (exclui estorno). Mesmo corte do backend. */
export const precisaDeAcao = (e: EmpresaPanorama) =>
  e.situacao === 'GRACA' || (e.situacao === 'BLOQUEADA' && (e.diasBloqueada ?? 0) >= 1 && (e.diasBloqueada ?? 0) <= 30);

/** Em dia/graça sem atividade há 7+ dias. Mesmo corte do `semUso7d` do backend. */
export const semUsoRecente = (e: EmpresaPanorama, agora: Date = new Date()) =>
  (e.situacao === 'EM_DIA' || e.situacao === 'GRACA') &&
  (!e.ultimaAtividade || agora.getTime() - new Date(e.ultimaAtividade).getTime() > 7 * DIA_MS);

export const abrirWhatsApp = (telefone: string | null) => {
  const numero = telefone?.replace(/\D/g, '');
  if (numero) window.open(`https://wa.me/${numero}`, '_blank');
};
