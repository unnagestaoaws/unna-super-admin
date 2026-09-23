export interface NavItem {
  key: string
  label: string
  to: string
  icon: string
  limitedOnly?: boolean
  hideWhenLimited?: boolean
}

export interface NavGroup {
  id: string
  label: string
  items: NavItem[]
  hideWhenLimited?: boolean
}

export const NAV_TOP: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard', icon: 'grid', hideWhenLimited: true },
  { key: 'sdr', label: 'Painel SDR', to: '/sdr', icon: 'activity', limitedOnly: true },
  { key: 'sdr-winback-campanhas', label: 'Winback', to: '/sdr/winback/campanhas', icon: 'activity', limitedOnly: true },
]

/**
 * Grupos = seções do acordeão da sidebar. Mantenha cada grupo com no máximo
 * ~5 itens: acima disso o grupo aberto volta a rolar e o acordeão perde a
 * função. Grupo novo é melhor do que grupo grande.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'gestao',
    label: 'Gestão Operacional',
    hideWhenLimited: true,
    items: [
      { key: 'empresas', label: 'Empresas', to: '/empresas', icon: 'building' },
      { key: 'usuarios', label: 'Usuários', to: '/usuarios', icon: 'users' },
      { key: 'clientes', label: 'Clientes', to: '/clientes', icon: 'users' },
      { key: 'afiliados', label: 'Afiliados', to: '/afiliados', icon: 'user-plus' },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    hideWhenLimited: true,
    items: [
      { key: 'planos', label: 'Planos', to: '/planos', icon: 'card' },
      { key: 'assinaturas', label: 'Assinaturas', to: '/assinaturas', icon: 'card' },
      { key: 'reajustes', label: 'Reajuste de preço', to: '/reajustes', icon: 'card' },
      { key: 'subcontas', label: 'Unna Pay (subcontas)', to: '/subcontas', icon: 'card' },
    ],
  },
  {
    id: 'comunicacao',
    label: 'Comunicação & Suporte',
    hideWhenLimited: true,
    items: [
      { key: 'atendimento', label: 'Atendimento', to: '/atendimento', icon: 'activity' },
      { key: 'suporte', label: 'Notificações (WAHA)', to: '/suporte', icon: 'activity' },
      { key: 'campanhas', label: 'Campanhas', to: '/campanhas', icon: 'activity' },
    ],
  },
  {
    id: 'crescimento',
    label: 'Crescimento & Dados',
    hideWhenLimited: true,
    items: [
      { key: 'uso-sistema', label: 'Uso do sistema', to: '/uso-sistema', icon: 'chart' },
      { key: 'relatorios', label: 'Relatórios', to: '/relatorios', icon: 'chart' },
      { key: 'marketing', label: 'Marketing', to: '/marketing', icon: 'activity' },
      { key: 'atribuicao', label: 'Atribuição (Ads)', to: '/atribuicao', icon: 'activity' },
    ],
  },
  {
    id: 'sistema',
    label: 'Configurações & Sistema',
    hideWhenLimited: true,
    items: [
      // { key: 'features', label: 'Features', to: '/feature-management', icon: 'settings' },
      { key: 'monitoramento', label: 'Monitoramento', to: '/monitoramento', icon: 'activity' },
      { key: 'webhooks', label: 'Webhooks', to: '/webhooks', icon: 'activity' },
      { key: 'login-logs', label: 'Logs de login', to: '/login-logs', icon: 'activity' },
      { key: 'solicitacoes-lgpd', label: 'Solicitações LGPD', to: '/solicitacoes-lgpd', icon: 'shield' },
      { key: 'configuracoes', label: 'Configurações', to: '/configuracoes', icon: 'settings' },
    ],
  },
]

/**
 * `hideWhenLimited` = esconder quando o usuário É limited (SDR).
 * Admin completo (`isLimited === false`) vê todos os grupos.
 */
export function filterNavForUser(isLimited: boolean) {
  const top = NAV_TOP.filter((item) => {
    if (isLimited) {
      // SDR: só itens limitedOnly, ou itens sem hideWhenLimited
      return Boolean(item.limitedOnly) || !item.hideWhenLimited
    }
    // Acesso total: esconde itens exclusivos do SDR
    return !item.limitedOnly
  })

  // Acesso total → todos os grupos. Limited → só grupos que não marcam hideWhenLimited.
  const groups = isLimited
    ? NAV_GROUPS.filter((g) => !g.hideWhenLimited)
    : NAV_GROUPS

  return { top, groups }
}

/**
 * Grupo que contém a rota atual — é o que o acordeão abre sozinho, para o
 * usuário nunca cair numa tela cujo menu está fechado.
 */
export function findGroupForPath(groups: NavGroup[], pathname: string): string | null {
  let melhor: { id: string; tamanho: number } | null = null
  for (const group of groups) {
    for (const item of group.items) {
      if (pathname === item.to || pathname.startsWith(`${item.to}/`)) {
        if (!melhor || item.to.length > melhor.tamanho) {
          melhor = { id: group.id, tamanho: item.to.length }
        }
      }
    }
  }
  return melhor?.id ?? null
}
