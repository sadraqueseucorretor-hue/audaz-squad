import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useDados } from '../context/DadosContext.jsx';
import { TIPOS_MATERIAIS } from '../data/tiposMateriais.js';
import { buscarPorSlug } from '../utils/empreendimentos.js';
import { comoExibir } from '../utils/visualizacao.js';

// Tela cheia para ver um material (book, tabela, planta, vídeo…) sem sair do site.
// Rota: /empreendimento/:slug/ver/:tipo/:indice — o link pode ser compartilhado.
export default function Visualizador() {
  const { slug, tipo, indice } = useParams();
  const navigate = useNavigate();
  const { empreendimentos, carregando } = useDados();
  const emp = buscarPorSlug(empreendimentos, slug);
  const item = emp?.materiais?.[tipo]?.[Number(indice)];
  const rotuloTipo = TIPOS_MATERIAIS.find((t) => t.chave === tipo)?.label;

  useEffect(() => {
    if (item) document.title = `${item.titulo} · ${emp.nome}`;
  }, [item, emp]);

  const voltar = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(`/empreendimento/${slug}`));

  if (carregando) return <div className="visor"><p className="visor__aviso">Carregando…</p></div>;
  if (!item?.url) {
    return (
      <div className="visor">
        <p className="visor__aviso">
          Material não encontrado. <Link to={emp ? `/empreendimento/${slug}` : '/'}>Voltar</Link>
        </p>
      </div>
    );
  }

  const { modo, src, talvezBloqueado } = comoExibir(item);

  return (
    <div className="visor">
      <header className="visor__topo">
        <button type="button" className="btn-icone" onClick={voltar} aria-label="Voltar">
          <Icon name="arrowLeft" />
        </button>
        <div className="visor__titulo">
          <strong>{item.titulo}</strong>
          <span>{emp.nome}{rotuloTipo ? ` · ${rotuloTipo}` : ''}</span>
        </div>
        <a className="visor__abrir" href={item.url} target="_blank" rel="noopener noreferrer">
          <Icon name="external" size={17} /> <span>Abrir em nova aba</span>
        </a>
      </header>

      <div className="visor__conteudo">
        {modo === 'imagem' && <img className="visor__imagem" src={src} alt={item.titulo} />}
        {modo === 'video' && <video className="visor__video" src={src} controls playsInline />}
        {modo === 'iframe' && (
          <iframe
            className="visor__frame"
            src={src}
            title={item.titulo}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          />
        )}
        {modo === 'externo' && (
          <p className="visor__aviso">
            Este link não pode ser exibido aqui. Use <strong>Abrir em nova aba</strong>.
          </p>
        )}
      </div>
      {talvezBloqueado && (
        <p className="visor__rodape">Não apareceu? Alguns sites bloqueiam a visualização. Use “Abrir em nova aba”.</p>
      )}
    </div>
  );
}
