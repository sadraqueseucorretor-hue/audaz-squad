import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { categoriaPorChave } from '../data/tiposMateriais.js';
import { analisarUrlMaterial } from '../utils/materiais.js';
import { arquivoEhPublico, temChaveDrive } from '../utils/pastaDrive.js';
import NavegadorPasta from './NavegadorPasta.jsx';

// Quanto esperar o conteúdo incorporado carregar antes de oferecer as alternativas.
const TEMPO_LIMITE_MS = 20000;

/**
 * Visualizador em tela cheia (modal) de um material, dentro do próprio site.
 * Fluxo: analisa o link → gera a URL de preview (Drive etc.) → tenta exibir →
 * se não der (site bloqueia, demora, link inválido), mostra explicação + botões
 * para abrir o original. Nunca fica uma tela branca sem saída.
 */
export default function VisualizadorMaterial({ material, contexto, onFechar }) {
  const analise = analisarUrlMaterial(material.urlOriginal);
  const categoria = categoriaPorChave(material.categoria);
  // Pasta do Drive: navegador próprio (pastas, arquivos e visualização grande), em vez da grade do Google.
  const ehPasta = analise.valido && analise.tipoOrigem === 'google_drive' && analise.drive.tipo === 'pasta' && temChaveDrive();
  const [estado, setEstado] = useState('carregando'); // carregando | pronto | demorou | falhou
  const botaoFechar = useRef(null);

  // Esc fecha, foco vai para o botão de fechar e a página atrás não rola.
  useEffect(() => {
    const anterior = document.activeElement;
    botaoFechar.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const aoTeclar = (e) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', aoTeclar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
  }, [onFechar]);

  // O componente é recriado a cada material (key no pai), então o estado já nasce "carregando".
  useEffect(() => {
    if (!analise.valido || analise.modo === 'externo' || ehPasta) return undefined;
    const t = setTimeout(() => setEstado((e) => (e === 'carregando' ? 'demorou' : e)), TEMPO_LIMITE_MS);
    return () => clearTimeout(t);
  }, [material.urlOriginal, analise.valido, analise.modo, ehPasta]);

  // Arquivo do Drive restrito: em vez da tela de login do Google, explica o que fazer.
  const idDrive = analise.valido && analise.tipoOrigem === 'google_drive' && !ehPasta ? analise.drive?.id : null;
  const [restrito, setRestrito] = useState(false);
  useEffect(() => {
    if (!idDrive) return undefined;
    let ativo = true;
    arquivoEhPublico(idDrive).then((publico) => ativo && setRestrito(publico === false));
    return () => { ativo = false; };
  }, [idDrive]);

  const urlOriginal = analise.valido ? analise.urlOriginal : null;
  const urlNovaAba = analise.valido ? (analise.modo === 'externo' ? analise.urlOriginal : analise.urlPreview) : null;
  const ehDrive = analise.valido && analise.tipoOrigem === 'google_drive';
  // PDF direto precisa do leitor nativo do navegador, que não roda em iframe com sandbox.
  const ehArquivoDireto = analise.valido && analise.urlPreview === analise.urlOriginal && /\.pdf$/i.test(new URL(analise.urlOriginal).pathname);

  const botoes = (
    <>
      {urlOriginal && (
        <a className="visor__botao" href={urlOriginal} target="_blank" rel="noopener noreferrer">
          <Icon name="external" size={17} /> Abrir arquivo original
        </a>
      )}
      {urlNovaAba && urlNovaAba !== urlOriginal && (
        <a className="visor__botao visor__botao--claro" href={urlNovaAba} target="_blank" rel="noopener noreferrer">
          <Icon name="eye" size={17} /> Abrir em nova aba
        </a>
      )}
    </>
  );

  let conteudo;
  if (ehPasta) {
    conteudo = <NavegadorPasta pastaId={analise.drive.id} nomeRaiz={material.titulo || 'Pasta'} />;
  } else if (!analise.valido) {
    conteudo = (
      <Aviso titulo="Material indisponível">
        O link cadastrado para este material não é válido. Avise o administrador para corrigir.
      </Aviso>
    );
  } else if (restrito) {
    conteudo = (
      <Aviso titulo="Arquivo sem acesso público" acoes={botoes}>
        Este arquivo no Google Drive não está compartilhado como “Qualquer pessoa com o link”, por isso não abre aqui.
        Se você tem acesso, use o botão abaixo; senão, avise o administrador.
      </Aviso>
    );
  } else if (analise.modo === 'externo' || estado === 'falhou') {
    conteudo = (
      <Aviso titulo="Este material abre fora do Audaz Squad" acoes={botoes}>
        O site onde o arquivo está não permite exibi-lo aqui dentro. Use o botão abaixo para abrir em uma nova aba.
      </Aviso>
    );
  } else {
    conteudo = (
      <>
        {analise.modo === 'iframe' && estado === 'pronto' && (
          // Fica POR TRÁS do iframe (que é transparente até o conteúdo ser desenhado):
          // o Drive costuma responder antes de terminar de pintar o PDF.
          <div className="visor__fundo" aria-hidden="true"><span className="visor__spinner" /></div>
        )}
        {analise.modo === 'iframe' && (
          <iframe
            key={analise.urlPreview}
            className="visor__frame"
            src={analise.urlPreview}
            title={material.titulo}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            sandbox={
              ehArquivoDireto
                ? undefined
                : 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-presentation allow-downloads'
            }
            onLoad={() => setEstado('pronto')}
          />
        )}
        {analise.modo === 'imagem' && (
          <img className="visor__imagem" src={analise.urlPreview} alt={material.titulo} onLoad={() => setEstado('pronto')} onError={() => setEstado('falhou')} />
        )}
        {analise.modo === 'video' && (
          <video className="visor__video" src={analise.urlPreview} controls playsInline onLoadedData={() => setEstado('pronto')} onError={() => setEstado('falhou')} />
        )}
        {estado === 'carregando' && (
          <div className="visor__camada" aria-live="polite">
            <span className="visor__spinner" aria-hidden="true" />
            <p>Carregando material…</p>
          </div>
        )}
        {estado === 'demorou' && (
          <div className="visor__camada">
            <Aviso titulo="Ainda carregando…" acoes={botoes}>
              {ehDrive
                ? 'Arquivos grandes do Google Drive podem levar alguns segundos. Se não abrir, use um dos botões abaixo — pode ser a conexão ou a permissão do arquivo.'
                : 'Se não abrir, use um dos botões abaixo — o site de origem pode estar lento ou bloqueando a visualização.'}
            </Aviso>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="visor" role="dialog" aria-modal="true" aria-labelledby="visor-titulo" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="visor__janela">
        <header className="visor__topo">
          <span className="visor__icone"><Icon name={categoria.icone} size={20} /></span>
          <div className="visor__titulo">
            <strong id="visor-titulo">{material.titulo}</strong>
            <span>{categoria.label}{contexto ? ` · ${contexto}` : ''}</span>
          </div>
          <button ref={botaoFechar} type="button" className="btn-icone visor__fechar" onClick={onFechar} aria-label="Fechar">
            <Icon name="close" />
          </button>
        </header>

        <div className="visor__conteudo">{conteudo}</div>

        {/* Quando o aviso já mostra os botões, o rodapé não repete. */}
        {!(restrito || !analise.valido || analise.modo === 'externo' || estado === 'falhou') && (
        <footer className="visor__rodape">
          {ehDrive && !restrito && (
            <p className="visor__dica">
              <Icon name="info" size={15} /> Se aparecer “Você precisa de acesso”, o arquivo no Drive precisa estar compartilhado como “Qualquer pessoa com o link”.
            </p>
          )}
          <div className="visor__acoes">{botoes}</div>
        </footer>
        )}
      </div>
    </div>
  );
}

function Aviso({ titulo, children, acoes }) {
  return (
    <div className="visor__aviso">
      <span className="visor__aviso-icone"><Icon name="alert" size={26} /></span>
      <strong>{titulo}</strong>
      <p>{children}</p>
      {acoes && <div className="visor__acoes">{acoes}</div>}
    </div>
  );
}
