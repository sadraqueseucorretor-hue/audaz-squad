// Nome que aparece na aba do navegador. O admin define em "Logo e textos" (campo nomeAba).
// Sem nome definido: a inicial usa "Título · Marca" e as páginas internas "Página · Marca"
// (mais curto). Com nome definido: "Nome" na inicial e "Página · Nome" nas demais.
export const nomeDaAba = (site) =>
  (site?.nomeAba || '').trim() || [site?.titulo, site?.marca].filter(Boolean).join(' · ');

export const tituloDaAba = (site, pagina) => {
  if (!pagina) return nomeDaAba(site);
  return `${pagina} · ${(site?.nomeAba || '').trim() || site?.marca || nomeDaAba(site)}`;
};
