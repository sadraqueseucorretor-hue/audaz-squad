import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import VisualizadorMaterial from './VisualizadorMaterial.jsx';
import { formatarDataHora, ehRecente } from '../utils/format.js';
import { agruparArquivos, listarPastaDrive, temChaveDrive } from '../utils/pastaDrive.js';

// Prévia da 1ª página: miniatura do Drive; se o Drive não tiver, a página reduzida pelo visualizador.
function PreviaArquivo({ arquivo }) {
  const [etapa, setEtapa] = useState('imagem');
  if (etapa === 'imagem') {
    return (
      <span className="tabela-card__previa">
        <img
          src={`https://drive.google.com/thumbnail?id=${arquivo.id}&sz=w600`}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setEtapa('pagina')}
        />
      </span>
    );
  }
  return (
    <span className="tabela-card__previa material__previa--pagina">
      <span className="material__previa-carregando"><Icon name="table" size={30} /></span>
      <iframe src={`https://drive.google.com/file/d/${arquivo.id}/preview`} title="" tabIndex={-1} loading="lazy" sandbox="allow-scripts allow-same-origin" />
    </span>
  );
}

/**
 * Galeria com todas as tabelas de uma pasta do Drive, agrupadas por linha, com busca.
 * Clicou, abre o arquivo em tela cheia no visualizador do Audaz Squad.
 */
export default function GaleriaTabelas({ pastaId, urlPasta }) {
  const [estado, setEstado] = useState({ carregando: true });
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(null);

  useEffect(() => {
    let ativo = true;
    listarPastaDrive(pastaId).then((r) => ativo && setEstado({ carregando: false, ...r }));
    return () => {
      ativo = false;
    };
  }, [pastaId]);

  // Sem chave da API (ou erro): mostra a própria pasta do Drive, que ao menos lista os arquivos.
  if (!estado.carregando && (estado.erro || !temChaveDrive())) {
    return (
      <div className="tabela-galeria tabela-galeria--simples">
        <iframe className="visor__frame" src={`https://drive.google.com/embeddedfolderview?id=${pastaId}#grid`} title="Tabelas" />
      </div>
    );
  }

  const grupos = estado.arquivos ? agruparArquivos(estado.arquivos, busca) : [];
  const total = estado.arquivos?.length || 0;

  return (
    <div className="tabela-galeria">
      <div className="tabela-galeria__interno">
        <div className="tabela-galeria__topo">
          <label className="search tabela-galeria__busca">
            <Icon name="search" className="search__icon" />
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar empreendimento" aria-label="Buscar tabela" />
          </label>
          {!estado.carregando && <span className="secao__contador">{total} {total === 1 ? 'tabela' : 'tabelas'}</span>}
        </div>

        {estado.carregando ? (
          <div className="tabela-galeria__vazio"><span className="visor__spinner" /> Carregando tabelas…</div>
        ) : grupos.length === 0 ? (
          <div className="tabela-galeria__vazio">{busca ? 'Nenhuma tabela encontrada para essa busca.' : 'A pasta ainda não tem tabelas.'}</div>
        ) : (
          grupos.map((grupo) => (
            <section key={grupo.nome} className="tabela-galeria__grupo">
              <h2>{grupo.nome.startsWith('Linha') ? grupo.nome : `Linha ${grupo.nome}`}</h2>
              <div className="tabela-galeria__grade">
                {grupo.itens.map((arquivo) => (
                  <button key={arquivo.id} type="button" className="tabela-card" onClick={() => setAberto(arquivo)}>
                    <PreviaArquivo arquivo={arquivo} />
                    <span className="tabela-card__info">
                      <strong>{arquivo.nomeAmigavel}</strong>
                      {arquivo.atualizadoEm && (
                        <small className={ehRecente(arquivo.atualizadoEm) ? 'nova' : ''}>
                          <Icon name="clock" size={13} /> Atualizada em {formatarDataHora(arquivo.atualizadoEm)}
                        </small>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
        {urlPasta && (
          <p className="tabela-galeria__rodape">
            <a href={urlPasta} target="_blank" rel="noopener noreferrer"><Icon name="folder" size={15} /> Abrir a pasta no Google Drive</a>
          </p>
        )}
      </div>

      {aberto && (
        <VisualizadorMaterial
          key={aberto.id}
          material={{ id: aberto.id, titulo: aberto.nomeAmigavel, categoria: 'tabela', urlOriginal: aberto.url }}
          contexto="Tabela de valores"
          onFechar={() => setAberto(null)}
        />
      )}
    </div>
  );
}
