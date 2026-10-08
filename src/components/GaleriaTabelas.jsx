import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import VisualizadorMaterial from './VisualizadorMaterial.jsx';
import { ehRecente } from '../utils/format.js';
import { agruparArquivos, listarPastaDrive, mesDasTabelas, temChaveDrive } from '../utils/pastaDrive.js';

/**
 * Tabelas de uma pasta do Drive no formato de MENU por linha (Conquista, Viva Vida, Nature…),
 * só com o nome de cada empreendimento. Clicou, abre o PDF em tela cheia no Audaz Squad.
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

  const arquivos = estado.arquivos || [];
  const grupos = agruparArquivos(arquivos, busca);
  const mes = mesDasTabelas(arquivos);

  return (
    <div className="tabela-menu">
      <div className="tabela-menu__interno">
        <h2 className="tabela-menu__titulo">Tabelas de valores{mes ? ` — ${mes}` : ''}</h2>
        <label className="search tabela-menu__busca">
          <Icon name="search" className="search__icon" />
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar empreendimento" aria-label="Buscar tabela" />
          {busca && (
            <button type="button" className="search__clear" onClick={() => setBusca('')} aria-label="Limpar busca">
              <Icon name="close" size={18} />
            </button>
          )}
        </label>

        {estado.carregando ? (
          <div className="tabela-galeria__vazio"><span className="visor__spinner" /> Carregando tabelas…</div>
        ) : grupos.length === 0 ? (
          <div className="tabela-galeria__vazio">{busca ? 'Nenhuma tabela encontrada para essa busca.' : 'A pasta ainda não tem tabelas.'}</div>
        ) : (
          <div className="tabela-menu__linhas">
            {grupos.map((grupo) => {
              // Dois arquivos com o mesmo empreendimento: mostra o nome completo para diferenciar.
              const repetidos = grupo.itens.map((i) => i.empreendimento).filter((n, i, t) => t.indexOf(n) !== i);
              return (
                <section key={grupo.nome} className="tabela-menu__linha">
                  <h3>Linha {grupo.nome}</h3>
                  <div className="tabela-menu__itens">
                    {grupo.itens.map((arquivo) => (
                      <button key={arquivo.id} type="button" className="tabela-menu__item" onClick={() => setAberto(arquivo)}>
                        <span>
                          {repetidos.includes(arquivo.empreendimento) ? arquivo.nomeAmigavel : arquivo.empreendimento}
                          {ehRecente(arquivo.atualizadoEm, 3) && <em className="tabela-menu__nova">nova</em>}
                        </span>
                        <Icon name="arrowRight" size={16} />
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
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
          material={{ id: aberto.id, titulo: aberto.empreendimento, categoria: 'tabela', urlOriginal: aberto.url }}
          contexto={`Tabela de valores${mes ? ` · ${mes}` : ''}`}
          onFechar={() => setAberto(null)}
        />
      )}
    </div>
  );
}
