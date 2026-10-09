import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';
import EmpreendimentoCard from '../components/EmpreendimentoCard.jsx';
import Footer from '../components/Footer.jsx';
import { SELOS, STATUS } from '../data/config.js';
import { useDados } from '../context/DadosContext.jsx';
import { anoEntrega, ordenarPorEntrega } from '../utils/entrega.js';
import { filtrarEmpreendimentos, fotosDo, opcoesUnicas, selosDo, ultimaAtualizacao, visiveis } from '../utils/empreendimentos.js';
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
  const selo = params.get('selo') || '';
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

  // Forma funcional: a busca (com pausa) não apaga um filtro escolhido nesse meio-tempo.
  const atualizar = (chave, valor) => {
    setParams((atual) => {
      const novo = new URLSearchParams(atual);
      valor ? novo.set(chave, valor) : novo.delete(chave);
      return novo;
    }, { replace: true });
  };
  const trocarVista = (emLista) => {
    setLista(emLista);
    try {
      localStorage.setItem(VISTA_CHAVE, emLista ? '1' : '0');
    } catch {
      // sem armazenamento: só não lembra a escolha
    }
  };

  const { empreendimentos: cadastrados, site: SITE, carregando } = useDados();
  // Ocultados no painel não aparecem; os com selo (destaque, campanha…) vêm primeiro.
  const todos = useMemo(() => visiveis(cadastrados), [cadastrados]);
  const resultado = useMemo(() => {
    const filtrados = filtrarEmpreendimentos(todos, { busca, status, cidade, construtora, ano, selo });
    return ordem ? ordenarPorEntrega(filtrados, ordem === 'entrega-desc') : filtrados;
  }, [todos, busca, status, cidade, construtora, ano, selo, ordem]);
  const filtrando = Boolean(busca || status || cidade || construtora || ano || selo);
  // No celular os filtros ficam recolhidos atrás de um botão (mostra quantos estão ativos).
  const filtrosAtivos = [status, cidade, construtora, ano, ordem].filter(Boolean).length;
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  // Celular: os filtros abrem como painel deslizante por cima da página — a página atrás não rola.
  useEffect(() => {
    if (!filtrosAbertos || !window.matchMedia('(max-width: 640px)').matches) return undefined;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const aoTeclar = (e) => e.key === 'Escape' && setFiltrosAbertos(false);
    window.addEventListener('keydown', aoTeclar);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener('keydown', aoTeclar);
    };
  }, [filtrosAbertos]);

  // Busca enquanto digita (pequena pausa para não refiltrar a cada letra).
  useEffect(() => {
    if (textoBusca.trim() === busca) return undefined;
    const t = setTimeout(() => atualizar('q', textoBusca.trim()), 250);
    return () => clearTimeout(t);
  }, [textoBusca]); // eslint-disable-line react-hooks/exhaustive-deps

  // Celular: quando a busca do topo sai da tela, aparece uma barra fixa com busca e filtros.
  const buscaTopo = useRef(null);
  const [barraFixa, setBarraFixa] = useState(false);
  useEffect(() => {
    const alvo = buscaTopo.current;
    if (!alvo || !('IntersectionObserver' in window)) return undefined;
    const obs = new IntersectionObserver(([e]) => setBarraFixa(!e.isIntersecting && e.boundingClientRect.top < 0));
    obs.observe(alvo);
    return () => obs.disconnect();
  }, []);
  const selosUsados = Object.entries(SELOS).filter(([chave]) => todos.some((e) => selosDo(e).includes(chave)));

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
  // Logo do grupo que não carrega (ex.: arquivo do Drive não compartilhado) volta para o texto.
  const [falhaLogoGrupo, setFalhaLogoGrupo] = useState(false);
  const fotoTopo = fotosTopo[falhasTopo] ? urlImagem(fotosTopo[falhasTopo], 1600) : null;
  // "GRUPO DIRECIONAL" já tem a palavra Grupo; "Direcional" ganha o prefixo.
  const temGrupo = /^grupo\b/i.test((SITE.parceiro || '').trim());
  // Sem grupo/parceiro preenchido no painel, a linha mostra só as construtoras (nada de "Grupo" solto).
  const nomeGrupo = !(SITE.parceiro || '').trim() ? '' : temGrupo ? SITE.parceiro.trim() : `Grupo ${SITE.parceiro.trim()}`;
  const parceiroSemGrupo = (SITE.parceiro || '').trim().replace(/^grupo\s+/i, '');

  const buscar = (e) => {
    e.preventDefault();
    atualizar('q', textoBusca.trim());
    e.currentTarget.querySelector('input')?.blur(); // fecha o teclado do celular
    document.getElementById('empreendimentos')?.scrollIntoView({ behavior: 'smooth' });
  };
  const limparTudo = () => { setTextoBusca(''); setParams({}, { replace: true }); };
  const campoBusca = (placeholder) => (
    <input
      type="search"
      value={textoBusca}
      onChange={(e) => setTextoBusca(e.target.value)}
      placeholder={placeholder}
      aria-label="Buscar empreendimentos"
      enterKeyHint="search"
    />
  );

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
            {SITE.logoGrupoUrl && !falhaLogoGrupo ? (
              <img
                className="inicio-nav__logo-grupo"
                src={urlImagem(SITE.logoGrupoUrl, 800)}
                alt={nomeGrupo || 'Logo do grupo'}
                referrerPolicy="no-referrer"
                onError={() => setFalhaLogoGrupo(true)}
              />
            ) : (
              <span className="inicio-nav__grupo">
                {parceiroSemGrupo && <small>Grupo</small>}
                {parceiroSemGrupo && <strong>{parceiroSemGrupo}</strong>}
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
            {[nomeGrupo, ...construtoras].filter(Boolean).map((n, i) => (
              <span key={n}>{i > 0 && <i>•</i>}{n}</span>
            ))}
          </p>
          <p className="inicio-heroi__sub">{SITE.subtitulo}</p>
          <form className="inicio-busca" onSubmit={buscar} role="search" ref={buscaTopo}>
            <Icon name="search" size={20} />
            {campoBusca('Nome, bairro, construtora, status…')}
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

        <button
          type="button"
          className={`inicio-filtros-botao ${filtrosAbertos ? 'aberto' : ''}`}
          aria-expanded={filtrosAbertos}
          aria-controls="inicio-filtros"
          onClick={() => setFiltrosAbertos((v) => !v)}
        >
          <Icon name="sliders" size={18} /> Filtros e ordem
          {filtrosAtivos > 0 && <b>{filtrosAtivos}</b>}
          <Icon name="arrowRight" size={16} className="inicio-filtros-botao__seta" />
        </button>
        {filtrosAbertos && <div className="inicio-filtros-fundo" onClick={() => setFiltrosAbertos(false)} aria-hidden="true" />}
        <div className={`inicio-filtros ${filtrosAbertos ? 'aberto' : ''}`} id="inicio-filtros" role="group" aria-label="Filtros">
          <div className="inicio-filtros__topo">
            <strong>Filtros e ordem</strong>
            <button type="button" className="btn-icone" onClick={() => setFiltrosAbertos(false)} aria-label="Fechar filtros"><Icon name="close" size={20} /></button>
          </div>
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
          <div className="inicio-filtros__rodape">
            <button type="button" className="btn btn--ghost" onClick={limparTudo} disabled={!filtrando && !ordem}>Limpar</button>
            <button type="button" className="btn btn--primary" onClick={() => { setFiltrosAbertos(false); document.getElementById('empreendimentos')?.scrollIntoView(); }}>
              Ver {resultado.length} {resultado.length === 1 ? 'empreendimento' : 'empreendimentos'}
            </button>
          </div>
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
              <button type="button" className="inicio-limpar" onClick={limparTudo}>
                Limpar filtros
              </button>
            )}
            <div className="inicio-vista" role="group" aria-label="Forma de exibir">
              <button type="button" className={!lista ? 'ativo' : ''} aria-pressed={!lista} aria-label="Grade" onClick={() => trocarVista(false)}><Icon name="grid" size={18} /></button>
              <button type="button" className={lista ? 'ativo' : ''} aria-pressed={lista} aria-label="Lista" onClick={() => trocarVista(true)}><Icon name="list" size={18} /></button>
            </div>
          </div>
        </div>

        {selosUsados.length > 0 && (
          <div className="inicio-selos" role="group" aria-label="Mostrar só">
            <button type="button" className={!selo ? 'ativo' : ''} aria-pressed={!selo} onClick={() => atualizar('selo', '')}>Todos</button>
            {selosUsados.map(([chave, { label, icone }]) => (
              <button
                key={chave}
                type="button"
                className={`selo-${chave} ${selo === chave ? 'ativo' : ''}`}
                aria-pressed={selo === chave}
                onClick={() => atualizar('selo', selo === chave ? '' : chave)}
              >
                <Icon name={icone} size={16} /> {label}
              </button>
            ))}
          </div>
        )}

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
              <button type="button" className="btn btn--ghost" onClick={limparTudo}>
                Limpar busca e filtros
              </button>
            )}
          </div>
        )}
      </main>

      <Footer />

      {/* Celular: busca e filtros sempre à mão depois de rolar a página */}
      <form className={`inicio-barra ${barraFixa && !filtrosAbertos ? 'visivel' : ''}`} onSubmit={buscar} role="search" aria-hidden={!barraFixa}>
        <label className="inicio-barra__busca">
          <Icon name="search" size={18} />
          {campoBusca('Buscar empreendimento…')}
        </label>
        <button type="button" className="inicio-barra__filtros" onClick={() => setFiltrosAbertos(true)} aria-label="Filtros e ordem">
          <Icon name="sliders" size={19} />
          {filtrosAtivos > 0 && <b>{filtrosAtivos}</b>}
        </button>
      </form>
    </>
  );
}
