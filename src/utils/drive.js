// Tudo que o sistema sabe sobre links do Google Drive/Docs fica AQUI.
// O admin cola o link normal de compartilhamento; o sistema descobre o ID e
// monta a URL de pré-visualização (/preview) sozinho.

const HOSTS_DRIVE = new Set(['drive.google.com', 'docs.google.com']);
const ID_VALIDO = /^[\w-]{10,}$/;

/**
 * Analisa um link do Google Drive/Docs.
 * Retorna { ehDrive, valido, id, tipo, urlOriginal, urlPreview }.
 *  - tipo: 'arquivo' | 'pasta' | 'documento' | 'planilha' | 'apresentacao' | 'formulario'
 *  - valido: false quando é do Drive mas não foi possível achar o ID.
 *
 * Formatos reconhecidos:
 *   drive.google.com/file/d/ID/view?usp=sharing   drive.google.com/open?id=ID
 *   drive.google.com/uc?id=ID&export=download      drive.google.com/drive/folders/ID
 *   drive.google.com/drive/u/0/folders/ID          docs.google.com/document|spreadsheets|presentation/d/ID/edit
 */
export function analisarLinkDrive(entrada) {
  let url;
  try {
    url = new URL(entrada);
  } catch {
    return { ehDrive: false, valido: false };
  }
  const host = url.hostname.replace(/^www\./, '');
  if (!HOSTS_DRIVE.has(host)) return { ehDrive: false, valido: false };

  const caminho = url.pathname;
  const base = { ehDrive: true, urlOriginal: url.href };

  if (host === 'docs.google.com') {
    const m = caminho.match(/^\/(?:a\/[^/]+\/)?(document|spreadsheets|presentation|forms)\/d\/(?:e\/)?([\w-]+)/);
    if (!m || !ID_VALIDO.test(m[2])) return { ...base, valido: false };
    const tipos = { document: 'documento', spreadsheets: 'planilha', presentation: 'apresentacao', forms: 'formulario' };
    // Planilha: mantém a aba escolhida no link (?gid=… ou #gid=…).
    const aba = m[1] === 'spreadsheets' ? url.searchParams.get('gid') || url.hash.match(/gid=(\d+)/)?.[1] : null;
    const urlPreview =
      m[1] === 'forms'
        ? `https://docs.google.com/forms/d/e/${m[2]}/viewform?embedded=true`
        : `https://docs.google.com/${m[1]}/d/${m[2]}/preview${aba ? `#gid=${aba}` : ''}`;
    return { ...base, valido: true, id: m[2], tipo: tipos[m[1]], urlPreview };
  }

  const pasta = caminho.match(/\/folders\/([\w-]+)/);
  if (pasta) {
    if (!ID_VALIDO.test(pasta[1])) return { ...base, valido: false };
    return {
      ...base,
      valido: true,
      id: pasta[1],
      tipo: 'pasta',
      urlPreview: `https://drive.google.com/embeddedfolderview?id=${pasta[1]}#grid`,
    };
  }

  const id = caminho.match(/\/file\/d\/([\w-]+)/)?.[1] || url.searchParams.get('id');
  if (!id || !ID_VALIDO.test(id)) return { ...base, valido: false };
  return { ...base, valido: true, id, tipo: 'arquivo', urlPreview: `https://drive.google.com/file/d/${id}/preview` };
}

/**
 * Endereço de IMAGEM direta para um link do Drive (fotos dos cards, banner).
 * O link normal de compartilhamento (/file/d/ID/view) abre a página do Drive, não a
 * imagem — aqui ele vira o endereço de miniatura do Drive, já redimensionado para `largura`.
 * Links que não são do Drive voltam como estão.
 */
export function urlImagem(entrada, largura = 1600) {
  if (!entrada) return entrada;
  const d = analisarLinkDrive(entrada);
  if (d.ehDrive && d.valido && d.tipo === 'arquivo') return `https://drive.google.com/thumbnail?id=${d.id}&sz=w${largura}`;
  return entrada;
}
