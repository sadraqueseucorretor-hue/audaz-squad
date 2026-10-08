import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from './Icon.jsx';
import { ehRecente, formatarDataHora } from '../utils/format.js';
import { agruparArquivos, listarPastaDrive, mesDasTabelas, temChaveDrive } from '../utils/pastaDrive.js';

/**
 * Tabelas de uma pasta do Drive em tela dividida, na mesma página (sem popup/modal):
 * lista de empreendimentos à esquerda (por linha, com busca) e o PDF completo à direita.
 * No celular, a lista vira um seletor no topo e o PDF ocupa o resto da tela.
 * A tabela escolhida fica na URL (?tabela=id) — dá para compartilhar o link direto.
 */
export default function GaleriaTabelas({ pastaId, urlPasta }) {
  const [estado, setEstado] = useState({ carregando: true });
  const [busca, setBusca] = useState('');
  const [params, setParams] = useSearchParams();

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
  const todosGrupos = agruparArquivos(arquivos);
  const grupos = agruparArquivos(arquivos, busca);
  const ordenados = todosGrupos.flatMap((g) => g.itens);
  const mes = mesDasTabelas(arquivos);
  const selecionado = ordenados.find((a) => a.id === params.get('tabela')) || ordenados[0];

  // Mesmo empreendimento em dois arquivos: mostra o nome completo para diferenciar.
  const nomesRepetidos = new Set(ordenados.map((a) => a.empreendimento).filter((n, i, t) => t.indexOf(n) !== i));
  const rotulo = (a) => (nomesRepetidos.has(a.empreendimento) ? a.nomeAmigavel : a.empreendimento);

  const escolher = (id) => {
    if (id === selecionado?.id) return;
    setParams({ tabela: id }, { replace: true });
  };

  return (
    <div className="tabelas-split">
      <aside className="tabelas-split__lista" aria-label="Empreendimentos">
        <div className="tabelas-split__cabeca">
          <strong>Tabelas{mes ? ` — ${mes}` : ''}</strong>
          <label className="search tabelas-split__busca">
            <Icon name="search" className="search__icon" />
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar empreendimento" aria-label="Buscar tabela" />
          </label>
        </div>

        {estado.carregando ? (
          <div className="tabela-galeria__vazio"><span className="visor__spinner" /> Carregando…</div>
        ) : grupos.length === 0 ? (
          <div className="tabela-galeria__vazio">{busca ? 'Nada encontrado.' : 'A pasta ainda não tem tabelas.'}</div>
        ) : (
          <nav className="tabelas-split__grupos">
            {grupos.map((grupo) => (
              <section key={grupo.nome}>
                <h3>Linha {grupo.nome}</h3>
                {grupo.itens.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`tabelas-split__item ${a.id === selecionado?.id ? 'ativo' : ''}`}
                    aria-current={a.id === selecionado?.id ? 'true' : undefined}
                    onClick={() => escolher(a.id)}
                  >
                    <span>{rotulo(a)}</span>
                    {ehRecente(a.atualizadoEm, 3) && <em className="tabela-menu__nova">nova</em>}
                  </button>
                ))}
              </section>
            ))}
          </nav>
        )}

        {/* Celular: a lista vira um seletor (a tela não comporta lista + PDF lado a lado). */}
        {!estado.carregando && ordenados.length > 0 && (
          <label className="tabelas-split__seletor">
            <span className="sr-only">Empreendimento</span>
            <select value={selecionado?.id || ''} onChange={(e) => escolher(e.target.value)}>
              {todosGrupos.map((g) => (
                <optgroup key={g.nome} label={`Linha ${g.nome}`}>
                  {g.itens.map((a) => <option key={a.id} value={a.id}>{rotulo(a)}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
        )}

        {urlPasta && (
          <a className="tabelas-split__pasta" href={urlPasta} target="_blank" rel="noopener noreferrer">
            <Icon name="folder" size={15} /> Abrir a pasta no Google Drive
          </a>
        )}
      </aside>

      <section className="tabelas-split__visor" aria-live="polite">
        {selecionado ? (
          <>
            <header className="tabelas-split__visor-topo">
              <div>
                <strong>{rotulo(selecionado)}</strong>
                {selecionado.atualizadoEm && <span>Atualizada em {formatarDataHora(selecionado.atualizadoEm)}</span>}
              </div>
              <a href={selecionado.url} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
                <Icon name="external" size={16} /> <span className="tabela-pagina__rotulo">Abrir original</span>
              </a>
            </header>
            <div className="tabelas-split__pdf">
              {/* Fica atrás do PDF (iframe transparente até o Drive desenhar o arquivo). */}
              <div className="tabelas-split__carregando"><span className="visor__spinner" /> Carregando tabela…</div>
              <iframe
                key={selecionado.id}
                src={`https://drive.google.com/file/d/${selecionado.id}/preview`}
                title={`Tabela — ${rotulo(selecionado)}`}
                allow="fullscreen"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads"
              />
            </div>
          </>
        ) : (
          !estado.carregando && <div className="tabela-galeria__vazio">Escolha um empreendimento na lista.</div>
        )}
      </section>
    </div>
  );
}
