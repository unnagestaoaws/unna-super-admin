import type { ReactNode } from 'react';
import { AlertTriangle, CreditCard, DollarSign, Users } from 'lucide-react';
import type { EmpresaPanorama, PanoramaAssinaturas, SituacaoAssinatura } from '@/services/super-admin.service';
import { formatCurrencyDynamic } from '@/utils/currencyUtils';
import { precisaDeAcao, ROTULO_SITUACAO, semUsoRecente, SERIE_PAGANTES } from './situacao-rotulos';

interface Props {
  retrato: PanoramaAssinaturas['retrato'];
  empresas: EmpresaPanorama[];
  onAbrirLista(titulo: string, empresas: EmpresaPanorama[]): void;
  onIrParaAcao(): void;
}

const CardNumero = ({ rotulo, valor, detalhe, icone, borda, onClick }: {
  rotulo: string; valor: ReactNode; detalhe?: ReactNode; icone?: ReactNode; borda: string; onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left bg-white rounded-xl shadow-sm border-l-4 ${borda} p-4 hover:bg-gray-50 transition-colors w-full`}
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{rotulo}</p>
        <p className="text-2xl font-bold text-gray-800">{valor}</p>
      </div>
      {icone}
    </div>
    {detalhe && <p className="mt-2 text-xs text-gray-500">{detalhe}</p>}
  </button>
);

/** Como está a base agora: pagantes, MRR, em risco e os grupos fora da receita. */
const RetratoBase = ({ retrato, empresas, onAbrirLista, onIrParaAcao }: Props) => {
  const { porSituacao } = retrato;
  const de = (...s: SituacaoAssinatura[]) => empresas.filter((e) => s.includes(e.situacao));
  const pagantes = SERIE_PAGANTES.map((s) => s.chave);
  const bloqueadasRecentes = empresas.filter((e) => e.situacao === 'BLOQUEADA' && precisaDeAcao(e)).length;
  const total = retrato.pagantes || 1;

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardNumero
          rotulo="Pagantes"
          valor={retrato.pagantes}
          detalhe="Em dia + período de graça + cancelada com acesso"
          borda="border-green-600"
          icone={<Users className="h-5 w-5 text-green-600" />}
          onClick={() => onAbrirLista('Pagantes', de(...pagantes))}
        />
        <CardNumero
          rotulo="MRR"
          valor={formatCurrencyDynamic(retrato.mrr)}
          detalhe={retrato.mrrSemPagamento.empresas > 0
            ? `Em dia + graça · inclui ${formatCurrencyDynamic(retrato.mrrSemPagamento.valor)} de ${retrato.mrrSemPagamento.empresas} sem pagamento registrado`
            : 'Em dia + graça (anuais divididos por 12)'}
          borda="border-indigo-500"
          icone={<DollarSign className="h-5 w-5 text-indigo-500" />}
          onClick={() => onAbrirLista('Compõem o MRR', de('EM_DIA', 'GRACA'))}
        />
        <CardNumero
          rotulo="Em risco"
          valor={formatCurrencyDynamic(retrato.emRisco)}
          detalhe="Graça + bloqueadas há até 30 dias · ver quem cobrar ↓"
          borda="border-amber-600"
          icone={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          onClick={onIrParaAcao}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" role="img"
          aria-label={SERIE_PAGANTES.map((s) => `${ROTULO_SITUACAO[s.chave]}: ${porSituacao[s.chave]}`).join(', ')}>
          {SERIE_PAGANTES.filter((s) => porSituacao[s.chave] > 0).map((s) => (
            <div
              key={s.chave}
              title={`${ROTULO_SITUACAO[s.chave]}: ${porSituacao[s.chave]}`}
              style={{ width: `${(porSituacao[s.chave] / total) * 100}%`, background: s.cor }}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-700">
          {SERIE_PAGANTES.map((s) => (
            <button key={s.chave} type="button" className="flex items-center gap-1.5 hover:underline"
              onClick={() => onAbrirLista(ROTULO_SITUACAO[s.chave], de(s.chave))}>
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.cor }} />
              {ROTULO_SITUACAO[s.chave]} <strong>{porSituacao[s.chave]}</strong>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <CardNumero rotulo="Trial" valor={porSituacao.TRIAL} borda="border-blue-500"
          onClick={() => onAbrirLista('Em trial', de('TRIAL'))} />
        <CardNumero rotulo="Bloqueadas" valor={porSituacao.BLOQUEADA} borda="border-red-500"
          detalhe={`${bloqueadasRecentes} há até 30 dias`}
          onClick={() => onAbrirLista('Bloqueadas', de('BLOQUEADA').sort((a, b) => (a.diasBloqueada ?? 0) - (b.diasBloqueada ?? 0)))} />
        <CardNumero rotulo="Canceladas" valor={porSituacao.CANCELADA} borda="border-gray-400"
          onClick={() => onAbrirLista('Canceladas', de('CANCELADA'))} />
        <CardNumero rotulo="Checkout pendente" valor={porSituacao.CHECKOUT_PENDENTE} borda="border-gray-300"
          icone={<CreditCard className="h-4 w-4 text-gray-400" />}
          onClick={() => onAbrirLista('Checkout pendente', de('CHECKOUT_PENDENTE'))} />
        <CardNumero rotulo="Sem uso há 7+ dias" valor={retrato.semUso7d} borda="border-orange-500"
          detalhe="Pagando, mas parou de usar"
          onClick={() => onAbrirLista('Em dia ou graça, sem uso há 7+ dias', empresas.filter((e) => semUsoRecente(e)))} />
      </div>
    </section>
  );
};

export default RetratoBase;
