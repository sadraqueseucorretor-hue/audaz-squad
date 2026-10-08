// Lista os arquivos de uma pasta PÚBLICA do Google Drive (API oficial do Drive, só leitura).
// Usada na Tabela de valores: o admin cola o link da pasta e o site mostra todos os arquivos.
import { GOOGLE_DRIVE_API_KEY } from '../data/firebaseConfig.js';
import { normalizar } from './format.js';

const CACHE = new Map();

export const temChaveDrive = () => Boolean(GOOGLE_DRIVE_API_KEY);

/**
 * Busca os arquivos da pasta. Retorna { arquivos: [{ id, nome, tipo, atualizadoEm, url }] }
 * ou { erro } com uma mensagem amigável.
 */
export function listarPastaDrive(pastaId) {
  if (!GOOGLE_DRIVE_API_KEY) return Promise.resolve({ erro: 'sem-chave' });
  if (!CACHE.has(pastaId)) {
    const params = new URLSearchParams({
      q: `'${pastaId.replace(/'/g, '')}' in parents and trashed = false`,
      fields: 'files(id,name,mimeType,modifiedTime)',
      orderBy: 'name',
      pageSize: '500',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
      key: GOOGLE_DRIVE_API_KEY,
    });
    CACHE.set(
      pastaId,
      fetch(`https://www.googleapis.com/drive/v3/files?${params}`)
        .then(async (r) => {
          const dados = await r.json().catch(() => ({}));
          if (!r.ok) return { erro: dados?.error?.message || `Erro ${r.status}` };
          return {
            arquivos: (dados.files || [])
              .filter((f) => f.mimeType !== 'application/vnd.google-apps.folder')
              .map((f) => ({
                id: f.id,
                nome: f.name,
                tipo: f.mimeType,
                atualizadoEm: f.modifiedTime,
                url:
                  f.mimeType === 'application/vnd.google-apps.spreadsheet'
                    ? `https://docs.google.com/spreadsheets/d/${f.id}/edit`
                    : `https://drive.google.com/file/d/${f.id}/view`,
              })),
          };
        })
        .catch(() => ({ erro: 'Sem conexão com o Google Drive.' }))
    );
  }
  return CACHE.get(pastaId);
}

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
