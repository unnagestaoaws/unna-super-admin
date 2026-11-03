import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  X, 
  Building2, 
  FileText, 
  Settings,
  Globe, 
  Clock, 
  Bell, 
  ChevronRight,
  Palette, 
  Share2, 
  Info, 
  Layout,
  CalendarDays,
  Calendar,
  Coffee,
  Zap,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  DollarSign,
  Users
} from 'lucide-react';
import { empresaService, Empresa, CreateEmpresaData } from '@/services/empresa.service';
import { colaboradorService, Colaborador } from '@/services/colaborador.service';
import { planoService, Plano } from '@/services/plano.service';
import { formatCurrencyDynamic } from '@/utils/currencyUtils';
import { assinaturaService, CreateAssinaturaData } from '@/services/assinatura.service';
import { commonDDIs, extractPhoneAndDDI } from '@/constants/phone';
import { masks } from '@/hooks/useMask';
import MaskedInput from '@/components/ui/MaskedInput';
import { cn } from '@/lib/utils';

interface EmpresaModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresa?: Empresa;
  onSuccess: () => void;
}

const EmpresaModal: React.FC<EmpresaModalProps> = ({ isOpen, onClose, empresa, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [activeTab, setActiveTab] = useState<'geral' | 'config' | 'horarios'>('geral');
  const [copied, setCopied] = useState(false);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loadingColaboradores, setLoadingColaboradores] = useState(false);

  const [formData, setFormData] = useState<CreateEmpresaData>({
    nome_negocio: '', 
    email: '',
    telefone: '',
    endereco: '',
    cnpj: '',
    slug: '',
    configuracoes: {}
  });
  const [ddiValue, setDdiValue] = useState('55');

  const [assinaturaData, setAssinaturaData] = useState<CreateAssinaturaData>({
    empresaId: '',
    planoId: '',
    status: 'TRIAL'
  });

  useEffect(() => {
    if (isOpen) {
      loadPlanos();
      if (empresa) {
        const { ddi, phone } = extractPhoneAndDDI(empresa.telefone || '');
        setDdiValue(ddi);
        setFormData({
          nome_negocio: empresa.nome_negocio,
          email: empresa.email || '',
          telefone: phone,
          endereco: typeof empresa.endereco === 'string' ? empresa.endereco : (empresa.endereco?.logradouro || ''),
          cnpj: empresa.cnpj || '',
          slug: empresa.slug || '',
          configuracoes: empresa.configuracoes || {}
        });
        setActiveTab('geral');
        loadColaboradores(empresa.id);
      } else {
        resetForm();
      }
    }
  }, [isOpen, empresa]);

  const loadColaboradores = async (empresaId: string) => {
    setColaboradores([]);
    setLoadingColaboradores(true);
    try {
      const lista = await colaboradorService.getColaboradoresSuperadmin(empresaId, 'todos');
      setColaboradores(lista || []);
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
    } finally {
      setLoadingColaboradores(false);
    }
  };

  const loadPlanos = async () => {
    try {
      const planosData = await planoService.getPlanos();
      setPlanos(planosData.filter(plano => plano.ativo));
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      nome_negocio: '',
      email: '',
      telefone: '',
      endereco: '',
      cnpj: '',
      slug: '',
      configuracoes: {}
    });
    setDdiValue('55');
    setAssinaturaData({
      empresaId: '',
      planoId: '',
      status: 'TRIAL'
    });
    setActiveTab('geral');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const finalFormData = {
        ...formData,
        telefone: ddiValue + formData.telefone
      };

      if (empresa) {
        await empresaService.updateEmpresa(empresa.id, finalFormData);
      } else {
        const novaEmpresa = await empresaService.createEmpresa(finalFormData);
        if (assinaturaData.planoId) {
          await assinaturaService.createAssinatura({
            ...assinaturaData,
            empresaId: novaEmpresa.id
          });
        }
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar empresa:', error);
      setError(error.response?.data?.message || 'Erro ao salvar empresa. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateEmpresaData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConfigChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      configuracoes: {
        ...prev.configuracoes,
        [key]: value
      }
    }));
  };

  const handleHorarioChange = (dia: string, field: 'inicio' | 'fim', value: string) => {
    const currentHorarios = formData.configuracoes?.horario_funcionamento || {};
    const diaConfig = currentHorarios[dia] || { inicio: null, fim: null };
    
    handleConfigChange('horario_funcionamento', {
      ...currentHorarios,
      [dia]: { ...diaConfig, [field]: value || null }
    });
  };

  const handleAssinaturaChange = (field: keyof CreateAssinaturaData, value: string) => {
    setAssinaturaData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  const diasSemana = [
    { key: 'segunda', label: 'Segunda-feira' },
    { key: 'terca', label: 'Terça-feira' },
    { key: 'quarta', label: 'Quarta-feira' },
    { key: 'quinta', label: 'Quinta-feira' },
    { key: 'sexta', label: 'Sexta-feira' },
    { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <CardTitle className="text-lg font-bold">
            {empresa ? `Empresa: ${empresa.nome_negocio}` : 'Nova Empresa'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-100 rounded-full h-8 w-8 p-0">
            <X className="w-5 h-5 text-gray-400" />
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {empresa && (
            <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-xl mb-8">
              <button
                type="button"
                onClick={() => setActiveTab('geral')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all",
                  activeTab === 'geral' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-500 hover:text-gray-700 font-bold"
                )}
              >
                <Building2 size={14} />
                Dados
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('config')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all",
                  activeTab === 'config' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-500 hover:text-gray-700 font-bold"
                )}
              >
                <Settings size={14} />
                Sistema
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('horarios')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all",
                  activeTab === 'horarios' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-500 hover:text-gray-700 font-bold"
                )}
              >
                <CalendarDays size={14} />
                Horários
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 pb-2">
            {activeTab === 'geral' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nome do Negócio</label>
                    <Input
                      value={formData.nome_negocio}
                      onChange={(e) => handleInputChange('nome_negocio', e.target.value)}
                      placeholder="Nome do salão"
                      required
                      className="h-10 text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">E-mail</label>
                    <Input
                      value={formData.email}
                      type="email"
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="contato@empresa.com"
                      className="h-10 text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">CNPJ</label>
                    <Input
                      value={formData.cnpj}
                      onChange={(e) => handleInputChange('cnpj', e.target.value)}
                      placeholder="00.000.000/0000-00"
                      className="h-10 text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Telefone Principal</label>
                  <div className="flex items-center gap-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-10 focus-within:ring-2 focus-within:ring-primary shadow-sm">
                    <div className="relative h-full flex items-center border-r">
                      <select
                        value={ddiValue}
                        onChange={(e) => setDdiValue(e.target.value)}
                        className="appearance-none bg-transparent h-full pl-3 pr-7 text-xs font-black outline-none cursor-pointer"
                      >
                        {commonDDIs.map(ddi => (
                          <option key={ddi.code} value={ddi.code}>{ddi.flag} +{ddi.code}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 rotate-90 pointer-events-none" />
                    </div>
                    <MaskedInput
                      value={formData.telefone}
                      onChange={(val) => handleInputChange('telefone', val)}
                      mask={ddiValue === '55' ? masks.phone.mask : (val: string) => val}
                      unmask={masks.phone.unmask}
                      maxLength={20}
                      placeholder="Telefone"
                      className="border-none focus:ring-0 h-full bg-transparent p-3 font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Endereço Completo</label>
                  <Input
                    value={typeof formData.endereco === 'string' ? formData.endereco : (formData.endereco?.logradouro || '')}
                    onChange={(e) => handleInputChange('endereco', e.target.value)}
                    placeholder="Rua, número, bairro..."
                    className="h-10 text-sm font-bold"
                  />
                </div>

                {empresa && (
                  <div className="space-y-3 pt-4 border-t border-dashed">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                      <Users size={14} className="text-primary" />
                      Profissionais
                      {!loadingColaboradores && <span className="text-gray-400">({colaboradores.length})</span>}
                    </div>
                    {loadingColaboradores ? (
                      <p className="text-xs text-gray-400 px-1">Carregando profissionais...</p>
                    ) : colaboradores.length === 0 ? (
                      <p className="text-xs text-gray-400 px-1">Nenhum profissional cadastrado.</p>
                    ) : (
                      <ul className="border rounded-xl divide-y overflow-hidden">
                        {colaboradores.map((c) => (
                          <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-gray-800 truncate">{c.nome}</p>
                              <p className="text-[11px] text-gray-500 truncate">{c.email || 'Sem e-mail'}</p>
                            </div>
                            {c.email && (
                              <button
                                type="button"
                                title="Copiar e-mail"
                                onClick={() => navigator.clipboard.writeText(c.email!)}
                                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5"
                              >
                                <Copy size={12} />
                              </button>
                            )}
                            <span className={cn(
                              "shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                              c.status === 'ativo' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                            )}>
                              {c.status === 'ativo' ? 'Ativo' : c.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {!empresa && (
                   <div className="space-y-4 pt-4 border-t border-dashed">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                        <FileText size={14} className="text-primary" />
                        Plano de Assinatura
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select
                          value={assinaturaData.planoId}
                          onChange={(e) => handleAssinaturaChange('planoId', e.target.value)}
                          className="w-full h-10 px-3 border border-gray-200 rounded-xl bg-gray-50 text-[11px] font-black uppercase tracking-wider"
                        >
                          <option value="">Selecione um plano</option>
                          {planos.map(p => <option key={p.id} value={p.id}>{p.nome} - {formatCurrencyDynamic(p.preco_mensal)}</option>)}
                        </select>
                        <select
                          value={assinaturaData.status}
                          onChange={(e) => handleAssinaturaChange('status', e.target.value)}
                          className="w-full h-10 px-3 border border-gray-200 rounded-xl bg-gray-50 text-[11px] font-black uppercase tracking-wider"
                        >
                          <option value="TRIAL">Início em Trial</option>
                          <option value="ACTIVE">Início Pago</option>
                        </select>
                      </div>
                   </div>
                )}
              </div>
            )}

            {activeTab === 'config' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Identidade Visual */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 tracking-widest bg-gray-50 p-2 rounded-lg">
                    <Palette size={12} className="text-primary" />
                    Identidade e Presença Web
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase ml-1">Slug da URL (Site)</label>
                      <div className="flex items-center group">
                        <span className="h-10 px-3 bg-gray-100 border border-r-0 rounded-l-lg text-[10px] font-bold text-gray-500 flex items-center">sites.unna.app.br/</span>
                        <Input 
                          value={formData.slug || ''}
                          onChange={(e) => handleInputChange('slug', e.target.value)}
                          placeholder="meu-salao"
                          className="h-10 text-xs font-bold rounded-l-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase ml-1">Cor Primária (HEX)</label>
                      <div className="flex gap-2">
                         <Input 
                           value={formData.configuracoes?.cor_primaria || '#3b82f6'}
                           onChange={(e) => handleConfigChange('cor_primaria', e.target.value)}
                           placeholder="#000000"
                           className="h-10 text-xs font-bold uppercase"
                         />
                         <div 
                           className="w-10 h-10 rounded-lg border flex-shrink-0" 
                           style={{ backgroundColor: formData.configuracoes?.cor_primaria || '#3b82f6' }}
                         />
                      </div>
                    </div>
                  </div>
                  
                  {/* Link Público de Agendamento */}
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                        <Globe size={12} className="text-primary" />
                        Link Público de Agendamento
                      </div>
                      {formData.slug && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[9px] font-black uppercase text-primary hover:bg-primary/10"
                          onClick={() => window.open(`https://painel.unna.app.br/${formData.slug}/agendar`, '_blank')}
                        >
                          <ExternalLink size={10} className="mr-1" />
                          Abrir Site
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex-1 truncate text-xs font-mono text-gray-500 font-bold px-1">
                        painel.unna.app.br/{formData.slug || 'seu-slug'}/agendar
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-3 rounded-lg text-[9px] font-black uppercase transition-all",
                          copied ? "text-green-600 bg-green-50" : "text-gray-400 hover:text-primary hover:bg-primary/5"
                        )}
                        onClick={() => {
                          const url = `https://painel.unna.app.br/${formData.slug}/agendar`;
                          navigator.clipboard.writeText(url);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                      >
                        {copied ? (
                          <>
                            <Check size={12} className="mr-1" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy size={12} className="mr-1" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm flex items-center justify-between">
                        <div className="flex flex-col">
                           <span className="text-xs font-bold">Portal Site Ativo</span>
                           <span className="text-[10px] text-gray-400">Exibir página pública</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={formData.configuracoes?.site_ativo ?? true}
                          onChange={(e) => handleConfigChange('site_ativo', e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-primary"
                        />
                     </div>
                     <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm flex items-center justify-between">
                        <div className="flex flex-col">
                           <span className="text-xs font-bold">Exibir Preços</span>
                           <span className="text-[10px] text-gray-400">Mostrar valores no site</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={formData.configuracoes?.exibir_precos_site ?? true}
                          onChange={(e) => handleConfigChange('exibir_precos_site', e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-primary"
                        />
                     </div>
                  </div>
                </div>

                {/* Comportamento e Regras */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 tracking-widest bg-gray-50 p-2 rounded-lg">
                    <Clock size={12} className="text-primary" />
                    Regras de Atendimento
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase ml-1">Intervalo Padrão (Minutos)</label>
                      <select
                        value={formData.configuracoes?.intervalo_agendamento || 30}
                        onChange={(e) => handleConfigChange('intervalo_agendamento', parseInt(e.target.value))}
                        className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-xs font-bold shadow-sm"
                      >
                        {[15, 30, 45, 60, 90, 120].map(v => <option key={v} value={v}>{v} minutos</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase ml-1">Fuso Horário</label>
                      <select
                        value={formData.configuracoes?.timezone || 'America/Sao_Paulo'}
                        onChange={(e) => handleConfigChange('timezone', e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-xs font-bold shadow-sm"
                      >
                        <option value="America/Sao_Paulo">Brasília (BSB)</option>
                        <option value="America/Cuiaba">Cuiabá (MT)</option>
                        <option value="America/Manaus">Manaus (AM)</option>
                        <option value="America/Fortaleza">Fortaleza (CE)</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                     <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl flex items-center justify-between">
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-primary">Agendamento Online</span>
                           <span className="text-[10px] text-primary/60">Abrir agenda para web</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={formData.configuracoes?.agendamento_online_ativo ?? true}
                          onChange={(e) => handleConfigChange('agendamento_online_ativo', e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-primary"
                        />
                     </div>
                     <div className="p-3 bg-green-50 border border-green-100 rounded-xl flex items-center justify-between">
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-green-700">Notificações Wpp</span>
                           <span className="text-[10px] text-green-600/60">Lembretes automáticos</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={formData.configuracoes?.lembrete_whatsapp ?? true}
                          onChange={(e) => handleConfigChange('lembrete_whatsapp', e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-green-600"
                        />
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between group transition-all hover:bg-indigo-100/50">
                        <div className="flex items-center gap-2">
                           <Zap size={16} className="text-indigo-600" />
                           <div className="flex flex-col">
                              <span className="text-xs font-bold text-indigo-700">Modo Inteligente</span>
                              <span className="text-[10px] text-indigo-600/60 text-[8px]">Otimização de lacunas</span>
                           </div>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={formData.configuracoes?.modo_inteligente ?? false}
                          onChange={(e) => handleConfigChange('modo_inteligente', e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-indigo-600"
                        />
                     </div>

                     <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between group transition-all hover:bg-emerald-100/50">
                        <div className="flex items-center gap-2">
                           <ShieldCheck size={16} className="text-emerald-600" />
                           <div className="flex flex-col">
                              <span className="text-xs font-bold text-emerald-700">Autoconfirmação</span>
                              <span className="text-[10px] text-emerald-600/60 text-[8px]">Aprovar sem manual</span>
                           </div>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={formData.configuracoes?.confirmacao_automatica ?? false}
                          onChange={(e) => handleConfigChange('confirmacao_automatica', e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-emerald-600"
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between group transition-all hover:bg-amber-100/50">
                       <div className="flex items-center gap-2">
                           <Bell size={16} className="text-amber-600" />
                           <div className="flex flex-col">
                             <span className="text-xs font-bold text-amber-700">Notificar MEU WhatsApp</span>
                             <span className="text-[10px] text-amber-600/60">Avisos de agendamentos online</span>
                           </div>
                       </div>
                       <input 
                         type="checkbox" 
                         checked={formData.configuracoes?.notificar_proprietario ?? false}
                         onChange={(e) => handleConfigChange('notificar_proprietario', e.target.checked)}
                         className="w-5 h-5 rounded border-gray-300 text-amber-600"
                       />
                     </div>

                     <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-between group transition-all hover:bg-purple-100/50">
                       <div className="flex items-center gap-2">
                           <Calendar size={16} className="text-purple-600" />
                           <div className="flex flex-col">
                             <span className="text-xs font-bold text-purple-700">Aceitar Lista de Espera</span>
                             <span className="text-[10px] text-purple-600/60">Colocar clientes em fila</span>
                           </div>
                       </div>
                       <input 
                         type="checkbox" 
                         checked={formData.configuracoes?.aceitar_lista_espera ?? true}
                         onChange={(e) => handleConfigChange('aceitar_lista_espera', e.target.checked)}
                         className="w-5 h-5 rounded border-gray-300 text-purple-600"
                       />
                     </div>
                  </div>
                </div>

                {/* Regras Financeiras */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 tracking-widest bg-gray-50 p-2 rounded-lg">
                    <DollarSign size={12} className="text-primary" />
                    Regras Financeiras e Comissões
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-3">
                      <span className="text-[10px] font-black uppercase text-gray-400">Taxas da Maquininha (%)</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-500">Débito</label>
                          <input 
                            type="number"
                            step="0.01"
                            value={formData.configuracoes?.taxas_maquina?.debito || 0}
                            onChange={(e) => handleConfigChange('taxas_maquina', { ...formData.configuracoes?.taxas_maquina, debito: parseFloat(e.target.value) })}
                            className="w-full h-8 px-2 border rounded text-xs font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-500">Crédito</label>
                          <input 
                            type="number"
                            step="0.01"
                            value={formData.configuracoes?.taxas_maquina?.credito || 0}
                            onChange={(e) => handleConfigChange('taxas_maquina', { ...formData.configuracoes?.taxas_maquina, credito: parseFloat(e.target.value) })}
                            className="w-full h-8 px-2 border rounded text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2">
                      <span className="text-[10px] font-black uppercase text-gray-400">Desconto de Taxas</span>
                      <select
                        value={formData.configuracoes?.desconto_comissao?.tipo || 'nao_descontar'}
                        onChange={(e) => handleConfigChange('desconto_comissao', { ...formData.configuracoes?.desconto_comissao, tipo: e.target.value })}
                        className="w-full h-8 px-2 border rounded-lg text-xs font-bold"
                      >
                        <option value="nao_descontar">Não descontar taxas</option>
                        <option value="taxa_maquina">Descontar taxa da máquina</option>
                        <option value="outras_taxas">Taxas personalizadas</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Comissão sobre Débitos</label>
                      <select
                        value={formData.configuracoes?.comissao_sobre_debito || 'pagar_sempre'}
                        onChange={(e) => handleConfigChange('comissao_sobre_debito', e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                      >
                        <option value="pagar_sempre">Pagar comissão normalmente</option>
                        <option value="bloquear_comissao">Bloquear até o pagamento</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Comissão de Pacotes</label>
                      <select
                        value={formData.configuracoes?.comissao_pacotes || 'na_venda'}
                        onChange={(e) => handleConfigChange('comissao_pacotes', e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                      >
                        <option value="nenhuma">Nenhuma (Não paga comissão)</option>
                        <option value="na_venda">Pagar total na venda</option>
                        <option value="no_consumo">Pagar por sessão realizada</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'horarios' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300 pb-4">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
                  <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                    Aqui você define o horário que o estabelecimento está disponível para receber agendamentos. 
                    Deixe os campos vazios para dias em que o local está **fechado**.
                  </p>
                </div>

                <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                   <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50 border-b text-[10px] font-black uppercase text-gray-400 tracking-widest">
                          <th className="px-5 py-3">Dia da Semana</th>
                          <th className="px-5 py-3">Abertura</th>
                          <th className="px-5 py-3">Fechamento</th>
                          <th className="px-5 py-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {diasSemana.map((dia) => {
                          const config = formData.configuracoes?.horario_funcionamento?.[dia.key] || { inicio: null, fim: null };
                          const isClosed = !config.inicio || !config.fim;
                          
                          return (
                            <tr key={dia.key} className="group hover:bg-gray-50/50 transition-colors">
                              <td className="px-5 py-4 text-xs font-bold text-gray-700">{dia.label}</td>
                              <td className="px-5 py-4">
                                <input 
                                  type="time" 
                                  value={config.inicio || ''} 
                                  onChange={(e) => handleHorarioChange(dia.key, 'inicio', e.target.value)}
                                  className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-1 focus:ring-primary w-24 h-8"
                                />
                              </td>
                              <td className="px-5 py-4">
                                <input 
                                  type="time" 
                                  value={config.fim || ''} 
                                  onChange={(e) => handleHorarioChange(dia.key, 'fim', e.target.value)}
                                  className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-1 focus:ring-primary w-24 h-8"
                                />
                              </td>
                              <td className="px-5 py-4 text-right">
                                {isClosed ? (
                                   <span className="flex items-center justify-end gap-1.5 text-[9px] font-black uppercase text-red-400">
                                      <Coffee size={10} />
                                      FECHADO
                                   </span>
                                ) : (
                                   <span className="flex items-center justify-end gap-1.5 text-[9px] font-black uppercase text-green-500">
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                      ABERTO
                                   </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                   </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="ghost" onClick={onClose} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="px-10 h-10 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                {loading ? 'Processando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmpresaModal;