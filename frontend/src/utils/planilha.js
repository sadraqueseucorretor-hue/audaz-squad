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

/**
 * Lê a aba MENU da planilha e devolve a estrutura para o site desenhar um menu clicável:
 *   { titulo, destaques: [{ nome, gid }], linhas: [{ nome, itens: [{ nome, gid }] }] }
 * Cada link "#gid=…" da aba vira um botão. Os títulos "Linha …" agrupam os links que estão
 * nas colunas abaixo deles (a posição real na grade, considerando células mescladas).
 * Links fora de qualquer linha (ex.: "Campanhas do Mês") viram destaques.
 * Retorna null se a aba não tiver links para outras abas.
 */
export function extrairMenu(html, Parser = globalThis.DOMParser) {
  if (!Parser || !html) return null;
  const doc = new Parser().parseFromString(html, 'text/html');
  const tabela = doc.querySelector('table');
  if (!tabela) return null;

  const texto = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const ocupadas = []; // ocupadas[linha][coluna] = true (células mescladas para baixo)
  const titulosLinha = [];
  const links = [];
  let titulo = '';

  [...tabela.querySelectorAll('tr')].forEach((tr, r) => {
    let col = 0;
    for (const td of tr.children) {
      if (td.tagName !== 'TD' && td.tagName !== 'TH') continue;
      while (ocupadas[r]?.[col]) col++;
      const largura = Number(td.getAttribute('colspan')) || 1;
      const altura = Number(td.getAttribute('rowspan')) || 1;
      for (let i = 1; i < altura; i++) for (let j = 0; j < largura; j++) ((ocupadas[r + i] ||= [])[col + j] = true);

      const conteudo = texto(td);
      const ancora = td.querySelector('a[href*="gid="]');
      const gid = ancora?.getAttribute('href').match(/gid=(\d+)/)?.[1];
      if (gid) links.push({ nome: texto(ancora) || conteudo, gid, ini: col, fim: col + largura - 1, linha: r });
      else if (/^linha\s/i.test(conteudo)) titulosLinha.push({ nome: conteudo, ini: col, fim: col + largura - 1, linha: r });
      else if (!titulo && conteudo.length > 3) titulo = conteudo;
      col += largura;
    }
  });

  if (!links.length) return null;
  const linhas = titulosLinha.map((t) => ({ nome: t.nome, itens: [] }));
  const destaques = [];
  for (const l of links) {
    // Linha cujo título fica acima deste link e cobre a coluna dele.
    const i = titulosLinha.findIndex((t) => t.linha < l.linha && l.ini <= t.fim && l.fim >= t.ini);
    if (i >= 0) linhas[i].itens.push({ nome: l.nome, gid: l.gid });
    else destaques.push({ nome: l.nome, gid: l.gid });
  }
  return { titulo, destaques, linhas: linhas.filter((l) => l.itens.length) };
}

const CACHE_MENU = new Map();

/** Carrega e interpreta a aba de menu (gid) da planilha. Retorna null se não houver menu. */
export function carregarMenuPlanilha(id, gid) {
  const chave = `${id}:${gid}`;
  if (!CACHE_MENU.has(chave)) {
    CACHE_MENU.set(
      chave,
      fetch(urlAbaPlanilha(id, gid))
        .then((r) => (r.ok ? r.text() : ''))
        .then((html) => extrairMenu(html))
        .catch(() => null)
    );
  }
  return CACHE_MENU.get(chave);
}
