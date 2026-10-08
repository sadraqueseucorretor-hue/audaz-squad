import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';
import { useDados } from '../context/DadosContext.jsx';
import { analisarUrlMaterial } from '../utils/materiais.js';
import { listarAbasPlanilha, urlAbaPlanilha } from '../utils/planilha.js';

// Aba "Tabela de valores": a planilha (Google Sheets) cadastrada no admin, em tela cheia,
// com um menu próprio das abas da planilha (os links internos dela não funcionam embutidos).
export default function TabelaValores() {
  const navigate = useNavigate();
  const { site, siteCarregado } = useDados();
  const analise = site.tabelaValoresUrl ? analisarUrlMaterial(site.tabelaValoresUrl) : null;
  const planilha = analise?.valido && analise.drive?.tipo === 'planilha' ? analise.drive : null;
  const gidInicial = planilha?.urlPreview.match(/gid=(\d+)/)?.[1] || '';

  const [params, setParams] = useSearchParams();
  const [abas, setAbas] = useState([]);
  const [carregou, setCarregou] = useState(false);
  const abaAtual = params.get('aba') || gidInicial || abas[0]?.gid || '';

  useEffect(() => {
    document.title = `Tabela de valores · ${site.marca}`;
  }, [site.marca]);

  useEffect(() => {
    let ativo = true;
    if (planilha) listarAbasPlanilha(planilha.id).then((lista) => ativo && setAbas(lista));
    return () => {
      ativo = false;
    };
  }, [planilha?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const escolherAba = (gid) => {
    setCarregou(false);
    setParams(gid ? { aba: gid } : {}, { replace: true });
  };

  const voltar = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'));
  const embutivel = analise?.valido && analise.modo === 'iframe';
  const src = planilha ? urlAbaPlanilha(planilha.id, abaAtual) : analise?.urlPreview;

  return (
    <div className="tabela-pagina">
      <header className="tabela-pagina__topo">
        <button type="button" className="btn-icone" onClick={voltar} aria-label="Voltar">
          <Icon name="arrowLeft" />
        </button>
        <Logo compacto />
        <div className="tabela-pagina__titulo">
          <strong>Tabela de valores</strong>
          <span>{abas.find((a) => a.gid === abaAtual)?.nome || site.marca}</span>
        </div>
        {analise?.valido && (
          <a className="visor__botao" href={analise.urlOriginal} target="_blank" rel="noopener noreferrer">
            <Icon name="external" size={17} /> <span className="tabela-pagina__rotulo">Abrir planilha original</span>
          </a>
        )}
      </header>

      {abas.length > 1 && (
        <nav className="tabela-abas" aria-label="Empreendimentos da tabela">
          {abas.map((aba) => (
            <button
              key={aba.gid}
              type="button"
              className={`tabela-abas__item ${aba.gid === abaAtual ? 'ativo' : ''}`}
              aria-pressed={aba.gid === abaAtual}
              onClick={() => escolherAba(aba.gid)}
            >
              {aba.nome}
            </button>
          ))}
        </nav>
      )}

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
              key={src}
              className="visor__frame"
              src={src}
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
