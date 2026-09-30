import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import {
  AlertCircle, ArrowRight, Building2, Calendar, Check, CheckSquare, ChevronDown, ChevronLeft,
  ChevronRight, Clock, Copy, CreditCard, ExternalLink, Filter, Kanban, LayoutList, Loader2, Mail,
  Phone, RefreshCw, Search, Send, Square, TrendingUp, XCircle,
} from 'lucide-react';
import {
  sdrService, SdrDashboardStats, SdrLead, SdrTrackingEntry, SegmentoLead,
} from '@/services/sdr.service';
import {
  SDR_SEGMENTS, SdrSegmentKey, detectSegment, fillTemplate,
} from '@/data/sdrTemplates';
import SdrKanban from '@/pages/sdr/SdrKanban';
import {
  AlcanceIcon,
  FunilFiltro,
  LeadActions,
  SDR_STATUS_COLORS,
  SDR_STATUS_LABELS,
  SEGMENTO_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  SegmentoBadge,
  alcanceTabelaLabel,
  daysSince,
  formatDate,
  formatDateTime,
  isoFromDateInputs,
  renderRecuperacao,
} from '@/pages/sdr/sdrUi';

const SEGMENTOS_WINBACK: SegmentoLead[] = [
  'cancelado_recente',
  'sem_assinatura',
  'pendente',
  'cancelado_antigo',
];

const SEGMENT_CHIPS: { key: string; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'novos', label: 'Novos' },
  { key: 'cancelado_recente', label: 'Cancelados/expirados recentes' },
  { key: 'sem_assinatura', label: 'Nunca assinou' },
  { key: 'cancelado_antigo', label: 'Cancelados antigos' },
  { key: 'trial', label: 'Trial' },
  { key: 'pendente', label: 'Pendente' },
];

type ViewMode = 'kanban' | 'tabela';

const SdrPanel = () => {
  const [stats, setStats] = useState<SdrDashboardStats | null>(null);
  const [leads, setLeads] = useState<SdrLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [sdrStatusFilter, setSdrStatusFilter] = useState('all');
  const [recuperacaoFilter, setRecuperacaoFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [segmento, setSegmento] = useState('all');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [funilFiltro, setFunilFiltro] = useState<FunilFiltro | null>(null);
  const [view, setView] = useState<ViewMode>('kanban');
  const [inventarioOpen, setInventarioOpen] = useState(false);
  const [maisFiltros, setMaisFiltros] = useState(false);
  const [leadsEpoch, setLeadsEpoch] = useState(0);

  const navigate = useNavigate();
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [approachModalOpen, setApproachModalOpen] = useState(false);
  const [approachSegment, setApproachSegment] = useState<SdrSegmentKey>('trial');
  // Chave `${segmento}:${indice}` da mensagem em envio / já enviada neste modal.
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [sentKeys, setSentKeys] = useState<Set<string>>(new Set());
  const [selectedLead, setSelectedLead] = useState<SdrLead | null>(null);
  const [trackingHistory, setTrackingHistory] = useState<SdrTrackingEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [contactForm, setContactForm] = useState({
    tipo_contato: 'whatsapp',
    resultado: '',
    notas: '',
    proximo_contato: '',
    status: 'CONTATADO',
  });

  const dateParams = useMemo(() => isoFromDateInputs(dataInicio, dataFim), [dataInicio, dataFim]);
  const segmentoParam = segmento !== 'all' ? segmento : undefined;
  const alcanceParam =
    funilFiltro === 'entregues' ? 'entregue'
      : funilFiltro === 'lidos' ? 'lido'
        : funilFiltro === 'responderam' ? 'respondeu'
          : undefined;
  const sdrStatusFromFunil =
    funilFiltro === 'negociacao' ? 'EM_NEGOCIACAO'
      : funilFiltro === 'convertidos' ? 'RECUPERADO'
        : undefined;

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search), 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await sdrService.getDashboardStats({
        segmento: segmentoParam,
        ...dateParams,
      });
      setStats(data);
    } catch (e) {
      console.error('Erro stats SDR:', e);
    }
  }, [dateParams, segmentoParam]);

  const fetchLeads = useCallback(async (p = page) => {
    try {
      setLoadingLeads(true);
      const res = await sdrService.getLeads({
        page: p,
        limit: 20,
        search: searchDebounced || undefined,
        subscriptionStatus: subscriptionFilter !== 'all' ? subscriptionFilter : undefined,
        sdrStatus: sdrStatusFromFunil || (sdrStatusFilter !== 'all' ? sdrStatusFilter : undefined),
        recuperacaoStatus: recuperacaoFilter !== 'all' ? recuperacaoFilter : undefined,
        segmento: segmentoParam,
        alcance: alcanceParam,
        sortOrder,
        ...dateParams,
      });
      setLeads(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e) {
      console.error('Erro leads SDR:', e);
    } finally {
      setLoadingLeads(false);
    }
  }, [
    alcanceParam, dateParams, page, recuperacaoFilter, sdrStatusFilter,
    sdrStatusFromFunil, searchDebounced, segmentoParam, sortOrder, subscriptionFilter,
  ]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const data = await sdrService.getDashboardStats({
          segmento: segmentoParam,
          ...dateParams,
        });
        if (!cancelled) setStats(data);
      } catch (e) {
        console.error('Erro stats SDR:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [dateParams, segmentoParam]);

  useEffect(() => {
    if (loading || view !== 'tabela') return;
    setPage(1);
    void fetchLeads(1);
  }, [
    alcanceParam, dateParams, loading, recuperacaoFilter, sdrStatusFilter, sdrStatusFromFunil,
    searchDebounced, segmentoParam, sortOrder, subscriptionFilter, view,
  ]);

  useEffect(() => {
    if (!loading && view === 'tabela') void fetchLeads(page);
  }, [page]);

  const refreshLeads = () => {
    void fetchStats();
    setLeadsEpoch((n) => n + 1);
    if (view === 'tabela') void fetchLeads(page);
  };

  const openContactModal = (lead: SdrLead) => {
    setSelectedLead(lead);
    setContactForm({ tipo_contato: 'whatsapp', resultado: '', notas: '', proximo_contato: '', status: 'CONTATADO' });
    setContactModalOpen(true);
  };

  const openHistoryModal = async (lead: SdrLead) => {
    setSelectedLead(lead);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const data = await sdrService.getTrackingHistory(lead.id);
      setTrackingHistory(data);
    } catch {
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmitContact = async () => {
    if (!selectedLead || !contactForm.resultado) {
      toast.error('Preencha o resultado do contato');
      return;
    }
    try {
      await sdrService.createTracking(selectedLead.id, contactForm);
      toast.success('Contato registrado!');
      setContactModalOpen(false);
      refreshLeads();
    } catch {
      toast.error('Erro ao registrar contato');
    }
  };

  const handleEstenderAcesso = async (lead: SdrLead) => {
    if (!confirm(`Liberar mais 7 dias de acesso para ${lead.nome_negocio}?`)) return;
    try {
      const res = await sdrService.estenderAcesso(lead.id);
      if (res?.ok === false) {
        const motivos: Record<string, string> = {
          assinatura_ativa: 'Essa empresa já tem assinatura ativa.',
          ja_estendido: 'Essa empresa já recebeu o período extra uma vez.',
          nao_encontrada: 'Empresa não encontrada.',
        };
        toast.error(motivos[res.motivo] || 'Não foi possível estender o acesso');
        return;
      }
      toast.success('Acesso estendido em 7 dias');
      refreshLeads();
    } catch {
      toast.error('Erro ao estender o acesso');
    }
  };

  const handleSuspender = async (lead: SdrLead) => {
    if (!confirm(`Suspender a conta de ${lead.nome_negocio}?\n\nO login será bloqueado, mas TODOS os dados são preservados e a conta pode ser reativada depois.`)) return;
    try {
      await sdrService.suspenderEmpresa(lead.id, 'Suspensa manualmente pelo painel SDR');
      toast.success('Conta suspensa — dados preservados');
      refreshLeads();
    } catch {
      toast.error('Erro ao suspender a conta');
    }
  };

  const handleReativar = async (lead: SdrLead) => {
    try {
      await sdrService.reativarEmpresa(lead.id);
      toast.success('Conta reativada');
      refreshLeads();
    } catch {
      toast.error('Erro ao reativar a conta');
    }
  };

  /**
   * A campanha virou página própria: a base histórica é grande demais para uma
   * prévia única, e o SDR precisa percorrer os lotes sem perder a tela.
   */
  const openWinbackPage = () => {
    const seg = (SEGMENTOS_WINBACK as string[]).includes(segmento) ? `?segmento=${segmento}` : '';
    navigate(`/sdr/winback${seg}`);
  };

  const openWhatsApp = (lead: SdrLead) => {
    const phone = (lead.telefone || lead.admin?.telefone || '').replace(/\D/g, '');
    if (phone) window.open(`https://wa.me/${phone}`, '_blank');
    else toast.error('Telefone não disponível');
  };

  const leadContactName = (lead: SdrLead | null) =>
    (lead?.admin?.nome || lead?.nome_negocio || '').split(' ')[0] || '';

  const suggestedDeadline = () =>
    new Date(Date.now() + 7 * 86400000).toLocaleDateString('pt-BR');

  const templateVars = (lead: SdrLead | null) => ({
    nome: leadContactName(lead),
    plano: lead?.assinatura?.plano || null,
    data: suggestedDeadline(),
  });

  const openApproachModal = (lead: SdrLead) => {
    setSelectedLead(lead);
    const seg = detectSegment({
      assinaturaStatus: lead.assinatura?.status,
      temAssinatura: !!lead.assinatura,
      diasDesdeFim: daysSince(lead.assinatura?.data_fim ?? null),
    });
    setApproachSegment(seg);
    setSentKeys(new Set());
    setApproachModalOpen(true);
  };

  const copyMessage = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success('Mensagem copiada!');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const sendWhatsAppMessage = (lead: SdrLead | null, texto: string) => {
    const phone = (lead?.telefone || lead?.admin?.telefone || '').replace(/\D/g, '');
    if (!phone) {
      toast.error('Telefone não disponível');
      return;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  /** Envio rápido pela sessão WAHA do suporte — sem passar pelo WhatsApp Web. */
  const sendViaSupportSession = async (lead: SdrLead | null, texto: string, rotulo: string, key: string) => {
    if (!lead || sendingKey) return;
    setSendingKey(key);
    try {
      await sdrService.enviarAbordagem(lead.id, { texto, rotulo });
      setSentKeys((prev) => new Set(prev).add(key));
      toast.success(`Mensagem enviada para ${leadContactName(lead) || lead.nome_negocio}`);
      refreshLeads();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Erro ao enviar a mensagem');
    } finally {
      setSendingKey(null);
    }
  };

  const leadActions = {
    onWhatsApp: openWhatsApp,
    onApproach: openApproachModal,
    onContact: openContactModal,
    onHistory: openHistoryModal,
    onEstender: handleEstenderAcesso,
    onSuspender: handleSuspender,
    onReativar: handleReativar,
  };

  const toggleFunil = (key: FunilFiltro) => {
    setFunilFiltro((prev) => (prev === key ? null : key));
    if (key === 'negociacao' || key === 'convertidos') setView('tabela');
  };

  const funil = stats?.funil;
  const chipCount = (key: string) => {
    if (key === 'all') return stats?.todos ?? stats?.totalEmpresas ?? 0;
    return stats?.segmentos?.[key] ?? 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 min-h-screen">
      <div className="flex justify-between items-center flex-col md:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Painel de Recuperação SDR</h1>
          <p className="text-sm text-gray-500">Segmente, acompanhe o funil e recupere leads</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openWinbackPage} variant="default" className="text-sm">
            <Send className="w-4 h-4 mr-2" /> Campanha de Winback
          </Button>
          <Button onClick={refreshLeads} variant="outline" className="text-sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex-1 flex gap-2 overflow-x-auto pb-1">
          {SEGMENT_CHIPS.map((chip) => {
            const active = segmento === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setSegmento(chip.key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  active
                    ? 'bg-primary text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {chip.label}
                <span className={`ml-1.5 ${active ? 'text-white/80' : 'text-gray-400'}`}>{chipCount(chip.key)}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-[10px] font-bold uppercase text-gray-400">De</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="h-8 px-2 rounded-lg border border-gray-300 dark:border-gray-600 text-xs bg-white dark:bg-gray-700 dark:text-white"
          />
          <label className="text-[10px] font-bold uppercase text-gray-400">Até</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="h-8 px-2 rounded-lg border border-gray-300 dark:border-gray-600 text-xs bg-white dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {funil && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3">
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { key: null as FunilFiltro | null, label: 'Total', value: funil.total, active: 'text-gray-800 dark:text-white', ring: 'ring-gray-300' },
              { key: 'entregues' as const, label: 'Entregues', value: funil.entregues, active: 'text-green-600', ring: 'ring-green-400' },
              { key: 'lidos' as const, label: 'Lidos', value: funil.lidos, active: 'text-blue-600', ring: 'ring-blue-400' },
              { key: 'responderam' as const, label: 'Responderam', value: funil.responderam, active: 'text-purple-600', ring: 'ring-purple-400' },
              { key: 'negociacao' as const, label: 'Em negociação', value: funil.emNegociacao, active: 'text-amber-600', ring: 'ring-amber-400' },
              { key: 'convertidos' as const, label: 'Convertidos', value: funil.convertidos, active: 'text-green-800', ring: 'ring-green-700' },
            ].map((item) => {
              const isActive = item.key === null ? funilFiltro === null : funilFiltro === item.key;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => (item.key ? toggleFunil(item.key) : setFunilFiltro(null))}
                  className={`rounded-xl px-2 py-2 text-center transition-all ${isActive ? `ring-2 ${item.ring} bg-gray-50 dark:bg-gray-700/40` : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{item.label}</p>
                  <p className={`text-2xl font-bold leading-tight ${item.active}`}>{item.value}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setInventarioOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Inventário e régua automática</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${inventarioOpen ? '' : '-rotate-90'}`} />
        </button>
        {inventarioOpen && stats && (
          <div className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Trials Ativos', value: stats.trialsAtivos, color: 'border-amber-500', icon: Clock, bg: 'bg-amber-50', iconColor: 'text-amber-500' },
                { label: 'Expirados', value: stats.expirados, color: 'border-red-500', icon: XCircle, bg: 'bg-red-50', iconColor: 'text-red-500' },
                { label: 'Cancelados', value: stats.cancelados, color: 'border-gray-500', icon: AlertCircle, bg: 'bg-gray-50', iconColor: 'text-gray-500' },
                { label: 'Pendentes', value: stats.pendentes, color: 'border-blue-500', icon: CreditCard, bg: 'bg-blue-50', iconColor: 'text-blue-500' },
                { label: 'Recuperados (mês)', value: stats.recuperadosEsteMes, color: 'border-green-500', icon: TrendingUp, bg: 'bg-green-50', iconColor: 'text-green-500' },
                { label: 'Contatos Hoje', value: stats.contatosHoje, color: 'border-purple-500', icon: Phone, bg: 'bg-purple-50', iconColor: 'text-purple-500' },
              ].map((card) => (
                <Card key={card.label} className={`bg-white dark:bg-gray-800 shadow-sm border-0 border-l-4 ${card.color}`}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{card.label}</p>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">{card.value}</h3>
                      </div>
                      <div className={`p-1.5 ${card.bg} rounded-lg`}>
                        <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {stats.recuperacao && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { label: 'Na régua', value: stats.recuperacao.emRecuperacao, color: 'text-orange-600' },
                  { label: 'Reativações (mês)', value: stats.recuperacao.reativacoes, color: 'text-green-600' },
                  { label: 'Cupons gerados', value: stats.recuperacao.cuponsGerados, color: 'text-blue-600' },
                  { label: 'Cupons resgatados', value: stats.recuperacao.cuponsResgatados, color: 'text-purple-600' },
                  { label: 'Suspensas (mês)', value: stats.recuperacao.suspensosNoMes, color: 'text-red-600' },
                ].map((m) => (
                  <div key={m.label}>
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{m.label}</p>
                    <h3 className={`text-lg font-bold ${m.color}`}>{m.value}</h3>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Acompanhamento de winback</h2>
            <p className="text-sm text-gray-500 mt-1">
              Leia entregas, falhas e respostas em uma visão de conversa por campanha.
            </p>
          </div>
          <Button variant="outline" className="h-9 shrink-0" onClick={() => navigate('/sdr/winback/campanhas')}>
            Abrir acompanhamento <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Busca</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Nome, email ou telefone..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
          <div className="w-full sm:w-44">
            <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Ordenar por Registro</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="h-9 w-full px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value="desc">Mais recentes primeiro</option>
              <option value="asc">Mais antigos primeiro</option>
            </select>
          </div>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden h-9">
            <button
              type="button"
              onClick={() => setView('kanban')}
              className={`px-3 text-[10px] font-bold uppercase flex items-center gap-1 ${view === 'kanban' ? 'bg-primary text-white' : 'bg-white dark:bg-gray-700 text-gray-500'}`}
            >
              <Kanban className="w-3.5 h-3.5" /> Kanban
            </button>
            <button
              type="button"
              onClick={() => setView('tabela')}
              className={`px-3 text-[10px] font-bold uppercase flex items-center gap-1 ${view === 'tabela' ? 'bg-primary text-white' : 'bg-white dark:bg-gray-700 text-gray-500'}`}
            >
              <LayoutList className="w-3.5 h-3.5" /> Tabela
            </button>
          </div>
          <Button variant="outline" className="h-9" onClick={() => setMaisFiltros((v) => !v)}>
            <Filter className="w-4 h-4 mr-1" /> Mais filtros
          </Button>
        </div>

        {maisFiltros && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Assinatura</label>
              <select
                value={subscriptionFilter}
                onChange={(e) => setSubscriptionFilter(e.target.value)}
                className="h-9 w-full px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Todos</option>
                <option value="TRIAL">Trial</option>
                <option value="EXPIRED">Expirado</option>
                <option value="CANCELLED">Cancelado</option>
                <option value="PENDING">Pendente</option>
                <option value="ACTIVE">Ativo</option>
                <option value="SEM_ASSINATURA">Sem Assinatura</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Pipeline SDR</label>
              <select
                value={sdrStatusFromFunil || sdrStatusFilter}
                onChange={(e) => setSdrStatusFilter(e.target.value)}
                disabled={!!sdrStatusFromFunil}
                className="h-9 w-full px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 dark:text-white disabled:opacity-60"
              >
                <option value="all">Todos</option>
                <option value="NOVO">Novo</option>
                <option value="CONTATADO">Contatado</option>
                <option value="EM_NEGOCIACAO">Em Negociação</option>
                <option value="RECUPERADO">Recuperado</option>
                <option value="PERDIDO">Perdido</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Recuperação</label>
              <select
                value={recuperacaoFilter}
                onChange={(e) => setRecuperacaoFilter(e.target.value)}
                className="h-9 w-full px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Todos</option>
                <option value="ATIVO">Na régua</option>
                <option value="CONVERTIDO">Convertido</option>
                <option value="RECUSADO">Recusou</option>
                <option value="SUSPENSO">Suspensa</option>
                <option value="NENHUM">Fora da régua</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {view === 'kanban' ? (
        <SdrKanban
          segmento={segmentoParam}
          dataInicio={dateParams.dataInicio}
          dataFim={dateParams.dataFim}
          alcance={alcanceParam}
          search={searchDebounced || undefined}
          pipelineCounts={funil?.pipeline}
          refreshEpoch={leadsEpoch}
          actions={leadActions}
          onMoved={() => { void fetchStats(); }}
        />
      ) : (
        <>
          <div className="text-xs text-gray-500 px-1">{total} empresa(s) encontrada(s)</div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {loadingLeads ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-16">
                <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Nenhum lead encontrado com os filtros selecionados.</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[10px] text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-3">Empresa</th>
                        <th className="px-4 py-3">Segmento</th>
                        <th className="px-4 py-3">Alcance</th>
                        <th className="px-4 py-3">Plano</th>
                        <th className="px-4 py-3">Assinatura</th>
                        <th className="px-4 py-3">Registro</th>
                        <th className="px-4 py-3">Pipeline</th>
                        <th className="px-4 py-3">Recuperação</th>
                        <th className="px-4 py-3">Último Contato</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {leads.map((lead) => {
                        const regDays = daysSince(lead.registered_at);
                        return (
                          <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-900 dark:text-white text-sm">{lead.nome_negocio}</div>
                              <div className="text-[10px] text-gray-500">{lead.email || lead.admin?.email || '-'}</div>
                              <div className="text-[10px] text-gray-400">{lead.telefone || lead.admin?.telefone || '-'}</div>
                            </td>
                            <td className="px-4 py-3"><SegmentoBadge segmento={lead.segmento} /></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <AlcanceIcon status={lead.alcance?.status} />
                                <span className="text-[10px] uppercase font-bold text-gray-500">
                                  {alcanceTabelaLabel(lead.alcance?.status)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-600 text-[10px] font-medium uppercase">
                                {lead.assinatura?.plano || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {lead.assinatura ? (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[lead.assinatura.status] || 'bg-gray-100 text-gray-600'}`}>
                                  {STATUS_LABELS[lead.assinatura.status] || lead.assinatura.status}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase">
                                  Sem Assinatura
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">
                              <div>{formatDate(lead.registered_at)}</div>
                              {regDays !== null && (
                                <div className="text-[10px] text-gray-400">
                                  {regDays === 0 ? 'Hoje' : regDays === 1 ? 'Ontem' : `Há ${regDays}d`}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${SDR_STATUS_COLORS[lead.sdr.status] || 'bg-gray-100'}`}>
                                {SDR_STATUS_LABELS[lead.sdr.status] || lead.sdr.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">{renderRecuperacao(lead)}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {lead.sdr.ultimo_contato ? (
                                <>
                                  <div>{formatDate(lead.sdr.ultimo_contato)}</div>
                                  <div className="text-[10px] text-gray-400">{lead.sdr.resultado || '-'}</div>
                                </>
                              ) : (
                                <span className="text-gray-400">Nunca</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <LeadActions lead={lead} variant="icons" {...leadActions} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                  {leads.map((lead) => {
                    const regDays = daysSince(lead.registered_at);
                    const email = lead.email || lead.admin?.email || '-';
                    const telefone = lead.telefone || lead.admin?.telefone || '-';
                    return (
                      <div key={lead.id} className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">{lead.nome_negocio}</div>
                            {lead.admin?.nome && (
                              <div className="text-[11px] text-gray-500 truncate">{lead.admin.nome}</div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <SegmentoBadge segmento={lead.segmento} />
                            <div className="flex items-center gap-1">
                              <AlcanceIcon status={lead.alcance?.status} />
                              <span className="text-[10px] uppercase font-bold text-gray-500">
                                {alcanceTabelaLabel(lead.alcance?.status)}
                              </span>
                            </div>
                            {lead.assinatura ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[lead.assinatura.status] || 'bg-gray-100 text-gray-600'}`}>
                                {STATUS_LABELS[lead.assinatura.status] || lead.assinatura.status}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase">Sem Assinatura</span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${SDR_STATUS_COLORS[lead.sdr.status] || 'bg-gray-100'}`}>
                              {SDR_STATUS_LABELS[lead.sdr.status] || lead.sdr.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-[11px] text-gray-500 space-y-0.5 mb-2">
                          <div className="flex items-center gap-1"><Mail className="w-3 h-3 shrink-0" /> <span className="truncate">{email}</span></div>
                          <div className="flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" /> {telefone}</div>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400 mb-3">
                          <span>Plano: <strong className="text-gray-600 dark:text-gray-300">{lead.assinatura?.plano || 'N/A'}</strong></span>
                          <span>
                            Registro: {formatDate(lead.registered_at)}
                            {regDays !== null && ` (${regDays === 0 ? 'hoje' : regDays === 1 ? 'ontem' : `há ${regDays}d`})`}
                          </span>
                          <span>Último contato: {lead.sdr.ultimo_contato ? formatDate(lead.sdr.ultimo_contato) : 'nunca'}</span>
                        </div>
                        {lead.recuperacao && <div className="mb-3">{renderRecuperacao(lead)}</div>}
                        <LeadActions lead={lead} variant="grid" {...leadActions} />
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500">Página {page} de {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <Modal isOpen={contactModalOpen} onClose={() => setContactModalOpen(false)} title={`Registrar Contato — ${selectedLead?.nome_negocio || ''}`} size="lg">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Tipo de Contato</label>
            <select value={contactForm.tipo_contato} onChange={(e) => setContactForm((f) => ({ ...f, tipo_contato: e.target.value }))} className="h-9 w-full px-3 rounded-lg border border-gray-300 text-sm bg-white">
              <option value="whatsapp">WhatsApp</option>
              <option value="telefone">Telefone</option>
              <option value="email">E-mail</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Resultado *</label>
            <select value={contactForm.resultado} onChange={(e) => setContactForm((f) => ({ ...f, resultado: e.target.value }))} className="h-9 w-full px-3 rounded-lg border border-gray-300 text-sm bg-white">
              <option value="">Selecione...</option>
              <option value="sem_resposta">Sem Resposta</option>
              <option value="respondeu">Respondeu</option>
              <option value="agendou_callback">Agendou Callback</option>
              <option value="rejeitou">Rejeitou</option>
              <option value="converteu">Converteu</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Status Pipeline</label>
            <select value={contactForm.status} onChange={(e) => setContactForm((f) => ({ ...f, status: e.target.value }))} className="h-9 w-full px-3 rounded-lg border border-gray-300 text-sm bg-white">
              <option value="CONTATADO">Contatado</option>
              <option value="EM_NEGOCIACAO">Em Negociação</option>
              <option value="RECUPERADO">Recuperado</option>
              <option value="PERDIDO">Perdido</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Notas</label>
            <textarea value={contactForm.notas} onChange={(e) => setContactForm((f) => ({ ...f, notas: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm min-h-[80px] resize-none" placeholder="Observações sobre o contato..." />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Próximo Contato</label>
            <Input type="datetime-local" value={contactForm.proximo_contato} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactForm((f) => ({ ...f, proximo_contato: e.target.value }))} className="h-9 text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setContactModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => { void handleSubmitContact(); }} className="bg-primary text-white">Registrar Contato</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={historyModalOpen} onClose={() => setHistoryModalOpen(false)} title={`Histórico — ${selectedLead?.nome_negocio || ''}`} size="2xl">
        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : trackingHistory.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">Nenhum registro de contato ainda.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {trackingHistory.map((entry) => (
              <div key={entry.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${SDR_STATUS_COLORS[entry.status] || 'bg-gray-100'}`}>
                      {SDR_STATUS_LABELS[entry.status] || entry.status}
                    </span>
                    {entry.tipo_contato && entry.tipo_contato !== 'status_change' && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium uppercase">
                        {entry.tipo_contato}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400">{formatDateTime(entry.createdAt)}</span>
                </div>
                {entry.resultado && (
                  <p className="text-xs text-gray-700 dark:text-gray-300 mb-1">
                    <strong>Resultado:</strong> {entry.resultado}
                  </p>
                )}
                {entry.notas && (
                  <p className="text-xs text-gray-500 italic">{entry.notas}</p>
                )}
                {entry.proximo_contato && (
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-blue-600">
                    <Calendar className="w-3 h-3" />
                    Próximo contato: {formatDateTime(entry.proximo_contato)}
                  </div>
                )}
                <div className="text-[10px] text-gray-400 mt-1">por {entry.sdrNome}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal isOpen={approachModalOpen} onClose={() => setApproachModalOpen(false)} title={`Abordagem — ${selectedLead?.nome_negocio || ''}`} size="2xl">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Modelo de Abordagem</label>
              <select
                value={approachSegment}
                onChange={(e) => setApproachSegment(e.target.value as SdrSegmentKey)}
                className="h-9 w-full px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 dark:text-white"
              >
                {Object.values(SDR_SEGMENTS).map((seg) => (
                  <option key={seg.key} value={seg.key}>{seg.titulo}</option>
                ))}
              </select>
            </div>
            <div className="text-xs text-gray-500 sm:text-right sm:pb-2">
              Contato: <strong className="text-gray-700 dark:text-gray-200">{leadContactName(selectedLead) || '—'}</strong>
              {selectedLead?.assinatura?.plano && <> · Plano {selectedLead.assinatura.plano}</>}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3 text-xs space-y-1">
            <p className="text-gray-600 dark:text-gray-300"><strong>Diagnóstico:</strong> {SDR_SEGMENTS[approachSegment].diagnostico}</p>
            <p className="text-gray-600 dark:text-gray-300"><strong>Oferta:</strong> {SDR_SEGMENTS[approachSegment].oferta}</p>
          </div>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {SDR_SEGMENTS[approachSegment].mensagens.map((msg, i) => {
              const texto = fillTemplate(msg.texto, templateVars(selectedLead));
              const key = `${approachSegment}:${i}`;
              const enviando = sendingKey === key;
              const enviado = sentKeys.has(key);
              return (
                <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase text-purple-600">{msg.label}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-500" onClick={() => { void copyMessage(texto); }} title="Copiar">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-500" onClick={() => sendWhatsAppMessage(selectedLead, texto)} title="Abrir no WhatsApp Web">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        className={`h-7 px-2.5 text-xs text-white ${enviado ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-green-600 hover:bg-green-700'}`}
                        onClick={() => { void sendViaSupportSession(selectedLead, texto, msg.label, key); }}
                        disabled={!!sendingKey}
                        title="Enviar agora pela sessão WhatsApp do suporte"
                      >
                        {enviando ? (
                          <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Enviando</>
                        ) : enviado ? (
                          <><Check className="w-3.5 h-3.5 mr-1" /> Enviada</>
                        ) : (
                          <><Send className="w-3.5 h-3.5 mr-1" /> Enviar</>
                        )}
                      </Button>
                    </div>
                  </div>
                  {msg.quando && (
                    <p className="text-[10px] text-gray-400 italic mb-1.5">Quando: {msg.quando}</p>
                  )}
                  <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{texto}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default SdrPanel;
