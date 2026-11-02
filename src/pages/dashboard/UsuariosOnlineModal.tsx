import { Activity, Users } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { OnlineUser } from '@/services/super-admin.service';

interface Props {
  aberto: boolean;
  onFechar(): void;
  usuarios: OnlineUser[];
  carregando: boolean;
}

const PlanoBadge = ({ user }: { user: OnlineUser }) => {
  if (!user.empresa) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-600">—</span>;
  }
  const assinatura = user.empresa.assinatura;
  if (!assinatura) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-700">Sem plano</span>;
  }

  const vencida = !!assinatura.data_fim && new Date(assinatura.data_fim) < new Date();
  const ativa = (assinatura.status === 'ACTIVE' || assinatura.status === 'TRIAL') && !vencida;
  const rotuloStatus: Record<string, string> = {
    ACTIVE: 'Ativo', TRIAL: 'Trial', CANCELLED: 'Cancelado', EXPIRED: 'Expirado', PENDING: 'Pendente',
  };
  const rotulo = vencida ? 'Vencido' : (rotuloStatus[assinatura.status] || assinatura.status);
  const cor = !ativa ? 'bg-red-100 text-red-700'
    : assinatura.status === 'TRIAL' ? 'bg-purple-100 text-purple-700'
    : 'bg-green-100 text-green-700';

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${cor}`}>{rotulo}</span>
      {assinatura.plano?.nome && <span className="text-[10px] text-gray-500">{assinatura.plano.nome}</span>}
    </div>
  );
};

const rotuloPerfil = (role: string) => (role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'ADMIN' ? 'Admin' : 'Funcionário');
const corPerfil = (role: string) =>
  role === 'SUPER_ADMIN' ? 'bg-indigo-100 text-indigo-700' : role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600';

/** Quem interagiu com o sistema nos últimos 5 minutos (atividade no Redis). */
const UsuariosOnlineModal = ({ aberto, onFechar, usuarios, carregando }: Props) => (
  <Modal isOpen={aberto} onClose={onFechar} title="Usuários Online no Momento" size="2xl">
    {carregando ? (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-500 animate-pulse">Buscando atividade...</p>
      </div>
    ) : usuarios.length === 0 ? (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <p className="text-gray-500">Nenhum usuário ativo nos últimos 5 minutos.</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3 text-center">Plano</th>
              <th className="px-4 py-3 text-center">Perfil</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {usuarios.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4">
                  <div className="font-semibold text-gray-900">{user.nome}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </td>
                <td className="px-4 py-4 text-gray-600">{user.empresa?.nome_negocio || 'Administração Unna'}</td>
                <td className="px-4 py-4 text-center"><PlanoBadge user={user} /></td>
                <td className="px-4 py-4 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${corPerfil(user.role)}`}>
                    {rotuloPerfil(user.role)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
          <Activity className="w-5 h-5 text-blue-500 mt-0.5" />
          <p className="text-[11px] text-blue-700 leading-relaxed">
            Mostra quem interagiu com o sistema nos últimos 5 minutos. Após esse período de inatividade,
            o usuário sai da lista automaticamente.
          </p>
        </div>
      </div>
    )}
  </Modal>
);

export default UsuariosOnlineModal;
