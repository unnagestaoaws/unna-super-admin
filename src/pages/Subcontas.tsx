import React, { useEffect, useState } from 'react'
import { AlertTriangle, Building2, CheckCircle2, Clock3, Loader2, RefreshCw, Wallet } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import {
  unnaPayAdminService,
  type SubcontaResumo,
} from '@/services/unna-pay.service'

const STATUS_CLASSES: Record<string, string> = {
  solicitado: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  em_analise: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  em_analise_asaas: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  criando_conta: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  ativo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  aprovado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  rejeitado: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  rejeitado_unna: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  rejeitado_asaas: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  desabilitado: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

const formatarData = (data?: string | null) => {
  if (!data) return '-'
  const valor = new Date(data)
  return Number.isNaN(valor.getTime()) ? '-' : valor.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const SINCRONIZAVEL = new Set(['em_analise_asaas', 'aprovado', 'rejeitado_asaas'])

const ETAPAS_ASAAS = [
  ['status_comercial', 'Cadastro'],
  ['status_documentacao', 'Documentos'],
  ['status_conta_bancaria', 'Conta bancária'],
] as const

const SITUACAO_ETAPA: Record<string, string> = {
  PENDING: 'pendente',
  AWAITING_APPROVAL: 'em análise',
  REJECTED: 'recusado',
}

const pendencia = (subconta: SubcontaResumo) => {
  if (subconta.motivo_pendencia) return subconta.motivo_pendencia
  const etapas = ETAPAS_ASAAS
    .filter(([campo]) => subconta[campo] && subconta[campo] !== 'APPROVED')
    .map(([campo, rotulo]) => `${rotulo}: ${SITUACAO_ETAPA[subconta[campo]!] || subconta[campo]}`)
  return etapas.join(' · ') || '-'
}

const nomeEmpresa = (subconta: SubcontaResumo) =>
  subconta.empresa?.nome_negocio || subconta.nome_empresa || 'Empresa não identificada'

const emailEmpresa = (subconta: SubcontaResumo) =>
  subconta.empresa?.email || subconta.email || '-'

export default function Subcontas() {
  const [lista, setLista] = useState<SubcontaResumo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [aprovandoId, setAprovandoId] = useState<string | null>(null)
  const [sincronizandoId, setSincronizandoId] = useState<string | null>(null)

  const carregar = async () => {
    try {
      setCarregando(true)
      setErro(null)
      setLista(await unnaPayAdminService.listar())
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível carregar as solicitações.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const aprovar = async (empresaId: string) => {
    try {
      setAprovandoId(empresaId)
      const atualizada = await unnaPayAdminService.aprovar(empresaId)
      setLista((atuais) => atuais.map((item) => item.empresaId === empresaId ? { ...item, ...atualizada, empresaId } : item))
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível aprovar a solicitação.')
    } finally {
      setAprovandoId(null)
    }
  }

  const sincronizar = async (empresaId: string) => {
    try {
      setSincronizandoId(empresaId)
      setErro(null)
      const atualizada = await unnaPayAdminService.sincronizar(empresaId)
      setLista((atuais) => atuais.map((item) => item.empresaId === empresaId ? { ...item, ...atualizada, empresaId } : item))
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível sincronizar com o Asaas.')
    } finally {
      setSincronizandoId(null)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="w-6 h-6" /> Unna Pay</h1>
          <p className="text-sm text-muted-foreground mt-1">Solicitações de subconta para recebimento online.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={carregar} disabled={carregando} className="gap-2 self-start sm:self-auto">
          <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {erro && <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{erro}</div>}

      <Card className="overflow-hidden py-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Solicitado em</th>
                <th className="px-4 py-3">Atualizado em</th>
                <th className="px-4 py-3">Pendência</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {carregando ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground"><span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Carregando solicitações...</span></td></tr>
              ) : lista.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Nenhuma solicitação encontrada.</td></tr>
              ) : lista.map((subconta) => (
                <tr key={subconta.empresaId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground shrink-0" /><div><p className="font-semibold">{nomeEmpresa(subconta)}</p><p className="text-xs text-muted-foreground">{emailEmpresa(subconta)}</p></div></div></td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_CLASSES[subconta.status] || 'bg-slate-100 text-slate-700'}`}>{subconta.status.replace(/_/g, ' ')}</span></td>
                  <td className="px-4 py-3 text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5" />{formatarData(subconta.solicitado_em || subconta.createdAt)}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{formatarData(subconta.analisado_em || subconta.updatedAt)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs"><span className="line-clamp-2">{pendencia(subconta)}</span></td>
                  <td className="px-4 py-3 text-right">
                    {subconta.status === 'solicitado' && <Button type="button" size="sm" onClick={() => aprovar(subconta.empresaId)} disabled={aprovandoId === subconta.empresaId} className="gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />{aprovandoId === subconta.empresaId ? 'Aprovando...' : 'Aprovar'}</Button>}
                    {SINCRONIZAVEL.has(subconta.status) && <Button type="button" variant="outline" size="sm" onClick={() => sincronizar(subconta.empresaId)} disabled={sincronizandoId === subconta.empresaId} className="gap-1.5"><RefreshCw className={`w-3.5 h-3.5 ${sincronizandoId === subconta.empresaId ? 'animate-spin' : ''}`} />{sincronizandoId === subconta.empresaId ? 'Sincronizando...' : 'Sincronizar'}</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
