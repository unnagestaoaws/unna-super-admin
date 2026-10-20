import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    MessageSquare,
    Send,
    Search,
    Loader2,
    Wifi,
    WifiOff,
    QrCode,
    RotateCcw,
    CheckCircle2,
    XCircle,
    Users,
    CheckSquare,
    Square,
    AlertCircle,
    History,
    RefreshCw,
    Info,
    HelpCircle
} from 'lucide-react';
import { supportService } from '@/services/support.service';
import { toast } from 'sonner';

type SessionStatus = 'not_found' | 'disconnected' | 'connecting' | 'qr_ready' | 'connected';

interface Recipient {
    id: string;
    nome: string;
    telefone: string;
    empresaId: string;
    nomeEmpresa: string;
    assinaturaStatus: string | null;
    assinaturaFim: string | null;
    planoNome: string | null;
}

// Expirada/cancelada: o período (fim do último período pago) só vale para esses status.
const STATUS_COM_PERIODO = ['EXPIRED', 'CANCELLED'];

interface NotificationHistoryItem {
    id: string;
    mensagem: string;
    total: number;
    enviados: number;
    falhas: number;
    status: string;
    createdAt: string;
}

export default function NotificacaoMassa() {
    // Session state
    const [sessionStatus, setSessionStatus] = useState<SessionStatus>('not_found');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [phoneInfo, setPhoneInfo] = useState<{ id: string; name?: string } | null>(null);
    const [sessionLoading, setSessionLoading] = useState(false);
    const [recreatingSession, setRecreatingSession] = useState(false);

    // Recipients state
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
    const [loadingRecipients, setLoadingRecipients] = useState(false);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [subFilter, setSubFilter] = useState('all');
    const [periodoDias, setPeriodoDias] = useState('60');

    // Message Composition
    const [messageText, setMessageText] = useState('');
    const [previewRecipient, setPreviewRecipient] = useState<Recipient | null>(null);

    // Active Broadcast state
    const [activeBroadcastId, setActiveBroadcastId] = useState<string | null>(null);
    const [broadcastStatus, setBroadcastStatus] = useState<any>(null);
    const [sendingBroadcast, setSendingBroadcast] = useState(false);

    // History state
    const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [viewingHistoryItem, setViewingHistoryItem] = useState<any>(null);

    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const broadcastPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ─── Session Management ────────────────────────────────────
    const checkSession = useCallback(async () => {
        try {
            const result = await supportService.getSessionStatus();
            const st = result.status?.status || 'not_found';
            setSessionStatus(st as SessionStatus);
            setQrCode(result.status?.qr || null);
            setPhoneInfo(result.status?.user || null);
            return st;
        } catch {
            setSessionStatus('not_found');
            return 'not_found';
        }
    }, []);

    const activateSession = useCallback(async () => {
        setSessionLoading(true);
        try {
            const result = await supportService.activateSession();
            const st = (result.status?.status || 'connecting') as SessionStatus;
            setSessionStatus(st);
            setQrCode(result.status?.qr || null);
            setPhoneInfo(result.status?.user || null);

            if (st !== 'connected') {
                if (pollingRef.current) clearInterval(pollingRef.current);
                pollingRef.current = setInterval(async () => {
                    const s = await checkSession();
                    if (s === 'connected') {
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        pollingRef.current = null;
                        toast.success('Sessão de suporte conectada!');
                    }
                }, 4000);
            } else {
                toast.success('Sessão de suporte conectada!');
            }
        } catch (error: any) {
            toast.error('Erro ao conectar sessão');
            console.error(error);
        } finally {
            setSessionLoading(false);
        }
    }, [checkSession]);

    const recreateSession = useCallback(async () => {
        setRecreatingSession(true);
        try {
            const result = await supportService.recreateSession();
            const st = (result.status?.status || 'connecting') as SessionStatus;
            setSessionStatus(st);
            setQrCode(result.status?.qr || null);
            setPhoneInfo(result.status?.user || null);

            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = setInterval(async () => {
                const s = await checkSession();
                if (s === 'connected') {
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    pollingRef.current = null;
                    toast.success('Sessão recriada com sucesso!');
                }
            }, 4000);
            toast.info('Nova sessão iniciada. Escaneie o QR Code.');
        } catch (error) {
            toast.error('Erro ao recriar sessão');
            console.error(error);
        } finally {
            setRecreatingSession(false);
        }
    }, [checkSession]);

    // ─── Fetch Data ────────────────────────────────────────────
    const fetchRecipients = useCallback(async () => {
        setLoadingRecipients(true);
        try {
            const res = await supportService.getBroadcastRecipients({
                limit: 5000,
                search: searchQuery || undefined,
                subscriptionStatus: subFilter !== 'all' ? subFilter : undefined,
                periodoDias:
                    STATUS_COM_PERIODO.includes(subFilter) && periodoDias !== 'all'
                        ? Number(periodoDias)
                        : undefined,
            });
            setRecipients(res.data || []);
            if (res.data?.length > 0 && !previewRecipient) {
                setPreviewRecipient(res.data[0]);
            }
        } catch (error) {
            toast.error('Erro ao carregar destinatários');
            console.error(error);
        } finally {
            setLoadingRecipients(false);
        }
    }, [searchQuery, subFilter, periodoDias, previewRecipient]);

    const fetchHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const res = await supportService.getNotificacoesMassa();
            setHistory(res.data || []);
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        checkSession();
        fetchRecipients();
        fetchHistory();

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (broadcastPollRef.current) clearInterval(broadcastPollRef.current);
        };
    }, []);

    useEffect(() => {
        fetchRecipients();
    }, [searchQuery, subFilter, periodoDias]);

    // ─── Selection Helpers ─────────────────────────────────────
    const toggleSelectRecipient = (recipient: Recipient) => {
        setSelectedRecipients((prev) => {
            const exists = prev.some((r) => r.id === recipient.id);
            if (exists) {
                return prev.filter((r) => r.id !== recipient.id);
            }
            return [...prev, recipient];
        });
    };

    const toggleSelectAll = () => {
        if (selectedRecipients.length === recipients.length) {
            setSelectedRecipients([]);
        } else {
            setSelectedRecipients([...recipients]);
        }
    };

    // ─── Preview replacement ───────────────────────────────────
    const getPreviewText = () => {
        if (!messageText) return 'Sua mensagem aparecerá aqui...';
        if (!previewRecipient) return messageText;
        return messageText
            .replace(/{nome_admin}/g, previewRecipient.nome)
            .replace(/{nome_empresa}/g, previewRecipient.nomeEmpresa || 'sua empresa');
    };

    // ─── Broadcast Send & Monitoring ───────────────────────────
    const handleSendBroadcast = async () => {
        if (sessionStatus !== 'connected') {
            toast.error('WhatsApp desconectado! Por favor conecte o WhatsApp primeiro.');
            return;
        }
        if (selectedRecipients.length === 0) {
            toast.error('Selecione pelo menos um destinatário.');
            return;
        }
        if (!messageText.trim()) {
            toast.error('Digite a mensagem.');
            return;
        }

        setSendingBroadcast(true);
        try {
            const payload = selectedRecipients.map((r) => ({
                id: r.id,
                phone: r.telefone,
                nome: r.nome,
                nomeEmpresa: r.nomeEmpresa,
            }));

            const res = await supportService.sendBroadcast(payload, messageText);
            if (res.success && res.notificacaoId) {
                toast.success('Envio enfileirado! Os disparos ocorrem aos poucos, dentro da janela segura (08h–20h).');
                setActiveBroadcastId(res.notificacaoId);
                setSelectedRecipients([]);
                // O envio agora é espalhado ao longo do dia: apenas monitoramos o progresso.
                pollBroadcastStatus(res.notificacaoId);
            } else {
                toast.error(res.error || 'Erro ao iniciar envio');
            }
        } catch (error) {
            toast.error('Erro ao enviar broadcast');
            console.error(error);
        } finally {
            // Não bloqueia o botão: o lote roda em background pelo dispatcher.
            setSendingBroadcast(false);
        }
    };

    const handleCancelBroadcast = async (id: string) => {
        try {
            const res = await supportService.cancelBroadcast(id);
            if (res.success) {
                toast.success(res.message || 'Envio cancelado.');
                if (broadcastPollRef.current) clearInterval(broadcastPollRef.current);
                fetchHistory();
                const status = await supportService.getBroadcastStatus(id);
                if (status.success) setBroadcastStatus(status.notificacao);
            } else {
                toast.error(res.error || 'Não foi possível cancelar.');
            }
        } catch (error) {
            toast.error('Erro ao cancelar envio');
            console.error(error);
        }
    };

    const pollBroadcastStatus = (id: string) => {
        if (broadcastPollRef.current) clearInterval(broadcastPollRef.current);

        broadcastPollRef.current = setInterval(async () => {
            try {
                const res = await supportService.getBroadcastStatus(id);
                if (res.success && res.notificacao) {
                    setBroadcastStatus(res.notificacao);
                    if (['concluido', 'falha', 'cancelado'].includes(res.notificacao.status)) {
                        if (broadcastPollRef.current) clearInterval(broadcastPollRef.current);
                        if (res.notificacao.status === 'concluido') {
                            toast.success('Envio de notificações concluído!');
                        }
                        fetchHistory();
                    }
                }
            } catch (error) {
                console.error('Erro ao monitorar envio:', error);
            }
        }, 5000);
    };

    const viewHistoryDetails = async (id: string) => {
        try {
            const res = await supportService.getBroadcastStatus(id);
            if (res.success) {
                setViewingHistoryItem(res.notificacao);
            }
        } catch (error) {
            toast.error('Erro ao buscar detalhes do histórico');
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                        <MessageSquare className="w-7 h-7 text-green-600" />
                        Notificação em Massa (WhatsApp)
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Envie mensagens customizadas aos administradores das empresas utilizando a sessão WAHA ativa.
                    </p>
                </div>

                {/* Session connection status badge */}
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold dark:text-gray-300">Status Sessão:</span>
                    {sessionStatus === 'connected' ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-full text-xs font-semibold">
                            <Wifi className="w-3.5 h-3.5" /> Conectado ({phoneInfo?.name || 'suporte'})
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-semibold">
                            <WifiOff className="w-3.5 h-3.5" /> Desconectado
                        </div>
                    )}
                </div>
            </div>

            {/* Session connection panel if not connected */}
            {sessionStatus !== 'connected' && (
                <div className="m-6 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-gray-500" />
                        <h2 className="font-bold text-gray-800 dark:text-white">Conexão WhatsApp (Sessão suporte-unna)</h2>
                    </div>
                    <SessionPanel
                        status={sessionStatus}
                        qrCode={qrCode}
                        phoneInfo={phoneInfo}
                        loading={sessionLoading}
                        onActivate={activateSession}
                        onRecreate={recreateSession}
                        recreating={recreatingSession}
                    />
                </div>
            )}

            {/* Layout Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 p-6 flex-1 items-start">
                
                {/* LEFT PANEL: Recipients list (5 cols) */}
                <div className="xl:col-span-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col h-[650px]">
                    {/* Panel header filters */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-green-600" />
                                Destinatários ({recipients.length})
                            </h2>
                            <button
                                onClick={toggleSelectAll}
                                className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 font-bold transition-colors"
                            >
                                {selectedRecipients.length === recipients.length && recipients.length > 0 ? 'Deselecionar todos' : 'Selecionar todos'}
                            </button>
                        </div>

                        {/* Search & Filter */}
                        <div className="flex flex-col gap-2">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar por nome, telefone ou empresa..."
                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-1 focus:ring-green-500 focus:outline-none"
                                />
                            </div>
                            
                            <select
                                value={subFilter}
                                onChange={(e) => setSubFilter(e.target.value)}
                                className="w-full py-1.5 px-3 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white focus:outline-none"
                            >
                                <option value="all">Todas as Assinaturas</option>
                                <option value="ACTIVE">Ativas (ACTIVE)</option>
                                <option value="TRIAL">Testando (TRIAL)</option>
                                <option value="CANCELLED">Canceladas (CANCELLED)</option>
                                <option value="EXPIRED">Expiradas (EXPIRED)</option>
                                <option value="none">Sem Assinatura</option>
                            </select>

                            {STATUS_COM_PERIODO.includes(subFilter) && (
                                <select
                                    value={periodoDias}
                                    onChange={(e) => setPeriodoDias(e.target.value)}
                                    className="w-full py-1.5 px-3 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white focus:outline-none"
                                >
                                    <option value="30">Período pago terminou nos últimos 30 dias</option>
                                    <option value="60">Período pago terminou nos últimos 60 dias</option>
                                    <option value="90">Período pago terminou nos últimos 90 dias</option>
                                    <option value="120">Período pago terminou nos últimos 120 dias</option>
                                    <option value="180">Período pago terminou nos últimos 180 dias</option>
                                    <option value="all">Qualquer data</option>
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Recipients scrollable area */}
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                        {loadingRecipients ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                            </div>
                        ) : recipients.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                Nenhum administrador com telefone encontrado.
                            </div>
                        ) : (
                            recipients.map((rec) => {
                                const isSelected = selectedRecipients.some((r) => r.id === rec.id);
                                return (
                                    <div
                                        key={rec.id}
                                        onClick={() => toggleSelectRecipient(rec)}
                                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                                            isSelected 
                                                ? 'bg-green-50/55 dark:bg-green-950/20' 
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="text-gray-400 hover:text-green-600 transition-colors">
                                                {isSelected ? (
                                                    <CheckSquare className="w-5 h-5 text-green-600" />
                                                ) : (
                                                    <Square className="w-5 h-5" />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{rec.nome}</h4>
                                                <p className="text-xs text-gray-500">{rec.telefone}</p>
                                                <span className="inline-block mt-0.5 text-[10px] bg-gray-150 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                                                    {rec.nomeEmpresa || 'Sem empresa'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Status Tag */}
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                rec.assinaturaStatus === 'ACTIVE'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400'
                                                    : rec.assinaturaStatus === 'TRIAL'
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                                            }`}>
                                                {rec.assinaturaStatus || 'Sem assinatura'}
                                            </span>
                                            {rec.assinaturaFim && STATUS_COM_PERIODO.includes(rec.assinaturaStatus || '') && (
                                                <span className="text-[10px] text-gray-500">
                                                    até {new Date(rec.assinaturaFim).toLocaleDateString('pt-BR')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Panel footer summary */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-300">
                        <span>{selectedRecipients.length} de {recipients.length} selecionados</span>
                        <span>Sem limite de lote</span>
                    </div>
                </div>

                {/* RIGHT PANEL: Message composer & preview (7 cols) */}
                <div className="xl:col-span-7 flex flex-col gap-6">
                    
                    {/* Message composer */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                                <Send className="w-4 h-4 text-green-600" />
                                Escrever Mensagem
                            </h2>
                            <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                <Info className="w-3.5 h-3.5" />
                                Variáveis: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-red-500">{`{nome_admin}`}</code>, <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-red-500">{`{nome_empresa}`}</code>
                            </div>
                        </div>

                        <textarea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder="Olá {nome_admin}, notamos que o plano de {nome_empresa} precisa de atenção..."
                            rows={6}
                            disabled={sendingBroadcast}
                            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-1 focus:ring-green-500 focus:outline-none resize-none"
                        />

                        {/* Live Preview section */}
                        {previewRecipient && (
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-950 rounded-lg border border-dashed border-gray-200 dark:border-gray-850">
                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    Visualização Prévia (Simulada para {previewRecipient.nome}):
                                </h4>
                                <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-mono">
                                    {getPreviewText()}
                                </div>
                            </div>
                        )}

                        {/* Send Action */}
                        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="text-xs text-gray-500 flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                                Envio ilimitado: os disparos são espalhados aos poucos (janela 08h–20h, ~4/min) para não bloquear o número.
                            </div>
                            <button
                                onClick={handleSendBroadcast}
                                disabled={sendingBroadcast || selectedRecipients.length === 0 || !messageText.trim()}
                                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {sendingBroadcast ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Enviar para {selectedRecipients.length} destinatários
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Progress Monitor if sending or active broadcast is running */}
                    {(sendingBroadcast || broadcastStatus) && (
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-850 dark:text-white flex items-center gap-2">
                                    <RefreshCw className={`w-4 h-4 text-green-600 ${broadcastStatus?.status === 'enviando' ? 'animate-spin' : ''}`} />
                                    Progresso de Envio Ativo
                                </h3>
                                {broadcastStatus?.status === 'enviando' && activeBroadcastId && (
                                    <button
                                        onClick={() => handleCancelBroadcast(activeBroadcastId)}
                                        className="px-3 py-1.5 text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 dark:border-red-900 rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                        <XCircle className="w-3.5 h-3.5" /> Cancelar envio
                                    </button>
                                )}
                            </div>

                            {broadcastStatus && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-gray-500">
                                            Status: <strong className="uppercase">{broadcastStatus.status}</strong>
                                        </span>
                                        <span className="text-xs text-gray-500 font-bold">
                                            {broadcastStatus.enviados + broadcastStatus.falhas} de {broadcastStatus.total} concluídos
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 mb-6 overflow-hidden">
                                        <div
                                            className="bg-green-600 h-2.5 rounded-full transition-all duration-500"
                                            style={{
                                                width: `${((broadcastStatus.enviados + broadcastStatus.falhas) / broadcastStatus.total) * 100}%`
                                            }}
                                        />
                                    </div>

                                    {/* Sub-counters */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-green-50/50 dark:bg-green-950/10 rounded-lg flex items-center justify-between border border-green-100/50 dark:border-green-900/20">
                                            <span className="text-xs text-green-700 dark:text-green-400 font-semibold flex items-center gap-1.5">
                                                <CheckCircle2 className="w-4 h-4" /> Sucessos
                                            </span>
                                            <span className="text-lg font-bold text-green-700 dark:text-green-400">{broadcastStatus.enviados}</span>
                                        </div>

                                        <div className="p-3 bg-red-50/50 dark:bg-red-950/10 rounded-lg flex items-center justify-between border border-red-100/50 dark:border-red-900/20">
                                            <span className="text-xs text-red-700 dark:text-red-400 font-semibold flex items-center gap-1.5">
                                                <XCircle className="w-4 h-4" /> Falhas
                                            </span>
                                            <span className="text-lg font-bold text-red-700 dark:text-red-400">{broadcastStatus.falhas}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            {/* Notification History list (horizontal split at bottom) */}
            <div className="m-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
                    <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-gray-500" />
                        Histórico de Notificações
                    </h2>
                    <button
                        onClick={fetchHistory}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                        title="Atualizar histórico"
                    >
                        <RefreshCw className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    {loadingHistory ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                        </div>
                    ) : history.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            Nenhuma notificação enviada anteriormente.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-900/50">
                                    <th className="p-3">Data</th>
                                    <th className="p-3">Mensagem</th>
                                    <th className="p-3">Destinatários</th>
                                    <th className="p-3">Sucessos</th>
                                    <th className="p-3">Falhas</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-sm dark:text-gray-200">
                                {history.map((h) => (
                                    <tr key={h.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-800/20">
                                        <td className="p-3 whitespace-nowrap text-xs text-gray-500">
                                            {new Date(h.createdAt).toLocaleString('pt-BR')}
                                        </td>
                                        <td className="p-3 max-w-xs truncate font-mono text-xs">{h.mensagem}</td>
                                        <td className="p-3 font-semibold">{h.total}</td>
                                        <td className="p-3 text-green-600 font-semibold">{h.enviados}</td>
                                        <td className="p-3 text-red-600 font-semibold">{h.falhas}</td>
                                        <td className="p-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                h.status === 'concluido'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400'
                                                    : h.status === 'enviando'
                                                    ? 'bg-yellow-100 text-yellow-850 dark:bg-yellow-950 dark:text-yellow-450'
                                                    : 'bg-gray-100 text-gray-850 dark:bg-gray-850 dark:text-gray-400'
                                            }`}>
                                                {h.status}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => viewHistoryDetails(h.id)}
                                                    className="text-xs text-green-650 hover:underline dark:text-green-400 font-semibold"
                                                >
                                                    Ver Detalhes
                                                </button>
                                                {h.status === 'enviando' && (
                                                    <button
                                                        onClick={() => handleCancelBroadcast(h.id)}
                                                        className="text-xs text-red-600 hover:underline dark:text-red-400 font-semibold"
                                                    >
                                                        Cancelar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal for detailed log viewer */}
            {viewingHistoryItem && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-850 w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
                            <div>
                                <h3 className="font-bold text-gray-850 dark:text-white">Detalhes do Envio</h3>
                                <p className="text-xs text-gray-500">ID: {viewingHistoryItem.id}</p>
                            </div>
                            <button
                                onClick={() => setViewingHistoryItem(null)}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors text-gray-500"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Mensagem Enviada:</h4>
                                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-950 rounded text-sm text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap">
                                    {viewingHistoryItem.mensagem}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Fila de Destinatários:</h4>
                                <div className="border border-gray-250 dark:border-gray-800 rounded-lg overflow-hidden divide-y divide-gray-150 dark:divide-gray-800 text-xs">
                                    {viewingHistoryItem.destinatarios?.map((dest: any) => (
                                        <div key={dest.id} className="p-3 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/10">
                                            <div>
                                                <span className="font-semibold text-gray-850 dark:text-white">
                                                    {dest.nomeDestinatario || 'Admin'} ({dest.nomeEmpresa || 'Sem Empresa'})
                                                </span>
                                                <p className="text-[11px] text-gray-500">{dest.telefone}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {dest.status === 'enviado' ? (
                                                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Enviado
                                                    </span>
                                                ) : dest.status === 'falha' ? (
                                                    <div className="text-right">
                                                        <span className="flex items-center gap-1 justify-end text-red-650 dark:text-red-400 font-semibold">
                                                            <XCircle className="w-3.5 h-3.5" /> Falha
                                                        </span>
                                                        {dest.erro && (
                                                            <span className="text-[10px] text-gray-400 block max-w-xs truncate">{dest.erro}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500">Pendente</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Inline Reusable Session Panel from SuporteChat ─────────────────
function SessionPanel({
    status,
    qrCode,
    phoneInfo,
    loading,
    onActivate,
    onRecreate,
    recreating,
}: {
    status: SessionStatus;
    qrCode: string | null;
    phoneInfo: { id: string; name?: string } | null;
    loading: boolean;
    onActivate: () => void;
    onRecreate: () => void;
    recreating: boolean;
}) {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900/30">
            {status === 'not_found' || status === 'disconnected' ? (
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-green-650" />
                    </div>
                    <h3 className="text-lg font-bold mb-1 dark:text-white">WhatsApp Sessão Desconectada</h3>
                    <p className="text-gray-500 text-sm mb-6">
                        Você precisa conectar ou iniciar a sessão do WhatsApp antes de realizar disparos em massa.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                            onClick={onActivate}
                            disabled={loading || recreating}
                            className="px-6 py-2.5 bg-green-650 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                            {loading ? 'Conectando...' : 'Iniciar / Conectar Sessão'}
                        </button>
                        <button
                            onClick={onRecreate}
                            disabled={loading || recreating}
                            className="px-6 py-2.5 border border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {recreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                            {recreating ? 'Recriando...' : 'Recriar Canal'}
                        </button>
                    </div>
                </div>
            ) : status === 'connecting' ? (
                <div className="text-center py-6">
                    <Loader2 className="w-10 h-10 animate-spin text-green-650 mx-auto mb-3" />
                    <h4 className="font-bold dark:text-white">Preparando conexão...</h4>
                    <p className="text-gray-500 text-xs mt-1">Isso pode levar até 1 minuto.</p>
                </div>
            ) : status === 'qr_ready' ? (
                <div className="text-center max-w-sm">
                    <h3 className="text-lg font-bold mb-2 dark:text-white">Escaneie o Código QR</h3>
                    <p className="text-xs text-gray-500 mb-4">
                        Abra o WhatsApp no seu celular → Dispositivos conectados → Escanear código QR.
                    </p>
                    {qrCode ? (
                        <div className="bg-white p-4 rounded-xl shadow-md inline-block mb-2 border border-gray-150">
                            <img src={qrCode} alt="QR Code" className="w-64 h-64 object-contain mx-auto" />
                        </div>
                    ) : (
                        <div className="w-64 h-64 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-300">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}
