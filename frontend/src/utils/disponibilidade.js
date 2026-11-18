import { normalizar } from './format.js';

// Busca de unidade tolerante ao jeito de digitar: "bl03 401", "bloco 3", "BL-03", "0401", "terreo 2q"
// encontram "BL03-0401". Sem acento, caixa, hífen ou zero à esquerda. Cada palavra precisa aparecer
// em algum campo (unidade, bloco, planta ou tipo). Código de bloco ("bl3") precisa ser exato, para
// "bloco 1" não trazer também os blocos 10, 11…
const semZeros = (parte) => parte.replace(/(^|[a-z])0+(?=\d)/g, '$1');

const partes = (texto) =>
  normalizar(String(texto ?? ''))
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(semZeros);

const codigo = (p) => /^[a-z]+\d+$/.test(p); // "bl3": letras + número → compara inteiro

export function termosDeBusca(texto) {
  return normalizar(texto)
    .replace(/\bbloco\b|\bblc\b|\bbl\b/g, ' bl')
    .replace(/\bbl\s*[-.]?\s*(?=\d)/g, 'bl')
    .replace(/\b(apto|apt|ap|unidade|unid|un)\b\.?/g, ' ')
    .split(/\s+/)
    .map(partes)
    .filter((t) => t.length && t.join('') !== 'bl');
}

// O termo (suas partes, em sequência) aparece nas partes do campo.
function contem(campo, termo) {
  for (let i = 0; i + termo.length <= campo.length; i++) {
    if (termo.every((p, j) => (codigo(p) ? campo[i + j] === p : campo[i + j].includes(p)))) return true;
  }
  return false;
}

export function unidadeCombina(u, termos) {
  if (termos.length === 0) return true;
  const campos = [u.identificador, u.bloco, u.tipo_planta, u.tipo].map(partes);
  return termos.every((t) => campos.some((c) => contem(c, t)));
}

// Número curto da unidade para o espelho: "BL03-0401" → "0401".
export const numeroCurto = (identificador = '') => {
  const partes = String(identificador).split(/[-\s/]+/).filter(Boolean);
  return partes.length > 1 ? partes[partes.length - 1] : String(identificador);
};

// Agrupa por bloco e, dentro do bloco, por andar (do mais alto para o térreo), como no espelho de vendas.
export function agruparEspelho(unidades) {
  const blocos = new Map();
  for (const u of unidades) {
    const bloco = u.bloco || 'Sem bloco';
    if (!blocos.has(bloco)) blocos.set(bloco, new Map());
    const andares = blocos.get(bloco);
    const andar = u.andar ?? '—';
    if (!andares.has(andar)) andares.set(andar, []);
    andares.get(andar).push(u);
  }
  const porTexto = (a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
  return [...blocos.entries()]
    .sort(([a], [b]) => porTexto(a, b))
    .map(([bloco, andares]) => ({
      bloco,
      andares: [...andares.entries()]
        .sort(([a], [b]) => (typeof a === 'number' && typeof b === 'number' ? b - a : porTexto(b, a)))
        .map(([andar, us]) => ({ andar, unidades: us.sort((x, y) => porTexto(x.identificador, y.identificador)) })),
    }));
}
