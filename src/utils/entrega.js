// Interpreta o texto livre da data de entrega para poder ORDENAR os empreendimentos.
// Aceita "31/01/2027", "01/2027", "Jun/2028", "JUNHO /2029", "janeiro 2027", "2028"…
// Dia inexistente (ex.: 31/06) vira o último dia do mês, em vez de quebrar a ordem.
import { normalizar } from './format.js';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const ultimoDia = (ano, mes) => new Date(ano, mes + 1, 0).getDate();
const ano4 = (a) => (a < 100 ? 2000 + a : a);

/** Retorna um número ordenável (ano*10000 + mês*100 + dia) ou null se não der para entender. */
export function chaveEntrega(texto) {
  const t = normalizar(texto || '');
  if (!t) return null;
  let ano, mes, dia;

  let m = t.match(/(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{2,4})/);
  if (m) [dia, mes, ano] = [Number(m[1]), Number(m[2]) - 1, ano4(Number(m[3]))];
  else if ((m = t.match(/\b(\d{1,2})\s*[/.-]\s*(\d{4})\b/))) [mes, ano] = [Number(m[1]) - 1, Number(m[2])];
  else {
    const nome = MESES.findIndex((p) => new RegExp(`\\b${p}`).test(t));
    const a = t.match(/\b(\d{4}|\d{2})\b(?!.*\d)/);
    if (nome >= 0 && a) [mes, ano] = [nome, ano4(Number(a[1]))];
    else if ((m = t.match(/\b(20\d\d)\b/))) [mes, ano] = [11, Number(m[1])];
  }
  if (ano === undefined || mes < 0 || mes > 11) return null;
  const d = Math.min(dia || ultimoDia(ano, mes), ultimoDia(ano, mes));
  return ano * 10000 + (mes + 1) * 100 + d;
}

/** Ordena por entrega (crescente ou decrescente); sem data reconhecida vai para o fim. */
export function ordenarPorEntrega(lista, decrescente = false) {
  return [...lista].sort((a, b) => {
    const x = chaveEntrega(a.entrega);
    const y = chaveEntrega(b.entrega);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return decrescente ? y - x : x - y;
  });
}
