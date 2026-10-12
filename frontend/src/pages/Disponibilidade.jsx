import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarEmpreendimentosBV, obterDisponibilidade } from '../services/api.js';

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

// Tabela de disponibilidade (espelho de vendas) ao vivo do Bora Vender.
// Usa o token guardado no servidor; se não houver, orienta a cadastrar.
export default function Disponibilidade() {
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [selecionado, setSelecionado] = useState('');
  const [disp, setDisp] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [soDisponiveis, setSoDisponiveis] = useState(false);

  useEffect(() => {
    listarEmpreendimentosBV()
      .then(setEmpreendimentos)
      .catch(setErro)
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    if (!selecionado) {
      setDisp(null);
      return;
    }
    setDisp(null);
    setErro(null);
    obterDisponibilidade(selecionado).then(setDisp).catch(setErro);
  }, [selecionado]);

  const unidades = useMemo(() => {
    if (!disp) return [];
    return soDisponiveis ? disp.unidades.filter((u) => u.disponivel) : disp.unidades;
  }, [disp, soDisponiveis]);

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
            <label className="campo" style={{ minWidth: 260 }}>
              <span>Empreendimento</span>
              <select value={selecionado} onChange={(e) => setSelecionado(e.target.value)}>
                <option value="">— Selecione um empreendimento —</option>
                {empreendimentos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                    {e.bairro ? ` — ${e.bairro}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={soDisponiveis} onChange={(e) => setSoDisponiveis(e.target.checked)} />
              Só disponíveis
            </label>
          </div>
        )
      )}

      {!carregando && !selecionado && !erro && empreendimentos.length > 0 && (
        <p style={{ color: '#666', marginTop: 8 }}>Selecione um empreendimento para ver a disponibilidade.</p>
      )}

      {disp && <Resumo resumo={disp.resumo} />}
      {disp && <Tabela unidades={unidades} />}
    </main>
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
