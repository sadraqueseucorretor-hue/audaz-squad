// Converte o link de um material no jeito certo de exibi-lo dentro do site.
// Retorna { modo: 'iframe' | 'imagem' | 'video' | 'externo', src }.

const EXT_IMAGEM = /\.(jpe?g|png|webp|gif|avif|svg)(\?|#|$)/i;
const EXT_VIDEO = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;
const EXT_PDF = /\.pdf(\?|#|$)/i;
const EXT_OFFICE = /\.(xlsx?|docx?|pptx?)(\?|#|$)/i;

function idDoDrive(url) {
  return url.pathname.match(/\/d\/([\w-]+)/)?.[1] || url.searchParams.get('id');
}

export function comoExibir(item) {
  let url;
  try {
    url = new URL(item.url);
  } catch {
    return { modo: 'externo', src: item.url };
  }
  const host = url.hostname.replace(/^www\./, '');
  const caminho = url.pathname;

  // Google Drive: arquivos e pastas
  if (host === 'drive.google.com') {
    if (caminho.includes('/folders/')) {
      const id = caminho.match(/\/folders\/([\w-]+)/)?.[1];
      return { modo: 'iframe', src: `https://drive.google.com/embeddedfolderview?id=${id}#grid` };
    }
    const id = idDoDrive(url);
    if (id) return { modo: 'iframe', src: `https://drive.google.com/file/d/${id}/preview` };
  }

  // Google Docs, Planilhas e Apresentações
  const docs = host === 'docs.google.com' && caminho.match(/^\/(document|spreadsheets|presentation)\/d\/([\w-]+)/);
  if (docs) return { modo: 'iframe', src: `https://docs.google.com/${docs[1]}/d/${docs[2]}/preview` };

  // YouTube e Vimeo
  const ytId =
    (host === 'youtu.be' && caminho.slice(1)) ||
    (host.endsWith('youtube.com') && (url.searchParams.get('v') || caminho.match(/^\/(shorts|embed|live)\/([\w-]+)/)?.[2]));
  if (ytId) return { modo: 'iframe', src: `https://www.youtube.com/embed/${ytId}?rel=0` };
  const vimeoId = host === 'vimeo.com' && caminho.match(/^\/(\d+)/)?.[1];
  if (vimeoId) return { modo: 'iframe', src: `https://player.vimeo.com/video/${vimeoId}` };

  // Google Maps (link de busca ou com ?q=)
  if ((host === 'google.com' || host === 'maps.google.com') && caminho.startsWith('/maps')) {
    const local = url.searchParams.get('query') || url.searchParams.get('q') || decodeURIComponent(caminho.match(/\/place\/([^/]+)/)?.[1] || '').replace(/\+/g, ' ');
    if (local) return { modo: 'iframe', src: `https://www.google.com/maps?q=${encodeURIComponent(local)}&output=embed` };
  }

  // Arquivos diretos (ex.: Firebase Storage). O Storage codifica o caminho, então olhamos o caminho decodificado.
  const arquivo = decodeURIComponent(caminho);
  if (item.formato === 'imagem' || EXT_IMAGEM.test(arquivo)) return { modo: 'imagem', src: item.url };
  if (EXT_VIDEO.test(arquivo)) return { modo: 'video', src: item.url };
  if (item.formato === 'pdf' || EXT_PDF.test(arquivo)) return { modo: 'iframe', src: item.url };
  if (EXT_OFFICE.test(arquivo)) {
    return { modo: 'iframe', src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(item.url)}` };
  }

  // Qualquer outro site: tenta exibir; alguns bloqueiam e aí o botão "Abrir em nova aba" resolve.
  return { modo: 'iframe', src: item.url, talvezBloqueado: true };
}
