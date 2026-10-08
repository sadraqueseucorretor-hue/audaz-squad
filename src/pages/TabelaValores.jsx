import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';
import { useDados } from '../context/DadosContext.jsx';
import { analisarUrlMaterial } from '../utils/materiais.js';

// Aba "Tabela de valores": a planilha (Google Sheets) cadastrada no admin, em tela cheia.
export default function TabelaValores() {
  const navigate = useNavigate();
  const { site, siteCarregado } = useDados();
  const analise = site.tabelaValoresUrl ? analisarUrlMaterial(site.tabelaValoresUrl) : null;
  const [carregou, setCarregou] = useState(false);

  useEffect(() => {
    document.title = `Tabela de valores · ${site.marca}`;
  }, [site.marca]);

  const voltar = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'));
  const embutivel = analise?.valido && analise.modo === 'iframe';

  return (
    <div className="tabela-pagina">
      <header className="tabela-pagina__topo">
        <button type="button" className="btn-icone" onClick={voltar} aria-label="Voltar">
          <Icon name="arrowLeft" />
        </button>
        <Logo compacto />
        <div className="tabela-pagina__titulo">
          <strong>Tabela de valores</strong>
          <span>{embutivel ? 'Troque de empreendimento pelas abas na parte de baixo da tabela' : site.marca}</span>
        </div>
        {analise?.valido && (
          <a className="visor__botao" href={analise.urlOriginal} target="_blank" rel="noopener noreferrer">
            <Icon name="external" size={17} /> <span className="tabela-pagina__rotulo">Abrir planilha original</span>
          </a>
        )}
      </header>

      <div className="tabela-pagina__conteudo">
        {!siteCarregado ? null : embutivel ? (
          <>
            {!carregou && (
              <div className="visor__camada" aria-live="polite">
                <span className="visor__spinner" aria-hidden="true" />
                <p>Carregando tabela…</p>
              </div>
            )}
            <iframe
              className="visor__frame"
              src={analise.urlPreview}
              title="Tabela de valores"
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
              onLoad={() => setCarregou(true)}
            />
          </>
        ) : (
          <div className="visor__aviso">
            <span className="visor__aviso-icone"><Icon name="table" size={26} /></span>
            <strong>{analise?.valido ? 'A tabela abre fora do Audaz Squad' : 'Tabela de valores em breve'}</strong>
            <p>
              {analise?.valido
                ? 'O endereço cadastrado não permite exibição aqui dentro. Use o botão acima para abrir.'
                : 'A tabela de valores ainda não foi publicada.'}
            </p>
            <Link to="/" className="visor__botao visor__botao--claro">Voltar aos empreendimentos</Link>
          </div>
        )}
      </div>
    </div>
  );
}
