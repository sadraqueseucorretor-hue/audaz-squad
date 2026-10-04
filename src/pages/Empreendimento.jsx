import { useCallback, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import SmartImage from '../components/SmartImage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import InfoGrid from '../components/InfoGrid.jsx';
import MaterialsSection from '../components/MaterialsSection.jsx';
import ShareButton from '../components/ShareButton.jsx';
import Footer from '../components/Footer.jsx';
import VisualizadorMaterial from '../components/VisualizadorMaterial.jsx';
import MapaEmpreendimento from '../components/MapaEmpreendimento.jsx';
import { listarMateriais } from '../utils/materiais.js';
import { useDados } from '../context/DadosContext.jsx';
import { buscarPorSlug, fotosDo } from '../utils/empreendimentos.js';

export default function Empreendimento() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { empreendimentos, site: SITE, carregando } = useDados();
  const emp = buscarPorSlug(empreendimentos, slug);
  // O material aberto fica na URL (?material=id): o link pode ser compartilhado e o
  // botão "voltar" do celular fecha o visualizador em vez de sair da página.
  const [params, setParams] = useSearchParams();
  const materialAberto = emp && params.get('material')
    ? listarMateriais(emp).find((m) => m.id === params.get('material') && m.ativo !== false)
    : null;
  const abrirMaterial = (m) => setParams({ material: m.id });
  const fecharMaterial = useCallback(
    () => (window.history.state?.idx > 0 && params.get('material') ? navigate(-1) : setParams({}, { replace: true })),
    [navigate, params, setParams]
  );

  useEffect(() => {
    if (params.get('material')) return;
    window.scrollTo(0, 0);
    document.title = emp ? `${emp.nome} · ${SITE.marca}` : SITE.titulo;
  }, [emp, SITE]);

  if (carregando) return <main className="container nao-encontrado"><Logo /><p>Carregando…</p></main>;

  if (!emp) {
    return (
      <main className="container nao-encontrado">
        <Logo />
        <h1>Empreendimento não encontrado</h1>
        <p>O link pode estar desatualizado.</p>
        <Link to="/" className="btn btn--primary">Ver todos os empreendimentos</Link>
      </main>
    );
  }

  // Volta preservando a busca anterior quando houver histórico; senão vai para a home.
  const voltar = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'));

  // Na página do empreendimento, só o prazo de entrega (os demais dados ficam no cadastro e no card).
  const info = [{ label: 'Entrega', valor: emp.entrega, icone: 'key', destaque: true }];

  return (
    <>
      <header className="banner">
        <SmartImage src={emp.banner || fotosDo(emp)[0]} alt={emp.nome} className="banner__img" eager largura={2000} />
        <div className="banner__overlay" />
        <div className="container banner__topo">
          <button type="button" className="btn-icone" onClick={voltar} aria-label="Voltar">
            <Icon name="arrowLeft" />
          </button>
          <Logo compacto />
        </div>
        <div className="container banner__conteudo">
          <StatusBadge status={emp.status} />
          <p className="banner__construtora">{emp.construtora}</p>
          <h1 className="banner__titulo">{emp.nome}</h1>
          <p className="banner__local">
            <Icon name="pin" size={16} /> {emp.bairro} · {emp.cidade}/{emp.uf}
          </p>
        </div>
      </header>

      <main className="container main main--detalhe">
        <div className="acoes-rapidas">
          {/* Botão (não âncora #) porque o HashRouter usa o # para as rotas */}
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => document.getElementById('materiais')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Ver materiais <Icon name="arrowRight" size={18} />
          </button>
          <ShareButton titulo={emp.nome} />
        </div>

        <section className="secao" aria-labelledby="info-titulo">
          <div className="secao__head">
            <h2 id="info-titulo" className="secao__titulo">Informações</h2>
          </div>
          {emp.endereco && (
            <p className="endereco">
              <Icon name="pin" size={18} />
              <span>{emp.endereco}</span>
            </p>
          )}
          {emp.observacoes?.trim() && (
            // Texto puro (sem HTML): quebras de linha preservadas pelo CSS.
            <aside className="observacoes" aria-label="Observações">
              <span className="observacoes__icone"><Icon name="info" size={20} /></span>
              <div>
                <strong>Observações</strong>
                <p>{emp.observacoes.trim()}</p>
              </div>
            </aside>
          )}
          <InfoGrid itens={info} />
          <MapaEmpreendimento emp={emp} />
        </section>

        <MaterialsSection emp={emp} onAbrir={abrirMaterial} />
      </main>

      <Footer />

      {materialAberto && (
        <VisualizadorMaterial key={materialAberto.id} material={materialAberto} contexto={emp.nome} onFechar={fecharMaterial} />
      )}
    </>
  );
}
