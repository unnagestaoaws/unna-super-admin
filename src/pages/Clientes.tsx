import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Users,
  Search,
  Building2,
  Mail,
  Phone,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Trash2,
  AlertTriangle,
  RefreshCw,
  MoreVertical,
  X
} from 'lucide-react';
import { superAdminService } from '@/services/super-admin.service';
import { empresaService, Empresa } from '@/services/empresa.service';
import { toast } from 'sonner';
import { formatCurrencyDynamic } from '@/utils/currencyUtils';
import { Combobox } from '@/components/ui/combobox';
import ClientePerfilSuperAdminModal from './ClientePerfilSuperAdminModal';

interface Cliente {
  id: string;
  nome: string;
  sobrenome?: string;
  email?: string;
  telefone: string;
  data_nascimento?: string;
  status: string;
  createdAt: string;
  metrics?: {
    visitas: number;
    total_ticket: number;
    avg_ticket: number;
  };
}

const Clientes = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // States para deleção
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState('');
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [viewingClienteId, setViewingClienteId] = useState<string | null>(null);

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    try {
      setLoadingEmpresas(true);
      setEmpresas(await empresaService.getTodasEmpresas());
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      toast.error('Não foi possível carregar a lista de empresas.');
    } finally {
      setLoadingEmpresas(false);
    }
  };

  useEffect(() => {
    if (selectedEmpresaId) {
      fetchClientes();
    } else {
      setClientes([]);
      setTotalItems(0);
    }
  }, [selectedEmpresaId, page]);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const response = await superAdminService.getClientes({
        empresaId: selectedEmpresaId,
        page,
        limit: 15,
        search: searchTerm
      });
      setClientes(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalItems(response.pagination.total);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao buscar clientes da empresa selecionada.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIndividual = async (id: string, nome: string) => {
    if (!window.confirm(`Deseja realmente excluir o cliente "${nome}"? Esta ação não pode ser desfeita.`)) return;

    try {
      setDeletingId(id);
      await superAdminService.removeCliente(id);
      toast.success('Cliente removido com sucesso');
      fetchClientes();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover cliente');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    const selectedEmpresa = empresas.find(e => e.id === selectedEmpresaId);
    if (!selectedEmpresa) return;

    try {
      setIsBulkDeleting(true);
      const result = await superAdminService.bulkRemoveClientes(selectedEmpresaId);
      toast.success('Base de clientes limpa com sucesso');
      setShowBulkDeleteModal(false);
      setBulkDeleteConfirmation('');
      setPage(1);
      fetchClientes();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao limpar base de clientes');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleViewProfile = (id: string) => {
    setViewingClienteId(id);
    setIsProfileModalOpen(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchClientes();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700">Ativo</span>;
      case 'inativo':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-700">Inativo</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-700">{status}</span>;
    }
  };



  const selectedEmpresa = empresas.find(e => e.id === selectedEmpresaId);

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="text-primary" />
            Explorar Clientes
          </h1>
          <p className="text-sm text-gray-500">Gestão centralizada de clientes por empresa</p>
        </div>
        
        {selectedEmpresaId && totalItems > 0 && (
          <Button 
            variant="outline" 
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 gap-2 font-bold"
            onClick={() => setShowBulkDeleteModal(true)}
          >
            <Trash2 size={16} />
            Limpar Base da Empresa
          </Button>
        )}
      </div>

      <Card className="border-none shadow-sm bg-white overflow-visible">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Selecionar Empresa</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 z-10 pointer-events-none" />
                <Combobox
                  options={empresas.map((empresa) => ({
                    value: empresa.id,
                    label: `${empresa.nome_negocio} (${empresa.id.substring(0, 8)})`
                  }))}
                  value={selectedEmpresaId}
                  onChange={(val) => {
                    setSelectedEmpresaId(val);
                    setPage(1);
                  }}
                  placeholder="Selecione uma empresa..."
                  emptyText="Nenhuma empresa encontrada."
                  className="w-full h-11 bg-gray-50 border-gray-200 text-gray-900 text-sm rounded-xl pl-10 pr-4 hover:bg-gray-100 transition-colors"
                  disabled={loadingEmpresas}
                />
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              <form onSubmit={handleSearch}>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Buscar na Lista</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Nome, email ou telefone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-11 border-gray-200 rounded-xl"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={!selectedEmpresaId || loading}
                    className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold"
                  >
                    Buscar
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedEmpresaId ? (
        <div className="bg-gray-50/50 border border-dashed border-gray-200 rounded-3xl p-20 text-center">
            <div className="w-16 h-16 bg-white shadow-sm rounded-2xl flex items-center justify-center text-gray-300 mx-auto mb-4">
                <Building2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Aguardando seleção</h3>
            <p className="text-gray-500 max-w-sm mx-auto text-sm">Selecione uma empresa acima para visualizar e gerenciar sua base de clientes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <Users size={16} className="text-primary" />
                Clientes de <span className="text-primary">{selectedEmpresa?.nome_negocio}</span>
                <span className="mx-2 text-gray-300">•</span>
                <span className="text-gray-400 font-medium normal-case">
                    {totalItems} no total
                </span>
            </h2>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1 || loading}
                    className="rounded-lg h-8 w-8 p-0"
                >
                    <ChevronLeft size={14} />
                </Button>
                <div className="bg-white border rounded-lg px-3 h-8 flex items-center shadow-sm">
                    <span className="text-[11px] font-bold text-gray-600">
                        {page} / {totalPages}
                    </span>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages || loading}
                    className="rounded-lg h-8 w-8 p-0"
                >
                    <ChevronRight size={14} />
                </Button>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 w-8 p-0 rounded-lg"
                onClick={fetchClientes}
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Contatos</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-center">Métricas</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cadastro</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clientes.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-blue-50/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                            <Users size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              {cliente.nome} {cliente.sobrenome}
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono select-all">ID: {cliente.id.substring(0, 13)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Phone size={12} className="text-gray-400" />
                            <span>{cliente.telefone}</span>
                          </div>
                          {cliente.email && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 max-w-[180px] truncate">
                              <Mail size={12} className="text-gray-400" />
                              <span className="truncate">{cliente.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {cliente.metrics ? (
                          <div className="inline-flex items-center gap-4 px-3 py-1 bg-gray-50 rounded-lg">
                            <div className="text-center">
                                <span className="block text-[9px] font-bold text-gray-400 uppercase">Visitas</span>
                                <span className="text-xs font-bold text-gray-700">{cliente.metrics.visitas}</span>
                            </div>
                            <div className="w-px h-4 bg-gray-200" />
                            <div className="text-center">
                                <span className="block text-[9px] font-bold text-gray-400 uppercase">Total</span>
                                <span className="text-xs font-bold text-primary">{formatCurrencyDynamic(cliente.metrics.total_ticket)}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <CalendarIcon size={12} className="text-gray-400" />
                          <span>{new Date(cliente.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(cliente.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/5 rounded-lg"
                            onClick={() => handleViewProfile(cliente.id)}
                            title="Ver Histórico e Perfil"
                          >
                            <ExternalLink size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                            onClick={() => handleDeleteIndividual(cliente.id, `${cliente.nome} ${cliente.sobrenome}`)}
                            disabled={deletingId === cliente.id}
                            title="Remover Cliente"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {!loading && clientes.length === 0 && (
                <div className="text-center py-20">
                  <Users size={40} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-gray-400 text-sm">Nenhum cliente encontrado para os critérios informados.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Bulk Delete */}
      {showBulkDeleteModal && selectedEmpresa && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                        <AlertTriangle size={24} />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowBulkDeleteModal(false)} className="h-8 w-8 p-0">
                        <X size={20} />
                    </Button>
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-2">Limpeza de Base Crítica</h2>
                <p className="text-sm text-gray-500 mb-6">
                    Você está prestes a remover <strong>TODOS</strong> os clientes de <span className="text-gray-900 font-bold">{selectedEmpresa.nome_negocio}</span>. Esta ação é irreversível e afetará métricas e históricos.
                </p>

                <div className="bg-gray-50 p-4 rounded-xl mb-6">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">
                        Para confirmar, digite: <span className="text-red-600 select-none">{selectedEmpresa.nome_negocio.toUpperCase()}</span>
                    </label>
                    <Input
                        value={bulkDeleteConfirmation}
                        onChange={(e) => setBulkDeleteConfirmation(e.target.value.toUpperCase())}
                        placeholder="Nome da empresa"
                        className="bg-white border-red-100 focus:border-red-500 uppercase font-bold text-center"
                    />
                </div>

                <div className="flex gap-3">
                    <Button
                        className="flex-1"
                        variant="ghost"
                        onClick={() => setShowBulkDeleteModal(false)}
                        disabled={isBulkDeleting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
                        onClick={handleBulkDelete}
                        disabled={isBulkDeleting || bulkDeleteConfirmation.trim().toUpperCase() !== selectedEmpresa.nome_negocio.trim().toUpperCase()}
                    >
                        {isBulkDeleting ? 'Limpando...' : 'Confirmar Limpeza'}
                    </Button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Perfil e Histórico */}
      {viewingClienteId && (
        <ClientePerfilSuperAdminModal
          clienteId={viewingClienteId}
          isOpen={isProfileModalOpen}
          onClose={() => {
            setIsProfileModalOpen(false);
            setViewingClienteId(null);
          }}
        />
      )}
    </div>
  );
};

export default Clientes;
