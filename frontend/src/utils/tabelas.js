// Tabelas de valores por construtora. Cada uma tem seu link no admin (campo na config do site);
// a página "Tabela de valores" mostra um botão para cada tabela cadastrada.
export const FONTES_TABELA = [
  { chave: 'direcional', rotulo: 'Direcional', campo: 'tabelaValoresUrl' },
  { chave: 'riva', rotulo: 'Riva', campo: 'tabelaValoresRivaUrl' },
];

/** Tabelas com link cadastrado, na ordem acima. */
export const fontesCadastradas = (site = {}) => FONTES_TABELA.filter((f) => site[f.campo]);

/** Tabela a abrir: a pedida (?fonte=), se cadastrada; senão a primeira cadastrada. */
export function escolherFonte(site, chave) {
  const lista = fontesCadastradas(site);
  return lista.find((f) => f.chave === chave) || lista[0] || null;
}

/** Tabela do empreendimento pela construtora: "RIVA" → Riva (sem link da Riva, cai na Direcional);
 * as demais → Direcional. Sem tabela cadastrada para ele, null. */
export function fonteDoEmpreendimento(emp, site = {}) {
  const [direcional, riva] = FONTES_TABELA;
  if (/riva/i.test(emp?.construtora || '') && site[riva.campo]) return riva;
  return site[direcional.campo] ? direcional : null;
}
