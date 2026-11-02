import { MessageCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import type { EmpresaPanorama } from '@/services/super-admin.service';
import { formatCurrencyDynamic } from '@/utils/currencyUtils';
import { abrirWhatsApp, COR_SITUACAO, haQuantoTempo, precisaDeAcao, rotuloDetalhado } from './situacao-rotulos';

interface Props {
  empresas: EmpresaPanorama[];
  onAbrirLista(titulo: string, empresas: EmpresaPanorama[]): void;
}

const VISIVEIS = 10;
export const ID_PRECISA_DE_ACAO = 'precisa-de-acao';

/** Quem cobrar: graça e bloqueadas há até 30 dias, maior valor primeiro. */
const PrecisaDeAcao = ({ empresas, onAbrirLista }: Props) => {
  const fila = empresas.filter(precisaDeAcao).sort((a, b) => (b.valorMensal ?? 0) - (a.valorMensal ?? 0));

  return (
    <section id={ID_PRECISA_DE_ACAO} className="bg-white rounded-xl shadow-sm">
      <div className="flex items-center justify-between p-5 border-b">
        <div>
          <h2 className="text-base font-bold text-gray-800">Precisa de ação</h2>
          <p className="text-xs text-gray-500">Período de graça e bloqueadas há até 30 dias, por valor</p>
        </div>
        {fila.length > VISIVEIS && (
          <Button variant="ghost" size="sm" className="text-primary text-xs"
            onClick={() => onAbrirLista('Precisa de ação', fila)}>
            Ver todas ({fila.length})
          </Button>
        )}
      </div>
      {fila.length === 0 ? (
        <p className="p-8 text-center text-sm text-gray-500">Ninguém em atraso recuperável agora.</p>
      ) : (
        <ul className="divide-y">
          {fila.slice(0, VISIVEIS).map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{e.nome_negocio}</p>
                <p className="text-xs text-gray-500">
                  {e.plano ?? '—'} · atividade: {haQuantoTempo(e.ultimaAtividade).toLowerCase()}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${COR_SITUACAO[e.situacao]}`}>
                  {rotuloDetalhado(e)}
                </span>
                <span className="text-sm font-medium text-gray-800 w-24 text-right">
                  {e.valorMensal != null ? formatCurrencyDynamic(e.valorMensal) : '—'}
                </span>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600"
                  onClick={() => abrirWhatsApp(e.telefone)} title="Conversar no WhatsApp" disabled={!e.telefone}>
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default PrecisaDeAcao;
