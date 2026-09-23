import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AppShell } from '@/pages/layout/AppShell'

import SuperAdminDashboard from '@/pages/SuperAdminDashboard'
import Empresas from '@/pages/Empresas'
import Planos from '@/pages/Planos'
import Assinaturas from '@/pages/Assinaturas'
import Reajustes from '@/pages/Reajustes'
import Usuarios from '@/pages/Usuarios'
import Clientes from '@/pages/Clientes'
import Relatorios from '@/pages/Relatorios'
import Configuracoes from '@/pages/Configuracoes'
import FeatureManagement from '@/pages/FeatureManagement'
import NotificacaoMassa from '@/pages/NotificacaoMassa'
import Webhooks from '@/pages/Webhooks'
import Campanhas from '@/pages/Campanhas'
import AfiliadosSuperAdmin from '@/pages/AfiliadosSuperAdmin'
import WorkerMonitoring from '@/pages/WorkerMonitoring'
import UsoSistema from '@/pages/UsoSistema'
import LoginLogs from '@/pages/LoginLogs'
import Marketing from '@/pages/Marketing'
import Atribuicao from '@/pages/Atribuicao'
import SdrPanel from '@/pages/SdrPanel'
import SdrWinback from '@/pages/SdrWinback'
import SdrCampanhaPanel from '@/pages/sdr/SdrCampanhaPanel'
import Subcontas from '@/pages/Subcontas'
import Atendimento from '@/pages/Atendimento'
import AccountDeletionRequests from '@/pages/AccountDeletionRequests'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <SuperAdminDashboard /> },
          { path: 'empresas', element: <Empresas /> },
          { path: 'planos', element: <Planos /> },
          { path: 'assinaturas', element: <Assinaturas /> },
          { path: 'reajustes', element: <Reajustes /> },
          { path: 'subcontas', element: <Subcontas /> },
          { path: 'usuarios', element: <Usuarios /> },
          { path: 'clientes', element: <Clientes /> },
          { path: 'afiliados', element: <AfiliadosSuperAdmin /> },
          { path: 'relatorios', element: <Relatorios /> },
          { path: 'configuracoes', element: <Configuracoes /> },
          { path: 'solicitacoes-lgpd', element: <AccountDeletionRequests /> },
          { path: 'feature-management', element: <FeatureManagement /> },
          { path: 'suporte', element: <NotificacaoMassa /> },
          { path: 'atendimento', element: <Atendimento /> },
          { path: 'webhooks', element: <Webhooks /> },
          { path: 'login-logs', element: <LoginLogs /> },
          { path: 'campanhas', element: <Campanhas /> },
          { path: 'monitoramento', element: <WorkerMonitoring /> },
          { path: 'uso-sistema', element: <UsoSistema /> },
          { path: 'marketing', element: <Marketing /> },
          { path: 'atribuicao', element: <Atribuicao /> },
          { path: 'sdr', element: <SdrPanel /> },
          { path: 'sdr/winback', element: <SdrWinback /> },
          { path: 'sdr/winback/campanhas', element: <SdrCampanhaPanel /> },
          { path: 'sdr/winback/campanhas/:campanhaId', element: <SdrCampanhaPanel /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
