// Validação e sanitização de URLs informadas no painel (materiais, fotos).
// Regra: só aceitamos endereço web absoluto em HTTPS. Nada de javascript:, data:,
// HTML colado ou espaços — a URL nunca vira HTML, só atributo href/src.

const PADRAO_PERIGOSO = /[\s<>"'`\\]/;

/**
 * Normaliza e valida uma URL digitada pelo admin.
 * Retorna { valida: true, url } ou { valida: false, erro }.
 */
export function sanitizarUrl(entrada) {
  const texto = String(entrada ?? '').trim();
  if (!texto) return { valida: false, erro: 'Informe o link do arquivo.' };
  if (PADRAO_PERIGOSO.test(texto)) return { valida: false, erro: 'O link não pode ter espaços, aspas ou HTML.' };

  // Quem copia da barra do navegador às vezes perde o "https://".
  const comProtocolo = /^[a-z][a-z0-9+.-]*:/i.test(texto) ? texto : `https://${texto}`;

  let url;
  try {
    url = new URL(comProtocolo);
  } catch {
    return { valida: false, erro: 'Link inválido. Copie o endereço completo do arquivo.' };
  }
  if (url.protocol !== 'https:') {
    return { valida: false, erro: 'Use um link seguro, começando com https://.' };
  }
  if (!url.hostname.includes('.') || url.username || url.password) {
    return { valida: false, erro: 'Link inválido. Copie o endereço completo do arquivo.' };
  }
  return { valida: true, url: url.href };
}

/** Versão curta para usar em src/href: devolve a URL segura ou null. */
export const urlSegura = (entrada) => {
  const r = sanitizarUrl(entrada);
  return r.valida ? r.url : null;
};
