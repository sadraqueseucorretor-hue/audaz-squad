// Abas de uma planilha do Google (nome + gid), lidas da versão HTML pública da planilha.
// O Google libera essa leitura para o site (CORS), sem chave de API. Quando a planilha
// fica embutida, os links internos dela (ex.: o MENU) não funcionam — por isso o próprio
// site monta o menu com estas abas.

const CACHE = new Map();

// Desfaz os escapes de string JS que o Google usa no HTML (\x26, é, \/).
const desescapar = (texto) =>
  texto
    .replace(/\\x([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\(.)/g, '$1');

/** Extrai as abas do HTML do "htmlview" da planilha. Exportada para os testes. */
export function extrairAbas(html) {
  const abas = [];
  const padrao = /items\.push\(\{name: "((?:[^"\\]|\\.)*)", pageUrl: "(?:[^"\\]|\\.)*", gid: "(\d+)"/g;
  for (const m of html.matchAll(padrao)) {
    const nome = desescapar(m[1]).trim();
    if (nome && !abas.some((a) => a.gid === m[2])) abas.push({ nome, gid: m[2] });
  }
  return abas;
}

/** Lista as abas da planilha (id do Google Planilhas). Retorna [] se não conseguir ler. */
export async function listarAbasPlanilha(id) {
  if (!id) return [];
  if (!CACHE.has(id)) {
    CACHE.set(
      id,
      fetch(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/htmlview`)
        .then((r) => (r.ok ? r.text() : ''))
        .then(extrairAbas)
        .catch(() => [])
    );
  }
  return CACHE.get(id);
}

/**
 * URL de visualização de uma aba. Com a aba definida, usa a versão HTML só daquela aba
 * (carrega em ~2 s, contra ~15 s do /preview); sem aba, cai no /preview completo.
 */
export const urlAbaPlanilha = (id, gid) =>
  gid
    ? `https://docs.google.com/spreadsheets/d/${id}/htmlview/sheet?headers=false&gid=${gid}`
    : `https://docs.google.com/spreadsheets/d/${id}/preview`;
