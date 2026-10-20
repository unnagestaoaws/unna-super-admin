// Espelho de backend/src/application/services/utils/nome-tratamento.ts — a
// pré-visualização precisa mostrar exatamente o que o envio vai mandar.

// Primeira palavra que indica nome de salão, não de pessoa.
const PALAVRAS_DE_NEGOCIO = new Set([
  'studio', 'estudio', 'estúdio', 'espaço', 'espaco', 'esmalteria',
  'salão', 'salao', 'negócio', 'negocio', 'clínica', 'clinica',
])

/**
 * Como chamar a dona numa mensagem: "ADRIELLE PESSANHA GONÇALVES" → "Adrielle".
 * Quem se cadastrou com o nome do salão ("Studio Laura Fogaça") fica com o nome inteiro.
 */
export function nomeDeTratamento(nome?: string | null): string {
  const limpo = (nome || '').trim().replace(/\s+/g, ' ')
  if (!limpo) return ''

  const primeiro = limpo.split(' ')[0]
  if (PALAVRAS_DE_NEGOCIO.has(primeiro.toLocaleLowerCase('pt-BR'))) return limpo

  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') + primeiro.slice(1).toLocaleLowerCase('pt-BR')
}
