import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Button from '@/components/ui/Button';
import {
  AlertCircle,
  BadgeCheck,
  Share2 as Facebook,
  Megaphone,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  empresaService,
  type AtribuicaoGrupo,
  type RelatorioAtribuicao,
} from '@/services/empresa.service';

/** Data de N dias atrás no formato YYYY-MM-DD (input date). */
const diasAtras = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
};
const hoje = () => new Date().toISOString().slice(0, 10);

const percentual = (parte: number, total: number) =>
  total > 0 ? `${Math.round((parte / total) * 100)}%` : '—';

const formatarData = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

/** Origem de um cadastro, derivada dos click-ids persistidos no registro. */
const origemDoCadastro = (c: {
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  fbclid?: string | null;
  utm_source?: string | null;
}) => {
  if (c.gclid || c.gbraid || c.wbraid) {
    return { label: 'Google Ads', className: 'bg-blue-100 text-blue-700' };
  }
  if (c.fbclid) {
    return { label: 'Meta Ads', className: 'bg-indigo-100 text-indigo-700' };
  }
  if (c.utm_source) {
    return { label: c.utm_source, className: 'bg-amber-100 text-amber-700' };
  }
  return { label: 'Sem atribuição', className: 'bg-gray-100 text-gray-500' };
};

const STATUS_ASSINATURA: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Ativa', className: 'bg-green-100 text-green-700' },
  TRIAL: { label: 'Trial', className: 'bg-sky-100 text-sky-700' },
  PENDING: { label: 'Pendente', className: 'bg-amber-100 text-amber-700' },
  CANCELLED: { label: 'Cancelada', className: 'bg-red-100 text-red-700' },
  EXPIRED: { label: 'Expirada', className: 'bg-gray-100 text-gray-500' },
};

interface CardResumoProps {
  titulo: string;
  valor: number;
  detalhe?: string;
  icone: React.ReactNode;
  cor: string;
}

const CardResumo = ({ titulo, valor, detalhe, icone, cor }: CardResumoProps) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-bold truncate">
            {titulo}
          </p>
          <p className="text-2xl font-black mt-1">{valor}</p>
          {detalhe && <p className="text-xs text-gray-500 mt-0.5">{detalhe}</p>}
        </div>
        <div className={`p-2 rounded-lg shrink-0 ${cor}`}>{icone}</div>
      </div>
    </CardContent>
  </Card>
);

const TabelaGrupo = ({
  titulo,
  linhas,
  rotuloColuna,
}: {
  titulo: string;
  linhas: AtribuicaoGrupo[];
  rotuloColuna: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">{titulo}</CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b text-[11px] uppercase tracking-wider text-gray-500 font-bold">
              <th className="px-4 py-3">{rotuloColuna}</th>
              <th className="px-4 py-3 text-right">Cadastros</th>
              <th className="px-4 py-3 text-right">Google</th>
              <th className="px-4 py-3 text-right">Meta</th>
              <th className="px-4 py-3 text-right">Ativas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {linhas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Nenhum cadastro no período.
                </td>
              </tr>
            )}
            {linhas.map((linha) => (
              <tr key={linha.valor} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-4 py-2.5 font-medium">{linha.valor}</td>
                <td className="px-4 py-2.5 text-right">{linha.total}</td>
                <td className="px-4 py-2.5 text-right text-blue-700">{linha.google}</td>
                <td className="px-4 py-2.5 text-right text-indigo-700">{linha.meta}</td>
                <td className="px-4 py-2.5 text-right font-bold text-green-700">
                  {linha.ativas}
                  <span className="ml-1 text-xs font-normal text-gray-400">
                    {percentual(linha.ativas, linha.total)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

const Atribuicao = () => {
  const [inicio, setInicio] = useState(diasAtras(30));
  const [fim, setFim] = useState(hoje());
  const [data, setData] = useState<RelatorioAtribuicao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // O backend filtra por createdAt <= fim; sem hora, "fim" cobre só a meia-noite.
      const resultado = await empresaService.getRelatorioAtribuicao({
        inicio,
        fim: `${fim}T23:59:59`,
      });
      setData(resultado);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar o relatório de atribuição.');
    } finally {
      setLoading(false);
    }
  }, [inicio, fim]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const resumo = data?.resumo;
  const cadastros = useMemo(() => data?.cadastros ?? [], [data]);

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Target size={24} /> Atribuição de Marketing
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Fonte de verdade dos cadastros vindos de anúncio. Compare cada número com o
            painel da plataforma no mesmo período.
          </p>
        </div>
        <Button onClick={carregar} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar
        </Button>
      </div>

      {/* Filtro de período */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">
              Início
            </label>
            <input
              type="date"
              value={inicio}
              max={fim}
              onChange={(e) => setInicio(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">
              Fim
            </label>
            <input
              type="date"
              value={fim}
              min={inicio}
              max={hoje()}
              onChange={(e) => setFim(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '7 dias', dias: 7 },
              { label: '30 dias', dias: 30 },
              { label: '90 dias', dias: 90 },
            ].map((atalho) => (
              <button
                key={atalho.dias}
                onClick={() => {
                  setInicio(diasAtras(atalho.dias));
                  setFim(hoje());
                }}
                className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50 transition-colors"
              >
                {atalho.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="p-4 flex items-center gap-2 text-red-600">
            <AlertCircle size={18} /> {error}
          </CardContent>
        </Card>
      )}

      {loading && !data && (
        <Card>
          <CardContent className="p-8 text-center text-gray-400">
            Carregando relatório…
          </CardContent>
        </Card>
      )}

      {resumo && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
            <CardResumo
              titulo="Cadastros"
              valor={resumo.total_cadastros}
              detalhe="Total no período"
              icone={<Users size={18} className="text-gray-600" />}
              cor="bg-gray-100"
            />
            <CardResumo
              titulo="De anúncio"
              valor={resumo.atribuiveis_a_anuncio}
              detalhe={`${percentual(resumo.atribuiveis_a_anuncio, resumo.total_cadastros)} do total`}
              icone={<TrendingUp size={18} className="text-green-600" />}
              cor="bg-green-100"
            />
            <CardResumo
              titulo="Google Ads"
              valor={resumo.atribuiveis_google}
              detalhe="Com gclid/gbraid/wbraid"
              icone={<Search size={18} className="text-blue-600" />}
              cor="bg-blue-100"
            />
            <CardResumo
              titulo="Meta Ads"
              valor={resumo.atribuiveis_meta}
              detalhe="Com fbclid"
              icone={<Facebook size={18} className="text-indigo-600" />}
              cor="bg-indigo-100"
            />
            <CardResumo
              titulo="Sem atribuição"
              valor={resumo.sem_atribuicao}
              detalhe="Orgânico, indicação, WhatsApp…"
              icone={<Megaphone size={18} className="text-amber-600" />}
              cor="bg-amber-100"
            />
            <CardResumo
              titulo="Assinaturas ativas"
              valor={resumo.assinaturas_ativas}
              detalhe={`${percentual(resumo.assinaturas_ativas, resumo.total_cadastros)} dos cadastros · ${resumo.ativas_de_anuncio} de anúncio (G ${resumo.ativas_google} · M ${resumo.ativas_meta})`}
              icone={<BadgeCheck size={18} className="text-emerald-600" />}
              cor="bg-emerald-100"
            />
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <strong>Como ler:</strong> só entram nas colunas Google/Meta os cadastros que
            chegaram com click-id na URL. Quem veio por busca orgânica, indicação ou
            WhatsApp aparece em “Sem atribuição” — isso é esperado, não é perda de
            rastreio. A divergência normal para o painel do anunciante vem de bloqueadores
            e de quem cadastra em outro dispositivo. “Assinaturas ativas” é o status de
            hoje de quem se cadastrou no período (trial não conta).
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TabelaGrupo
              titulo="Por fonte (utm_source)"
              linhas={data?.por_fonte ?? []}
              rotuloColuna="Fonte"
            />
            <TabelaGrupo
              titulo="Por campanha (utm_campaign)"
              linhas={data?.por_campanha ?? []}
              rotuloColuna="Campanha"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Cadastros do período ({cadastros.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                      <th className="px-4 py-3">Empresa</th>
                      <th className="px-4 py-3">Criada em</th>
                      <th className="px-4 py-3">Origem</th>
                      <th className="px-4 py-3">Campanha</th>
                      <th className="px-4 py-3">Conteúdo (CTA)</th>
                      <th className="px-4 py-3">Assinatura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {cadastros.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                          Nenhum cadastro no período.
                        </td>
                      </tr>
                    )}
                    {cadastros.map((c) => {
                      const origem = origemDoCadastro(c);
                      const assinatura = c.assinatura_status
                        ? STATUS_ASSINATURA[c.assinatura_status]
                        : null;
                      return (
                        <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-2.5 font-medium">{c.nome_negocio}</td>
                          <td className="px-4 py-2.5 text-gray-500">
                            {formatarData(c.createdAt)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-bold ${origem.className}`}
                            >
                              {origem.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">
                            {c.utm_campaign || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">
                            {c.utm_content || '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            {assinatura ? (
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-bold ${assinatura.className}`}
                              >
                                {assinatura.label}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Atribuicao;
