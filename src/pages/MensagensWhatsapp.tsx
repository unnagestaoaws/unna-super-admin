import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  FileJson,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Badge } from '@/components/Badge';
import {
  mensagemWhatsappService,
  type DetalheMensagem,
  type FiltroMensagens,
  type ListaMensagens,
  type MensagemWhatsapp,
  type ResumoMensagens,
} from '@/services/mensagem-whatsapp.service';

/**
 * Mensagens de WhatsApp enviadas, de todas as empresas.
 *
 * Lê a outbox transacional (agendamento criado, lembrete, cancelamento…), que é
 * onde vive o provedor real. Notificação em massa e Atendimento têm telas
 * próprias e não entram aqui.
 */

const dataISO = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const hoje = () => dataISO(new Date());
const diasAtras = (dias: number) => dataISO(new Date(Date.now() - dias * 24 * 60 * 60 * 1000));

const formatarNumero = (n: number) => n.toLocaleString('pt-BR');

const formatarDataHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const formatarTelefone = (valor: string) => {
  const d = valor.replace(/\D/g, '').replace(/^55/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return valor;
};

/** Provedores possíveis. `official` é o WABA (Cloud API da Meta). */
const PROVIDERS: { valor: string; rotulo: string }[] = [
  { valor: 'waha', rotulo: 'WAHA' },
  { valor: 'evolution', rotulo: 'Evolution' },
  { valor: 'official', rotulo: 'WABA (oficial)' },
];

const ROTULO_PROVIDER: Record<string, string> = {
  waha: 'WAHA',
  evolution: 'Evolution',
  official: 'WABA',
  pendente: 'Ainda na fila',
};

/** Estados da outbox, do enfileiramento ao fim. */
const STATUS: { valor: string; rotulo: string }[] = [
  { valor: 'queued', rotulo: 'Na fila' },
  { valor: 'processing', rotulo: 'Processando' },
  { valor: 'retry_wait', rotulo: 'Aguardando retry' },
  { valor: 'provider_accepted', rotulo: 'Aceita pelo provedor' },
  { valor: 'delivered', rotulo: 'Entregue' },
  { valor: 'read', rotulo: 'Lida' },
  { valor: 'skipped', rotulo: 'Ignorada' },
  { valor: 'uncertain', rotulo: 'Incerta' },
  { valor: 'failed', rotulo: 'Falhou' },
  { valor: 'dead_letter', rotulo: 'Dead letter' },
];

const ROTULO_STATUS: Record<string, string> = Object.fromEntries(
  STATUS.map((s) => [s.valor, s.rotulo]),
);

type Tone = 'default' | 'accent' | 'success' | 'warning' | 'danger';

const toneStatus = (status: string): Tone => {
  if (status === 'delivered' || status === 'read') return 'success';
  if (status === 'provider_accepted') return 'accent';
  if (status === 'failed' || status === 'dead_letter') return 'danger';
  if (status === 'uncertain' || status === 'retry_wait' || status === 'skipped') return 'warning';
  return 'default';
};

const Stat = ({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe?: string }) => (
  <Card className="py-4">
    <CardContent className="px-4">
      <p className="truncate text-[11px] font-bold uppercase tracking-wider text-text-faint">{titulo}</p>
      <p className="mt-1 text-2xl font-black text-text-main">{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-text-muted">{detalhe}</p>}
    </CardContent>
  </Card>
);

const MensagensWhatsapp = () => {
  const [de, setDe] = useState(diasAtras(7));
  const [ate, setAte] = useState(hoje());
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState('');
  const [tipo, setTipo] = useState('');
  const [destinatario, setDestinatario] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [empresaNome, setEmpresaNome] = useState('');

  const [lista, setLista] = useState<ListaMensagens | null>(null);
  const [resumo, setResumo] = useState<ResumoMensagens | null>(null);
  const [detalhe, setDetalhe] = useState<DetalheMensagem | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const filtro: FiltroMensagens = useMemo(
    () => ({
      de,
      ate,
      provider: provider || undefined,
      status: status || undefined,
      tipo: tipo || undefined,
      destinatario: destinatario || undefined,
      empresaId: empresaId || undefined,
    }),
    [de, ate, provider, status, tipo, destinatario, empresaId],
  );

  const carregar = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setErro(null);
      const [l, r] = await Promise.all([
        mensagemWhatsappService.listar({ ...filtro, page, limit: 50 }),
        mensagemWhatsappService.resumo(filtro),
      ]);
      setLista(l);
      setResumo(r);
    } catch (e) {
      console.error('Erro ao carregar mensagens de WhatsApp:', e);
      setErro('Não foi possível carregar as mensagens.');
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    carregar(1);
    // Só na montagem e via Filtrar — recarregar a cada tecla dispararia duas
    // queries paginadas por letra digitada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clicar na empresa filtra por ela; digitar um UUID à mão seria pior.
  const filtrarPorEmpresa = (m: MensagemWhatsapp) => {
    setEmpresaId(m.empresaId);
    setEmpresaNome(m.empresa ?? m.empresaId);
  };

  // Empresa é o único filtro que recarrega sozinho: vem de clique, não de
  // digitação, então não há risco de disparar uma query por tecla.
  const montado = useRef(false);
  useEffect(() => {
    if (!montado.current) {
      montado.current = true;
      return;
    }
    carregar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  const abrirDetalhe = async (id: string) => {
    try {
      setLoadingDetalhe(true);
      setDetalhe(await mensagemWhatsappService.detalhar(id));
    } catch (e) {
      console.error('Erro ao carregar detalhe da mensagem:', e);
      setErro('Não foi possível carregar o detalhe dessa mensagem.');
    } finally {
      setLoadingDetalhe(false);
    }
  };

  const mensagens = lista?.data ?? [];
  const pagination = lista?.pagination;

  const totalPorStatus = (alvos: string[]) =>
    (resumo?.porStatus ?? [])
      .filter((s) => alvos.includes(s.status))
      .reduce((acc, s) => acc + s.total, 0);

  const entregues = totalPorStatus(['delivered', 'read']);
  const falhas = totalPorStatus(['failed', 'dead_letter']);
  const naFila = totalPorStatus(['queued', 'processing', 'retry_wait']);
  const total = resumo?.total ?? 0;

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Mensagens de WhatsApp</h1>
          <p className="text-sm text-text-muted">
            Mensagens transacionais enviadas pelos salões, por WAHA, Evolution ou WABA. Notificação
            em massa e as conversas do Atendimento não entram nesta lista.
          </p>
        </div>
        <Button onClick={() => carregar(pagination?.page ?? 1)} variant="outline" size="sm" className="gap-2">
          <RefreshCw size={14} />
          Atualizar
        </Button>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap">
        <Input type="date" value={de} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDe(e.target.value)} />
        <Input type="date" value={ate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAte(e.target.value)} />
        <select
          className="h-10 rounded-md border border-teal-border bg-card-bg px-3 text-sm text-text-main"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          <option value="">Todos os provedores</option>
          {PROVIDERS.map((p) => (
            <option key={p.valor} value={p.valor}>{p.rotulo}</option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-teal-border bg-card-bg px-3 text-sm text-text-main"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {STATUS.map((s) => (
            <option key={s.valor} value={s.valor}>{s.rotulo}</option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-teal-border bg-card-bg px-3 text-sm text-text-main"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          <option value="">Todos os tipos</option>
          {(resumo?.porTipo ?? []).map((t) => (
            <option key={t.tipo} value={t.tipo}>{t.tipo}</option>
          ))}
        </select>
        <Input
          placeholder="Telefone do destinatário"
          value={destinatario}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDestinatario(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && carregar(1)}
        />
        <Button onClick={() => carregar(1)} size="sm" className="gap-2">
          <Search size={14} />
          Filtrar
        </Button>
      </div>

      {empresaId && (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Building2 size={14} />
          Filtrando por
          <span className="font-semibold text-text-main">{empresaNome}</span>
          <button
            type="button"
            onClick={() => { setEmpresaId(''); setEmpresaNome(''); }}
            className="inline-flex items-center gap-1 rounded-md border border-teal-border px-2 py-0.5 text-xs hover:bg-teal-hover-bg"
          >
            <X size={12} />
            limpar
          </button>
        </div>
      )}

      {erro && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4" />
          {erro}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat titulo="Mensagens" valor={formatarNumero(total)} detalhe="no período" />
        <Stat
          titulo="Entregues"
          valor={formatarNumero(entregues)}
          detalhe={total > 0 ? `${((entregues / total) * 100).toFixed(1)}% do total` : undefined}
        />
        <Stat titulo="Falhas" valor={formatarNumero(falhas)} detalhe="failed + dead letter" />
        <Stat titulo="Na fila" valor={formatarNumero(naFila)} detalhe="ainda não saíram" />
      </div>

      {(resumo?.porProvider.length ?? 0) > 0 && (
        <Card className="py-4">
          <CardContent className="px-4">
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-faint">Por provedor</h2>
            <div className="flex flex-wrap gap-2">
              {resumo!.porProvider.map((p) => (
                <button
                  key={p.provider}
                  type="button"
                  disabled={p.provider === 'pendente'}
                  onClick={() => setProvider(p.provider === provider ? '' : p.provider)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors disabled:cursor-default disabled:opacity-70 ${
                    provider === p.provider
                      ? 'border-teal-main bg-teal-hover-bg'
                      : 'border-teal-border enabled:hover:bg-teal-hover-bg'
                  }`}
                >
                  <span className="block text-[11px] text-text-muted">
                    {ROTULO_PROVIDER[p.provider] ?? p.provider}
                  </span>
                  <span className="font-semibold text-text-main">{formatarNumero(p.total)}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden py-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-teal-border text-[11px] font-bold uppercase tracking-wider text-text-faint">
                <th className="px-4 py-3">Enviada em</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Destinatário</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Provedor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-border/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-text-muted">Carregando...</td>
                </tr>
              ) : mensagens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-text-muted">
                    Nenhuma mensagem nesse período com esses filtros.
                  </td>
                </tr>
              ) : mensagens.map((m) => (
                <tr key={m.id} className="text-sm hover:bg-teal-hover-bg/40">
                  <td className="px-4 py-3 text-text-muted">
                    <div className="whitespace-nowrap">{formatarDataHora(m.createdAt)}</div>
                    {m.tentativas > 1 && (
                      <div className="text-[10px] text-text-faint">{m.tentativas} tentativas</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => filtrarPorEmpresa(m)}
                      className="text-left font-medium text-text-main hover:text-teal-main"
                    >
                      {m.empresa ?? <span className="italic text-text-faint">Empresa removida</span>}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-text-main">
                    {formatarTelefone(m.destinatario)}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{m.tipo}</td>
                  <td className="px-4 py-3">
                    {m.provider ? (
                      <Badge tone="default">{ROTULO_PROVIDER[m.provider] ?? m.provider}</Badge>
                    ) : (
                      <span className="text-xs italic text-text-faint">ainda na fila</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={toneStatus(m.status)}>{ROTULO_STATUS[m.status] ?? m.status}</Badge>
                    {m.ultimoErro && (
                      <p className="mt-1 max-w-[220px] truncate text-[10px] text-danger">{m.ultimoErro}</p>
                    )}
                    {m.ack?.status && (
                      <p className="mt-1 text-[10px] text-text-faint">ack: {m.ack.status}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2"
                        onClick={() => abrirDetalhe(m.id)}
                      >
                        <FileJson size={14} />
                        Ver envio
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-teal-border px-4 py-3">
            <span className="text-xs text-text-muted">
              {formatarNumero(pagination.total)} mensagens
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => carregar(pagination.page - 1)}
              >
                Anterior
              </Button>
              <span className="px-2 text-sm text-text-muted">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => carregar(pagination.page + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>

      {(detalhe || loadingDetalhe) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-3xl overflow-hidden py-0 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-teal-border px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate font-bold text-text-main">
                  {detalhe?.empresa?.nome_negocio ?? 'Envio'}
                </h3>
                <p className="text-xs text-text-muted">
                  {detalhe ? `${detalhe.tipo} para ${formatarTelefone(detalhe.destinatario)}` : 'Carregando...'}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => setDetalhe(null)}>
                <X size={14} />
                Fechar
              </Button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {loadingDetalhe || !detalhe ? (
                <p className="px-4 py-12 text-center text-sm text-text-muted">Carregando...</p>
              ) : (
                <div className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-text-faint">Provedor</p>
                      <p className="text-text-main">
                        {detalhe.provider ? ROTULO_PROVIDER[detalhe.provider] ?? detalhe.provider : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-text-faint">Aceita em</p>
                      <p className="text-text-main">{formatarDataHora(detalhe.aceitoEm)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-text-faint">Entregue em</p>
                      <p className="text-text-main">{formatarDataHora(detalhe.entregueEm)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-text-faint">Lida em</p>
                      <p className="text-text-main">{formatarDataHora(detalhe.lidoEm)}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-faint">
                      Tentativas no provedor
                    </h4>
                    {detalhe.tentativasEnvio.length === 0 ? (
                      <p className="text-sm text-text-muted">
                        Nenhuma tentativa registrada — a mensagem ainda não saiu da fila.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {detalhe.tentativasEnvio.map((t) => (
                          <div key={t.id} className="rounded-lg border border-teal-border px-3 py-2 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-text-main">#{t.numero}</span>
                              <Badge tone={t.status === 'accepted' ? 'success' : t.status === 'failed' ? 'danger' : 'warning'}>
                                {t.status}
                              </Badge>
                              <span className="text-text-muted">{t.provider ?? '—'}</span>
                              <span className="text-text-faint">{formatarDataHora(t.iniciadoEm)}</span>
                              {t.duracaoMs !== null && <span className="text-text-faint">{t.duracaoMs} ms</span>}
                            </div>
                            {t.erro && <p className="mt-1 text-danger">{t.erro}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-text-faint">
                      Payload enviado
                    </h4>
                    <pre className="max-h-64 overflow-auto rounded-lg bg-app-bg p-3 font-mono text-[11px] leading-relaxed text-text-main">
                      {JSON.stringify(detalhe.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MensagensWhatsapp;
