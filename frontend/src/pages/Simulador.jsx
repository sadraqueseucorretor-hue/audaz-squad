import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';
import { useDados } from '../context/DadosContext.jsx';
import { tituloDaAba } from '../utils/tituloAba.js';
import { sanitizarUrl } from '../utils/urls.js';

// Aba "Simulador": a ferramenta externa de propostas/disponibilidade (link definido no painel),
// aberta em tela cheia dentro do Audaz Squad. O simulador bloqueia "Imprimir" e "Baixar PDF" quando
// está dentro de um quadro (iframe) e não dá para imprimir um quadro de outro site por inteiro (sai
// cortado). Por isso "Gerar PDF" guia o corretor a levar a simulação, pelo código dela, para o
// simulador numa aba própria, onde o PDF sai completo.
export default function Simulador() {
  const navigate = useNavigate();
  const { site } = useDados();
  const link = site.simuladorUrl ? sanitizarUrl(site.simuladorUrl) : null;
  const url = link?.valida ? link.url : null;
  // Trocar a chave recarrega o quadro: volta ao início do simulador se o corretor navegar lá dentro.
  const [versao, setVersao] = useState(0);
  const [guiaPdf, setGuiaPdf] = useState(false);

  useEffect(() => {
    if (!guiaPdf) return undefined;
    const fechar = (e) => e.key === 'Escape' && setGuiaPdf(false);
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [guiaPdf]);

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
        {url && (
          <button type="button" className="visor__botao" onClick={() => setGuiaPdf(true)}>
            <Icon name="download" size={17} /> <span className="tabela-pagina__rotulo">Gerar PDF</span>
          </button>
        )}
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
        <Icon name="info" size={14} /> Simulador por Corretor Desenrolado (Emanuel Santiago) · para a proposta caber em 1 página, ligue o “Modo Resumido Impressão” antes de gerar o PDF.
      </p>

      {guiaPdf && (
        <div className="guia-pdf" role="dialog" aria-modal="true" aria-labelledby="guia-pdf-titulo" onClick={() => setGuiaPdf(false)}>
          <div className="guia-pdf__caixa" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="guia-pdf__fechar" onClick={() => setGuiaPdf(false)} aria-label="Fechar">
              <Icon name="close" size={18} />
            </button>
            <h2 id="guia-pdf-titulo">Gerar o PDF completo</h2>
            <p>O simulador só gera o PDF fora deste quadro. Leve a sua simulação para lá em 3 passos:</p>
            <ol>
              <li>No simulador, clique em <strong>Código</strong>, depois em <strong>Gerar</strong> e em <strong>Copiar</strong>.</li>
              <li>Clique no botão abaixo: o simulador abre numa aba nova.</li>
              <li>Lá, cole em <strong>Carregar código</strong>, clique em <strong>Carregar</strong> e depois em <strong>Baixar PDF</strong>.</li>
            </ol>
            <p className="guia-pdf__dica">Na primeira vez, o simulador pode pedir para entrar com a sua conta.</p>
            <div className="guia-pdf__acoes">
              <button type="button" className="btn btn--ghost" onClick={() => setGuiaPdf(false)}>Voltar</button>
              <a className="btn btn--primary" href={url} target="_blank" rel="noopener noreferrer" onClick={() => setGuiaPdf(false)}>
                <Icon name="external" size={18} /> Abrir simulador em nova aba
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
