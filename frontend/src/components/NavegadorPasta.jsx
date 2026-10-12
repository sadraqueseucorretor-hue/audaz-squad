import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { analisarLinkDrive } from '../utils/drive.js';
import { listarItensPasta, nomeDeExibicao, tipoDoArquivo } from '../utils/pastaDrive.js';

const ICONE = { imagem: 'image', video: 'play', pdf: 'doc', documento: 'doc', outro: 'doc' };
const ROTULO = { imagem: 'Imagem', video: 'Vídeo', pdf: 'PDF', documento: 'Documento', outro: 'Arquivo' };

const miniatura = (id, largura) => `https://drive.google.com/thumbnail?id=${id}&sz=w${largura}`;

// Miniatura do arquivo (gerada pelo Drive); sem miniatura, o ícone do tipo.
function Miniatura({ item, largura = 320, className = '' }) {
  const [falhou, setFalhou] = useState(false);
  const tipo = tipoDoArquivo(item);
  if (falhou) return <span className={`navegador__mini navegador__mini--icone ${className}`}><Icon name={ICONE[tipo]} size={22} /></span>;
  return (
    <span className={`navegador__mini ${className}`}>
      <img src={miniatura(item.id, largura)} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFalhou(true)} />
    </span>
  );
}

// Visualização grande do arquivo escolhido: foto em alta, PDF/vídeo/documento completos.
function Previa({ item }) {
  const tipo = tipoDoArquivo(item);
  const [fotoFalhou, setFotoFalhou] = useState(false);
  if (tipo === 'imagem' && !fotoFalhou) {
    return <img className="navegador__foto" src={miniatura(item.id, 2000)} alt={nomeDeExibicao(item.nome)} referrerPolicy="no-referrer" onError={() => setFotoFalhou(true)} />;
  }
  const docs = item.tipo.startsWith('application/vnd.google-apps.') ? analisarLinkDrive(item.url) : null;
  const src = docs?.valido ? docs.urlPreview : `https://drive.google.com/file/d/${item.id}/preview`;
  return (
    <>
      <div className="navegador__carregando"><span className="visor__spinner" /> Carregando…</div>
      <iframe key={item.id} className="navegador__frame" src={src} title={item.nome} allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads" />
    </>
  );
}

/**
 * Navegador de uma pasta do Google Drive dentro do Audaz Squad: pastas e arquivos à
 * esquerda (com caminho para voltar), visualização grande à direita. Abrindo uma pasta,
 * mostra a grade com tudo que tem dentro. Fotos passam com as setas (tela e teclado).
 */
export default function NavegadorPasta({ pastaId, nomeRaiz = 'Início' }) {
  const [caminho, setCaminho] = useState([{ id: pastaId, nome: nomeRaiz }]);
  const atual = caminho[caminho.length - 1];
  const [conteudo, setConteudo] = useState({ carregando: true });
  const [arquivoId, setArquivoId] = useState(null);

  useEffect(() => {
    let ativo = true;
    setConteudo({ carregando: true });
    setArquivoId(null);
    listarItensPasta(atual.id).then((r) => ativo && setConteudo({ carregando: false, ...r }));
    return () => {
      ativo = false;
    };
  }, [atual.id]);

  const itens = conteudo.itens || [];
  const pastas = itens.filter((i) => i.ehPasta);
  const arquivos = itens.filter((i) => !i.ehPasta);
  const posicao = arquivos.findIndex((a) => a.id === arquivoId);
  const selecionado = posicao >= 0 ? arquivos[posicao] : null;

  const entrar = (pasta) => setCaminho((c) => [...c, { id: pasta.id, nome: nomeDeExibicao(pasta.nome) }]);
  const voltarPara = (i) => setCaminho((c) => c.slice(0, i + 1));
  const passar = (d) => arquivos.length && setArquivoId(arquivos[(posicao + d + arquivos.length) % arquivos.length].id);

  // Setas do teclado passam os arquivos (fotos) quando um está aberto.
  useEffect(() => {
    if (!selecionado) return undefined;
    const aoTeclar = (e) => {
      if (e.target.closest?.('input, textarea, select')) return;
      if (e.key === 'ArrowRight') passar(1);
      if (e.key === 'ArrowLeft') passar(-1);
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  });

  if (conteudo.erro) {
    return (
      <div className="visor__aviso">
        <span className="visor__aviso-icone"><Icon name="alert" size={26} /></span>
        <strong>Não foi possível abrir a pasta</strong>
        <p>Confira se a pasta está compartilhada como “Qualquer pessoa com o link”.</p>
      </div>
    );
  }

  return (
    <div className={`navegador ${selecionado ? 'navegador--arquivo' : ''}`}>
      <nav className="navegador__caminho" aria-label="Caminho da pasta">
        {caminho.map((p, i) => (
          <span key={p.id}>
            {i > 0 && <Icon name="arrowRight" size={13} />}
            {i < caminho.length - 1 || selecionado ? (
              <button type="button" onClick={() => (i < caminho.length - 1 ? voltarPara(i) : setArquivoId(null))}>{p.nome}</button>
            ) : (
              <strong>{p.nome}</strong>
            )}
          </span>
        ))}
        {selecionado && (
          <span><Icon name="arrowRight" size={13} /><strong>{nomeDeExibicao(selecionado.nome)}</strong></span>
        )}
      </nav>

      <aside className="navegador__lista">
        {conteudo.carregando ? (
          <div className="navegador__vazio"><span className="visor__spinner" /> Carregando…</div>
        ) : (
          <>
            {caminho.length > 1 && (
              <button type="button" className="navegador__item navegador__item--voltar" onClick={() => voltarPara(caminho.length - 2)}>
                <Icon name="arrowLeft" size={18} /> <span>Voltar</span>
              </button>
            )}
            {pastas.map((p) => (
              <button key={p.id} type="button" className="navegador__item" onClick={() => entrar(p)}>
                <span className="navegador__mini navegador__mini--pasta"><Icon name="folder" size={20} /></span>
                <span className="navegador__nome">{nomeDeExibicao(p.nome)}</span>
                <Icon name="arrowRight" size={15} />
              </button>
            ))}
            {arquivos.map((a) => (
              <button key={a.id} type="button" className={`navegador__item ${a.id === arquivoId ? 'ativo' : ''}`} onClick={() => setArquivoId(a.id)}>
                <Miniatura item={a} largura={120} />
                <span className="navegador__nome">{nomeDeExibicao(a.nome)}</span>
              </button>
            ))}
            {!itens.length && <div className="navegador__vazio">Pasta vazia.</div>}
          </>
        )}
      </aside>

      <section className="navegador__visor">
        {selecionado ? (
          <>
            <header className="navegador__visor-topo">
              <button type="button" className="navegador__voltar-grade" onClick={() => setArquivoId(null)}>
                <Icon name="arrowLeft" size={16} /> {atual.nome}
              </button>
              <span className="navegador__contador">{posicao + 1} de {arquivos.length} · {ROTULO[tipoDoArquivo(selecionado)]}</span>
              <a className="navegador__abrir" href={selecionado.url} target="_blank" rel="noopener noreferrer">
                <Icon name="external" size={15} /> <span>Abrir original</span>
              </a>
            </header>
            <div className="navegador__palco">
              <Previa key={selecionado.id} item={selecionado} />
              {arquivos.length > 1 && (
                <>
                  <button type="button" className="navegador__seta navegador__seta--esq" aria-label="Anterior" onClick={() => passar(-1)}><Icon name="arrowLeft" /></button>
                  <button type="button" className="navegador__seta navegador__seta--dir" aria-label="Próximo" onClick={() => passar(1)}><Icon name="arrowRight" /></button>
                </>
              )}
            </div>
          </>
        ) : conteudo.carregando ? (
          <div className="navegador__vazio"><span className="visor__spinner" /> Carregando…</div>
        ) : (
          <div className="navegador__grade">
            {pastas.map((p) => (
              <button key={p.id} type="button" className="navegador__bloco navegador__bloco--pasta" onClick={() => entrar(p)}>
                <span className="navegador__bloco-capa"><Icon name="folder" size={40} /></span>
                <strong>{nomeDeExibicao(p.nome)}</strong>
                <small>Pasta</small>
              </button>
            ))}
            {arquivos.map((a) => (
              <button key={a.id} type="button" className="navegador__bloco" onClick={() => setArquivoId(a.id)}>
                <Miniatura item={a} largura={480} className="navegador__bloco-capa" />
                <strong>{nomeDeExibicao(a.nome)}</strong>
                <small>{ROTULO[tipoDoArquivo(a)]}</small>
              </button>
            ))}
            {!itens.length && <div className="navegador__vazio">Pasta vazia.</div>}
          </div>
        )}
      </section>
    </div>
  );
}
