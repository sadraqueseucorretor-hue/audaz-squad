import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';
import SearchBar from '../components/SearchBar.jsx';
import FilterChips from '../components/FilterChips.jsx';
import { ordenarPorEntrega } from '../utils/entrega.js';
import EmpreendimentoCard from '../components/EmpreendimentoCard.jsx';
import Footer from '../components/Footer.jsx';
import { STATUS } from '../data/config.js';
import { useDados } from '../context/DadosContext.jsx';
import {
  filtrarEmpreendimentos,
  opcoesUnicas,
} from '../utils/empreendimentos.js';

export default function Home() {
  // Busca e filtros ficam na URL: ao voltar de um empreendimento, o corretor não perde a pesquisa.
  const [params, setParams] = useSearchParams();
  const busca = params.get('q') || '';
  const status = params.get('status') || '';
  const cidade = params.get('cidade') || '';
  const construtora = params.get('construtora') || '';
  // Ordem da lista: '' (definida no painel) | 'entrega' (mais próxima) | 'entrega-desc' (mais distante).
  const ordem = params.get('ordem') || '';

  const atualizar = (chave, valor) => {
    const novo = new URLSearchParams(params);
    valor ? novo.set(chave, valor) : novo.delete(chave);
    setParams(novo, { replace: true });
  };

  const { empreendimentos: todos, site: SITE, carregando } = useDados();
  const resultado = useMemo(() => {
    const filtrados = filtrarEmpreendimentos(todos, { busca, status, cidade, construtora });
    return ordem ? ordenarPorEntrega(filtrados, ordem === 'entrega-desc') : filtrados;
  }, [todos, busca, status, cidade, construtora, ordem]);
  const filtrando = Boolean(busca || status || cidade || construtora);

  const opcoesStatus = Object.entries(STATUS)
    .filter(([chave]) => todos.some((e) => e.status === chave))
    .map(([valor, { label }]) => ({ valor, label }));
  const opcoesCidade = opcoesUnicas(todos, 'cidade').map((c) => ({ valor: c, label: c }));
  const opcoesConstrutora = opcoesUnicas(todos, 'construtora').map((c) => ({ valor: c, label: c }));

  return (
    <>
      <header className="hero">
        <div className="container">
          <nav className="hero__nav">
            <Logo />
            <div className="hero__botoes">
              {SITE.tabelaValoresUrl && (
                <Link to="/tabela-valores" className="btn-admin btn-admin--destaque">
                  <Icon name="table" size={16} /> Tabela de valores
                </Link>
              )}
              <Link to="/admin" className="btn-admin">
                <Icon name="key" size={16} /> Acesso Admin
              </Link>
            </div>
          </nav>
          <div className="hero__conteudo">
            <p className="hero__eyebrow">{SITE.marca} · {SITE.parceiro}</p>
            <h1 className="hero__titulo">{SITE.titulo}</h1>
            <p className="hero__sub">{SITE.subtitulo}</p>
          </div>
          <div className="hero__busca">
            <SearchBar valor={busca} onChange={(v) => atualizar('q', v)} />
          </div>
        </div>
      </header>

      <main className="container main">
        <div className="filtros">
          <FilterChips rotulo="Status" opcoes={opcoesStatus} valor={status} onChange={(v) => atualizar('status', v)} />
          {opcoesCidade.length > 1 && (
            <FilterChips rotulo="Cidade" opcoes={opcoesCidade} valor={cidade} onChange={(v) => atualizar('cidade', v)} rotuloTodos="Todas" />
          )}
          {opcoesConstrutora.length > 1 && (
            <FilterChips rotulo="Construtora" opcoes={opcoesConstrutora} valor={construtora} onChange={(v) => atualizar('construtora', v)} rotuloTodos="Todas" />
          )}
        </div>


        <section className="secao" aria-labelledby="catalogo-titulo">
          <div className="secao__head">
            <h2 id="catalogo-titulo" className="secao__titulo">
              {filtrando ? 'Resultados' : 'Todos os empreendimentos'}
            </h2>
            <div className="secao__acoes">
              <label className="ordenar">
                <Icon name="clock" size={15} />
                <span className="sr-only">Ordenar</span>
                <select value={ordem} onChange={(e) => atualizar('ordem', e.target.value)} aria-label="Ordenar empreendimentos">
                  <option value="">Ordem padrão</option>
                  <option value="entrega">Entrega mais próxima</option>
                  <option value="entrega-desc">Entrega mais distante</option>
                </select>
              </label>
              <span className="secao__contador" aria-live="polite">
                {resultado.length} {resultado.length === 1 ? 'empreendimento' : 'empreendimentos'}
              </span>
            </div>
          </div>

          {carregando ? (
            <p className="vazio">Carregando empreendimentos…</p>
          ) : resultado.length ? (
            <div className="grade">
              {resultado.map((emp, i) => (
                <EmpreendimentoCard key={emp.slug} emp={emp} prioridade={i < 2} />
              ))}
            </div>
          ) : (
            <div className="vazio">
              <p>{filtrando ? 'Nenhum empreendimento encontrado para essa busca.' : 'Nenhum empreendimento publicado ainda.'}</p>
              {filtrando && (
                <button type="button" className="btn btn--ghost" onClick={() => setParams({}, { replace: true })}>
                  Limpar busca e filtros
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
