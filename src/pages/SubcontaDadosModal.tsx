import React, { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileText, Loader2, XCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import {
  unnaPayAdminService,
  type DadosKyc,
  type SubcontaDetalhe,
  type SubcontaResumo,
} from '@/services/unna-pay.service'

const TIPO_EMPRESA: Record<string, string> = {
  MEI: 'MEI',
  LIMITED: 'Limitada',
  INDIVIDUAL: 'Individual',
  ASSOCIATION: 'Associação',
}

const formatarDocumento = (valor?: string) => {
  const d = (valor || '').replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return valor || '-'
}

const formatarTelefone = (valor?: string) => {
  const d = (valor || '').replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return valor || '-'
}

const formatarCep = (valor?: string) => {
  const d = (valor || '').replace(/\D/g, '')
  return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, '$1-$2') : valor || '-'
}

const formatarNascimento = (valor?: string) => {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor || '')
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : valor || '-'
}

const linhasKyc = (kyc: DadosKyc): Array<[string, string]> => [
  ['Titular', kyc.nome_titular || '-'],
  ['CPF/CNPJ', formatarDocumento(kyc.cpf_cnpj)],
  ['Tipo de empresa', kyc.tipo_empresa ? TIPO_EMPRESA[kyc.tipo_empresa] || kyc.tipo_empresa : '-'],
  ['Data de nascimento', formatarNascimento(kyc.data_nascimento)],
  ['E-mail (login Asaas)', kyc.email || '-'],
  ['Celular', formatarTelefone(kyc.telefone_celular)],
  ['Faturamento mensal', typeof kyc.faturamento_mensal === 'number'
    ? kyc.faturamento_mensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '-'],
  ['Endereço', [kyc.logradouro, kyc.numero, kyc.complemento].filter(Boolean).join(', ') || '-'],
  ['Bairro', kyc.bairro || '-'],
  ['CEP', formatarCep(kyc.cep)],
]

interface Props {
  empresaId: string | null
  onClose: () => void
  /** Devolve a mensagem de erro, ou `null` quando a subconta foi criada. */
  onAprovar: (empresaId: string) => Promise<string | null>
  aprovando: boolean
  onReprovada: (empresaId: string, atualizada: SubcontaResumo) => void
}

export default function SubcontaDadosModal({ empresaId, onClose, onAprovar, aprovando, onReprovada }: Props) {
  const [detalhe, setDetalhe] = useState<SubcontaDetalhe | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [reprovando, setReprovando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!empresaId) return
    setDetalhe(null)
    setErro(null)
    setReprovando(false)
    setMotivo('')
    setCarregando(true)
    unnaPayAdminService.detalhar(empresaId)
      .then(setDetalhe)
      .catch((error: any) => setErro(error?.message || 'Não foi possível carregar o cadastro.'))
      .finally(() => setCarregando(false))
  }, [empresaId])

  const reprovar = async () => {
    if (!empresaId) return
    try {
      setEnviando(true)
      setErro(null)
      const atualizada = await unnaPayAdminService.reprovar(empresaId, motivo.trim())
      onReprovada(empresaId, atualizada)
      onClose()
    } catch (error: any) {
      setErro(error?.message || 'Não foi possível reprovar a solicitação.')
    } finally {
      setEnviando(false)
    }
  }

  const aprovar = async () => {
    if (!empresaId) return
    setErro(null)
    const falha = await onAprovar(empresaId)
    if (!falha) return onClose()
    setErro(falha)
    // A falha pode ter acontecido depois de a subconta existir (webhook ou
    // credencial): recarrega para o status do modal não oferecer outra aprovação.
    unnaPayAdminService.detalhar(empresaId).then(setDetalhe).catch(() => undefined)
  }

  const podeDecidir = detalhe?.status === 'solicitado'

  const rodape = podeDecidir ? (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-4">
      {reprovando ? (
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => setReprovando(false)} disabled={enviando}>Voltar</Button>
          <Button type="button" variant="destructive" size="sm" onClick={reprovar} disabled={enviando || motivo.trim().length < 5} className="gap-1.5">
            <XCircle className="w-3.5 h-3.5" />{enviando ? 'Reprovando...' : 'Confirmar reprovação'}
          </Button>
        </>
      ) : (
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => setReprovando(true)} disabled={aprovando} className="gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Reprovar
          </Button>
          <Button type="button" size="sm" onClick={aprovar} disabled={aprovando} className="gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />{aprovando ? 'Aprovando...' : 'Aprovar e criar subconta'}
          </Button>
        </>
      )}
    </div>
  ) : undefined

  return (
    <Modal
      isOpen={Boolean(empresaId)}
      onClose={onClose}
      size="2xl"
      title={detalhe?.empresa?.nome_negocio || 'Cadastro enviado'}
      subtitle="Dados que seguem para o Asaas na criação da subconta"
      icon={<FileText className="w-6 h-6" />}
      footer={rodape}
    >
      {carregando ? (
        <p className="py-10 text-center text-sm text-muted-foreground inline-flex w-full justify-center items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando cadastro...
        </p>
      ) : (
        <div className="space-y-4">
          {erro && <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{erro}</div>}

          {detalhe?.motivo_rejeicao && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
              <span className="font-semibold">Motivo da reprovação:</span> {detalhe.motivo_rejeicao}
            </div>
          )}
          {detalhe?.motivo_pendencia && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <span className="font-semibold">Pendência:</span> {detalhe.motivo_pendencia}
            </div>
          )}

          {detalhe?.dados_kyc ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {linhasKyc(detalhe.dados_kyc).map(([rotulo, valor]) => (
                <div key={rotulo} className="min-w-0">
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">{rotulo}</dt>
                  <dd className="break-words">{valor}</dd>
                </div>
              ))}
            </dl>
          ) : detalhe && (
            <p className="text-sm text-muted-foreground">Esta solicitação não tem dados cadastrais gravados.</p>
          )}

          {detalhe?.asaas_account_id && (
            <p className="text-xs text-muted-foreground">Conta Asaas: <span className="font-mono">{detalhe.asaas_account_id}</span></p>
          )}

          {reprovando && (
            <div className="space-y-2">
              <label htmlFor="motivo-reprovacao" className="text-sm font-semibold">Motivo da reprovação</label>
              <textarea
                id="motivo-reprovacao"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                maxLength={1000}
                autoFocus
                placeholder="Ex.: CPF não confere com o titular. Corrija e envie de novo."
                className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-xs text-muted-foreground">A empresa vê este motivo no painel e pode corrigir o cadastro e reenviar.</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
