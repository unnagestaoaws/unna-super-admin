import { Info } from 'lucide-react';
import type { EmpresaPanorama, EventoAssinatura, PanoramaAssinaturas } from '@/services/super-admin.service';

interface Props {
  movimento: PanoramaAssinaturas['movimento'];
  empresas: EmpresaPanorama[];
  onAbrirLista(titulo: string, empresas: EmpresaPanorama[]): void;
}

const LINHAS: Array<{ evento: EventoAssinatura; chave: 'novas' | 'voltaram' | 'bloquearam' | 'cancelaram'; rotulo: string; sinal: '+' | '−'; cor: string }> = [
  { evento: 'NOVA', chave: 'novas', rotulo: 'Novas (primeiro pagamento)', sinal: '+', cor: '#16a34a' },
  { evento: 'VOLTOU', chave: 'voltaram', rotulo: 'Voltaram (pagaram depois de bloquear)', sinal: '+', cor: '#16a34a' },
  { evento: 'BLOQUEOU', chave: 'bloquearam', rotulo: 'Bloquearam (passaram de 48h sem pagar)', sinal: '−', cor: '#dc2626' },
  { evento: 'CANCELOU', chave: 'cancelaram', rotulo: 'Cancelaram (pediram para sair)', sinal: '−', cor: '#dc2626' },
];

/** O que mudou entre De e Até: entradas, saídas e o saldo. Reconstruído dos pagamentos. */
const MovimentoPeriodo = ({ movimento, empresas, onAbrirLista }: Props) => {
  const maior = Math.max(1, ...LINHAS.map((l) => movimento[l.chave]));

  return (
    <section className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
          Movimento no período
          <span title="O movimento conta a decisão (cancelou em X); o retrato conta o acesso (cancelada com acesso até Y).">
            <Info className="w-4 h-4 text-gray-400" />
          </span>
        </h2>
        <p className="text-sm text-gray-700">
          Saldo <strong className="text-lg text-gray-900">{movimento.saldo > 0 ? `+${movimento.saldo}` : movimento.saldo}</strong>
        </p>
      </div>

      <div className="space-y-2">
        {LINHAS.map((l) => (
          <button
            key={l.chave}
            type="button"
            className="w-full grid grid-cols-[minmax(0,16rem)_1fr_3rem] items-center gap-3 text-left rounded-md px-1 py-1 hover:bg-gray-50"
            title={`${movimento[l.chave]} — clique para ver as empresas`}
            onClick={() => onAbrirLista(l.rotulo, empresas.filter((e) => e.eventosNoPeriodo.includes(l.evento)))}
          >
            <span className="text-xs text-gray-700 truncate">{l.rotulo}</span>
            <span className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <span
                className="block h-3 rounded-full"
                style={{ width: `${(movimento[l.chave] / maior) * 100}%`, background: l.cor }}
              />
            </span>
            <span className="text-sm font-semibold text-gray-900 text-right">
              {l.sinal}{movimento[l.chave]}
            </span>
          </button>
        ))}
      </div>

      {movimento.divergentes > 0 && (
        <button
          type="button"
          className="mt-4 text-left text-[11px] text-gray-500 underline decoration-dotted hover:text-gray-700"
          onClick={() => onAbrirLista('Data ajustada fora do fluxo de pagamento', empresas.filter((e) => e.divergente))}
        >
          {movimento.divergentes} assinaturas com data ajustada fora do fluxo de pagamento: o movimento delas é aproximado.
        </button>
      )}
    </section>
  );
};

export default MovimentoPeriodo;
