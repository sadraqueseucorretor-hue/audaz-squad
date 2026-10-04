// Tudo que o sistema sabe sobre links do Google Maps fica AQUI.
// Aceita: link do navegador (/maps/place/…, /maps/@lat,lng…, ?q=…), link curto de
// compartilhamento (maps.app.goo.gl/…) e o código de "Incorporar um mapa" (<iframe src=…>),
// do qual só a URL é aproveitada — nenhum HTML colado vai para a página.
import { sanitizarUrl } from './urls.js';

const HOSTS_MAPS = ['google.com', 'google.com.br', 'maps.google.com', 'maps.google.com.br'];
const HOSTS_CURTOS = ['maps.app.goo.gl', 'goo.gl'];

const embedPorBusca = (termo) => `https://www.google.com/maps?q=${encodeURIComponent(termo)}&z=16&output=embed`;

/** Mapa embutido a partir do endereço em texto (usado quando não há link ou o link é curto). */
export const embedPorEndereco = (endereco) => (endereco?.trim() ? embedPorBusca(endereco.trim()) : null);

/** Link "Abrir no Google Maps" a partir do endereço em texto. */
export const linkBuscaMaps = (endereco) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco || '')}`;

/**
 * Analisa o que o admin colou no campo do Maps.
 * Retorna { valido, erro, url, urlEmbed, exato }:
 *  - url: link seguro a guardar (o original, ou o src do iframe);
 *  - urlEmbed: endereço para o iframe do mapa (null = usar o endereço em texto);
 *  - exato: true quando o pin vem do próprio link (coordenadas/local), não do endereço.
 */
export function analisarLinkMaps(entrada) {
  let texto = String(entrada ?? '').trim();
  if (!texto) return { valido: false, erro: '' };

  // Código de incorporação: pega só o src do <iframe>.
  if (/^<iframe/i.test(texto)) {
    const src = texto.match(/\ssrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!src) return { valido: false, erro: 'Não encontrei o mapa nesse código. Cole o link do Google Maps.' };
    texto = src.replace(/&amp;/g, '&');
  }

  const limpo = sanitizarUrl(texto);
  if (!limpo.valida) return { valido: false, erro: limpo.erro };
  const url = new URL(limpo.url);
  const host = url.hostname.replace(/^www\./, '');

  if (HOSTS_CURTOS.includes(host) && (host === 'maps.app.goo.gl' || url.pathname.startsWith('/maps'))) {
    // Link curto não revela o local sem abrir — o mapa usa o endereço em texto; o botão abre o link.
    return { valido: true, url: limpo.url, urlEmbed: null, exato: false };
  }
  if (!HOSTS_MAPS.includes(host) || !(url.pathname.startsWith('/maps') || host.startsWith('maps.'))) {
    return { valido: false, erro: 'Use um link do Google Maps (maps.google.com ou maps.app.goo.gl).' };
  }

  const caminho = decodeURIComponent(url.pathname);
  if (caminho.startsWith('/maps/embed') && url.searchParams.get('pb')) {
    return { valido: true, url: limpo.url, urlEmbed: limpo.url, exato: true };
  }
  // Pin do local (!3d<lat>!4d<lng>) é mais preciso que o centro da tela (@lat,lng).
  const pin = caminho.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const centro = caminho.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const coord = pin || centro;
  if (coord) return { valido: true, url: limpo.url, urlEmbed: embedPorBusca(`${coord[1]},${coord[2]}`), exato: true };

  const lugar = caminho.match(/\/place\/([^/]+)/)?.[1]?.replace(/\+/g, ' ');
  const busca = url.searchParams.get('q') || url.searchParams.get('query') || url.searchParams.get('ll') || lugar;
  if (busca) return { valido: true, url: limpo.url, urlEmbed: embedPorBusca(busca), exato: true };

  return { valido: true, url: limpo.url, urlEmbed: null, exato: false };
}

/** O que a página do empreendimento precisa para mostrar o mapa (ou null se não há nada). */
export function mapaDoEmpreendimento(emp) {
  const link = emp?.mapsUrl ? analisarLinkMaps(emp.mapsUrl) : null;
  const urlEmbed = (link?.valido && link.urlEmbed) || embedPorEndereco(emp?.endereco);
  if (!urlEmbed) return null;
  return {
    urlEmbed,
    urlAbrir: link?.valido ? link.url : linkBuscaMaps(emp.endereco),
    urlRota: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(emp?.endereco || '')}`,
  };
}
