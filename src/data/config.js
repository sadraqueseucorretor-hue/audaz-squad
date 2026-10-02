// Configurações gerais da Central. Edite aqui textos institucionais e opções de filtro.

export const SITE = {
  marca: 'AUDAZ SQUAD',
  parceiro: 'Direcional',
  titulo: 'Central de Empreendimentos',
  subtitulo: 'Books, tabelas, plantas e tudo o que você precisa para vender — sempre atualizado.',
  // Troque por '/logo.svg' (em /public) para usar a logo oficial em imagem.
  logoUrl: null,
  rodape: 'Materiais de uso exclusivo dos corretores AUDAZ SQUAD.',
};

// Ordem em que os status aparecem nos filtros. A chave deve bater com `status` nos dados.
export const STATUS = {
  lancamento: { label: 'Lançamento', tom: 'red' },
  'em-obras': { label: 'Em obras', tom: 'navy' },
  pronto: { label: 'Pronto para morar', tom: 'green' },
  'breve-lancamento': { label: 'Breve lançamento', tom: 'gold' },
};

// Quantos itens mostrar em "Atualizados recentemente".
export const RECENTES_LIMITE = 4;
