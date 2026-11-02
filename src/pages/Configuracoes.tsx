import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Settings,
  Save,
  Shield,
  CreditCard,
  Mail,
  Database,
  Key,
  Globe,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  Plus,
  Trash2,
  ExternalLink,
  X
} from 'lucide-react';
import { sistemaConfigService } from '@/services/sistema-config.service';
import { whatsappService } from '@/services/whatsapp.service';
import { supportService } from '@/services/support.service';
import { superAdminService } from '@/services/super-admin.service';
import GatewayPagamentoCard from '@/components/superadmin/GatewayPagamentoCard';
import RecebimentoOnlineCard from '@/components/superadmin/RecebimentoOnlineCard';
import TermosAceiteCard from '@/components/superadmin/TermosAceiteCard';
import { toast } from 'sonner';

interface Configuracoes {
  trialDays: number;
  maxFileSize: number;
  email_verification_mode: 'STRICT' | 'FLEXIBLE';
  email_grace_days: number;
  whatsapp_official_enabled: boolean;
  whatsapp_official_otp_template: string;
}

const Configuracoes = () => {
  const [configuracoes, setConfiguracoes] = useState<Configuracoes>({
    trialDays: 14,
    maxFileSize: 5242880,
    email_verification_mode: 'STRICT',
    email_grace_days: 5,
    whatsapp_official_enabled: false,
    whatsapp_official_otp_template: 'otp_login_unna'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');

  // Official Channels State
  const [channels, setChannels] = useState<any[]>([]);
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [selectedChannelForTest, setSelectedChannelForTest] = useState<string | null>(null);
  const [newChannel, setNewChannel] = useState({
    name: '',
    phoneNumberId: '',
    businessId: '',
    accessToken: '',
    verifyToken: 'unna_verify_token'
  });

  useEffect(() => {
    const fetchConfiguracoes = async () => {
      try {
        const data = await sistemaConfigService.getAllConfig() as Record<string, any>;

        // Mapear dados da API para o estado
        setConfiguracoes(prev => {
          const newState = { ...prev };
          Object.keys(data).forEach(key => {
            if (key in newState) {
              const val = data[key]?.valor !== undefined ? data[key].valor : data[key];
              // @ts-ignore
              newState[key] = val;
            }
          });
          return newState;
        });

        // Load Official Channels
        const channelsRes = await supportService.getOfficialChannels();
        if (channelsRes.success) {
          setChannels(channelsRes.channels);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfiguracoes();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(configuracoes).map(([key, value]) =>
        sistemaConfigService.setConfig(key, value)
      );

      await Promise.all(promises);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof Configuracoes, value: any) => {
    setConfiguracoes(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddChannel = async () => {
    if (!newChannel.name || !newChannel.phoneNumberId || !newChannel.accessToken) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      const res = await supportService.createOfficialChannel(newChannel);
      if (res.id) {
        toast.success('Canal adicionado com sucesso!');
        setChannels([...channels, res]);
        setIsAddingChannel(false);
        setNewChannel({
          name: '',
          phoneNumberId: '',
          businessId: '',
          accessToken: '',
          verifyToken: 'unna_verify_token'
        });
      }
    } catch (error) {
      toast.error('Erro ao adicionar canal');
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este canal?')) return;

    try {
      await supportService.deleteOfficialChannel(id);
      setChannels(channels.filter(c => c.id !== id));
      toast.success('Canal removido');
    } catch (error) {
      toast.error('Erro ao remover canal');
    }
  };

  const handleTestOfficialApi = async (channelId?: string) => {
    if (!testPhone) {
      toast.error('Digite um telefone para teste (ex: 5527999999999)');
      return;
    }

    setIsTesting(true);
    try {
      const result = await whatsappService.testOfficialApi(testPhone, configuracoes.whatsapp_official_otp_template, channelId);
      if (result.success) {
        toast.success('Teste enviado com sucesso! Verifique o WhatsApp.');
        setIsTesting(false);
        setSelectedChannelForTest(null);
      } else {
        toast.error(`Erro no teste: ${result.error || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error('Erro ao testar API:', error);
      toast.error(`Erro ao testar API: ${error.message}`);
    } finally {
      setIsTesting(false);
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Configurações do Sistema</h1>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>Recarregar</Button>
            <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
        </div>
      </div>

      {/* Configurações do WhatsApp Oficial */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader className="bg-white dark:bg-gray-800">
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              WhatsApp Business API (Oficial Meta)
            </div>
            <Button size="sm" onClick={() => setIsAddingChannel(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Canal
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div>
                <p className="font-semibold text-sm">Status Global da API</p>
                <p className="text-xs text-gray-500">Habilita/Desabilita uso da Meta no sistema.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={configuracoes.whatsapp_official_enabled}
                  onChange={(e) => handleInputChange('whatsapp_official_enabled', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
              <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Template de OTP (Meta)</label>
              <Input
                placeholder="Ex: otp_login_unna"
                value={configuracoes.whatsapp_official_otp_template}
                onChange={(e) => handleInputChange('whatsapp_official_otp_template', e.target.value)}
              />
              <p className="text-[10px] text-gray-400 mt-1">Nome do template de autenticação aprovado no Manager da Meta.</p>
            </div>
          </div>

          {/* List of Channels */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="py-3 px-2 font-semibold">Nome/Identificador</th>
                  <th className="py-3 px-2 font-semibold">Phone Number ID</th>
                  <th className="py-3 px-2 font-semibold">Status</th>
                  <th className="py-3 px-2 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {channels.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 font-medium">
                      Nenhum canal oficial configurado.
                    </td>
                  </tr>
                ) : (
                  channels.map((channel) => (
                    <tr key={channel.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-2">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{channel.name || 'Sem nome'}</div>
                        <div className="text-[10px] text-gray-400 truncate max-w-[150px] font-mono">{channel.accessToken.substring(0, 15)}...</div>
                      </td>
                      <td className="py-3 px-2 font-mono text-xs">{channel.phoneNumberId}</td>
                      <td className="py-3 px-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Ativo</span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setTestPhone('');
                            setSelectedChannelForTest(channel.id);
                          }} className="h-8 w-8 p-0 hover:bg-blue-50">
                            <ExternalLink className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteChannel(channel.id)} className="h-8 w-8 p-0 hover:bg-red-50">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Test Area */}
          {selectedChannelForTest && (
            <div className="mt-4 p-4 bg-primary/5 border border-primary/10 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-primary">
                  Testar Envio: {channels.find(c => c.id === selectedChannelForTest)?.name}
                </h4>
                <Button variant="ghost" size="sm" onClick={() => setSelectedChannelForTest(null)} className="h-6 w-6 p-0">
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Número (Ex: 5527999999999)" 
                  value={testPhone} 
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="flex-1 bg-white"
                />
                <Button size="sm" onClick={() => handleTestOfficialApi(selectedChannelForTest!)} disabled={isTesting}>
                  {isTesting ? 'Enviando...' : 'Testar Template'}
                </Button>
              </div>
            </div>
          )}

          {/* Add Channel Form */}
          {isAddingChannel && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm">Adicionar Novo Canal Oficial</h4>
                <Button variant="ghost" size="sm" onClick={() => setIsAddingChannel(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Nome do Canal</label>
                  <Input
                    placeholder="Ex: Suporte Unna"
                    value={newChannel.name}
                    onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Phone Number ID</label>
                  <Input
                    placeholder="Ex: 123456789012345"
                    value={newChannel.phoneNumberId}
                    onChange={(e) => setNewChannel({ ...newChannel, phoneNumberId: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Business Account ID</label>
                  <Input
                    placeholder="Ex: 987654321098765"
                    value={newChannel.businessId}
                    onChange={(e) => setNewChannel({ ...newChannel, businessId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Access Token</label>
                  <Input
                    type="password"
                    placeholder="Token da Meta"
                    value={newChannel.accessToken}
                    onChange={(e) => setNewChannel({ ...newChannel, accessToken: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsAddingChannel(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleAddChannel}>Salvar Canal</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verificação de E-mail */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader className="bg-white dark:bg-gray-800">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Políticas de Verificação de E-mail
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Modo de Verificação</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${configuracoes.email_verification_mode === 'STRICT' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-gray-200'}`}
                  onClick={() => handleInputChange('email_verification_mode', 'STRICT')}
                >
                  <div className="flex items-center gap-3">
                    <Shield className={`w-5 h-5 ${configuracoes.email_verification_mode === 'STRICT' ? 'text-primary' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-semibold text-sm">Modo Restrito</p>
                      <p className="text-xs text-gray-500">Bloqueia o login até que o e-mail seja verificado.</p>
                    </div>
                  </div>
                </div>
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${configuracoes.email_verification_mode === 'FLEXIBLE' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-gray-200'}`}
                  onClick={() => handleInputChange('email_verification_mode', 'FLEXIBLE')}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`w-5 h-5 ${configuracoes.email_verification_mode === 'FLEXIBLE' ? 'text-primary' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-semibold text-sm">Modo Flexível</p>
                      <p className="text-xs text-gray-500">Exibe aviso mas permite uso durante carência.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {configuracoes.email_verification_mode === 'FLEXIBLE' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium mb-2">Dias de Carência</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={configuracoes.email_grace_days}
                    onChange={(e) => handleInputChange('email_grace_days', parseInt(e.target.value))}
                    className="w-24 bg-white"
                    min={1}
                  />
                  <span className="text-sm text-gray-500">dias de prazo após o cadastro.</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configurações Gerais do SaaS */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader className="bg-white dark:bg-gray-800">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Configurações Gerais do SaaS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium mb-2">Dias de Teste Grátis (Trial)</label>
              <Input
                type="number"
                value={configuracoes.trialDays}
                onChange={(e) => handleInputChange('trialDays', parseInt(e.target.value))}
                placeholder="14"
                className="bg-white"
              />
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium mb-2">Tamanho Máx. Arquivo (Bytes)</label>
              <Input
                type="number"
                value={configuracoes.maxFileSize}
                onChange={(e) => handleInputChange('maxFileSize', parseInt(e.target.value))}
                placeholder="5242880"
                className="bg-white"
              />
            </div>
          </div>
          
          <div className="p-4 border border-dashed border-gray-200 rounded-lg">
            <p className="text-xs text-center text-gray-400">
              * Nota: Configurações sensíveis (Asaas, Email, Banco de Dados) agora são geridas via Ambiente (.env) por segurança.
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Rollout de pagamento — cada card cuida de um eixo diferente do dinheiro:
          o gateway cobra a mensalidade do salão, o recebimento online é o salão
          cobrando a cliente dele. */}
      <GatewayPagamentoCard />
      <RecebimentoOnlineCard />
      <TermosAceiteCard />

      {/* Manutenção: estava em "Ações rápidas" no dashboard, que agora só mostra métricas. */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader className="bg-white dark:bg-gray-800">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Manutenção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            className="text-xs h-9 text-blue-600 border-blue-100 hover:bg-blue-50"
            variant="outline"
            onClick={async () => {
              try {
                await superAdminService.syncPermissions();
                toast.success('Permissões sincronizadas com sucesso!');
              } catch (error) {
                toast.error('Erro ao sincronizar permissões');
              }
            }}
          >
            <Shield className="w-3.5 h-3.5 mr-2" />
            Sincronizar Permissões
          </Button>
        </CardContent>
      </Card>

      {/* Footer info/links */}
      <div className="flex justify-center text-gray-300 py-4">
        <Globe className="w-4 h-4 opacity-50" />
      </div>
    </div>
  );
};

export default Configuracoes;