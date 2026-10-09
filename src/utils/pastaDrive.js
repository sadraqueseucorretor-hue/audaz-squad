// Lista os arquivos de uma pasta PÚBLICA do Google Drive (API oficial do Drive, só leitura).
// Usada na Tabela de valores: o admin cola o link da pasta e o site mostra todos os arquivos.
import { GOOGLE_DRIVE_API_KEY } from '../data/firebaseConfig.js';
import { normalizar } from './format.js';

const CACHE = new Map();

export const temChaveDrive = () => Boolean(GOOGLE_DRIVE_API_KEY);

const PASTA = 'application/vnd.google-apps.folder';
const CACHE_ITENS = new Map();

/** Endereço para abrir o item no Google (arquivo, Docs/Planilhas/Apresentações ou pasta). */
function urlDoItem(f) {
  if (f.mimeType === PASTA) return `https://drive.google.com/drive/folders/${f.id}`;
  const docs = {
    'application/vnd.google-apps.spreadsheet': 'spreadsheets',
    'application/vnd.google-apps.document': 'document',
    'application/vnd.google-apps.presentation': 'presentation',
  }[f.mimeType];
  return docs ? `https://docs.google.com/${docs}/d/${f.id}/edit` : `https://drive.google.com/file/d/${f.id}/view`;
}

/**
 * Tudo que está DENTRO da pasta (subpastas e arquivos), pastas primeiro.
 * Retorna { itens: [{ id, nome, tipo, ehPasta, atualizadoEm, tamanho, url }] } ou { erro }.
 */
export function listarItensPasta(pastaId) {
  if (!GOOGLE_DRIVE_API_KEY) return Promise.resolve({ erro: 'sem-chave' });
  if (!CACHE_ITENS.has(pastaId)) {
    const params = new URLSearchParams({
      q: `'${pastaId.replace(/'/g, '')}' in parents and trashed = false`,
      fields: 'files(id,name,mimeType,modifiedTime,size)',
      orderBy: 'folder,name',
      pageSize: '1000',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
      key: GOOGLE_DRIVE_API_KEY,
    });
    CACHE_ITENS.set(
      pastaId,
      fetch(`https://www.googleapis.com/drive/v3/files?${params}`)
        .then(async (r) => {
          const dados = await r.json().catch(() => ({}));
          if (!r.ok) return { erro: dados?.error?.message || `Erro ${r.status}` };
          const itens = (dados.files || []).map((f) => ({
            id: f.id,
            nome: f.name,
            tipo: f.mimeType,
            ehPasta: f.mimeType === PASTA,
            atualizadoEm: f.modifiedTime,
            tamanho: f.size ? Number(f.size) : null,
            url: urlDoItem(f),
          }));
          itens.sort((a, b) => (a.ehPasta === b.ehPasta ? a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }) : a.ehPasta ? -1 : 1));
          return { itens };
        })
        .catch(() => ({ erro: 'Sem conexão com o Google Drive.' }))
    );
  }
  return CACHE_ITENS.get(pastaId);
}

/** Só os arquivos da pasta (sem subpastas) — usado na Tabela de valores. */
export function listarPastaDrive(pastaId) {
  return listarItensPasta(pastaId).then((r) => (r.erro ? r : { arquivos: r.itens.filter((i) => !i.ehPasta) }));
}

/** Tipo de exibição do arquivo: 'imagem' | 'video' | 'pdf' | 'documento' | 'outro'. */
export function tipoDoArquivo(item) {
  const t = item.tipo || '';
  if (t.startsWith('image/')) return 'imagem';
  if (t.startsWith('video/')) return 'video';
  if (t === 'application/pdf') return 'pdf';
  if (t.startsWith('application/vnd.google-apps.') || /officedocument|msword|ms-excel|ms-powerpoint/.test(t)) return 'documento';
  return 'outro';
}

/** Nome para exibir: sem extensão e sem o código aleatório que alguns apps colocam no fim. */
export const nomeDeExibicao = (nome) =>
  nome
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/[_\s-]*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, '')
    .replace(/[\s_-]+$/, '')
    .trim() || nome;

/** "Tabela - Viva Vida Siqueira - SETEMBRO 2026.pdf" → "Viva Vida Siqueira - SETEMBRO 2026" */
export function nomeAmigavel(nome) {
  return nome
    .replace(/(\.(pdf|pptx?|xlsx?|docx?|png|jpe?g))+$/i, '')
    .replace(/^tabela\s*[-–:]\s*/i, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Grupo (linha) do empreendimento pelo começo do nome: "Viva Vida", "Conquista", "Nature"… */
export function grupoDoArquivo(nome) {
  const limpo = nomeAmigavel(nome);
  const n = normalizar(limpo);
  if (n.startsWith('viva vida') || n.startsWith('vida nova')) return 'Viva Vida';
  const primeira = limpo.split(/[\s\-–.]+/)[0] || 'Outros';
  return primeira.charAt(0).toUpperCase() + primeira.slice(1);
}

/** Agrupa e ordena os arquivos por linha; filtra pela busca (sem acento/maiúsculas). */
export function agruparArquivos(arquivos, busca = '') {
  const termo = normalizar(busca);
  const grupos = new Map();
  for (const a of arquivos) {
    const nome = nomeAmigavel(a.nome);
    if (termo && !termo.split(/\s+/).every((p) => normalizar(nome).includes(p))) continue;
    const g = grupoDoArquivo(a.nome);
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g).push({ ...a, nomeAmigavel: nome, empreendimento: nomeEmpreendimento(a.nome) });
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([nome, itens]) => ({ nome, itens: itens.sort((x, y) => x.empreendimento.localeCompare(y.empreendimento, 'pt-BR')) }));
}

const MES = String.raw`(jan(?:eiro)?|fev(?:ereiro)?|mar(?:ço|co)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?)`;
// Mês no nome do arquivo: precisa vir depois de um separador e não continuar como palavra
// ("Mar" em "Maraponga" não conta).
const MES_NO_NOME = new RegExp(String.raw`(?:^|[\s\-–._]+)${MES}(?=[\s._\-\d]|$)`, 'i');
const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Só o nome do empreendimento: "Nature Arbo - SETEMBRO_26 V2.pptx.pdf" → "Nature Arbo". */
export function nomeEmpreendimento(nome) {
  const limpo = nomeAmigavel(nome);
  const i = limpo.search(MES_NO_NOME);
  const base = i > 0 ? limpo.slice(0, i) : limpo;
  return base.replace(/[\s\-–._]+$/, '').trim() || limpo;
}

/** Mês/ano mais comum nos nomes dos arquivos ("Setembro 2026"), para o título. */
export function mesDasTabelas(arquivos) {
  const contagem = new Map();
  for (const a of arquivos) {
    const m = nomeAmigavel(a.nome).match(MES_NO_NOME);
    if (!m) continue;
    const mes = NOMES_MES.find((n) => normalizar(n).startsWith(normalizar(m[1]).slice(0, 3)));
    if (mes) contagem.set(mes, (contagem.get(mes) || 0) + 1);
  }
  if (!contagem.size) return '';
  const mes = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const ano = arquivos.map((a) => a.nome.match(/20\d\d/)?.[0]).find(Boolean);
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)}${ano ? ` ${ano}` : ''}`;
}
