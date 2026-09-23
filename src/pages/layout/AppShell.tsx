import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { filterNavForUser, findGroupForPath, type NavGroup, type NavItem } from '@/config/navigation'
import { NavIcon } from '@/components/NavIcon'
import { Button } from '@/components/Button'
import { ThemeToggle } from '@/components/ThemeToggle'

function linkClass(active: boolean) {
  return clsx(
    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
    active
      ? 'bg-teal-hover-bg text-teal-main'
      : 'text-text-muted hover:bg-teal-hover-bg hover:text-text-main',
  )
}

function SidebarNav({
  top,
  groups,
  abertos,
  onToggleGroup,
  onNavigate,
  email,
  onLogout,
  brand,
}: {
  top: NavItem[]
  groups: NavGroup[]
  abertos: string[]
  onToggleGroup: (id: string) => void
  onNavigate?: () => void
  email?: string
  onLogout: () => void
  brand: string
}) {
  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-teal-border px-4 lg:h-16 lg:px-5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-teal-main text-xs font-bold text-primary-foreground">
          SA
        </div>
        <span className="truncate font-semibold tracking-wide">{brand}</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4">
        {top.map((item) => (
          <NavLink
            key={item.key}
            to={item.to}
            end={item.to === '/dashboard' || item.to === '/sdr'}
            onClick={onNavigate}
            className={({ isActive }) => linkClass(isActive)}
          >
            <NavIcon name={item.icon} className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}

        {groups.map((group) => {
          const aberto = abertos.includes(group.id)
          return (
            <div key={group.id} className="pt-2">
              <button
                type="button"
                onClick={() => onToggleGroup(group.id)}
                aria-expanded={aberto}
                aria-controls={`nav-grupo-${group.id}`}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-text-faint transition-colors hover:bg-teal-hover-bg hover:text-text-muted"
              >
                <NavIcon
                  name="chevron"
                  className={clsx(
                    'h-3 w-3 shrink-0 transition-transform duration-200',
                    aberto && 'rotate-90',
                  )}
                />
                <span className="truncate text-left">{group.label}</span>
                {!aberto && (
                  <span className="ml-auto shrink-0 text-[10px] font-semibold text-text-faint/70">
                    {group.items.length}
                  </span>
                )}
              </button>
              {aberto && (
                <div id={`nav-grupo-${group.id}`} className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.key}
                      to={item.to}
                      onClick={onNavigate}
                      className={({ isActive }) => clsx(linkClass(isActive), 'pl-8')}
                    >
                      <NavIcon name={item.icon} className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-teal-border p-3">
        <div className="mb-2 truncate px-2 text-xs text-text-muted">{email}</div>
        <Button variant="ghost" className="w-full justify-start" onClick={onLogout}>
          <NavIcon name="logout" className="h-4 w-4 shrink-0" />
          Sair
        </Button>
      </div>
    </>
  )
}

const MOBILE_QUICK: { to: string; label: string; icon: string; match?: (path: string) => boolean }[] = [
  {
    to: '/dashboard',
    label: 'Home',
    icon: 'grid',
    match: (p) => p === '/' || p === '/dashboard',
  },
  {
    to: '/empresas',
    label: 'Empresas',
    icon: 'building',
    match: (p) => p.startsWith('/empresas'),
  },
  {
    to: '/usuarios',
    label: 'Usuários',
    icon: 'users',
    match: (p) => p.startsWith('/usuarios'),
  },
]

const CHAVE_NAV_ABERTOS = 'unna_sa_nav_abertos'

function lerGruposAbertos(): string[] {
  try {
    const bruto = localStorage.getItem(CHAVE_NAV_ABERTOS)
    const valor = bruto ? JSON.parse(bruto) : null
    return Array.isArray(valor) ? valor.filter((id): id is string => typeof id === 'string') : []
  } catch {
    // Storage bloqueado ou conteúdo corrompido: começa tudo fechado.
    return []
  }
}

export function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [gruposAbertos, setGruposAbertos] = useState<string[]>(lerGruposAbertos)

  const isLimited = user?.is_limited === true
  const { top, groups } = filterNavForUser(isLimited)
  const brand = isLimited ? 'Painel SDR' : 'Unna Admin'

  const grupoAtivo = findGroupForPath(groups, location.pathname)

  // O grupo da rota atual abre sozinho — ninguém deve cair numa tela cujo
  // menu está fechado. O que o usuário abriu à mão continua aberto.
  useEffect(() => {
    if (!grupoAtivo) return
    setGruposAbertos((atuais) => (atuais.includes(grupoAtivo) ? atuais : [...atuais, grupoAtivo]))
  }, [grupoAtivo])

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_NAV_ABERTOS, JSON.stringify(gruposAbertos))
    } catch {
      // Sem storage o acordeão ainda funciona, só não lembra entre sessões.
    }
  }, [gruposAbertos])

  const alternarGrupo = useCallback((id: string) => {
    setGruposAbertos((atuais) =>
      atuais.includes(id) ? atuais.filter((g) => g !== id) : [...atuais, id],
    )
  }, [])

  const allItems = [...top, ...groups.flatMap((g) => g.items)]
    .sort((a, b) => b.to.length - a.to.length)
  const title =
    allItems.find((item) =>
      item.to === '/dashboard'
        ? location.pathname === '/dashboard' || location.pathname === '/'
        : location.pathname.startsWith(item.to),
    )?.label ?? (isLimited ? 'Painel SDR' : 'Super Admin')

  // Fecha o drawer ao trocar de rota (mobile)
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Trava scroll do body com drawer aberto
  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  // Fecha com Escape
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate('/login')
  }

  const quickItems = isLimited
    ? [
        {
          to: '/sdr',
          label: 'SDR',
          icon: 'activity',
          match: (p: string) => p === '/sdr',
        },
        {
          to: '/sdr/winback/campanhas',
          label: 'Winback',
          icon: 'activity',
          match: (p: string) => p.startsWith('/sdr/winback/campanhas'),
        },
      ]
    : MOBILE_QUICK

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-app-bg font-sans text-sm text-text-main antialiased">
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-teal-border bg-sidebar-bg lg:flex">
        <SidebarNav
          top={top}
          groups={groups}
          abertos={gruposAbertos}
          onToggleGroup={alternarGrupo}
          email={user?.email}
          onLogout={handleLogout}
          brand={brand}
        />
      </aside>

      {/* Mobile drawer */}
      <div
        className={clsx(
          'fixed inset-0 z-50 lg:hidden',
          menuOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          className={clsx(
            'absolute inset-0 bg-black/60 transition-opacity duration-200',
            menuOpen ? 'opacity-100' : 'opacity-0',
          )}
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        />
        <aside
          className={clsx(
            'absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] max-w-full flex-col border-r border-teal-border bg-sidebar-bg shadow-2xl transition-transform duration-200 ease-out',
            menuOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="absolute right-2 top-2 z-10 lg:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded-md p-2 text-text-muted hover:bg-teal-hover-bg hover:text-text-main"
              aria-label="Fechar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <SidebarNav
            top={top}
            groups={groups}
            abertos={gruposAbertos}
            onToggleGroup={alternarGrupo}
            email={user?.email}
            onLogout={handleLogout}
            onNavigate={() => setMenuOpen(false)}
            brand={brand}
          />
        </aside>
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-teal-border bg-sidebar-bg/80 px-3 backdrop-blur-md sm:h-16 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-teal-border text-text-main hover:bg-teal-hover-bg lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="hidden h-6 w-1 shrink-0 rounded-full bg-teal-main sm:block" />
            <h1 className="truncate text-base font-semibold tracking-tight text-text-main sm:text-lg">
              {title}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <div className="hidden flex-col items-end sm:flex">
              <span className="max-w-[10rem] truncate text-xs font-semibold text-text-main lg:max-w-xs">
                {user?.nome || 'Super Admin'}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-text-muted">
                {isLimited ? 'SDR' : 'Acesso Total'}
              </span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-teal-border bg-card-bg text-[10px] font-bold text-teal-main">
              {(user?.nome || user?.email || 'A').slice(0, 1).toUpperCase()}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="hidden rounded-md p-2 text-danger hover:bg-danger/10 sm:inline-flex"
              title="Sair"
            >
              <NavIcon name="logout" className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/*
          min-w-0 é crítico: sem isso o flex item não encolhe e páginas largas
          (grids/tabelas) estouram a viewport e “quebram” o layout sob a sidebar.
        */}
        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-app-bg text-text-main pb-20 lg:pb-0">
          <div className="sa-page mx-auto w-full min-w-0 max-w-full p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>

        {/* Bottom nav — mobile only */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-stretch border-t border-teal-border bg-sidebar-bg/95 backdrop-blur-md lg:hidden">
          {quickItems.map((item) => {
            const active = item.match
              ? item.match(location.pathname)
              : location.pathname.startsWith(item.to)
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                className={clsx(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium',
                  active ? 'text-teal-main' : 'text-text-muted',
                )}
              >
                <NavIcon name={item.icon} className="h-5 w-5" />
                {item.label}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-text-muted"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Mais
          </button>
        </nav>
      </div>
    </div>
  )
}
