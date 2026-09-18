import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  CreditCard, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Building2,
  Calendar as CalendarIcon,
  DollarSign,
  AlertCircle,
  Plus,
  Receipt,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { assinaturaService, Assinatura } from '@/services/assinatura.service';
import Modal from '@/components/ui/Modal';
import { planoService, Plano } from '@/services/plano.service';
import { empresaService, Empresa } from '@/services/empresa.service';
import { superAdminService, EmpresaFaturas } from '@/services/super-admin.service';
import { formatCurrencyDynamic } from '@/utils/currencyUtils';
import { toast } from 'sonner';

const Assinaturas = () => {
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Filtros da lista
  const [showFilters, setShowFilters] = useState(false);
  const [filtros, setFiltros] = useState({
    status: '',
    ciclo: '',
    planoId: '',
    vencimentoInicio: '',
    vencimentoFim: '',
  });
  
  // Modais
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const [selectedAssinatura, setSelectedAssinatura] = useState<Assinatura | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [updating, setUpdating] = useState(false);
  const [creating, setCreating] = useState(false);

  // Faturas (Asaas ou Woovi, conforme o gateway da assinatura)
  const [isFaturasModalOpen, setIsFaturasModalOpen] = useState(false);
  const [loadingFaturas, setLoadingFaturas] = useState(false);
  const [faturasData, setFaturasData] = useState<EmpresaFaturas | null>(null);
  const [faturasEmpresaId, setFaturasEmpresaId] = useState<string>('');
  const [faturasGateway, setFaturasGateway] = useState<'asaas' | 'woovi'>('asaas');
  const nomeGatewayFaturas = faturasGateway === 'woovi' ? 'Woovi' : 'Asaas';
  const [faturaFiltros, setFaturaFiltros] = useState({ vencimentoInicio: '', vencimentoFim: '', status: '' });

  const [editForm, setEditForm] = useState({
    status: '',
    planoId: '',
    data_fim: ''
  });

  const [createForm, setCreateForm] = useState({
    empresaId: '',
    planoId: '',
    status: 'TRIAL' as any,
    cycle: 'MONTHLY' as const
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [assinaturasData, planosData, empresasData] = await Promise.all([
        assinaturaService.getAssinaturas(),
        planoService.getPlanos(),
        empresaService.getEmpresas({ limit: 1000 })
      ]);
      
      setAssinaturas(assinaturasData);
      setPlanos(planosData);
      setEmpresas(empresasData.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredAssinaturas = assinaturas.filter((assinatura) => {
    if (!assinatura.empresa?.nome_negocio.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filtros.status && assinatura.status !== filtros.status) return false;
    if (filtros.ciclo && (assinatura.billing_cycle || 'MONTHLY') !== filtros.ciclo) return false;
    if (filtros.planoId && assinatura.planoId !== filtros.planoId) return false;
    if (filtros.vencimentoInicio) {
      if (!assinatura.data_fim || new Date(assinatura.data_fim) < new Date(filtros.vencimentoInicio)) return false;
    }
    if (filtros.vencimentoFim) {
      // Inclui o dia inteiro do limite superior (até 23:59:59).
      const fim = new Date(filtros.vencimentoFim);
      fim.setHours(23, 59, 59, 999);
      if (!assinatura.data_fim || new Date(assinatura.data_fim) > fim) return false;
    }
    return true;
  });

  const filtrosAtivos = !!(filtros.status || filtros.ciclo || filtros.planoId || filtros.vencimentoInicio || filtros.vencimentoFim);

  const limparFiltros = () =>
    setFiltros({ status: '', ciclo: '', planoId: '', vencimentoInicio: '', vencimentoFim: '' });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600 bg-green-100';
      case 'TRIAL':
        return 'text-blue-600 bg-blue-100';
      case 'CANCELLED':
        return 'text-red-600 bg-red-100';
      case 'EXPIRED':
        return 'text-yellow-600 bg-yellow-100';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Ativa';
      case 'TRIAL':
        return 'Trial';
      case 'CANCELLED':
        return 'Cancelada';
      case 'EXPIRED':
        return 'Expirada';
      case 'PENDING':
        return 'Pendente';
      default:
        return status;
    }
  };

  // Status das faturas (vocabulário do Asaas; a Woovi é mapeada para ele no backend)
  const getFaturaStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED':
      case 'CONFIRMED':
      case 'RECEIVED_IN_CASH':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
      case 'AWAITING_RISK_ANALYSIS':
        return 'bg-yellow-100 text-yellow-700';
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-700';
      case 'OVERDUE':
        return 'bg-red-100 text-red-700';
      case 'REFUNDED':
      case 'CHARGEBACK_REQUESTED':
      case 'REFUND_REQUESTED':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getFaturaStatusText = (status: string) => {
    switch (status) {
      case 'RECEIVED':
      case 'RECEIVED_IN_CASH':
        return 'Recebida';
      case 'CONFIRMED':
        return 'Confirmada';
      case 'PENDING':
        return 'Pendente';
      case 'SCHEDULED':
        return 'Agendada';
      case 'OVERDUE':
        return 'Vencida';
      case 'REFUNDED':
        return 'Estornada';
      case 'AWAITING_RISK_ANALYSIS':
        return 'Em análise';
      default:
        return status;
    }
  };

  const handleDelete = async (id: string, empresa: string) => {
    if (window.confirm(`Tem certeza que deseja remover permanentemente a assinatura da empresa ${empresa}?`)) {
      try {
        await assinaturaService.deleteAssinatura(id);
        setAssinaturas(prev => prev.filter(a => a.id !== id));
        toast.success('Assinatura removida com sucesso');
      } catch (error) {
        console.error('Erro ao remover assinatura:', error);
        toast.error('Erro ao remover assinatura');
      }
    }
  };

  const fetchFaturas = async (empresaId: string, filtros = {}) => {
    setLoadingFaturas(true);
    try {
      const data = await superAdminService.getFaturasEmpresa(empresaId, filtros);
      setFaturasData(data);
      if (data.gateway) setFaturasGateway(data.gateway);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao buscar faturas');
      setFaturasData(null);
    } finally {
      setLoadingFaturas(false);
    }
  };

  const handleViewFaturas = (assinatura: Assinatura) => {
    setFaturasEmpresaId(assinatura.empresaId);
    setFaturasGateway(assinatura.gateway === 'woovi' ? 'woovi' : 'asaas');
    setFaturaFiltros({ vencimentoInicio: '', vencimentoFim: '', status: '' });
    setFaturasData(null);
    setIsFaturasModalOpen(true);
    fetchFaturas(assinatura.empresaId);
  };

  const aplicarFiltrosFaturas = () => {
    if (!faturasEmpresaId) return;
    fetchFaturas(faturasEmpresaId, {
      status: faturaFiltros.status || undefined,
      vencimentoInicio: faturaFiltros.vencimentoInicio || undefined,
      vencimentoFim: faturaFiltros.vencimentoFim || undefined,
    });
  };

  const handleEdit = (assinatura: Assinatura) => {
    setSelectedAssinatura(assinatura);
    setEditForm({
      status: assinatura.status,
      planoId: assinatura.planoId,
      data_fim: assinatura.data_fim ? new Date(assinatura.data_fim).toISOString().split('T')[0] : ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedAssinatura) return;
    try {
      setUpdating(true);
      const updated = await assinaturaService.updateAssinatura(selectedAssinatura.id, {
        status: editForm.status as any,
        planoId: editForm.planoId,
        data_fim: editForm.data_fim ? new Date(editForm.data_fim).toISOString() : undefined
      });
      
      // Refresh list to get updated relations
      await fetchData();
      
      setIsEditModalOpen(false);
      toast.success('Assinatura atualizada com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar assinatura:', error);
      toast.error('Erro ao atualizar assinatura');
    } finally {
      setUpdating(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.empresaId || !createForm.planoId) {
      toast.error('Selecione uma empresa e um plano');
      return;
    }

    try {
      setCreating(true);
      await assinaturaService.createAssinatura({
        empresaId: createForm.empresaId,
        planoId: createForm.planoId,
        status: createForm.status,
        cycle: createForm.cycle
      });
      
      await fetchData();
      setIsCreateModalOpen(false);
      setCreateForm({ empresaId: '', planoId: '', status: 'TRIAL', cycle: 'MONTHLY' });
      toast.success('Assinatura criada com sucesso');
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      toast.error('Erro ao criar assinatura');
    } finally {
      setCreating(false);
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
    <div className="space-y-6">
      <div className="flex justify-between items-center md:flex-row flex-col">
        <h1 className="text-3xl font-bold text-gray-900 md:pb-0 pb-4">Gerenciar Assinaturas</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Assinatura
        </Button>
      </div>

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros e Busca */}
      <Card className='bg-white'>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar assinaturas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters((v) => !v)}
              className={filtrosAtivos ? 'border-primary text-primary' : ''}
            >
              Filtros{filtrosAtivos ? ' (ativos)' : ''}
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Status</label>
                <select
                  value={filtros.status}
                  onChange={(e) => setFiltros((p) => ({ ...p, status: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Todos</option>
                  <option value="ACTIVE">Ativa</option>
                  <option value="TRIAL">Trial</option>
                  <option value="PENDING">Pendente</option>
                  <option value="CANCELLED">Cancelada</option>
                  <option value="EXPIRED">Expirada</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Ciclo</label>
                <select
                  value={filtros.ciclo}
                  onChange={(e) => setFiltros((p) => ({ ...p, ciclo: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Todos</option>
                  <option value="MONTHLY">Mensal</option>
                  <option value="YEARLY">Anual</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Plano</label>
                <select
                  value={filtros.planoId}
                  onChange={(e) => setFiltros((p) => ({ ...p, planoId: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Todos</option>
                  {planos.map((plano) => (
                    <option key={plano.id} value={plano.id}>{plano.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Vencimento de</label>
                <input
                  type="date"
                  value={filtros.vencimentoInicio}
                  onChange={(e) => setFiltros((p) => ({ ...p, vencimentoInicio: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Vencimento até</label>
                <input
                  type="date"
                  value={filtros.vencimentoFim}
                  onChange={(e) => setFiltros((p) => ({ ...p, vencimentoFim: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {filtrosAtivos && (
                <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
                  <button
                    onClick={limparFiltros}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-800"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Assinaturas */}
      <div className="grid gap-4">
        {filteredAssinaturas.map((assinatura) => (
          <Card key={assinatura.id} className='bg-white'>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Building2 className="w-5 h-5 text-gray-500" />
                    <div>
                      <h3 className="text-lg font-semibold">{assinatura.empresa?.nome_negocio || 'Empresa não encontrada'}</h3>
                     
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(assinatura.status)}`}>
                      {getStatusText(assinatura.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Plano:</span>
                      <span>{assinatura.plano?.nome || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Valor:</span>
                      <span className="font-semibold">{assinatura.plano ? formatCurrencyDynamic(assinatura.plano.preco_mensal) : 'N/A'}/mês</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Início:</span>
                      <span>{new Date(assinatura.data_inicio).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Próximo pagamento:</span>
                      <span>{assinatura.data_fim ? new Date(assinatura.data_fim).toLocaleDateString('pt-BR') : 'N/A'}</span>
                    </div>
                  </div>

                  {assinatura.valor_pago && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium">Valor pago:</span> {formatCurrencyDynamic(assinatura.valor_pago)}
                        </div>
                        <div>
                          <span className="font-medium">Método de pagamento:</span> {assinatura.metodo_pagamento || 'N/A'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleViewFaturas(assinatura)} title={`Ver faturas (${assinatura.gateway === 'woovi' ? 'Woovi' : 'Asaas'})`}>
                    <Receipt className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(assinatura)} title="Editar">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(assinatura.id, assinatura.empresa?.nome_negocio || 'NI')}
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAssinaturas.length === 0 && !loading && (
        <Card className="bg-white">
          <CardContent className="pt-6 text-center">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma assinatura encontrada</p>
          </CardContent>
        </Card>
      )}

      {/* Faturas Modal */}
      <Modal
        isOpen={isFaturasModalOpen}
        onClose={() => setIsFaturasModalOpen(false)}
        title={`Faturas ${nomeGatewayFaturas}${faturasData?.nome_negocio ? ` - ${faturasData.nome_negocio}` : ''}`}
        size="lg"
      >
        {/* Filtros */}
        {faturasData?.customerId && (
          <div className="flex flex-wrap items-end gap-3 mb-4 pb-4 border-b border-gray-100">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Vencimento de</label>
              <input
                type="date"
                value={faturaFiltros.vencimentoInicio}
                onChange={(e) => setFaturaFiltros((p) => ({ ...p, vencimentoInicio: e.target.value }))}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">até</label>
              <input
                type="date"
                value={faturaFiltros.vencimentoFim}
                onChange={(e) => setFaturaFiltros((p) => ({ ...p, vencimentoFim: e.target.value }))}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Status</label>
              <select
                value={faturaFiltros.status}
                onChange={(e) => setFaturaFiltros((p) => ({ ...p, status: e.target.value }))}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Todos</option>
                <option value="PENDING">Pendente</option>
                {faturasGateway === 'woovi' && <option value="SCHEDULED">Agendada</option>}
                <option value="RECEIVED">Recebida</option>
                <option value="CONFIRMED">Confirmada</option>
                <option value="OVERDUE">Vencida</option>
                <option value="REFUNDED">Estornada</option>
              </select>
            </div>
            <Button size="sm" onClick={aplicarFiltrosFaturas} disabled={loadingFaturas}>
              Filtrar
            </Button>
          </div>
        )}

        {loadingFaturas ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm">Buscando faturas no {nomeGatewayFaturas}...</p>
          </div>
        ) : !faturasData ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-600">Não foi possível carregar as faturas.</p>
          </div>
        ) : !faturasData.customerId ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <p className="text-gray-600">{faturasData.message || `Empresa sem cliente ${nomeGatewayFaturas} vinculado.`}</p>
          </div>
        ) : faturasData.faturas.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma fatura encontrada para este cliente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              {faturasData.faturas.length} de {faturasData.totalCount} fatura(s) • {faturasGateway === 'woovi' ? 'Assinatura Woovi' : 'Cliente Asaas'}: <span className="font-mono">{faturasData.customerId}</span>
            </p>
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
              {faturasData.faturas.map((f) => (
                <div key={f.id} className="p-3 flex items-center justify-between gap-4 hover:bg-gray-50">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{formatCurrencyDynamic(f.value)}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getFaturaStatusColor(f.status)}`}>
                        {getFaturaStatusText(f.status)}
                      </span>
                      {f.billingType && <span className="text-[10px] text-gray-400 uppercase">{f.billingType}</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{f.description || 'Cobrança de assinatura'}</p>
                    <p className="text-[11px] text-gray-400">
                      Vencimento: {f.dueDate ? new Date(f.dueDate).toLocaleDateString('pt-BR') : 'N/A'}
                      {f.paymentDate && ` • Pago em: ${new Date(f.paymentDate).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>
                  {f.invoiceUrl && (
                    <a
                      href={f.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Abrir
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Editar Assinatura - ${selectedAssinatura?.empresa?.nome_negocio}`}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary h-10 px-3 border"
              value={editForm.planoId}
              onChange={(e) => setEditForm(prev => ({ ...prev, planoId: e.target.value }))}
            >
              {planos.map(plano => (
                <option key={plano.id} value={plano.id}>
                  {plano.nome} - {formatCurrencyDynamic(plano.preco_mensal)}/mês
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary h-10 px-3 border"
              value={editForm.status}
              onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
            >
              <option value="ACTIVE">Ativa</option>
              <option value="TRIAL">Trial</option>
              <option value="PENDING">Pendente</option>
              <option value="EXPIRED">Expirada</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Expiração/Próximo Pagamento</label>
            <Input
              type="date"
              value={editForm.data_fim}
              onChange={(e) => setEditForm(prev => ({ ...prev, data_fim: e.target.value }))}
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="text-xs text-amber-800">
              <p className="font-bold">Aviso sobre o Asaas:</p>
              <p>Alterar o plano aqui pode sincronizar a mudança de valor no Asaas. Tenha cuidado ao alterar status manualmente.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Nova Assinatura"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary h-10 px-3 border"
              value={createForm.empresaId}
              onChange={(e) => setCreateForm(prev => ({ ...prev, empresaId: e.target.value }))}
            >
              <option value="">Selecione uma empresa...</option>
              {empresas.map(empresa => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nome_negocio}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary h-10 px-3 border"
              value={createForm.planoId}
              onChange={(e) => setCreateForm(prev => ({ ...prev, planoId: e.target.value }))}
            >
              <option value="">Selecione um plano...</option>
              {planos.map(plano => (
                <option key={plano.id} value={plano.id}>
                  {plano.nome} - {formatCurrencyDynamic(plano.preco_mensal)}/mês
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status Inicial</label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary h-10 px-3 border"
              value={createForm.status}
              onChange={(e) => setCreateForm(prev => ({ ...prev, status: e.target.value as any }))}
            >
              <option value="TRIAL">Trial (7 dias)</option>
              <option value="ACTIVE">Ativa</option>
              <option value="PENDING">Pendente</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Criando...' : 'Criar Assinatura'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Assinaturas;