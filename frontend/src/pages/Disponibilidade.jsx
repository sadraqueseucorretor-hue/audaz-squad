import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listarEmpreendimentosBV, obterDisponibilidade } from '../services/api.js';
import Icon from '../components/Icon.jsx';
import { normalizar } from '../utils/format.js';
import { agruparEspelho, numeroCurto, termosDeBusca, unidadeCombina } from '../utils/disponibilidade.js';

const formatarReais = (n) =>
  typeof n === 'number'
    ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';

// Definição das colunas. `larg` = largura inicial (px); `align` = alinhamento; `campo` = valor bruto
// (para ordenar e para ocultar a coluna quando nenhuma unidade tem valor nela).
const COLUNAS = [
  { key: 'unidade', label: 'Unidade', larg: 110, campo: 'identificador', sempre: true, get: (u) => u.identificador },
  { key: 'bloco', label: 'Bloco', larg: 90, campo: 'bloco', get: (u) => u.bloco || '—' },
  { key: 'andar', label: 'Andar', larg: 82, align: 'center', campo: 'andar', get: (u) => u.andar ?? '—' },
  { key: 'tipo', label: 'Tipo', larg: 130, campo: 'tipo', get: (u) => u.tipo || '—' },
  { key: 'planta', label: 'Planta', larg: 150, campo: 'tipo_planta', get: (u) => u.tipo_planta || '—' },
  { key: 'area', label: 'Área (m²)', larg: 110, align: 'right', campo: 'area_privativa', get: (u) => u.area_privativa ?? '—' },
  { key: 'qtos', label: 'Qtos', larg: 76, align: 'center', campo: 'num_quartos', get: (u) => u.num_quartos ?? '—' },
  { key: 'suites', label: 'Suítes', larg: 70, align: 'center', campo: 'num_suites', get: (u) => u.num_suites ?? '—' },
  { key: 'vagas', label: 'Vagas', larg: 70, align: 'center', campo: 'vagas', get: (u) => u.vagas ?? '—' },
  { key: 'status', label: 'Status', larg: 150, sempre: true, get: (u) => <Selo status={u.categoria_status} texto={u.status} /> },
  { key: 'final', label: 'Valor final', larg: 130, align: 'right', campo: 'valor_final_kit', get: (u) => formatarReais(u.valor_final_kit) },
  { key: 'aval', label: 'Aval. banco', larg: 130, align: 'right', campo: 'valor_aval_bancaria', get: (u) => formatarReais(u.valor_aval_bancaria) },
  { key: 'volta', label: 'Volta ao Caixa', larg: 130, align: 'right', campo: 'folga_volta_caixa', get: (u) => formatarReais(u.folga_volta_caixa) },
  { key: 'ba', label: 'Desconto (BA)', larg: 130, align: 'right', campo: 'ba_unidade', get: (u) => formatarReais(u.ba_unidade) },
];
const LARGURA_MINIMA = 50;
const CHAVE_LARGURAS = 'audaz-disp-larguras-v2';
const CHAVE_VISAO = 'audaz-disp-visao';

// Categorias de status (vindas do backend em u.categoria_status) com rótulo e cor.
// Usadas nos cartões-filtro, no selo da tabela e nas cores do espelho.
const STATUS_INFO = {
  disponivel: { rotulo: 'Disponível', plural: 'Disponíveis', cor: '#1f9d55' },
  reservada: { rotulo: 'Reservada', plural: 'Reservadas', cor: '#c27c0e' },
  vendida: { rotulo: 'Vendida', plural: 'Vendidas', cor: '#c0392b' },
  quitada: { rotulo: 'Quitada', plural: 'Quitadas', cor: '#5b4bb7' },
  bloqueada: { rotulo: 'Bloqueada', plural: 'Bloqueadas', cor: '#5b6678' },
  outro: { rotulo: 'Outros', plural: 'Outros', cor: '#9aa3b2' },
};
const ORDEM_STATUS = ['disponivel', 'reservada', 'vendida', 'quitada', 'bloqueada', 'outro'];

// Tabela de disponibilidade (espelho de vendas) ao vivo do Bora Vender.
// Usa o token guardado no servidor; se não houver, orienta a cadastrar.
// Liga o empreendimento do catálogo (?emp=Nome, vindo da página do empreendimento) ao do Bora Vender:
// primeiro pelo nome igual; senão, por um nome cujas palavras contêm as do outro ("Direcional Viva Vida
// Maracanaú" ↔ "Viva Vida Maracanau"), se só houver um. Sem acento, caixa e "s" do plural ("Sabiás" ↔ "Sabiá").
const palavras = (texto) => ` ${normalizar(texto).split(/[^a-z0-9]+/).filter(Boolean).map((p) => p.replace(/s$/, '')).join(' ')} `;
// Nomes do catálogo que no Bora Vender são diferentes demais para ligar sozinhos: catálogo → Bora Vender.
const NOMES_NO_BORA_VENDER = {
  'VIVA NOVA CAUCAIA': 'Direcional Vida Nova Caucaia',
};
const nomeNoBoraVender = Object.fromEntries(
  Object.entries(NOMES_NO_BORA_VENDER).map(([catalogo, bv]) => [palavras(catalogo), bv]),
);

function acharPorNome(lista, nome) {
  const alvo = palavras(nomeNoBoraVender[palavras(nome)] ?? nome);
  if (!alvo.trim()) return null;
  const igual = lista.find((e) => palavras(e.nome) === alvo);
  if (igual) return igual;
  const parecidos = lista.filter((e) => {
    const outro = palavras(e.nome);
    return outro.includes(alvo) || alvo.includes(outro);
  });
  return parecidos.length === 1 ? parecidos[0] : null;
}

export default function Disponibilidade() {
  const [params] = useSearchParams();
  const nomeVindo = params.get('emp') || '';
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [selecionado, setSelecionado] = useState('');
  const [disp, setDisp] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [statusAtivos, setStatusAtivos] = useState(() => new Set()); // vazio = todos
  const [busca, setBusca] = useState('');
  const [planta, setPlanta] = useState('');
  const [visao, setVisao] = useState(() => lerPreferencia(CHAVE_VISAO, 'lista'));
  const [aberta, setAberta] = useState(null); // unidade com os detalhes abertos
  // Vindo da página do empreendimento: abre já mostrando só as disponíveis (guarda o id que veio pelo link).
  const vindoDoLink = useRef(null);

  useEffect(() => {
    listarEmpreendimentosBV()
      .then(setEmpreendimentos)
      .catch(setErro)
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    const achado = nomeVindo && acharPorNome(empreendimentos, nomeVindo);
    vindoDoLink.current = achado ? String(achado.id) : null;
    setSelecionado(achado ? String(achado.id) : '');
  }, [empreendimentos, nomeVindo]);

  useEffect(() => {
    if (!selecionado) {
      setDisp(null);
      return;
    }
    setDisp(null);
    setErro(null);
    setBusca('');
    setPlanta('');
    setAberta(null);
    setStatusAtivos(new Set(vindoDoLink.current === selecionado ? ['disponivel'] : []));
    vindoDoLink.current = null;
    // Ao trocar de empreendimento rápido, ignora a resposta atrasada do anterior.
    let atual = true;
    obterDisponibilidade(selecionado)
      .then((d) => atual && setDisp(d))
      .catch((e) => atual && setErro(e));
    return () => { atual = false; };
  }, [selecionado]);

  useEffect(() => gravarPreferencia(CHAVE_VISAO, visao), [visao]);

  // Quantas unidades há de cada status (na ordem padrão), para os cartões-filtro.
  const contagem = useMemo(() => {
    if (!disp) return [];
    const n = {};
    for (const u of disp.unidades) n[u.categoria_status] = (n[u.categoria_status] || 0) + 1;
    return ORDEM_STATUS.filter((c) => n[c]).map((c) => ({ cat: c, qtd: n[c] }));
  }, [disp]);

  const plantas = useMemo(() => {
    if (!disp) return [];
    return [...new Set(disp.unidades.map((u) => u.tipo_planta).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [disp]);

  // Unidades que passam em todos os filtros (status, busca e planta).
  const visiveis = useMemo(() => {
    if (!disp) return [];
    const termos = termosDeBusca(busca);
    return disp.unidades.filter(
      (u) =>
        (statusAtivos.size === 0 || statusAtivos.has(u.categoria_status)) &&
        (!planta || u.tipo_planta === planta) &&
        unidadeCombina(u, termos),
    );
  }, [disp, statusAtivos, busca, planta]);

  function alternarStatus(cat) {
    setStatusAtivos((prev) => {
      const prox = new Set(prev);
      if (prox.has(cat)) prox.delete(cat);
      else prox.add(cat);
      return prox;
    });
  }

  const filtrando = statusAtivos.size > 0 || busca.trim() !== '' || planta !== '';
  const limparFiltros = () => {
    setStatusAtivos(new Set());
    setBusca('');
    setPlanta('');
  };

  return (
    <main className="container disp">
      <div className="disp__cabecalho">
        <h1>Disponibilidade</h1>
        <Link to="/" className="btn btn--ghost">← Voltar</Link>
      </div>

      {erro && <MensagemErro erro={erro} />}

      {carregando ? (
        <p className="disp__aviso">Carregando empreendimentos…</p>
      ) : (
        empreendimentos.length > 0 && (
          <BuscaEmpreendimento
            empreendimentos={empreendimentos}
            selecionado={selecionado}
            onEscolher={setSelecionado}
            textoInicial={nomeVindo}
          />
        )
      )}

      {!carregando && !selecionado && !erro && empreendimentos.length > 0 && (
        <p className="disp__aviso">
          {nomeVindo
            ? `Não encontramos “${nomeVindo}” automaticamente no sistema de disponibilidade. Pesquise e escolha acima.`
            : 'Pesquise e escolha um empreendimento para ver a disponibilidade.'}
        </p>
      )}

      {selecionado && !disp && !erro && <p className="disp__aviso">Carregando disponibilidade…</p>}

      {disp && (
        <>
          <Resumo
            resumo={disp.resumo}
            contagem={contagem}
            ativos={statusAtivos}
            onAlternar={alternarStatus}
          />

          <div className="disp__barra">
            <div className="disp__busca">
              <Icon name="search" size={18} />
              <input
                type="search"
                placeholder="Buscar unidade, bloco ou planta (ex.: bl03 401)"
                aria-label="Buscar unidade, bloco ou planta"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            {plantas.length > 1 && (
              <select className="disp__planta" aria-label="Planta" value={planta} onChange={(e) => setPlanta(e.target.value)}>
                <option value="">Todas as plantas</option>
                {plantas.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            <div className="disp__visao" role="group" aria-label="Visualização">
              <button type="button" aria-pressed={visao === 'lista'} onClick={() => setVisao('lista')}>
                <Icon name="list" size={16} /> Lista
              </button>
              <button type="button" aria-pressed={visao === 'espelho'} onClick={() => setVisao('espelho')}>
                <Icon name="grid" size={16} /> Espelho
              </button>
            </div>
          </div>

          <p className="disp__contador">
            Mostrando <strong>{visiveis.length}</strong> de {disp.unidades.length} unidades
            {filtrando && (
              <button type="button" className="disp__limpar" onClick={limparFiltros}>Limpar filtros</button>
            )}
          </p>

          {visao === 'espelho' ? (
            <Espelho
              unidades={disp.unidades}
              visiveis={visiveis}
              aberta={aberta}
              onAbrir={setAberta}
            />
          ) : (
            <Tabela unidades={visiveis} todas={disp.unidades} />
          )}
        </>
      )}
    </main>
  );
}

function lerPreferencia(chave, padrao) {
  try {
    return localStorage.getItem(chave) || padrao;
  } catch {
    return padrao;
  }
}
function gravarPreferencia(chave, valor) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    // sem armazenamento: só não lembra a preferência
  }
}

const rotuloEmp = (e) => (e.bairro ? `${e.nome} — ${e.bairro}` : e.nome);

// Campo de busca com sugestões: digite parte do nome ou do bairro (sem precisar de acento).
// Setas ↑/↓ navegam, Enter escolhe, Esc fecha.
function BuscaEmpreendimento({ empreendimentos, selecionado, onEscolher, textoInicial = '' }) {
  const escolhido = empreendimentos.find((e) => String(e.id) === String(selecionado));
  const [texto, setTexto] = useState(escolhido ? rotuloEmp(escolhido) : textoInicial);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const lista = useRef(null);

  // Quando a escolha muda por fora (ex.: veio de outro empreendimento pelo link), o campo acompanha.
  useEffect(() => {
    setTexto(escolhido ? rotuloEmp(escolhido) : textoInicial);
  }, [escolhido?.id, textoInicial]); // eslint-disable-line react-hooks/exhaustive-deps

  const resultados = useMemo(() => {
    const ordenados = [...empreendimentos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    // Com um empreendimento escolhido e o texto igual a ele, mostra a lista toda para facilitar a troca.
    if (escolhido && texto === rotuloEmp(escolhido)) return ordenados;
    const partes = normalizar(texto).split(/\s+/).filter(Boolean);
    return ordenados.filter((e) => {
      const alvo = normalizar(`${e.nome} ${e.bairro || ''}`);
      return partes.every((p) => alvo.includes(p));
    });
  }, [empreendimentos, texto, escolhido]);

  useEffect(() => {
    lista.current?.children[ativo]?.scrollIntoView({ block: 'nearest' });
  }, [ativo]);

  function escolher(e) {
    onEscolher(String(e.id));
    setTexto(rotuloEmp(e));
    setAberto(false);
  }

  function teclas(ev) {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      setAberto(true);
      const passo = ev.key === 'ArrowDown' ? 1 : -1;
      setAtivo((i) => (resultados.length ? (i + passo + resultados.length) % resultados.length : 0));
    } else if (ev.key === 'Enter') {
      if (aberto && resultados[ativo]) {
        ev.preventDefault();
        escolher(resultados[ativo]);
      }
    } else if (ev.key === 'Escape') {
      setAberto(false);
    }
  }

  return (
    <div className="campo busca-emp">
      <label htmlFor="busca-emp">Empreendimento</label>
      <div className="busca-emp__caixa">
        <input
          id="busca-emp"
          type="search"
          role="combobox"
          aria-expanded={aberto}
          aria-controls="busca-emp-lista"
          aria-autocomplete="list"
          aria-activedescendant={aberto && resultados[ativo] ? `busca-emp-${resultados[ativo].id}` : undefined}
          autoComplete="off"
          placeholder="Pesquisar por nome ou bairro…"
          value={texto}
          onChange={(ev) => {
            setTexto(ev.target.value);
            setAtivo(0);
            setAberto(true);
          }}
          onFocus={(ev) => {
            ev.target.select();
            setAberto(true);
          }}
          onClick={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 120)}
          onKeyDown={teclas}
        />
        {aberto && (
          <ul className="busca-emp__lista" id="busca-emp-lista" role="listbox" ref={lista}>
            {resultados.length === 0 ? (
              <li className="busca-emp__vazio">Nenhum empreendimento encontrado.</li>
            ) : (
              resultados.map((e, i) => (
                <li
                  key={e.id}
                  id={`busca-emp-${e.id}`}
                  role="option"
                  aria-selected={i === ativo}
                  className={i === ativo ? 'ativo' : ''}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onMouseEnter={() => setAtivo(i)}
                  onClick={() => escolher(e)}
                >
                  <strong>{e.nome}</strong>
                  {e.bairro && <small>{e.bairro}</small>}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

// Resumo: total, um cartão por status (clique para filtrar; nenhum marcado = todos), faixa de preço
// e uma barra com a proporção de cada status.
function Resumo({ resumo, contagem, ativos, onAlternar }) {
  const faixa =
    resumo.preco_minimo_disponivel != null
      ? `${formatarReais(resumo.preco_minimo_disponivel)} — ${formatarReais(resumo.preco_maximo_disponivel)}`
      : '—';
  const total = resumo.total || 1;
  return (
    <section className="disp-resumo" aria-label="Resumo">
      <div className="disp-resumo__cartoes">
        <div className="disp-cartao">
          <span className="disp-cartao__rotulo">Total de unidades</span>
          <strong className="disp-cartao__valor">{resumo.total}</strong>
        </div>
        {contagem.map(({ cat, qtd }) => {
          const info = STATUS_INFO[cat];
          const on = ativos.has(cat);
          return (
            <button
              key={cat}
              type="button"
              className={`disp-cartao disp-cartao--status${on ? ' ligado' : ''}`}
              style={{ '--cor': info.cor }}
              aria-pressed={on}
              title={on ? 'Clique para tirar este filtro' : `Clique para ver só: ${info.rotulo}`}
              onClick={() => onAlternar(cat)}
            >
              <span className="disp-cartao__rotulo"><i className="disp-ponto" />{info.plural}</span>
              <strong className="disp-cartao__valor">{qtd}</strong>
              <span className="disp-cartao__pct">{Math.round((qtd / total) * 100)}%</span>
            </button>
          );
        })}
        <div className="disp-cartao disp-cartao--faixa">
          <span className="disp-cartao__rotulo">Faixa de valor (disponíveis)</span>
          <strong className="disp-cartao__valor">{faixa}</strong>
        </div>
      </div>
      <div className="disp-resumo__barra" aria-hidden="true">
        {contagem.map(({ cat, qtd }) => (
          <span key={cat} style={{ flexGrow: qtd, background: STATUS_INFO[cat].cor }} />
        ))}
      </div>
    </section>
  );
}

// Valor bruto de uma coluna, para ordenar e para saber se a coluna está vazia.
const valorBruto = (c, u) => (c.key === 'status' ? ORDEM_STATUS.indexOf(u.categoria_status) : u[c.campo]);
const vazio = (v) => v == null || v === '' || v === 0;
const comparar = (a, b) => {
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'pt-BR', { numeric: true });
};

// Tabela com colunas redimensionáveis (arraste a borda do cabeçalho; larguras ficam salvas no navegador)
// e ordenáveis (clique no nome da coluna). Colunas sem nenhum valor no empreendimento ficam ocultas.
function Tabela({ unidades, todas }) {
  const [larguras, setLarguras] = useState(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_LARGURAS));
      if (Array.isArray(salvo) && salvo.length === COLUNAS.length) return salvo;
    } catch {
      // sem armazenamento ou dado inválido: usa os padrões
    }
    return COLUNAS.map((c) => c.larg);
  });
  const [ordem, setOrdem] = useState(null); // { key, dir: 1 | -1 }
  const arraste = useRef(null);
  const [sobre, setSobre] = useState(null); // índice da alça sob o mouse (realce)

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_LARGURAS, JSON.stringify(larguras));
    } catch {
      // sem armazenamento: só não lembra as larguras
    }
  }, [larguras]);

  // Índices (em COLUNAS) das colunas que têm algum valor neste empreendimento.
  const colunas = useMemo(
    () => COLUNAS.map((c, i) => i).filter((i) => COLUNAS[i].sempre || todas.some((u) => !vazio(valorBruto(COLUNAS[i], u)))),
    [todas],
  );

  const ordenadas = useMemo(() => {
    if (!ordem) return unidades;
    const c = COLUNAS.find((x) => x.key === ordem.key);
    return [...unidades].sort((a, b) => {
      const va = valorBruto(c, a);
      const vb = valorBruto(c, b);
      if (va == null || vb == null) return comparar(va, vb); // vazios sempre no fim
      return comparar(va, vb) * ordem.dir;
    });
  }, [unidades, ordem]);

  function ordenarPor(key) {
    setOrdem((o) => (!o || o.key !== key ? { key, dir: 1 } : o.dir === 1 ? { key, dir: -1 } : null));
  }

  function iniciarArraste(indice, evento) {
    evento.preventDefault();
    evento.stopPropagation();
    arraste.current = { indice, xInicial: evento.clientX, larguraInicial: larguras[indice] };
    const mover = (ev) => {
      const a = arraste.current;
      if (!a) return;
      const nova = Math.max(LARGURA_MINIMA, a.larguraInicial + (ev.clientX - a.xInicial));
      setLarguras((ls) => ls.map((w, i) => (i === a.indice ? nova : w)));
    };
    const soltar = () => {
      arraste.current = null;
      window.removeEventListener('mousemove', mover);
      window.removeEventListener('mouseup', soltar);
      document.body.style.userSelect = '';
    };
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', mover);
    window.addEventListener('mouseup', soltar);
  }

  if (unidades.length === 0) return <p className="disp__aviso">Nenhuma unidade com esses filtros.</p>;

  const larguraTotal = colunas.reduce((soma, i) => soma + larguras[i], 0);

  return (
    <div className="disp-tabela">
      <table style={{ width: larguraTotal }}>
        <colgroup>
          {colunas.map((i) => <col key={COLUNAS[i].key} style={{ width: larguras[i] }} />)}
        </colgroup>
        <thead>
          <tr>
            {colunas.map((i) => {
              const c = COLUNAS[i];
              const dir = ordem?.key === c.key ? ordem.dir : 0;
              return (
                <th
                  key={c.key}
                  style={{ textAlign: c.align || 'left' }}
                  aria-sort={dir === 1 ? 'ascending' : dir === -1 ? 'descending' : 'none'}
                >
                  <button type="button" className="disp-tabela__ordenar" onClick={() => ordenarPor(c.key)} title="Clique para ordenar">
                    <span>{c.label}</span>
                    <span className="disp-tabela__seta" aria-hidden="true">{dir === 1 ? '▲' : dir === -1 ? '▼' : '↕'}</span>
                  </button>
                  <span
                    className={`disp-tabela__alca${sobre === i || arraste.current?.indice === i ? ' ativa' : ''}`}
                    onMouseDown={(e) => iniciarArraste(i, e)}
                    onDoubleClick={() => setLarguras((ls) => ls.map((w, idx) => (idx === i ? COLUNAS[i].larg : w)))}
                    onMouseEnter={() => setSobre(i)}
                    onMouseLeave={() => setSobre(null)}
                    title="Arraste para ajustar a largura (duplo clique para padrão)"
                  />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((u) => (
            <tr key={u.id} className={u.disponivel ? 'disponivel' : ''}>
              {colunas.map((i) => {
                const c = COLUNAS[i];
                const v = c.get(u);
                return (
                  <td key={c.key} style={{ textAlign: c.align || 'left' }}>
                    <span className="disp-tabela__celula" title={textoTitulo(v)}>{v}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// título (tooltip) só quando o conteúdo é texto/número
function textoTitulo(valor) {
  return typeof valor === 'string' || typeof valor === 'number' ? String(valor) : undefined;
}

// Espelho de vendas: cada bloco com seus andares (do mais alto ao térreo) e as unidades coloridas
// pelo status. Unidades fora dos filtros ficam apagadas; blocos sem nenhuma somem.
// Clique numa unidade para ver os detalhes.
function Espelho({ unidades, visiveis, aberta, onAbrir }) {
  const grupos = useMemo(() => agruparEspelho(unidades), [unidades]);
  const mostrar = useMemo(() => new Set(visiveis.map((u) => u.id)), [visiveis]);

  useEffect(() => {
    if (!aberta) return undefined;
    const fechar = (e) => e.key === 'Escape' && onAbrir(null);
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [aberta, onAbrir]);

  const blocos = grupos.filter((g) => g.andares.some((a) => a.unidades.some((u) => mostrar.has(u.id))));
  if (blocos.length === 0) return <p className="disp__aviso">Nenhuma unidade com esses filtros.</p>;

  return (
    <>
      <div className="espelho">
        {blocos.map((g) => {
          const livres = g.andares.reduce((n, a) => n + a.unidades.filter((u) => u.disponivel).length, 0);
          return (
            <section key={g.bloco} className="espelho__bloco">
              <header className="espelho__topo">
                <h3>{g.bloco}</h3>
                <span>{livres} {livres === 1 ? 'disponível' : 'disponíveis'}</span>
              </header>
              {g.andares.map((a) => (
                <div key={a.andar} className="espelho__andar">
                  <span className="espelho__num-andar">{typeof a.andar === 'number' ? `${a.andar}º` : a.andar}</span>
                  <div className="espelho__unidades">
                    {a.unidades.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className={`unid unid--${u.categoria_status}${mostrar.has(u.id) ? '' : ' unid--fora'}${aberta?.id === u.id ? ' unid--aberta' : ''}`}
                        title={`${u.identificador} · ${u.status}${u.tipo_planta ? ` · ${u.tipo_planta}` : ''}`}
                        onClick={() => onAbrir(aberta?.id === u.id ? null : u)}
                      >
                        {numeroCurto(u.identificador)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          );
        })}
      </div>
      {aberta && <DetalhesUnidade u={aberta} onFechar={() => onAbrir(null)} />}
    </>
  );
}

function DetalhesUnidade({ u, onFechar }) {
  const info = STATUS_INFO[u.categoria_status] || STATUS_INFO.outro;
  const linhas = [
    ['Bloco', u.bloco],
    ['Andar', u.andar],
    ['Tipo', u.tipo],
    ['Planta', u.tipo_planta],
    ['Área privativa', u.area_privativa != null ? `${u.area_privativa} m²` : null],
    ['Quartos', u.num_quartos],
    ['Suítes', u.num_suites || null],
    ['Vagas', u.vagas || null],
    ['Valor final', u.valor_final_kit != null ? formatarReais(u.valor_final_kit) : null],
    ['Avaliação do banco', u.valor_aval_bancaria != null ? formatarReais(u.valor_aval_bancaria) : null],
    ['Volta ao Caixa', u.folga_volta_caixa != null ? formatarReais(u.folga_volta_caixa) : null],
    ['Desconto (BA)', u.ba_unidade != null ? formatarReais(u.ba_unidade) : null],
  ].filter(([, v]) => v != null && v !== '');
  return (
    <aside className="unid-detalhe" aria-label={`Unidade ${u.identificador}`}>
      <header>
        <div>
          <h3>{u.identificador}</h3>
          <Selo status={u.categoria_status} texto={u.status} />
        </div>
        <button type="button" className="unid-detalhe__fechar" onClick={onFechar} aria-label="Fechar">
          <Icon name="close" size={18} />
        </button>
      </header>
      <dl>
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
      <span className="unid-detalhe__faixa" style={{ background: info.cor }} />
    </aside>
  );
}

function Selo({ status, texto }) {
  const cor = (STATUS_INFO[status] || STATUS_INFO.outro).cor;
  return (
    <span className="disp-selo" style={{ '--cor': cor }} title={texto}>
      {texto}
    </span>
  );
}

function MensagemErro({ erro }) {
  const semToken = erro?.status === 409;
  return (
    <p className="admin-erro" style={{ margin: '12px 0' }}>
      {semToken
        ? 'A integração ainda não tem um token do Bora Vender. Cadastre em Admin → Integração.'
        : erro?.message || 'Não foi possível carregar a disponibilidade.'}
    </p>
  );
}
