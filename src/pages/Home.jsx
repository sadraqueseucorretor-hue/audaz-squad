import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';
import EmpreendimentoCard from '../components/EmpreendimentoCard.jsx';
import Footer from '../components/Footer.jsx';
import { STATUS } from '../data/config.js';
import { useDados } from '../context/DadosContext.jsx';
import { anoEntrega, ordenarPorEntrega } from '../utils/entrega.js';
import { filtrarEmpreendimentos, fotosDo, opcoesUnicas, ultimaAtualizacao } from '../utils/empreendimentos.js';
import { urlImagem } from '../utils/drive.js';

const VISTA_CHAVE = 'audaz-vista-lista';

function dataAtualizacao(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return 'Atualizado hoje';
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return 'Atualizado ontem';
  return 'Última atualização';
}

// Caixa de seleção dos filtros (rótulo com ícone em cima, como no layout).
function Filtro({ icone, rotulo, valor, onChange, opcoes, todos = 'Todos' }) {
  return (
    <label className="inicio-filtro">
      <span><Icon name={icone} size={15} /> {rotulo}</span>
      <select value={valor} onChange={(e) => onChange(e.target.value)}>
        {todos !== null && <option value="">{todos}</option>}
        {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
      </select>
    </label>
  );
}

export default function Home() {
  // Busca e filtros ficam na URL: ao voltar de um empreendimento, o corretor não perde a pesquisa.
  const [params, setParams] = useSearchParams();
  const busca = params.get('q') || '';
  const status = params.get('status') || '';
  const cidade = params.get('cidade') || '';
  const construtora = params.get('construtora') || '';
  const ano = params.get('ano') || '';
  // Ordem: '' (definida no painel) | 'entrega' (mais próxima) | 'entrega-desc' (mais distante).
  const ordem = params.get('ordem') || '';
  const [textoBusca, setTextoBusca] = useState(busca);
  const [lista, setLista] = useState(() => {
    try {
      return localStorage.getItem(VISTA_CHAVE) === '1';
    } catch {
      return false;
    }
  });

  const atualizar = (chave, valor) => {
    const novo = new URLSearchParams(params);
    valor ? novo.set(chave, valor) : novo.delete(chave);
    setParams(novo, { replace: true });
  };
  const trocarVista = (emLista) => {
    setLista(emLista);
    try {
      localStorage.setItem(VISTA_CHAVE, emLista ? '1' : '0');
    } catch {
      // sem armazenamento: só não lembra a escolha
    }
  };

  const { empreendimentos: todos, site: SITE, carregando } = useDados();
  const resultado = useMemo(() => {
    const filtrados = filtrarEmpreendimentos(todos, { busca, status, cidade, construtora, ano });
    return ordem ? ordenarPorEntrega(filtrados, ordem === 'entrega-desc') : filtrados;
  }, [todos, busca, status, cidade, construtora, ano, ordem]);
  const filtrando = Boolean(busca || status || cidade || construtora || ano);

  const construtoras = opcoesUnicas(todos, 'construtora');
  const cidades = opcoesUnicas(todos, 'cidade');
  const anos = [...new Set(todos.map((e) => anoEntrega(e.entrega)).filter(Boolean))].sort();
  const opcoesStatus = Object.entries(STATUS)
    .filter(([chave]) => todos.some((e) => e.status === chave))
    .map(([valor, { label }]) => ({ valor, label }));
  const lancamentos = todos.filter((e) => e.status === 'lancamento').length;
  const ultima = todos.map((e) => ultimaAtualizacao(e).data).filter(Boolean).sort().pop();
  // Foto de fundo do topo: banner/1ª foto dos empreendimentos, na ordem do painel; se uma não
  // carregar (ex.: foto restrita no Drive), tenta a próxima.
  const fotosTopo = todos.map((e) => e.banner || fotosDo(e)[0]).filter(Boolean);
  const [falhasTopo, setFalhasTopo] = useState(0);
  const fotoTopo = fotosTopo[falhasTopo] ? urlImagem(fotosTopo[falhasTopo], 1600) : null;
  // "GRUPO DIRECIONAL" já tem a palavra Grupo; "Direcional" ganha o prefixo.
  const temGrupo = /^grupo\b/i.test((SITE.parceiro || '').trim());
  const nomeGrupo = temGrupo ? SITE.parceiro.trim() : `Grupo ${SITE.parceiro}`;
  const parceiroSemGrupo = (SITE.parceiro || '').trim().replace(/^grupo\s+/i, '');

  const buscar = (e) => {
    e.preventDefault();
    atualizar('q', textoBusca.trim());
    document.getElementById('empreendimentos')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <header className="inicio-topo">
        {fotoTopo && (
          <img key={fotoTopo} className="inicio-topo__foto" src={fotoTopo} alt="" referrerPolicy="no-referrer" onError={() => setFalhasTopo((n) => n + 1)} />
        )}
        <div className="inicio-topo__sombra" />

        <nav className="inicio-nav container">
          <div className="inicio-nav__marca">
            <Logo />
            {SITE.logoGrupoUrl ? (
              <img className="inicio-nav__logo-grupo" src={urlImagem(SITE.logoGrupoUrl, 800)} alt={nomeGrupo} referrerPolicy="no-referrer" />
            ) : (
              <span className="inicio-nav__grupo">
                <small>Grupo</small>
                <strong>{parceiroSemGrupo}</strong>
                {construtoras.length > 0 && <em>{construtoras.join('  |  ')}</em>}
              </span>
            )}
          </div>
          <div className="inicio-nav__links">
            <a href="#/" className="ativo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              <Icon name="building" size={17} /> Início
            </a>
            <a href="#empreendimentos" onClick={(e) => { e.preventDefault(); document.getElementById('empreendimentos')?.scrollIntoView({ behavior: 'smooth' }); }}>
              <Icon name="grid" size={17} /> Empreendimentos
            </a>
            <Link to="/admin"><Icon name="key" size={17} /> Acesso Admin</Link>
          </div>
          {SITE.tabelaValoresUrl && (
            <Link to="/tabela-valores" className="inicio-nav__tabela">
              <Icon name="table" size={18} /> Tabela de valores
            </Link>
          )}
        </nav>

        <div className="inicio-heroi container">
          <p className="inicio-heroi__marca">{SITE.marca}</p>
          <h1>{SITE.titulo}</h1>
          <p className="inicio-heroi__grupo">
            {[nomeGrupo, ...construtoras].map((n, i) => (
              <span key={n}>{i > 0 && <i>•</i>}{n}</span>
            ))}
          </p>
          <p className="inicio-heroi__sub">{SITE.subtitulo}</p>
          <form className="inicio-busca" onSubmit={buscar} role="search">
            <Icon name="search" size={20} />
            <input
              type="search"
              value={textoBusca}
              onChange={(e) => {
                setTextoBusca(e.target.value);
                if (!e.target.value) atualizar('q', '');
              }}
              placeholder="Buscar empreendimento, bairro, cidade ou construtora…"
              aria-label="Buscar empreendimentos"
            />
            <button type="submit">Buscar</button>
          </form>
        </div>
      </header>

      <div className="container inicio-numeros-wrap">
        <div className="inicio-numeros">
          <div><Icon name="building" size={30} /><span><strong>{todos.length}</strong> empreendimentos</span></div>
          <div><Icon name="rocket" size={30} /><span><strong>{lancamentos}</strong> {lancamentos === 1 ? 'lançamento' : 'lançamentos'}</span></div>
          <div>
            <Icon name="refresh" size={30} />
            <span>
              <b>{dataAtualizacao(ultima)}</b>
              {ultima && new Date(ultima).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div>
            <Icon name="map" size={30} />
            <span>
              <b>{construtoras.length} {construtoras.length === 1 ? 'construtora' : 'construtoras'}</b>
              {cidades.length} {cidades.length === 1 ? 'cidade' : 'cidades'}
            </span>
          </div>
        </div>

        <div className="inicio-filtros">
          <Filtro icone="pin" rotulo="Cidade" valor={cidade} onChange={(v) => atualizar('cidade', v)} opcoes={cidades.map((c) => ({ valor: c, label: c }))} todos="Todas" />
          <Filtro icone="building" rotulo="Construtora" valor={construtora} onChange={(v) => atualizar('construtora', v)} opcoes={construtoras.map((c) => ({ valor: c, label: c }))} todos="Todas" />
          <Filtro icone="tag" rotulo="Status" valor={status} onChange={(v) => atualizar('status', v)} opcoes={opcoesStatus} />
          <Filtro icone="calendar" rotulo="Ano de entrega" valor={ano} onChange={(v) => atualizar('ano', v)} opcoes={anos.map((a) => ({ valor: String(a), label: String(a) }))} />
          <span className="inicio-filtros__divisor" aria-hidden="true" />
          <Filtro
            icone="sliders"
            rotulo="Ordenar por"
            valor={ordem}
            onChange={(v) => atualizar('ordem', v)}
            todos="Ordem padrão"
            opcoes={[{ valor: 'entrega', label: 'Entrega mais próxima' }, { valor: 'entrega-desc', label: 'Entrega mais distante' }]}
          />
        </div>
      </div>

      <main className="container main inicio-main" id="empreendimentos">
        <div className="inicio-secao">
          <h2>Empreendimentos</h2>
          <div className="inicio-secao__direita">
            <span aria-live="polite">
              {resultado.length} {resultado.length === 1 ? 'empreendimento encontrado' : 'empreendimentos encontrados'}
            </span>
            {filtrando && (
              <button type="button" className="inicio-limpar" onClick={() => { setTextoBusca(''); setParams({}, { replace: true }); }}>
                Limpar filtros
              </button>
            )}
            <div className="inicio-vista" role="group" aria-label="Forma de exibir">
              <button type="button" className={!lista ? 'ativo' : ''} aria-pressed={!lista} aria-label="Grade" onClick={() => trocarVista(false)}><Icon name="grid" size={18} /></button>
              <button type="button" className={lista ? 'ativo' : ''} aria-pressed={lista} aria-label="Lista" onClick={() => trocarVista(true)}><Icon name="list" size={18} /></button>
            </div>
          </div>
        </div>

        {carregando ? (
          <p className="vazio">Carregando empreendimentos…</p>
        ) : resultado.length ? (
          <div className={lista ? 'inicio-lista' : 'inicio-grade'}>
            {resultado.map((emp, i) => (
              <EmpreendimentoCard key={emp.slug} emp={emp} prioridade={i < 4} emLista={lista} />
            ))}
          </div>
        ) : (
          <div className="vazio">
            <p>{filtrando ? 'Nenhum empreendimento encontrado para essa busca.' : 'Nenhum empreendimento publicado ainda.'}</p>
            {filtrando && (
              <button type="button" className="btn btn--ghost" onClick={() => { setTextoBusca(''); setParams({}, { replace: true }); }}>
                Limpar busca e filtros
              </button>
            )}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
