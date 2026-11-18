import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';
import PlanoModal from './PlanoModal.jsx';
import { useDados } from '../context/DadosContext.jsx';
import { tituloDaAba } from '../utils/tituloAba.js';
import { sanitizarUrl } from '../utils/urls.js';

// Aba "Simulador": a ferramenta externa de propostas/disponibilidade (link definido no painel),
// aberta em tela cheia dentro do Audaz Squad. Imprimir/gerar PDF pode exigir abrir fora do quadro.
export default function Simulador() {
  const navigate = useNavigate();
  const { site } = useDados();
  const link = site.simuladorUrl ? sanitizarUrl(site.simuladorUrl) : null;
  const url = link?.valida ? link.url : null;
  // Trocar a chave recarrega o quadro: volta ao início do simulador se o corretor navegar lá dentro.
  const [versao, setVersao] = useState(0);
  const [planoAberto, setPlanoAberto] = useState(false);

  useEffect(() => {
    document.title = tituloDaAba(site, 'Simulador');
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
          <strong>Simulador</strong>
          <span>Propostas e unidades disponíveis</span>
        </div>
        {url && (
          <button type="button" className="visor__botao visor__botao--claro" onClick={() => setVersao((v) => v + 1)} title="Voltar ao início do simulador">
            <Icon name="refresh" size={17} /> <span className="tabela-pagina__rotulo">Recomeçar</span>
          </button>
        )}
        {url && (
          <a className="visor__botao visor__botao--claro" href={url} target="_blank" rel="noopener noreferrer" title="Abrir em nova aba">
            <Icon name="external" size={17} />
          </a>
        )}
        {/* Gera o plano de pagamento resumido a partir do código do simulador (botão "Código"). */}
        <button type="button" className="visor__botao" onClick={() => setPlanoAberto(true)}>
          <Icon name="download" size={17} /> <span className="tabela-pagina__rotulo">Gerar plano</span>
        </button>
      </header>

      <div className="tabela-pagina__conteudo">
        {url ? (
          <>
            {/* Fica POR TRÁS do quadro: o simulador leva alguns segundos para se desenhar e, até lá, o
                quadro é transparente — o corretor vê o aviso de carregamento, não uma tela branca. */}
            <div className="tabelas-split__carregando"><span className="visor__spinner" /> Carregando simulador…</div>
            {/* A barra de navegação do site do simulador (fixa no topo dele, 65 px) fica fora da área
                visível: o corretor fica só no simulador, sem sair para as outras páginas daquele site. */}
            <div className="simulador__folha">
            <iframe
              key={versao}
              className="visor__frame simulador__frame"
              src={url}
              title="Simulador de propostas"
              allow="clipboard-write"
            />
            </div>
          </>
        ) : (
          <p className="vazio">O simulador ainda não foi configurado no painel.</p>
        )}
      </div>
      <p className="simulador__aviso">
        <Icon name="info" size={14} /> Simulador por Corretor Desenrolado (Emanuel Santiago) · copie o “Código” da simulação e clique em “Gerar plano” para baixar o resumo em PDF.
      </p>
      <PlanoModal aberto={planoAberto} aoFechar={() => setPlanoAberto(false)} />
    </div>
  );
}
