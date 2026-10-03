import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';
import SearchBar from '../components/SearchBar.jsx';
import FilterChips from '../components/FilterChips.jsx';
import EmpreendimentoCard from '../components/EmpreendimentoCard.jsx';
import RecentesSection from '../components/RecentesSection.jsx';
import Footer from '../components/Footer.jsx';
import { STATUS, RECENTES_LIMITE } from '../data/config.js';
import { useDados } from '../context/DadosContext.jsx';
import {
  filtrarEmpreendimentos,
  opcoesUnicas,
  atualizadosRecentemente,
} from '../utils/empreendimentos.js';

export default function Home() {
  // Busca e filtros ficam na URL: ao voltar de um empreendimento, o corretor não perde a pesquisa.
  const [params, setParams] = useSearchParams();
  const busca = params.get('q') || '';
  const status = params.get('status') || '';
  const cidade = params.get('cidade') || '';

  const atualizar = (chave, valor) => {
    const novo = new URLSearchParams(params);
    valor ? novo.set(chave, valor) : novo.delete(chave);
    setParams(novo, { replace: true });
  };

  const { empreendimentos: todos, site: SITE, carregando } = useDados();
  const resultado = useMemo(() => filtrarEmpreendimentos(todos, { busca, status, cidade }), [todos, busca, status, cidade]);
  const recentes = useMemo(() => atualizadosRecentemente(todos, RECENTES_LIMITE), [todos]);
  const filtrando = Boolean(busca || status || cidade);

  const opcoesStatus = Object.entries(STATUS)
    .filter(([chave]) => todos.some((e) => e.status === chave))
    .map(([valor, { label }]) => ({ valor, label }));
  const opcoesCidade = opcoesUnicas(todos, 'cidade').map((c) => ({ valor: c, label: c }));

  return (
    <>
      <header className="hero">
        <div className="container">
          <nav className="hero__nav">
            <Logo />
            <Link to="/admin" className="btn-admin">
              <Icon name="key" size={16} /> Acesso Admin
            </Link>
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
        </div>

        {!filtrando && !carregando && <RecentesSection itens={recentes} />}

        <section className="secao" aria-labelledby="catalogo-titulo">
          <div className="secao__head">
            <h2 id="catalogo-titulo" className="secao__titulo">
              {filtrando ? 'Resultados' : 'Todos os empreendimentos'}
            </h2>
            <span className="secao__contador" aria-live="polite">
              {resultado.length} {resultado.length === 1 ? 'empreendimento' : 'empreendimentos'}
            </span>
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
