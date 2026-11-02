import { useCallback, useEffect, useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import Input from '@/components/ui/Input';
import {
  superAdminService,
  type EmpresaPanorama,
  type OnlineUser,
  type PanoramaAssinaturas,
} from '@/services/super-admin.service';
import RetratoBase from './dashboard/RetratoBase';
import MovimentoPeriodo from './dashboard/MovimentoPeriodo';
import SeriePagantes from './dashboard/SeriePagantes';
import PrecisaDeAcao, { ID_PRECISA_DE_ACAO } from './dashboard/PrecisaDeAcao';
import Aquisicao from './dashboard/Aquisicao';
import ListaEmpresasModal from './dashboard/ListaEmpresasModal';
import UsuariosOnlineModal from './dashboard/UsuariosOnlineModal';

/** Dia de hoje em Brasília, AAAA-MM-DD (o backend interpreta o período em BRT). */
const hojeBrt = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const diasAntes = (dia: string, n: number) =>
  new Date(Date.parse(`${dia}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

/**
 * Dashboard do superadmin: a situação real das assinaturas, decidida pelas datas
 * (backend `panorama-assinaturas`). O período (De/Até) afeta só movimento, série
 * e aquisição; o retrato e a fila de ação são sempre de agora.
 */
const SuperAdminDashboard = () => {
  const [inicio, setInicio] = useState(() => diasAntes(hojeBrt(), 30));
  const [fim, setFim] = useState(hojeBrt);
  const [panorama, setPanorama] = useState<PanoramaAssinaturas | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [lista, setLista] = useState<{ titulo: string; empresas: EmpresaPanorama[] } | null>(null);

  const [online, setOnline] = useState<OnlineUser[]>([]);
  const [onlineAberto, setOnlineAberto] = useState(false);
  const [carregandoOnline, setCarregandoOnline] = useState(false);

  const buscarOnline = useCallback(async () => {
    setCarregandoOnline(true);
    try {
      setOnline(await superAdminService.getOnlineUsers());
    } catch (error) {
      console.error('Erro ao buscar usuários online:', error);
    } finally {
      setCarregandoOnline(false);
    }
  }, []);

  useEffect(() => {
    if (!inicio || !fim || inicio > fim) return;
    let cancelado = false;
    setCarregando(true);
    superAdminService
      .getPanorama(inicio, fim)
      .then((p) => { if (!cancelado) setPanorama(p); })
      // Mantém o último panorama na tela: um erro ao trocar o período não apaga o que já se via.
      .catch(() => { if (!cancelado) toast.error('Erro ao carregar o panorama das assinaturas'); })
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, [inicio, fim]);

  useEffect(() => { buscarOnline(); }, [buscarOnline]);

  const abrirLista = (titulo: string, empresas: EmpresaPanorama[]) => setLista({ titulo, empresas });

  if (!panorama) {
    return (
      <div className="flex items-center justify-center h-screen">
        {carregando
          ? <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          : <p className="text-sm text-gray-500">Não foi possível carregar o panorama das assinaturas.</p>}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      <div className="flex justify-between items-start md:items-center md:flex-row flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Dashboard
            <button
              type="button"
              onClick={() => { setOnlineAberto(true); buscarOnline(); }}
              className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
              title="Usuários ativos nos últimos 5 minutos"
            >
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              {online.length} online
            </button>
          </h1>
          <p className="text-sm text-gray-500">Situação real das assinaturas, pelas datas de vencimento e pagamentos</p>
        </div>
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold uppercase text-gray-400">De</span>
          <Input type="date" value={inicio} max={fim} onChange={(e: any) => setInicio(e.target.value)}
            className="h-9 text-xs py-0 min-w-[140px]" />
          <span className="text-[10px] font-bold uppercase text-gray-400">Até</span>
          <Input type="date" value={fim} min={inicio} max={hojeBrt()} onChange={(e: any) => setFim(e.target.value)}
            className="h-9 text-xs py-0 min-w-[140px]" />
        </div>
      </div>

      <div className={`space-y-6 transition-opacity ${carregando ? 'opacity-60 pointer-events-none' : ''}`}>
        <RetratoBase
          retrato={panorama.retrato}
          empresas={panorama.empresas}
          onAbrirLista={abrirLista}
          onIrParaAcao={() => document.getElementById(ID_PRECISA_DE_ACAO)?.scrollIntoView({ behavior: 'smooth' })}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MovimentoPeriodo movimento={panorama.movimento} empresas={panorama.empresas} onAbrirLista={abrirLista} />
          <SeriePagantes serie={panorama.serie} historicoDesde={panorama.historicoDesde} />
        </div>
        <PrecisaDeAcao empresas={panorama.empresas} onAbrirLista={abrirLista} />
        <Aquisicao aquisicao={panorama.aquisicao} />
      </div>

      <ListaEmpresasModal
        key={lista?.titulo}
        titulo={lista?.titulo ?? ''}
        empresas={lista?.empresas ?? []}
        aberto={!!lista}
        onFechar={() => setLista(null)}
      />
      <UsuariosOnlineModal
        aberto={onlineAberto}
        onFechar={() => setOnlineAberto(false)}
        usuarios={online}
        carregando={carregandoOnline}
      />
    </div>
  );
};

export default SuperAdminDashboard;
