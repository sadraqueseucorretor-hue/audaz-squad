// Categorias dos materiais dos empreendimentos.
// A ORDEM deste array é a ordem dos cards na página do empreendimento.
// Para criar uma categoria nova, adicione um item aqui (a `chave` é o que fica gravado no banco).

export const CATEGORIAS_MATERIAL = [
  { chave: 'book', label: 'Book', descricao: 'Apresentação completa do empreendimento', icone: 'book' },
  { chave: 'tabela', label: 'Tabela de Preços', descricao: 'Valores e condições vigentes', icone: 'table' },
  { chave: 'plantas', label: 'Plantas', descricao: 'Plantas humanizadas por tipologia', icone: 'blueprint' },
  { chave: 'implantacao', label: 'Implantação', descricao: 'Distribuição de torres e áreas comuns', icone: 'map' },
  { chave: 'memorial', label: 'Memorial Descritivo', descricao: 'Acabamentos e especificações', icone: 'doc' },
  { chave: 'apresentacao', label: 'Apresentação', descricao: 'Slides e apresentações de venda', icone: 'slides' },
  { chave: 'material-comercial', label: 'Material Comercial', descricao: 'Regras, campanhas e condições', icone: 'info' },
  { chave: 'imagens', label: 'Imagens', descricao: 'Fotos, perspectivas e decorado', icone: 'image' },
  { chave: 'videos', label: 'Vídeos', descricao: 'Tour, decorado e institucional', icone: 'play' },
  { chave: 'documentos', label: 'Documentos', descricao: 'Contratos, fichas e formulários', icone: 'doc' },
  { chave: 'localizacao', label: 'Localização', descricao: 'Mapa e pontos de interesse', icone: 'pin' },
  { chave: 'outros', label: 'Outros', descricao: 'Artes, posts e arquivos extras', icone: 'folder' },
];

export const categoriaPorChave = (chave) =>
  CATEGORIAS_MATERIAL.find((c) => c.chave === chave) || CATEGORIAS_MATERIAL[CATEGORIAS_MATERIAL.length - 1];

// Tipos da versão anterior do painel → categoria atual (registros antigos continuam aparecendo).
const TIPOS_ANTIGOS = { informacoes: 'material-comercial' };

export const categoriaDoTipoAntigo = (tipo) =>
  TIPOS_ANTIGOS[tipo] || (CATEGORIAS_MATERIAL.some((c) => c.chave === tipo) ? tipo : 'outros');
