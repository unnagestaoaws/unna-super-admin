import { useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { EmpresaPanorama } from '@/services/super-admin.service';
import { formatCurrencyDynamic } from '@/utils/currencyUtils';
import { abrirWhatsApp, COR_SITUACAO, formatarData, haQuantoTempo, rotuloDetalhado } from './situacao-rotulos';

interface Props {
  titulo: string;
  empresas: EmpresaPanorama[];
  aberto: boolean;
  onFechar(): void;
}

const dataHora = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR') : '—');

/**
 * Lista das empresas por trás de qualquer número do dashboard. Herda as colunas
 * do antigo modal de engajamento e acrescenta situação, valor e datas.
 */
const ListaEmpresasModal = ({ titulo, empresas, aberto, onFechar }: Props) => {
  const [busca, setBusca] = useState('');

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return empresas;
    return empresas.filter(
      (e) => e.nome_negocio.toLowerCase().includes(termo) || (e.email ?? '').toLowerCase().includes(termo),
    );
  }, [busca, empresas]);

  return (
    <Modal isOpen={aberto} onClose={onFechar} title={`${titulo} (${empresas.length})`} size="7xl">
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Buscar por empresa ou e-mail..."
          value={busca}
          onChange={(e: any) => setBusca(e.target.value)}
          className="max-w-sm h-10"
        />
      </div>
      {filtradas.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-500">Nenhuma empresa.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-3 py-3">Empresa</th>
                <th className="px-3 py-3">Situação</th>
                <th className="px-3 py-3">Plano</th>
                <th className="px-3 py-3 text-right">Valor/mês</th>
                <th className="px-3 py-3">Vence / cancelou</th>
                <th className="px-3 py-3">Último login</th>
                <th className="px-3 py-3">Último agend.</th>
                <th className="px-3 py-3">Último caixa</th>
                <th className="px-3 py-3">Atividade</th>
                <th className="px-3 py-3 text-right">WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtradas.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <div className="font-semibold text-gray-900">{e.nome_negocio}</div>
                    <div className="text-[10px] text-gray-500">{e.email ?? '—'}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${COR_SITUACAO[e.situacao]}`}>
                      {rotuloDetalhado(e)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600">{e.plano ?? '—'}</td>
                  <td className="px-3 py-3 text-xs text-gray-700 text-right whitespace-nowrap">
                    {e.valorMensal != null ? formatCurrencyDynamic(e.valorMensal) : '—'}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {e.dataCancelamento ? `cancelou ${formatarData(e.dataCancelamento)}` : formatarData(e.dataFim)}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500">{dataHora(e.ultimoLogin)}</td>
                  <td className="px-3 py-3 text-xs text-gray-500">{dataHora(e.ultimoAgendamento)}</td>
                  <td className="px-3 py-3 text-xs text-gray-500">{dataHora(e.ultimaTransacao)}</td>
                  <td className="px-3 py-3 text-xs font-medium text-gray-900 whitespace-nowrap">{haQuantoTempo(e.ultimaAtividade)}</td>
                  <td className="px-3 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-green-600"
                      onClick={() => abrirWhatsApp(e.telefone)}
                      title="Conversar no WhatsApp"
                      disabled={!e.telefone}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-[11px] text-gray-500">
            Atividade = ação mais recente entre login de administrador, agendamento criado e movimentação de caixa.
          </p>
        </div>
      )}
    </Modal>
  );
};

export default ListaEmpresasModal;
