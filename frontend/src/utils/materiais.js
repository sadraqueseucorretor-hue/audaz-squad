// Regras dos materiais dos empreendimentos: análise do link, compatibilidade com
// o formato antigo e agrupamento por categoria para exibição.
import { CATEGORIAS_MATERIAL, categoriaDoTipoAntigo } from '../data/tiposMateriais.js';
import { analisarLinkDrive } from './drive.js';
import { analisarLinkMaps } from './mapa.js';
import { sanitizarUrl } from './urls.js';

const EXT_IMAGEM = /\.(jpe?g|png|webp|gif|avif)$/i;
const EXT_VIDEO = /\.(mp4|webm|mov|m4v)$/i;
const EXT_PDF = /\.pdf$/i;
const EXT_OFFICE = /\.(xlsx?|docx?|pptx?)$/i;

// Domínios que aceitamos exibir em iframe — os demais abrem por botão (nova aba).
// Assim o visualizador nunca fica em branco por um site que proíbe incorporação.
const IFRAME_PERMITIDO = [
  'drive.google.com',
  'docs.google.com',
  'www.youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'www.google.com', // Google Maps (output=embed)
  'view.officeapps.live.com',
  'firebasestorage.googleapis.com', // arquivos enviados na versão anterior do painel
];

function idYoutube(url) {
  const host = url.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0];
  if (host.endsWith('youtube.com')) {
    return url.searchParams.get('v') || url.pathname.match(/^\/(shorts|embed|live)\/([\w-]+)/)?.[2] || null;
  }
  return null;
}

/**
 * Analisa o link de um material. Única fonte de verdade sobre como exibir um link.
 * Retorna:
 *   { valido, erro, urlOriginal, urlPreview, tipoOrigem, modo, drive }
 *   tipoOrigem: 'google_drive' | 'video' | 'image' | 'external_url' | 'outro'
 *   modo: como o visualizador mostra — 'iframe' | 'imagem' | 'video' | 'externo'
 */
export function analisarUrlMaterial(entrada) {
  const limpo = sanitizarUrl(entrada);
  if (!limpo.valida) return { valido: false, erro: limpo.erro };

  const urlOriginal = limpo.url;
  const url = new URL(urlOriginal);
  const host = url.hostname.replace(/^www\./, '');
  const arquivo = decodeURIComponent(url.pathname).toLowerCase();
  const ok = (dados) => ({ valido: true, urlOriginal, ...dados });

  const drive = analisarLinkDrive(urlOriginal);
  if (drive.ehDrive) {
    if (!drive.valido) {
      return { valido: false, erro: 'Não reconheci esse link do Google Drive. Use “Compartilhar → Copiar link” no arquivo.' };
    }
    return ok({ tipoOrigem: 'google_drive', urlPreview: drive.urlPreview, modo: 'iframe', drive });
  }

  const yt = idYoutube(url);
  if (yt) return ok({ tipoOrigem: 'video', urlPreview: `https://www.youtube-nocookie.com/embed/${yt}?rel=0`, modo: 'iframe' });

  const vimeo = host === 'vimeo.com' && url.pathname.match(/^\/(\d+)/)?.[1];
  if (vimeo) return ok({ tipoOrigem: 'video', urlPreview: `https://player.vimeo.com/video/${vimeo}`, modo: 'iframe' });

  const maps = analisarLinkMaps(urlOriginal);
  if (maps.valido) {
    return ok({ tipoOrigem: 'outro', urlPreview: maps.urlEmbed || urlOriginal, modo: maps.urlEmbed ? 'iframe' : 'externo' });
  }

  if (EXT_IMAGEM.test(arquivo)) return ok({ tipoOrigem: 'image', urlPreview: urlOriginal, modo: 'imagem' });
  if (EXT_VIDEO.test(arquivo)) return ok({ tipoOrigem: 'video', urlPreview: urlOriginal, modo: 'video' });
  if (EXT_PDF.test(arquivo)) return ok({ tipoOrigem: 'external_url', urlPreview: urlOriginal, modo: 'iframe' });
  if (EXT_OFFICE.test(arquivo)) {
    return ok({
      tipoOrigem: 'external_url',
      urlPreview: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(urlOriginal)}`,
      modo: 'iframe',
    });
  }

  // Qualquer outro site: só exibe embutido se o domínio estiver na lista segura.
  const modo = IFRAME_PERMITIDO.includes(url.hostname) ? 'iframe' : 'externo';
  return ok({ tipoOrigem: 'external_url', urlPreview: urlOriginal, modo });
}

/** Rótulo curto exibido no botão do material. */
export function seloDoMaterial(material) {
  const a = analisarUrlMaterial(material.urlOriginal);
  if (!a.valido) return 'Link';
  if (a.tipoOrigem === 'google_drive') {
    return { planilha: 'Planilha', documento: 'Doc', apresentacao: 'Slides', pasta: 'Pasta' }[a.drive.tipo] || 'Drive';
  }
  if (a.tipoOrigem === 'video') return 'Vídeo';
  if (a.tipoOrigem === 'image') return 'Imagem';
  if (EXT_PDF.test(new URL(a.urlOriginal).pathname)) return 'PDF';
  return 'Link';
}

/**
 * Lista de materiais do empreendimento no formato novo.
 * Compatível com o formato antigo (`materiais: { book: [{titulo, url, ...}], ... }`):
 * registros antigos continuam aparecendo, com id estável "<tipo>-<posição>".
 */
export function listarMateriais(emp) {
  if (Array.isArray(emp?.materiaisLista)) return emp.materiaisLista;

  const antigos = emp?.materiais || {};
  const lista = [];
  for (const [tipo, itens] of Object.entries(antigos)) {
    (itens || []).forEach((item, indice) => {
      if (!item?.url) return;
      const analise = analisarUrlMaterial(item.url);
      lista.push({
        id: `${tipo}-${indice}`,
        empreendimentoId: emp.slug,
        titulo: item.titulo || 'Material',
        categoria: categoriaDoTipoAntigo(tipo),
        urlOriginal: analise.valido ? analise.urlOriginal : item.url,
        urlPreview: analise.valido ? analise.urlPreview : item.url,
        tipoOrigem: analise.valido ? analise.tipoOrigem : 'outro',
        ordem: lista.length,
        ativo: true,
        createdAt: item.atualizadoEm || emp.atualizadoEm || null,
        updatedAt: item.atualizadoEm || emp.atualizadoEm || null,
      });
    });
  }
  return lista;
}

/** Só os ativos, agrupados por categoria (na ordem do catálogo) e ordenados dentro de cada uma. */
export function materiaisPorCategoria(emp) {
  const ativos = listarMateriais(emp)
    .filter((m) => m.ativo !== false && m.urlOriginal)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  return CATEGORIAS_MATERIAL.map((cat) => ({ ...cat, itens: ativos.filter((m) => m.categoria === cat.chave) })).filter(
    (cat) => cat.itens.length > 0
  );
}

/**
 * Imagem de pré-visualização do material para o card (ou null → mostra o ícone da categoria).
 * Drive: miniatura gerada pelo próprio Drive (1ª página do PDF, Docs, imagem). Alguns arquivos
 * grandes não têm miniatura — o <img> cai no ícone pelo onError.
 */
export function miniaturaDoMaterial(material, largura = 800) {
  const a = analisarUrlMaterial(material.urlOriginal);
  if (!a.valido) return null;
  if (a.tipoOrigem === 'google_drive') {
    return a.drive.tipo === 'pasta' || a.drive.tipo === 'formulario'
      ? null
      : `https://drive.google.com/thumbnail?id=${a.drive.id}&sz=w${largura}`;
  }
  const youtube = a.urlPreview.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]+)/)?.[1];
  if (youtube) return `https://i.ytimg.com/vi/${youtube}/hqdefault.jpg`;
  if (a.tipoOrigem === 'image') return a.urlOriginal;
  return null;
}
