import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listarEmpreendimentosBV, obterDisponibilidade } from '../services/api.js';
import { normalizar } from '../utils/format.js';

const formatarReais = (n) =>
  typeof n === 'number'
    ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';

// Definição das colunas. `larg` = largura inicial (px); `align` = alinhamento.
const COLUNAS = [
  { key: 'unidade', label: 'Unidade', larg: 110, get: (u) => u.identificador },
  { key: 'bloco', label: 'Bloco', larg: 90, get: (u) => u.bloco || '—' },
  { key: 'andar', label: 'Andar', larg: 70, align: 'center', get: (u) => u.andar ?? '—' },
  { key: 'tipo', label: 'Tipo', larg: 130, get: (u) => u.tipo || '—' },
  { key: 'planta', label: 'Planta', larg: 120, get: (u) => u.tipo_planta || '—' },
  { key: 'area', label: 'Área (m²)', larg: 95, align: 'right', get: (u) => u.area_privativa ?? '—' },
  { key: 'qtos', label: 'Qtos', larg: 60, align: 'center', get: (u) => u.num_quartos ?? '—' },
  { key: 'suites', label: 'Suítes', larg: 70, align: 'center', get: (u) => u.num_suites ?? '—' },
  { key: 'vagas', label: 'Vagas', larg: 70, align: 'center', get: (u) => u.vagas ?? '—' },
  { key: 'status', label: 'Status', larg: 160, get: (u) => <Selo status={u.categoria_status} texto={u.status} /> },
  { key: 'final', label: 'Valor final', larg: 120, align: 'right', get: (u) => formatarReais(u.valor_final_kit) },
  { key: 'aval', label: 'Aval. banco', larg: 120, align: 'right', get: (u) => formatarReais(u.valor_aval_bancaria) },
  { key: 'volta', label: 'Volta ao Caixa', larg: 130, align: 'right', get: (u) => formatarReais(u.folga_volta_caixa) },
  { key: 'ba', label: 'Desconto (BA)', larg: 130, align: 'right', get: (u) => formatarReais(u.ba_unidade) },
];
const LARGURA_MINIMA = 50;
const CHAVE_LARGURAS = 'audaz-disp-larguras-v1';

// Categorias de status (vindas do backend em u.categoria_status) com rótulo e cor.
// Usadas no filtro de status: marque quais quer ver; nenhum marcado = todos.
const STATUS_INFO = {
  disponivel: { rotulo: 'Disponível', cor: '#1f9d55' },
  reservada: { rotulo: 'Reservada', cor: '#b7791f' },
  vendida: { rotulo: 'Vendida', cor: '#c0392b' },
  quitada: { rotulo: 'Quitada', cor: '#555' },
  bloqueada: { rotulo: 'Bloqueada', cor: '#888' },
  outro: { rotulo: 'Outros', cor: '#888' },
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
  const [soDisponiveis, setSoDisponiveis] = useState(false);
  const [statusAtivos, setStatusAtivos] = useState(() => new Set()); // vazio = todos

  useEffect(() => {
    listarEmpreendimentosBV()
      .then(setEmpreendimentos)
      .catch(setErro)
      .finally(() => setCarregando(false));
  }, []);

  // Vindo da página do empreendimento: já abre nele e só com as unidades disponíveis.
  useEffect(() => {
    const achado = nomeVindo && acharPorNome(empreendimentos, nomeVindo);
    setSelecionado(achado ? String(achado.id) : '');
    setSoDisponiveis(!!achado);
  }, [empreendimentos, nomeVindo]);

  useEffect(() => {
    if (!selecionado) {
      setDisp(null);
      return;
    }
    setDisp(null);
    setErro(null);
    setStatusAtivos(new Set()); // começa mostrando todos ao trocar de empreendimento
    // Ao trocar de empreendimento rápido, ignora a resposta atrasada do anterior.
    let atual = true;
    obterDisponibilidade(selecionado)
      .then((d) => atual && setDisp(d))
      .catch((e) => atual && setErro(e));
    return () => { atual = false; };
  }, [selecionado]);

  // Categorias de status realmente presentes no empreendimento atual (na ordem padrão).
  const categoriasPresentes = useMemo(() => {
    if (!disp) return [];
    const presentes = new Set(disp.unidades.map((u) => u.categoria_status));
    return ORDEM_STATUS.filter((c) => presentes.has(c));
  }, [disp]);

  const unidades = useMemo(() => {
    if (!disp) return [];
    let us = soDisponiveis ? disp.unidades.filter((u) => u.disponivel) : disp.unidades;
    // Filtro por status: nenhum marcado = mostra todos.
    if (statusAtivos.size > 0) us = us.filter((u) => statusAtivos.has(u.categoria_status));
    return us;
  }, [disp, soDisponiveis, statusAtivos]);

  function alternarStatus(cat) {
    setStatusAtivos((prev) => {
      const prox = new Set(prev);
      if (prox.has(cat)) prox.delete(cat);
      else prox.add(cat);
      return prox;
    });
  }
  const limparStatus = () => setStatusAtivos(new Set());

  return (
    <main className="container" style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1>Disponibilidade</h1>
        <Link to="/" className="btn btn--ghost">← Voltar</Link>
      </div>

      {erro && <MensagemErro erro={erro} />}

      {carregando ? (
        <p>Carregando empreendimentos…</p>
      ) : (
        empreendimentos.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', margin: '16px 0' }}>
            <BuscaEmpreendimento
              empreendimentos={empreendimentos}
              selecionado={selecionado}
              onEscolher={setSelecionado}
              textoInicial={nomeVindo}
            />
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={soDisponiveis} onChange={(e) => setSoDisponiveis(e.target.checked)} />
              Só disponíveis
            </label>
          </div>
        )
      )}

      {!carregando && !selecionado && !erro && empreendimentos.length > 0 && (
        <p style={{ color: '#666', marginTop: 8 }}>
          {nomeVindo
            ? `Não encontramos “${nomeVindo}” automaticamente no sistema de disponibilidade. Pesquise e escolha acima.`
            : 'Pesquise e escolha um empreendimento para ver a disponibilidade.'}
        </p>
      )}

      {selecionado && !disp && !erro && <p style={{ color: '#666', marginTop: 8 }}>Carregando disponibilidade…</p>}
      {disp && <Resumo resumo={disp.resumo} />}
      {disp && (
        <FiltroStatus
          categorias={categoriasPresentes}
          ativos={statusAtivos}
          onAlternar={alternarStatus}
          onLimpar={limparStatus}
        />
      )}
      {disp && <Tabela unidades={unidades} />}
    </main>
  );
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

function Resumo({ resumo }) {
  const faixa =
    resumo.preco_minimo_disponivel != null
      ? `${formatarReais(resumo.preco_minimo_disponivel)} — ${formatarReais(resumo.preco_maximo_disponivel)}`
      : '—';
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '12px 0' }}>
      <Cartao rotulo="Total de unidades" valor={resumo.total} />
      <Cartao rotulo="Disponíveis" valor={resumo.disponiveis} destaque />
      <Cartao rotulo="Faixa (disponíveis)" valor={faixa} />
    </div>
  );
}

function Cartao({ rotulo, valor, destaque }) {
  return (
    <div
      style={{
        border: '1px solid var(--borda, #e2e2e2)',
        borderRadius: 12,
        padding: '12px 16px',
        minWidth: 160,
        background: destaque ? '#e9f8ef' : '#fff',
      }}
    >
      <div style={{ fontSize: 13, color: '#666' }}>{rotulo}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{valor}</div>
    </div>
  );
}

// Filtro por status: um botão por categoria presente. Marque os que quer ver;
// clicar alterna. Com nenhum marcado, a tabela mostra todas as unidades.
function FiltroStatus({ categorias, ativos, onAlternar, onLimpar }) {
  if (categorias.length <= 1) return null; // nada a filtrar se só há um status
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', margin: '4px 0 14px' }}>
      <span style={{ fontSize: 13, color: '#666', fontWeight: 600 }}>Mostrar:</span>
      {categorias.map((cat) => {
        const info = STATUS_INFO[cat] || { rotulo: cat, cor: '#888' };
        const on = ativos.has(cat);
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onAlternar(cat)}
            aria-pressed={on}
            title={on ? 'Clique para ocultar' : 'Clique para mostrar só este'}
            style={{
              cursor: 'pointer',
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              border: `1.5px solid ${info.cor}`,
              background: on ? info.cor : 'transparent',
              color: on ? '#fff' : info.cor,
              transition: 'background .12s, color .12s',
            }}
          >
            {info.rotulo}
          </button>
        );
      })}
      {ativos.size > 0 && (
        <button
          type="button"
          onClick={onLimpar}
          style={{
            cursor: 'pointer', padding: '4px 10px', borderRadius: 999, fontSize: 13,
            border: '1px solid #ccc', background: 'transparent', color: '#666',
          }}
        >
          Limpar
        </button>
      )}
      <span style={{ fontSize: 12, color: '#999' }}>
        {ativos.size === 0 ? '(nenhum marcado = todos)' : null}
      </span>
    </div>
  );
}

// Tabela com colunas redimensionáveis: arraste a borda direita de cada cabeçalho.
// As larguras ficam salvas no navegador.
function Tabela({ unidades }) {
  const [larguras, setLarguras] = useState(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_LARGURAS));
      if (Array.isArray(salvo) && salvo.length === COLUNAS.length) return salvo;
    } catch {
      // sem armazenamento ou dado inválido: usa os padrões
    }
    return COLUNAS.map((c) => c.larg);
  });
  const arraste = useRef(null);
  const [sobre, setSobre] = useState(null); // índice da alça sob o mouse (realce)

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_LARGURAS, JSON.stringify(larguras));
    } catch {
      // sem armazenamento: só não lembra as larguras
    }
  }, [larguras]);

  function iniciarArraste(indice, evento) {
    evento.preventDefault();
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

  if (unidades.length === 0) return <p>Nenhuma unidade para mostrar.</p>;

  const larguraTotal = larguras.reduce((a, b) => a + b, 0);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: larguraTotal, fontSize: 14 }}>
        <colgroup>
          {COLUNAS.map((c, i) => <col key={c.key} style={{ width: larguras[i] }} />)}
        </colgroup>
        <thead>
          <tr>
            {COLUNAS.map((c, i) => (
              <th key={c.key} style={{ ...th, textAlign: c.align || 'left' }}>
                <span style={celulaTexto}>{c.label}</span>
                <span
                  onMouseDown={(e) => iniciarArraste(i, e)}
                  onDoubleClick={() => setLarguras((ls) => ls.map((w, idx) => (idx === i ? COLUNAS[i].larg : w)))}
                  onMouseEnter={() => setSobre(i)}
                  onMouseLeave={() => setSobre(null)}
                  title="Arraste para ajustar a largura (duplo clique para padrão)"
                  style={{ ...alca, borderRightColor: (sobre === i || arraste.current?.indice === i) ? '#2563eb' : '#c4c9d4' }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {unidades.map((u) => (
            <tr key={u.id} style={{ background: u.disponivel ? '#f3fbf6' : 'transparent' }}>
              {COLUNAS.map((c) => (
                <td key={c.key} style={{ ...td, textAlign: c.align || 'left' }}>
                  <span style={celulaTexto} title={textoTitulo(c.get(u))}>{c.get(u)}</span>
                </td>
              ))}
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

function Selo({ status, texto }) {
  const cor = { disponivel: '#1f9d55', reservada: '#b7791f', vendida: '#c0392b', quitada: '#555', bloqueada: '#888' }[status] || '#888';
  return (
    <span style={{ color: cor, fontWeight: 600 }} title={texto}>
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

const th = {
  position: 'relative',
  borderBottom: '2px solid #ddd',
  padding: '8px 10px',
  background: '#fff',
};
const td = { borderBottom: '1px solid #eee', padding: '8px 10px' };
// texto numa linha só; o que passar da largura vira reticências.
const celulaTexto = { display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
// alça de redimensionamento na borda direita do cabeçalho.
const alca = {
  position: 'absolute',
  top: 0,
  right: 0,
  width: 8,
  height: '100%',
  cursor: 'col-resize',
  userSelect: 'none',
  // traço cinza na borda (azul no hover) — sinaliza que dá para redimensionar
  borderRight: '2px solid #c4c9d4',
};
