import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  RefreshCw,
  Route as RouteIcon,
  Search,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Badge } from '@/components/Badge';
import {
  usoRotaService,
  type FiltroUso,
  type UsoDetalheEmpresa,
  type UsoEmpresa,
  type UsoResumo,
  type UsoRota,
} from '@/services/uso-rota.service';

/**
 * Uso do sistema por empresa — o que cada salão realmente chama.
 *
 * Três leituras da mesma tabela: o volume no tempo, quais features a base usa
 * (rota + quantas empresas distintas) e quais salões estão ativos. O número de
 * empresas por rota é o que separa "feature da base" de "feature de um cliente
 * só"; o volume sozinho engana, porque um salão grande domina o total.
 */

const dataISO = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const hoje = () => dataISO(new Date());
const diasAtras = (dias: number) => dataISO(new Date(Date.now() - dias * 24 * 60 * 60 * 1000));

const formatarNumero = (n: number) => n.toLocaleString('pt-BR');

const formatarDia = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

/** Métrica de adoção: GET é "abriu a tela", o resto é "usou de verdade". */
const METODOS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const toneMetodo = (metodo: string): 'default' | 'accent' | 'success' | 'warning' | 'danger' => {
  if (metodo === 'GET') return 'default';
  if (metodo === 'DELETE') return 'danger';
  if (metodo === 'POST') return 'success';
  return 'warning';
};

interface StatProps {
  titulo: string;
  valor: string;
  detalhe?: string;
}

const Stat = ({ titulo, valor, detalhe }: StatProps) => (
  <Card className="py-4">
    <CardContent className="px-4">
      <p className="truncate text-[11px] font-bold uppercase tracking-wider text-text-faint">{titulo}</p>
      <p className="mt-1 text-2xl font-black text-text-main">{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-text-muted">{detalhe}</p>}
    </CardContent>
  </Card>
);

const TabelaRotas = ({ dados, vazio }: { dados: UsoRota[]; vazio: string }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-teal-border text-[11px] font-bold uppercase tracking-wider text-text-faint">
          <th className="px-4 py-3">Rota</th>
          <th className="px-4 py-3 text-right">Chamadas</th>
          <th className="px-4 py-3 text-right">Empresas</th>
          <th className="px-4 py-3 text-right">Erros</th>
          <th className="px-4 py-3 text-right">Último uso</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-teal-border/50">
        {dados.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-4 py-12 text-center text-sm text-text-muted">
              {vazio}
            </td>
          </tr>
        ) : dados.map((r) => (
          <tr key={`${r.metodo} ${r.rota}`} className="text-sm hover:bg-teal-hover-bg/40">
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Badge tone={toneMetodo(r.metodo)}>{r.metodo}</Badge>
                <span className="font-mono text-[12px] text-text-main">{r.rota}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-right font-semibold text-text-main">{formatarNumero(r.total)}</td>
            <td className="px-4 py-3 text-right text-text-muted">{formatarNumero(r.empresas)}</td>
            <td className={`px-4 py-3 text-right ${r.erros > 0 ? 'font-semibold text-danger' : 'text-text-faint'}`}>
              {formatarNumero(r.erros)}
            </td>
            <td className="px-4 py-3 text-right text-xs text-text-muted">{formatarDia(r.ultimo_dia)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const UsoSistema = () => {
  const [de, setDe] = useState(diasAtras(30));
  const [ate, setAte] = useState(hoje());
  const [origem, setOrigem] = useState('');
  const [metodo, setMetodo] = useState('');
  const [busca, setBusca] = useState('');

  const [resumo, setResumo] = useState<UsoResumo | null>(null);
  const [rotas, setRotas] = useState<UsoRota[]>([]);
  const [empresas, setEmpresas] = useState<UsoEmpresa[]>([]);
  const [detalhe, setDetalhe] = useState<UsoDetalheEmpresa | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const filtro: FiltroUso = useMemo(
    () => ({ de, ate, origem: origem || undefined, metodo: metodo || undefined, busca: busca || undefined }),
    [de, ate, origem, metodo, busca],
  );

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);
      const [r, rt, emp] = await Promise.all([
        usoRotaService.resumo(filtro),
        usoRotaService.porRota({ ...filtro, limit: 100 }),
        usoRotaService.porEmpresa({ ...filtro, limit: 100 }),
      ]);
      setResumo(r);
      setRotas(rt.dados);
      setEmpresas(emp.dados);
    } catch (e) {
      console.error('Erro ao carregar uso do sistema:', e);
      setErro('Não foi possível carregar o uso do sistema.');
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    carregar();
    // Só na montagem e via botão Filtrar — recarregar a cada tecla do campo de
    // busca dispararia três queries agregadas por letra digitada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrirEmpresa = async (empresaId: string) => {
    try {
      setLoadingDetalhe(true);
      setDetalhe(await usoRotaService.detalheEmpresa(empresaId, filtro));
    } catch (e) {
      console.error('Erro ao carregar detalhe da empresa:', e);
      setErro('Não foi possível carregar o detalhe dessa empresa.');
    } finally {
      setLoadingDetalhe(false);
    }
  };

  const serie = (resumo?.porDia ?? []).map((d) => ({ ...d, rotulo: formatarDia(d.dia) }));
  const totais = resumo?.totais;
  const origens = resumo?.porOrigem ?? [];
  const taxaErro = totais && totais.chamadas > 0
    ? `${((totais.erros / totais.chamadas) * 100).toFixed(1)}% das chamadas`
    : undefined;

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Uso do sistema</h1>
          <p className="text-sm text-text-muted">
            Quantas vezes cada rota foi chamada por dia, por empresa. Conta só request autenticado
            com empresa — site público, webhooks e crons ficam de fora.
          </p>
        </div>
        <Button onClick={carregar} variant="outline" size="sm" className="gap-2">
          <RefreshCw size={14} />
          Atualizar
        </Button>
      </div>

      <div className="flex flex-col gap-2 md:flex-row">
        <Input type="date" value={de} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDe(e.target.value)} />
        <Input type="date" value={ate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAte(e.target.value)} />
        <select
          className="h-10 rounded-md border border-teal-border bg-card-bg px-3 text-sm text-text-main"
          value={metodo}
          onChange={(e) => setMetodo(e.target.value)}
        >
          <option value="">Todos os métodos</option>
          {METODOS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-teal-border bg-card-bg px-3 text-sm text-text-main"
          value={origem}
          onChange={(e) => setOrigem(e.target.value)}
        >
          <option value="">Todas as origens</option>
          {origens.map((o) => (
            <option key={o.origem} value={o.origem}>{o.origem}</option>
          ))}
        </select>
        <Input
          placeholder="Trecho da rota (ex. /agendamento)"
          value={busca}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBusca(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && carregar()}
        />
        <Button onClick={carregar} size="sm" className="gap-2">
          <Search size={14} />
          Filtrar
        </Button>
      </div>

      {erro && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4" />
          {erro}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat titulo="Chamadas" valor={formatarNumero(totais?.chamadas ?? 0)} detalhe="no período" />
        <Stat titulo="Empresas ativas" valor={formatarNumero(totais?.empresas ?? 0)} detalhe="chamaram ao menos uma rota" />
        <Stat titulo="Rotas usadas" valor={formatarNumero(totais?.rotas ?? 0)} detalhe="método + rota distintos" />
        <Stat titulo="Erros" valor={formatarNumero(totais?.erros ?? 0)} detalhe={taxaErro} />
      </div>

      <Card>
        <CardContent className="space-y-3">
          <div>
            <h2 className="font-semibold text-text-main">Chamadas por dia</h2>
            <p className="text-xs text-text-muted">
              Contagem gravada em lote a cada minuto — o dia corrente fecha com até um minuto de atraso.
            </p>
          </div>
          <div className="h-64 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-text-muted">Carregando...</div>
            ) : serie.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-text-muted">
                Nenhuma chamada registrada nesse período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={serie} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradUso" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--sa-teal-main)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--sa-teal-main)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--sa-teal-border)" />
                  <XAxis
                    dataKey="rotulo"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--sa-text-faint)' }}
                    minTickGap={24}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--sa-text-faint)' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid var(--sa-teal-border)',
                      background: 'var(--sa-card-bg)',
                      color: 'var(--sa-text-main)',
                      fontSize: '12px',
                    }}
                    formatter={(valor: any, chave: any) => {
                      const rotulos: Record<string, string> = {
                        total: 'Chamadas',
                        erros: 'Erros',
                        empresas: 'Empresas',
                      };
                      return [formatarNumero(Number(valor)), rotulos[chave] ?? chave];
                    }}
                  />
                  {/*
                    Só "total" tem marca no gráfico. Erros e empresas entram no
                    tooltip sem desenhar nada: são escalas diferentes e não
                    dividem eixo com o volume.
                  */}
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--sa-teal-main)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#gradUso)"
                  />
                  <Area dataKey="erros" stroke="none" fill="none" activeDot={false} />
                  <Area dataKey="empresas" stroke="none" fill="none" activeDot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {origens.length > 0 && (
        <Card className="py-4">
          <CardContent className="px-4">
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-faint">Por origem</h2>
            <div className="flex flex-wrap gap-2">
              {origens.map((o) => (
                <button
                  key={o.origem}
                  type="button"
                  onClick={() => setOrigem(o.origem === origem ? '' : o.origem)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    origem === o.origem
                      ? 'border-teal-main bg-teal-hover-bg'
                      : 'border-teal-border hover:bg-teal-hover-bg'
                  }`}
                >
                  <span className="block font-mono text-[11px] text-text-muted">{o.origem}</span>
                  <span className="font-semibold text-text-main">{formatarNumero(o.total)}</span>
                  <span className="text-text-faint"> · {formatarNumero(o.empresas)} empresa(s)</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden py-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-teal-border px-4 py-3">
          <RouteIcon size={16} className="text-text-muted" />
          <h2 className="font-semibold text-text-main">Rotas mais chamadas</h2>
          <span className="text-xs text-text-muted">
            — "Empresas" é quantos salões distintos usaram a rota
          </span>
        </div>
        {loading ? (
          <p className="px-4 py-12 text-center text-sm text-text-muted">Carregando...</p>
        ) : (
          <TabelaRotas dados={rotas} vazio="Nenhuma chamada registrada nesse período." />
        )}
      </Card>

      <Card className="overflow-hidden py-0">
        <div className="flex items-center gap-2 border-b border-teal-border px-4 py-3">
          <Building2 size={16} className="text-text-muted" />
          <h2 className="font-semibold text-text-main">Empresas por volume</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-teal-border text-[11px] font-bold uppercase tracking-wider text-text-faint">
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3 text-right">Chamadas</th>
                <th className="px-4 py-3 text-right">Rotas</th>
                <th className="px-4 py-3 text-right">Dias ativos</th>
                <th className="px-4 py-3 text-right">Erros</th>
                <th className="px-4 py-3 text-right">Último uso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-border/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-text-muted">Carregando...</td>
                </tr>
              ) : empresas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-text-muted">
                    Nenhuma empresa usou o sistema nesse período.
                  </td>
                </tr>
              ) : empresas.map((e) => (
                <tr
                  key={e.empresaId}
                  className="cursor-pointer text-sm hover:bg-teal-hover-bg/40"
                  onClick={() => abrirEmpresa(e.empresaId)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-main">
                      {e.nome ?? <span className="italic text-text-faint">Empresa removida</span>}
                    </div>
                    <div className="font-mono text-[10px] text-text-faint">{e.empresaId}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-text-main">{formatarNumero(e.total)}</td>
                  <td className="px-4 py-3 text-right text-text-muted">{formatarNumero(e.rotas)}</td>
                  <td className="px-4 py-3 text-right text-text-muted">{formatarNumero(e.dias_ativos)}</td>
                  <td className={`px-4 py-3 text-right ${e.erros > 0 ? 'font-semibold text-danger' : 'text-text-faint'}`}>
                    {formatarNumero(e.erros)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-text-muted">{formatarDia(e.ultimo_dia)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {(detalhe || loadingDetalhe) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-3xl overflow-hidden py-0 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-teal-border px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate font-bold text-text-main">
                  {detalhe?.empresa?.nome_negocio ?? 'Empresa'}
                </h3>
                <p className="text-xs text-text-muted">
                  O que essa empresa usou entre {formatarDia(de)} e {formatarDia(ate)}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => setDetalhe(null)}>
                <X size={14} />
                Fechar
              </Button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {loadingDetalhe ? (
                <p className="px-4 py-12 text-center text-sm text-text-muted">Carregando...</p>
              ) : (
                <TabelaRotas
                  dados={detalhe?.dados ?? []}
                  vazio="Essa empresa não chamou nenhuma rota no período."
                />
              )}
            </div>
            <div className="border-t border-teal-border px-4 py-3">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setDetalhe(null)}>
                <ArrowLeft size={14} />
                Voltar à lista
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UsoSistema;
