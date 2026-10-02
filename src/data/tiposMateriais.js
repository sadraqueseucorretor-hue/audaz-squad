// Catálogo dos tipos de material comercial.
// A ORDEM deste array é a ordem de exibição na página do empreendimento.
// Para criar um novo tipo, adicione um item aqui e use a mesma `chave` nos dados.

export const TIPOS_MATERIAIS = [
  { chave: 'book', label: 'Book', descricao: 'Apresentação completa do empreendimento', icone: 'book' },
  { chave: 'tabela', label: 'Tabela de Preços', descricao: 'Valores e condições vigentes', icone: 'table' },
  { chave: 'plantas', label: 'Plantas', descricao: 'Plantas humanizadas por tipologia', icone: 'blueprint' },
  { chave: 'implantacao', label: 'Implantação', descricao: 'Distribuição de torres e áreas comuns', icone: 'map' },
  { chave: 'memorial', label: 'Memorial Descritivo', descricao: 'Acabamentos e especificações', icone: 'doc' },
  { chave: 'informacoes', label: 'Informações Comerciais', descricao: 'Regras, campanhas e condições', icone: 'info' },
  { chave: 'videos', label: 'Vídeos', descricao: 'Tour, decorado e institucional', icone: 'play' },
  { chave: 'localizacao', label: 'Localização', descricao: 'Mapa e pontos de interesse', icone: 'pin' },
  { chave: 'outros', label: 'Outros Materiais', descricao: 'Artes, posts e arquivos extras', icone: 'folder' },
];

// Formatos aceitos em cada arquivo/link. Controla o selo exibido no botão.
export const FORMATOS = {
  pdf: 'PDF',
  imagem: 'Imagem',
  planilha: 'Planilha',
  video: 'Vídeo',
  link: 'Link',
};
