import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  AlertCircle,
  MoreVertical,
  ExternalLink,
  ShieldCheck,
  MessageCircle,
  Zap,
  ZapOff,
  Power,
  RefreshCw,
  AlertTriangle,
  LogIn,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Info
} from 'lucide-react';
import { empresaService, Empresa } from '@/services/empresa.service';
import { assinaturaService, Assinatura } from '@/services/assinatura.service';
import { whatsappService, WahaHealthResponse } from '@/services/whatsapp.service';
import { publicAgendamentoService, DisponibilidadeResponse } from '@/services/public-agendamento.service';
import { superAdminService as superAdminApi } from '@/services/super-admin.service';
import { impersonationService } from '@/services/impersonation.service';
import EmpresaModal from '@/components/EmpresaModal';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { formatCurrencyDynamic, formatCurrency } from '@/utils/currencyUtils';
import Modal from '@/components/ui/Modal';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { servicoService, Servico } from '@/services/servico.service';
import { colaboradorService, Colaborador } from '@/services/colaborador.service';
import { cn } from '@/lib/utils';
import { Users as LucideUsers } from 'lucide-react';

interface EmpresaComAssinatura extends Empresa {
  assinatura?: Assinatura;
}

const Empresas = () => {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<EmpresaComAssinatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);

  // Estados para Filtros e Paginação teste
  const [statusFilter, setStatusFilter] = useState('all');
  const [assinaturaFilter, setAssinaturaFilter] = useState('all');
  const [planoFilter, setPlanoFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(15);

  // States para sessões WAHA
  const [wahaSessions, setWahaSessions] = useState<WahaHealthResponse | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionActionLoading, setSessionActionLoading] = useState<string | null>(null);
  const [impersonandoId, setImpersonandoId] = useState<string | null>(null);

  const [purgeConfirmation, setPurgeConfirmation] = useState('');
  const [purging, setPurging] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgingEmpresa, setPurgingEmpresa] = useState<Empresa | null>(null);

  // States para Detalhes da Empresa
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [empresaServicos, setEmpresaServicos] = useState<Servico[]>([]);
  const [empresaColaboradores, setEmpresaColaboradores] = useState<Colaborador[]>([]);
  
  // States para Diagnóstico de Agenda
  const [diagDate, setDiagDate] = useState(new Date().toISOString().split('T')[0]);
  const [diagColaborador, setDiagColaborador] = useState<string>('all');
  const [diagSlots, setDiagSlots] = useState<any[]>([]);
  const [diagAgendamentos, setDiagAgendamentos] = useState<any[]>([]);
  const [diagLoading, setDiagLoading] = useState(false);
  const [colaboradorTurno, setColaboradorTurno] = useState<any>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [colaboradorDisponibilidade, setColaboradorDisponibilidade] = useState<{[key: string]: any}>({});
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);

  const fetchEmpresas = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await empresaService.getEmpresas({
        page,
        limit,
        search: searchTerm,
        status: statusFilter,
        subscriptionStatus: assinaturaFilter
      });
      
      setEmpresas(response.data as EmpresaComAssinatura[]);
      setTotalPages(response.pages);
      setTotalItems(response.total);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      setError('Erro ao carregar empresas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();
  }, [page, statusFilter, assinaturaFilter]);

  useEffect(() => {
    fetchWahaSessions();
  }, []);

  const fetchWahaSessions = async () => {
    try {
      setLoadingSessions(true);
      const health = await whatsappService.getWahaHealth();
      setWahaSessions(health);
    } catch (error) {
      console.error('Erro ao buscar sessões WAHA:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleImpersonar = async (empresa: EmpresaComAssinatura) => {
    if (!window.confirm(`Acessar o painel de "${empresa.nome_negocio}" como administrador da empresa?\n\nO painel do cliente abre em outra aba (apps separados). A ação fica registrada no log do sistema.`)) return;

    try {
      setImpersonandoId(empresa.id);
      const response = await superAdminApi.impersonarEmpresa(empresa.id);
      toast.success(`Abrindo painel de ${response.empresa.nome}…`);
      impersonationService.start(response);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Erro ao acessar painel da empresa');
    } finally {
      setImpersonandoId(null);
    }
  };

  const handlePausarSessao = async (uuid: string) => {
    if (!window.confirm('Deseja realmente pausar esta sessão? O serviço de automação será interrompido.')) return;
    
    try {
      setSessionActionLoading(uuid);
      await whatsappService.deactivateSession(uuid);
      toast.success('Sessão pausada com sucesso');
      fetchWahaSessions();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao pausar sessão');
    } finally {
      setSessionActionLoading(null);
    }
  };

  const handleRemoverDispositivo = async (uuid: string) => {
    if (!window.confirm('ALERTA: Isso removerá permanentemente as credenciais do WhatsApp. O cliente precisará escanear o QR Code novamente. Continuar?')) return;

    try {
      setSessionActionLoading(uuid);
      await whatsappService.removeSessionCompletely(uuid);
      toast.success('Dispositivo removido com sucesso');
      fetchWahaSessions();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover dispositivo');
    } finally {
      setSessionActionLoading(null);
    }
  };

  const getWahaBadge = (empresaId: string) => {
    const normalizedEmpresaId = empresaId.toLowerCase();
    const session = wahaSessions?.sessions?.find(s => s.name.toLowerCase() === normalizedEmpresaId);
    
    if (!session) {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-gray-100 text-gray-500 w-fit">Inativo</span>
        </div>
      );
    }

    const status = session.status;
    const number = session.me?.id ? session.me.id.split('@')[0] : null;

    let badge = null;
    switch (status) {
      case 'WORKING':
        badge = <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-green-100 text-green-700 w-fit">Online</span>;
        break;
      case 'SCAN_QR_CODE':
        badge = <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-yellow-100 text-yellow-700 w-fit">Aguardando QR</span>;
        break;
      case 'STARTING':
        badge = <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-blue-100 text-blue-700 w-fit">Iniciando</span>;
        break;
      default:
        badge = <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-orange-100 text-orange-700 w-fit">{status}</span>;
    }

    return (
      <div className="flex flex-col gap-0.5">
        {badge}
        {number && <span className="text-[10px] text-gray-400 font-mono">+{number}</span>}
      </div>
    );
  };

  // Filtro de planos local (baseado apenas no que está na página atual, o que é uma limitação mas aceitável por agora)
  const planosDisponiveis = React.useMemo(() => {
    const planos = new Set<string>();
    empresas.forEach(e => {
      if (e.assinatura?.plano?.nome) {
        planos.add(e.assinatura.plano.nome);
      }
    });
    return Array.from(planos).sort();
  }, [empresas]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEmpresas();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setAssinaturaFilter('all');
    setPlanoFilter('all');
    setSortBy('newest');
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700">Ativo</span>;
      case 'suspended':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-yellow-100 text-yellow-700">Suspenso</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-700">Cancelado</span>;
      case 'PENDING_VERIFICATION':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-100 text-orange-700">Aguardando Verificação</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const getSubscriptionBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-700">Ativo</span>;
      case 'TRIAL':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-700">Trial</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-700">Cancelado</span>;
      case 'PENDING':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-yellow-100 text-yellow-700">Pendente</span>;
      case 'EXPIRED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-100 text-orange-700">Expirado</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-700">{status}</span>;
    }
  };



  // Nomes salvos com espaço sobrando ("Studio X ") nunca batiam com o que se
  // digita, porque o espaço não aparece na tela. O rótulo é exibido em caixa
  // alta, então maiúsculas e minúsculas também não contam.
  const normalizarNomeConfirmacao = (nome?: string | null) =>
    (nome || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR');

  const handleOpenPurgeModal = (empresa: EmpresaComAssinatura) => {
    setPurgingEmpresa(empresa);
    setPurgeConfirmation('');
    setShowPurgeModal(true);
  };

  const handlePurgeEmpresa = async () => {
    if (!purgingEmpresa) return;

    try {
      setPurging(true);
      setError(null);

      // Chamar novo endpoint de purge por empresa
      await empresaService.purgeEmpresa(purgingEmpresa.id);

      setEmpresas(prev => prev.filter(e => e.id !== purgingEmpresa.id));
      setShowPurgeModal(false);
      setPurgingEmpresa(null);
      setPurgeConfirmation('');
    } catch (error: any) {
      console.error('Erro ao remover empresa:', error);
      setError(error.response?.data?.message || 'Erro ao remover empresa. Verifique as permissões.');
    } finally {
      setPurging(false);
    }
  };

  const handleViewDetails = async (empresa: EmpresaComAssinatura) => {
    setSelectedEmpresa(empresa);
    setDetailsOpen(true);
    setLoadingDetails(true);
    try {
      const [servicos, colaboradores] = await Promise.all([
        servicoService.getServicosSuperadmin(empresa.id),
        colaboradorService.getColaboradoresSuperadmin(empresa.id, 'todos')
      ]);
      setEmpresaServicos(servicos || []);
      setEmpresaColaboradores(colaboradores || []);
    } catch (error) {
      console.error('Erro ao buscar detalhes da empresa:', error);
      toast.error('Não foi possível carregar os detalhes completos da empresa.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleFetchDisponibilidade = async (id: string) => {
    if (colaboradorDisponibilidade[id]) {
      setExpandedSchedule(expandedSchedule === id ? null : id);
      return;
    }
    
    try {
      setExpandedSchedule(id);
      const data = await colaboradorService.getDisponibilidade(id);
      setColaboradorDisponibilidade(prev => ({ ...prev, [id]: data }));
    } catch (error) {
      console.error('Erro ao buscar disponibilidade:', error);
      toast.error('Erro ao buscar horários.');
    }
  };

  const handleCheckDiag = async () => {
    if (!selectedEmpresa || !selectedEmpresa.slug) {
      toast.error('Empresa sem slug configurado para diagnóstico.');
      return;
    }

    try {
      setDiagLoading(true);
      setDiagSlots([]);
      setDiagAgendamentos([]);
      setColaboradorTurno(null);

      // 1. Buscar Turnos do Colaborador se um profissional for selecionado
      if (diagColaborador && diagColaborador !== 'all') {
        try {
          const shiftData = await colaboradorService.getDisponibilidade(diagColaborador);
          const daysMap: any = { 0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sabado' };
          const dateObj = new Date(diagDate + 'T12:00:00');
          const dayName = daysMap[dateObj.getDay()];
          setColaboradorTurno(shiftData[dayName]);
        } catch (e) {
          console.error("Erro ao carregar turnos:", e);
        }
      }

      // 2. Buscar Agendamentos Reais (Agenda da Empresa)
      console.log('Diagnostic: Calling superAdminApi.getAgendamentosEmpresa');
      const agendamentos = await superAdminApi.getAgendamentosEmpresa(
        selectedEmpresa.id,
        diagDate
      );
      setDiagAgendamentos(agendamentos || []);

      // 3. Buscar Disponibilidade Real (Opcional, manter slots para referência técnica se desejar)
      const response = await publicAgendamentoService.verificarDisponibilidade(
        selectedEmpresa.slug,
        diagColaborador === 'all' ? null : diagColaborador,
        diagDate,
        90
      );
      setDiagSlots(response.slots_disponiveis || []);
      
      if (agendamentos.length === 0) {
        toast.info('Nenhum agendamento encontrado para este dia.');
      }
    } catch (error: any) {
      console.error('Erro no diagnóstico:', error);
      toast.error('Erro ao consultar disponibilidade.');
    } finally {
      setDiagLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Empresas</h1>
          <p className="text-sm text-gray-500">Lista completa das empresas do ecossistema</p>
        </div>
        <Button onClick={() => {
          setSelectedEmpresa(null);
          setModalOpen(true);
        }} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      {wahaSessions && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold">Conexões Ativas</p>
                <div className="flex flex-col">
                  <p className="text-xl font-bold text-gray-900">{(wahaSessions.sessions || []).filter(s => s.status === 'WORKING').length}</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                <Zap size={20} />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold">Aguardando QR</p>
                <p className="text-xl font-bold text-gray-900">{(wahaSessions.sessions || []).filter(s => s.status === 'SCAN_QR_CODE').length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600">
                <RefreshCw size={20} />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold">Status WAHA</p>
                <p className={`text-sm font-bold ${wahaSessions.wahaReachable ? 'text-green-600' : 'text-red-600'}`}>
                  {wahaSessions.wahaReachable ? 'Online' : 'Offline'}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full ${wahaSessions.wahaReachable ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'} flex items-center justify-center`}>
                <AlertTriangle size={20} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Filtros e Busca */}
      <Card className="bg-white shadow-sm border-0 border-b-2 border-primary/10 overflow-visible">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-gray-700">Filtros e Organização</h2>
            </div>
            
            <div className="flex flex-col md:flex-row gap-2">
              <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Nome, CNPJ, Email ou Telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 text-sm border-gray-200 focus:ring-primary/20"
                />
              </form>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-10 px-4 whitespace-nowrap text-gray-600 hover:text-red-600 hover:border-red-200"
                  onClick={handleClearFilters}
                  title="Limpar todos os filtros"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-10" 
                  onClick={fetchWahaSessions}
                  disabled={loadingSessions}
                  title="Atualizar Status WhatsApp"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingSessions ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Status Empresa</label>
                <Select 
                  value={statusFilter} 
                  onChange={(e: any) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Todos os Status</option>
                  <option value="active">Ativo</option>
                  <option value="suspended">Suspenso</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="PENDING_VERIFICATION">Aguardando Verificação</option>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Status Assinatura</label>
                <Select 
                  value={assinaturaFilter} 
                  onChange={(e: any) => setAssinaturaFilter(e.target.value)}
                >
                  <option value="all">Todas Assinaturas</option>
                  <option value="ACTIVE">Ativa</option>
                  <option value="TRIAL">Trial</option>
                  <option value="CANCELLED">Cancelada</option>
                  <option value="PENDING">Pendente</option>
                  <option value="EXPIRED">Expirada</option>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Plano</label>
                <Select 
                  value={planoFilter} 
                  onChange={(e: any) => setPlanoFilter(e.target.value)}
                >
                  <option value="all">Todos os Planos</option>
                  {planosDisponiveis.map(plano => (
                    <option key={plano} value={plano}>{plano}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Ordenar por</label>
                <Select 
                  value={sortBy} 
                  onChange={(e: any) => setSortBy(e.target.value)}
                >
                  <option value="newest">Mais Recentes</option>
                  <option value="oldest">Mais Antigas</option>
                  <option value="az">Nome (A-Z)</option>
                  <option value="za">Nome (Z-A)</option>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-500">
            Total visitadas: <span className="font-bold text-gray-900">{totalItems}</span> empresas
          </p>
        </div>
        
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg border-gray-200"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            <ChevronLeft size={16} />
          </Button>
          
          <div className="bg-white border border-gray-200 rounded-lg px-3 h-8 flex items-center shadow-sm">
            <span className="text-[11px] font-bold text-gray-700">
              {page} de {totalPages || 1}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg border-gray-200"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Lista de Empresas - Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assinatura</th>
                <th className="px-4 py-3">CNPJ / Tel</th>
                <th className="px-4 py-3">Criada em</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {empresas.map((empresa) => (
                <tr key={empresa.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{empresa.nome_negocio}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{empresa.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(empresa.status)}
                  </td>
                  <td className="px-4 py-3">
                    {empresa.assinatura ? (
                      <div className="flex flex-col gap-1">
                        {getSubscriptionBadge(empresa.assinatura.status)}
                        <span className="text-[10px] text-gray-500 font-medium">
                          {empresa.assinatura.plano?.nome || 'N/A'} • {formatCurrencyDynamic(empresa.assinatura.plano?.preco_mensal || 0)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">Sem assinatura</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[11px] text-gray-600">
                      <p>{empresa.cnpj || '---'}</p>
                      <p>{empresa.telefone || '---'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(empresa.registered_at || empresa.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    {loadingSessions ? (
                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                    ) : (
                      getWahaBadge(empresa.id)
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                     {empresa.email || <span className="text-gray-300">---</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {/* WhatsApp Actions */}
                      {wahaSessions?.sessions?.find(s => s.name === empresa.id) && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-amber-600"
                            title="Pausar Sessão WhatsApp"
                            onClick={() => handlePausarSessao(empresa.id)}
                            disabled={sessionActionLoading === empresa.id}
                          >
                            <Power className={`w-4 h-4 ${sessionActionLoading === empresa.id ? 'animate-pulse' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500"
                            title="Remover Dispositivo WhatsApp"
                            onClick={() => handleRemoverDispositivo(empresa.id)}
                            disabled={sessionActionLoading === empresa.id}
                          >
                            <ZapOff className={`w-4 h-4 ${sessionActionLoading === empresa.id ? 'animate-pulse' : ''}`} />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-primary"
                        title="Acessar painel da empresa (impersonar)"
                        onClick={() => handleImpersonar(empresa)}
                        disabled={impersonandoId === empresa.id}
                      >
                        <LogIn className={`w-4 h-4 ${impersonandoId === empresa.id ? 'animate-pulse' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-600"
                        title="Visualizar Detalhes"
                        onClick={() => {
                          setSelectedEmpresa(empresa);
                          setModalOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-purple-600"
                        title="Visualizar Serviços e Profissionais"
                        onClick={() => handleViewDetails(empresa)}
                        disabled={loadingSessions}
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-green-600"
                        onClick={() => {
                          const phone = empresa.telefone?.replace(/\D/g, '');
                          if (phone) {
                            window.open(`https://wa.me/${phone}`, '_blank');
                          }
                        }}
                        title="Conversar no WhatsApp"
                        disabled={!empresa.telefone}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-600"
                        onClick={() => {
                          setSelectedEmpresa(empresa);
                          setModalOpen(true);
                        }}
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600"
                        onClick={() => handleOpenPurgeModal(empresa)}
                        title="Remover Nuclear"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {empresas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500 text-sm">
                    Nenhuma empresa encontrada com os termos de busca.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden grid gap-3">
        {empresas.map((empresa) => (
          <Card key={empresa.id} className="bg-white shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{empresa.nome_negocio}</h3>
                    <p className="text-[11px] text-gray-400">{new Date(empresa.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-green-600"
                    onClick={() => {
                      const phone = empresa.telefone?.replace(/\D/g, '');
                      if (phone) {
                        window.open(`https://wa.me/${phone}`, '_blank');
                      }
                    }}
                    title="WhatsApp"
                    disabled={!empresa.telefone}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setSelectedEmpresa(empresa);
                      setModalOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600"
                    onClick={() => handleOpenPurgeModal(empresa)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-2">
                {getStatusBadge(empresa.status)}
                {empresa.assinatura && getSubscriptionBadge(empresa.assinatura.status)}
                <div className="flex-1" />
                {getWahaBadge(empresa.id)}
              </div>

              {wahaSessions?.sessions?.find(s => s.name === empresa.id) && (
                <div className="flex gap-2 mb-3 bg-gray-50 p-2 rounded-lg">
                  <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    WhatsApp:
                  </span>
                  <div className="flex gap-1 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[10px] gap-1 text-amber-600 border-amber-100 hover:bg-amber-50"
                      onClick={() => handlePausarSessao(empresa.id)}
                      disabled={sessionActionLoading === empresa.id}
                    >
                      <Power className="w-3 h-3" /> Pausar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[10px] gap-1 text-red-500 border-red-100 hover:bg-red-50"
                      onClick={() => handleRemoverDispositivo(empresa.id)}
                      disabled={sessionActionLoading === empresa.id}
                    >
                      <ZapOff className="w-3 h-3" /> Remover
                    </Button>
                  </div>
                </div>
              )}

              {empresa.assinatura && (
                <div className="bg-gray-50 p-2 rounded text-[10px] text-gray-600 flex justify-between items-center mb-2">
                  <span>Plano: {empresa.assinatura.plano?.nome}</span>
                  <span className="font-bold">{formatCurrencyDynamic(empresa.assinatura.plano?.preco_mensal || 0)}/mês</span>
                </div>
              )}

              {empresa.email && (
                <div className="p-2 border border-dashed rounded-lg flex items-center gap-2 text-[11px] text-gray-500">
                   <span className="font-bold uppercase text-[9px]">Email:</span>
                   {empresa.email}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Purge para Empresa */}
      {showPurgeModal && purgingEmpresa && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-red-100">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <ShieldCheck size={32} />
                <h2 className="text-xl font-bold">Ação Crítica!</h2>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Remover <strong>{purgingEmpresa.nome_negocio}</strong> apagará permanentemente todos os usuários, agendamentos e histórico financeiro desta empresa.
              </p>

              <div className="mb-6">
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-tight">
                  Digite o nome para confirmar: <span className="text-red-600 font-mono ml-1">{purgingEmpresa.nome_negocio}</span>
                </label>
                <Input
                  value={purgeConfirmation}
                  onChange={(e) => setPurgeConfirmation(e.target.value)}
                  placeholder="Nome da empresa"
                  className="border-red-200 focus:ring-red-500"
                />
              </div>

              <div className="flex gap-3 mt-8">
                <Button
                  className="flex-1"
                  variant="ghost"
                  onClick={() => {
                    setShowPurgeModal(false);
                    setPurgingEmpresa(null);
                    setPurgeConfirmation('');
                  }}
                  disabled={purging}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handlePurgeEmpresa}
                  disabled={purging || normalizarNomeConfirmacao(purgeConfirmation) !== normalizarNomeConfirmacao(purgingEmpresa.nome_negocio)}
                >
                  {purging ? 'Processando...' : 'Remover Tudo'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Empresa */}
      <EmpresaModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedEmpresa(null);
        }}
        empresa={selectedEmpresa || undefined}
        onSuccess={fetchEmpresas}
      />

      {/* Modal de Detalhes da Empresa */}
      <Modal 
        isOpen={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        title={selectedEmpresa?.nome_negocio}
        size="7xl"
      >
        <div className="space-y-6">
          <Tabs defaultValue="servicos" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <TabsTrigger value="servicos" className="font-bold text-xs rounded-lg py-2">
                Serviços e Comissões
              </TabsTrigger>
              <TabsTrigger value="profissionais" className="font-bold text-xs rounded-lg py-2">
                Equipe e Profissionais
              </TabsTrigger>
              <TabsTrigger value="diagnostico" className="font-bold text-xs rounded-lg py-2">
                Diagnóstico de Agenda
              </TabsTrigger>
            </TabsList>


            <TabsContent value="servicos">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Zap size={16} className="text-amber-500" />
                  Serviços da Empresa
                </h3>
                <span className="text-[10px] font-black bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-1 rounded-full uppercase">
                  {empresaServicos.length} Serviços
                </span>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Serviço</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Preço</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Comissão Padrão</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                      {loadingDetails ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <RefreshCw size={24} className="animate-spin text-primary" />
                              <span className="text-xs text-gray-400 font-medium">Carregando serviços...</span>
                            </div>
                          </td>
                        </tr>
                      ) : empresaServicos.length > 0 ? (
                        empresaServicos.map(item => (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-900 dark:text-white">{item.nome}</span>
                                <span className="text-[9px] text-gray-400 font-mono tracking-tighter truncate max-w-[200px]">{item.id}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{formatCurrencyDynamic(item.preco)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-emerald-600">
                                  {item.tipo_comissao_padrao === 'percentual' || item.tipo_comissao_padrao === 'porcentagem' ? `${item.valor_comissao_padrao}%` : formatCurrencyDynamic(item.valor_comissao_padrao)}
                                </span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                  {item.tipo_comissao_padrao === 'percentual' || item.tipo_comissao_padrao === 'porcentagem' ? 'Porcentagem' : 'Fixo'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                item.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              )}>
                                {item.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center text-xs text-gray-400 font-medium italic">
                            Nenhum serviço cadastrado nesta empresa.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="profissionais">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <LucideUsers size={16} className="text-blue-500" />
                  Profissionais da Equipe
                </h3>
                <span className="text-[10px] font-black bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-1 rounded-full uppercase">
                  {empresaColaboradores.length} Profissionais
                </span>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nome</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Comissão Base</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Personalizadas</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Agenda</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                      {loadingDetails ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-xs text-gray-400 font-medium">
                            <RefreshCw size={24} className="animate-spin text-primary inline mr-2" />
                            Carregando profissionais...
                          </td>
                        </tr>
                        ) : empresaColaboradores.length > 0 ? (
                        empresaColaboradores.map(item => (
                          <React.Fragment key={item.id}>
                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-[10px] overflow-hidden">
                                    {item.avatar_url ? (
                                      <img src={item.avatar_url} alt={item.nome} className="w-full h-full object-cover" />
                                    ) : (
                                      item.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                                    )}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{item.nome}</span>
                                    <span className="text-[10px] text-gray-400 font-medium">{item.role?.nome || 'Sem Acesso'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-blue-600">
                                    {item.tipo_comissao === 'percentual' || item.tipo_comissao === 'porcentagem' ? `${item.valor_comissao || 0}%` : formatCurrencyDynamic(item.valor_comissao || 0)}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    {item.tipo_comissao === 'percentual' || item.tipo_comissao === 'porcentagem' ? 'Porcentagem' : 'Fixo'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border",
                                  item.servicos && item.servicos.length > 0 
                                    ? "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50" 
                                    : "bg-gray-50 text-gray-400 border-gray-100 dark:bg-gray-700/50 dark:text-gray-500 dark:border-gray-600"
                                )}>
                                  {item.servicos?.length || 0} Serviços
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                  item.status === 'ativo' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                )}>
                                  {item.status === 'ativo' ? 'Ativo' : 'Inativo'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-8 w-8 p-0 rounded-lg transition-all",
                                    expandedSchedule === item.id ? "bg-primary/10 text-primary" : "text-gray-400"
                                  )}
                                  onClick={() => handleFetchDisponibilidade(item.id)}
                                >
                                  <Clock size={16} />
                                </Button>
                              </td>
                            </tr>
                            {expandedSchedule === item.id && (
                              <tr className="bg-gray-50/50 dark:bg-gray-800/50 animate-in fade-in slide-in-from-top-1">
                                <td colSpan={5} className="px-4 py-4 border-b border-gray-100 dark:border-gray-700">
                                  <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-2">
                                      <Info size={12} className="text-primary" />
                                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Escala de Trabalho Semanal</span>
                                    </div>
                                    
                                    {!colaboradorDisponibilidade[item.id] ? (
                                      <div className="flex items-center gap-2 py-2">
                                        <RefreshCw size={12} className="animate-spin text-gray-400" />
                                        <span className="text-[10px] text-gray-400 font-bold italic">Carregando grade horária...</span>
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                                        {['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'].map(dia => {
                                          const config = colaboradorDisponibilidade[item.id][dia];
                                          const isToday = new Date().getDay() === (['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].indexOf(dia));
                                          
                                          return (
                                            <div 
                                              key={dia} 
                                              className={cn(
                                                "p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all",
                                                config?.disponivel 
                                                  ? isToday ? "bg-primary/5 border-primary/20" : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm"
                                                  : "bg-gray-100 dark:bg-gray-900 border-transparent opacity-50"
                                              )}
                                            >
                                              <span className={cn(
                                                "text-[9px] font-black uppercase tracking-tighter",
                                                isToday ? "text-primary" : "text-gray-400"
                                              )}>
                                                {dia.slice(0, 3)}
                                                {isToday && <span className="ml-1 text-[8px]">•</span>}
                                              </span>
                                              
                                              {config?.disponivel && config.turnos && config.turnos.length > 0 ? (
                                                <div className="flex flex-col items-center gap-0.5">
                                                  {config.turnos.map((t: any, idx: number) => (
                                                    <div key={idx} className="flex flex-col items-center">
                                                      <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{t.inicio}</span>
                                                      <span className="text-[8px] font-medium text-gray-400 leading-none">às</span>
                                                      <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{t.fim}</span>
                                                      {idx < config.turnos.length - 1 && <div className="h-px w-2 bg-gray-100 my-0.5" />}
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <span className="text-[9px] font-bold text-gray-400 uppercase italic">Folga</span>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-xs text-gray-400 font-medium italic">
                            Nenhum profissional cadastrado nesta empresa.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="diagnostico">
              <div className="flex flex-col gap-6">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Selecione o Profissional</label>
                      <Select 
                        value={diagColaborador} 
                        onChange={(e: any) => setDiagColaborador(e.target.value)}
                      >
                        <option value="all">Visão Geral (Todos)</option>
                        {empresaColaboradores.map(c => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Escolha a Data</label>
                      <Input 
                        type="date"
                        value={diagDate}
                        onChange={(e) => setDiagDate(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <Button 
                      className="bg-primary hover:bg-primary/90 h-10 px-6 font-bold"
                      onClick={handleCheckDiag}
                      disabled={diagLoading}
                    >
                      {diagLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Consultar Grade'}
                    </Button>
                  </div>
                </div>

                {colaboradorTurno && (
                  <div className="flex items-center gap-2 px-1">
                    <Info className="w-4 h-4 text-primary" />
                    <p className="text-xs text-gray-600">
                      <strong>Configuração de Turno:</strong> {colaboradorTurno.disponivel ? 
                        `Das ${colaboradorTurno.inicio} às ${colaboradorTurno.fim}` : 
                        "Não trabalha neste dia."}
                    </p>
                  </div>
                )}

                <div className="bg-white border rounded-2xl p-6 min-h-[400px]">
                  {diagLoading ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                      <RefreshCw size={32} className="animate-spin text-primary" />
                      <p className="text-sm font-medium text-gray-400">Consultando agenda da empresa...</p>
                    </div>
                  ) : diagAgendamentos.length > 0 ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b pb-4">
                        <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          Agendamentos Marcados para {new Date(diagDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </h4>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-bold uppercase">
                          {diagAgendamentos.length} Agendamentos
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b">
                              <th className="py-3 text-[10px] font-bold text-gray-400 uppercase">Horário</th>
                              <th className="py-3 text-[10px] font-bold text-gray-400 uppercase">Cliente</th>
                              <th className="py-3 text-[10px] font-bold text-gray-400 uppercase">Profissional</th>
                              <th className="py-3 text-[10px] font-bold text-gray-400 uppercase">Serviços</th>
                              <th className="py-3 text-[10px] font-bold text-gray-400 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {diagAgendamentos.map((ag) => (
                              <tr key={ag.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-4">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-black text-gray-800">
                                      {new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Início</span>
                                  </div>
                                </td>
                                <td className="py-4">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-700">{ag.cliente?.nome}</span>
                                    <span className="text-[10px] text-gray-400">{ag.cliente?.telefone}</span>
                                  </div>
                                </td>
                                <td className="py-4">
                                  <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                                    {ag.colaborador?.nome}
                                  </span>
                                </td>
                                <td className="py-4">
                                  <div className="flex flex-wrap gap-1">
                                    {ag.servicos?.map((s: any, idx: number) => (
                                      <span key={idx} className="text-[9px] font-bold border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded uppercase">
                                        {s.servico?.nome}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-4">
                                  <span className={cn(
                                    "text-[9px] font-black uppercase px-2 py-1 rounded-full",
                                    ag.status === 'cancelado' ? "bg-rose-100 text-rose-600" :
                                    ag.status === 'confirmado' ? "bg-emerald-100 text-emerald-600" :
                                    "bg-amber-100 text-amber-600"
                                  )}>
                                    {ag.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="pt-6 border-t">
                        <h5 className="text-[10px] font-bold text-gray-400 uppercase mb-4 tracking-widest text-center">
                          Slots de Disponibilidade (Grid de 90min)
                        </h5>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                          {diagSlots.map((slot, index) => (
                            <div 
                              key={index}
                              className={cn(
                                "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
                                slot.status === 'available' 
                                  ? "bg-emerald-50 border-emerald-100 text-emerald-900 shadow-sm"
                                  : "bg-rose-50 border-rose-100 text-rose-900 opacity-80"
                              )}
                            >
                              <span className="text-sm font-black">{slot.horario}</span>
                              <span className="text-[8px] font-bold uppercase tracking-tighter opacity-70">
                                {slot.status === 'available' ? 'Livre' : 'Ocupado'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
                      <Calendar className="w-8 h-8 text-gray-200" />
                      <p className="text-sm text-gray-400 font-medium italic">
                        Não há agendamentos para este dia. <br />
                        Utilize o botão acima para consultar ou verifique outra data.
                      </p>
                    </div>
                  )}
                </div>

                {(diagAgendamentos.length > 0 || diagSlots.length > 0 || colaboradorTurno) && (
                  <div className="mt-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-primary"
                      onClick={() => setShowRaw(!showRaw)}
                    >
                      {showRaw ? 'Ocultar JSON do Banco' : 'Ver JSON Direto do Banco'}
                    </Button>
                    
                    {showRaw && (
                      <div className="mt-2 bg-gray-900 rounded-xl p-4 overflow-auto max-h-[400px]">
                        <pre className="text-[10px] text-green-400 font-mono leading-tight">
                          {JSON.stringify({ 
                            empresa_id: selectedEmpresa.id,
                            data_consulta: diagDate,
                            total_agendamentos: diagAgendamentos.length,
                            agendamentos: diagAgendamentos,
                            grid_disponibilidade: diagSlots,
                            turno_configurado: colaboradorTurno
                          }, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

          </Tabs>
        </div>

      </Modal>
    </div>
  );
};

export default Empresas;
