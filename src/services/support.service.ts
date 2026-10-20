// Service for SuperAdmin Support Chat / broadcast / canais oficiais
import { getAccessToken } from '@/api/tokenStorage'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3090').replace(/\/api\/?$/, '')

class SupportService {
    private getHeaders(isFormData = false): HeadersInit {
        const token = getAccessToken()
        const headers: Record<string, string> = {}
        if (!isFormData) headers['Content-Type'] = 'application/json'
        // Storage isolado do superadmin: unna_sa_access_token (não "token" do front legado)
        if (token) headers['Authorization'] = `Bearer ${token}`
        return headers
    }

    private async request<T = any>(path: string, options: RequestInit = {}, isFormData = false): Promise<T> {
        const normalized = path.replace(/^\//, '')
        const response = await fetch(`${API_BASE_URL}/${normalized}`, {
            ...options,
            headers: { ...this.getHeaders(isFormData), ...((options.headers as Record<string, string>) || {}) },
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error((data as any).error || (data as any).message || 'Request failed')
        return data as T
    }

    // ─── Session ───────────────────────────────────────────────
    getSessionStatus() {
        return this.request('support/session/status');
    }

    activateSession() {
        return this.request('support/session/activate', { method: 'POST' });
    }

    deactivateSession() {
        return this.request('support/session/deactivate', { method: 'POST' });
    }

    recreateSession() {
        return this.request('support/session/recreate', { method: 'POST' });
    }

    // ─── Chats ─────────────────────────────────────────────────
    getChats() {
        return this.request<{ success: boolean; chats: any[] }>('support/chats');
    }

    getChatMessages(chatId: string, limit = 50) {
        const encoded = encodeURIComponent(chatId);
        return this.request<{ success: boolean; messages: any[] }>(`support/chats/${encoded}/messages?limit=${limit}`);
    }

    sendMessage(chatId: string, text: string) {
        const encoded = encodeURIComponent(chatId);
        return this.request(`support/chats/${encoded}/send`, {
            method: 'POST',
            body: JSON.stringify({ text }),
        });
    }

    sendImage(chatId: string, file: File, caption?: string) {
        const encoded = encodeURIComponent(chatId);
        const formData = new FormData();
        formData.append('file', file);
        if (caption) formData.append('caption', caption);

        return this.request(`support/chats/${encoded}/send-image`, {
            method: 'POST',
            body: formData,
        }, true);
    }

    getMediaUrl(filename: string) {
        return `${API_BASE_URL}/support/media/${filename}`;
    }

    // ─── Assignment ────────────────────────────────────────────
    assignChat(chatId: string, attendant: string) {
        const encoded = encodeURIComponent(chatId);
        return this.request(`support/chats/${encoded}/assign`, {
            method: 'POST',
            body: JSON.stringify({ attendant }),
        });
    }

    getAssignments() {
        return this.request<{ success: boolean; assignments: Record<string, string> }>('support/assignments');
    }

    getAttendants() {
        return this.request<{ success: boolean; attendants: string[] }>('support/attendants');
    }

    // ─── WebSocket ─────────────────────────────────────────────
    connectWebSocket(onMessage: (data: any) => void, onStatus?: (data: any) => void): WebSocket | null {
        try {
            const wsUrl = API_BASE_URL.replace(/^http/, 'ws');
            const ws = new WebSocket(`${wsUrl}/ws?uuid=suporte-unna`);

            ws.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);
                    if (parsed.type === 'message' && onMessage) {
                        onMessage(parsed.data);
                    } else if (parsed.type === 'status' && onStatus) {
                        onStatus(parsed.data);
                    }
                } catch (e) {
                    console.error('WS parse error:', e);
                }
            };

            ws.onerror = (e) => console.error('WS error:', e);
            ws.onclose = () => console.log('WS closed');

            return ws;
        } catch (e) {
            console.error('WS connect error:', e);
            return null;
        }
    }

    // ─── Official Channels ─────────────────────────────────────────
    getOfficialChannels() {
        return this.request<{ success: boolean; channels: any[] }>('whatsapp/official/channels');
    }

    sendOfficialMessage(channelId: string, to: string, text: string) {
        return this.request(`whatsapp/official/channels/${channelId}/send`, {
            method: 'POST',
            body: JSON.stringify({ to, text }),
        });
    }

    createOfficialChannel(data: any) {
        return this.request('whatsapp/official/channels', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    updateOfficialChannel(id: string, data: any) {
        return this.request(`whatsapp/official/channels/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    deleteOfficialChannel(id: string) {
        return this.request(`whatsapp/official/channels/${id}`, {
            method: 'DELETE',
        });
    }

    // ─── Broadcast / Notificação em Massa ─────────────────────────

    getBroadcastRecipients(params?: {
        page?: number;
        limit?: number;
        search?: string;
        subscriptionStatus?: string;
        periodoDias?: number;
    }) {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.search) queryParams.append('search', params.search);
        if (params?.subscriptionStatus && params.subscriptionStatus !== 'all') {
            queryParams.append('subscriptionStatus', params.subscriptionStatus);
        }
        if (params?.periodoDias) queryParams.append('periodoDias', params.periodoDias.toString());
        const qs = queryParams.toString();
        return this.request<{
            data: {
                id: string;
                nome: string;
                telefone: string;
                empresaId: string;
                nomeEmpresa: string;
                assinaturaStatus: string | null;
                assinaturaFim: string | null;
                planoNome: string | null;
            }[];
            total: number;
            pages: number;
            page: number;
        }>(`super-admin/broadcast-recipients${qs ? `?${qs}` : ''}`);
    }

    sendBroadcast(recipients: { id?: string; phone: string; nome?: string; nomeEmpresa?: string }[], text: string) {
        return this.request<{
            success: boolean;
            notificacaoId: string;
            total: number;
            message: string;
            error?: string;
        }>('support/broadcast', {
            method: 'POST',
            body: JSON.stringify({ recipients, text }),
        });
    }

    getBroadcastStatus(id: string) {
        return this.request<{
            success: boolean;
            notificacao: {
                id: string;
                mensagem: string;
                total: number;
                enviados: number;
                falhas: number;
                status: string;
                createdAt: string;
                destinatarios: {
                    id: string;
                    telefone: string;
                    nomeDestinatario: string | null;
                    nomeEmpresa: string | null;
                    status: string;
                    erro: string | null;
                    enviadoEm: string | null;
                }[];
            };
        }>(`support/broadcast/${id}/status`);
    }

    cancelBroadcast(id: string) {
        return this.request<{ success: boolean; message?: string; error?: string }>(
            `support/broadcast/${id}/cancel`,
            { method: 'POST' },
        );
    }

    getNotificacoesMassa(params?: { page?: number; limit?: number }) {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        const qs = queryParams.toString();
        return this.request<{
            data: any[];
            total: number;
            pages: number;
            page: number;
        }>(`super-admin/notificacoes-massa${qs ? `?${qs}` : ''}`);
    }
}

export const supportService = new SupportService();
