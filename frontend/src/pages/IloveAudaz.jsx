import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';
import { useDados } from '../context/DadosContext.jsx';
import { tituloDaAba } from '../utils/tituloAba.js';
import { sanitizarUrl } from '../utils/urls.js';

// "iLove Audaz" — Central de Documentos (declarações e ferramentas de PDF), outro sistema da Audaz
// no mesmo GitHub Pages. Abre em tela cheia dentro do Audaz Squad, com o cabeçalho do Audaz.
export default function IloveAudaz() {
  const navigate = useNavigate();
  const { site } = useDados();
  const link = site.iloveAudazUrl ? sanitizarUrl(site.iloveAudazUrl) : null;
  const url = link?.valida ? link.url : null;

  useEffect(() => {
    document.title = tituloDaAba(site, 'iLove Audaz');
  }, [site]);

  const voltar = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'));

  return (
    <div className="tabela-pagina">
      <header className="tabela-pagina__topo">
        <button type="button" className="btn-icone" onClick={voltar} aria-label="Voltar">
          <Icon name="arrowLeft" />
        </button>
        <Logo compacto />
        <div className="tabela-pagina__titulo">
          <strong>iLove Audaz</strong>
          <span>Central de Documentos · declarações e PDF</span>
        </div>
        {url && (
          <a className="visor__botao visor__botao--claro" href={url} target="_blank" rel="noopener noreferrer" title="Abrir em nova aba">
            <Icon name="external" size={17} /> <span className="tabela-pagina__rotulo">Abrir em nova aba</span>
          </a>
        )}
      </header>
      <div className="tabela-pagina__conteudo">
        {url ? (
          <>
            <div className="tabelas-split__carregando"><span className="visor__spinner" /> Carregando…</div>
            <iframe className="visor__frame ilove__frame" src={url} title="iLove Audaz — Central de Documentos" allow="clipboard-write" />
          </>
        ) : (
          <p className="vazio">O link do iLove Audaz não está configurado.</p>
        )}
      </div>
    </div>
  );
}
