// Acha, na pasta da Tabela de valores, o arquivo do empreendimento pelo NOME do arquivo
// (ex.: "Conquista Maraponga SETEMBRO 2026.pdf" → Conquista Maraponga).
// Compara palavra por palavra, sem acento/maiúsculas, tolerando pequenas diferenças de digitação
// ("Sabiás" × "Sabiá", "Viva" × "Vida") — mas sempre fica com a correspondência mais exata
// (assim "Viva Vida Maracanã" não pega a tabela do "Viva Vida Maracanaú").
import { normalizar } from './format.js';
import { nomeEmpreendimento } from './pastaDrive.js';

const IGNORAR = new Set(['e', 'de', 'do', 'da', 'dos', 'das', 'tabela', 'residencial', 'condominio']);

const palavras = (texto) =>
  normalizar(texto).replace(/[^a-z0-9]+/g, ' ').split(' ').filter((p) => p && !IGNORAR.has(p));

// Diferença de até 1 letra (troca, sobra ou falta) — só para palavras de 4+ letras.
function quaseIgual(a, b) {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 4 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let diferencas = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diferencas > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return diferencas + (a.length - i) + (b.length - j) <= 1;
}

/** Pontuação de um arquivo para o empreendimento (0 = não serve). */
export function pontuacao(nomeEmp, nomeArquivo) {
  const emp = palavras(nomeEmp);
  const arq = palavras(nomeEmpreendimento(nomeArquivo));
  if (!emp.length || !arq.length) return 0;
  const usadas = new Set();
  let pontos = 0;
  for (const p of emp) {
    let achou = arq.findIndex((q, k) => !usadas.has(k) && q === p);
    let peso = 1;
    if (achou < 0) { achou = arq.findIndex((q, k) => !usadas.has(k) && quaseIgual(p, q)); peso = 0.8; }
    if (achou < 0) return 0; // toda palavra do empreendimento precisa estar no nome do arquivo
    usadas.add(achou);
    pontos += peso;
  }
  return pontos - 0.1 * (arq.length - usadas.size); // palavras a mais no arquivo pesam um pouco contra
}

/** O arquivo da tabela do empreendimento (o de maior pontuação; empate → o mais recente) ou null. */
export function tabelaDoEmpreendimento(arquivos, nomeEmp) {
  let melhor = null;
  for (const a of arquivos || []) {
    const p = pontuacao(nomeEmp, a.nome);
    if (p <= 0) continue;
    if (!melhor || p > melhor.p || (p === melhor.p && (a.atualizadoEm || '') > (melhor.a.atualizadoEm || ''))) melhor = { a, p };
  }
  return melhor?.a || null;
}
