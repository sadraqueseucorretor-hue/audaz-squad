import { useEffect, useRef, useState } from 'react';
import { salvarTokenBoraVender, statusTokenBoraVender } from '../../services/api.js';

// Tela admin: token do Bora Vender guardado no servidor + contagem regressiva
// do vencimento. Enquanto não há renovação automática, é aqui que se sobe um
// token novo quando o atual estiver perto de expirar.
export default function AdminIntegracao() {
  const [status, setStatus] = useState(null);
  const [semToken, setSemToken] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [token, setToken] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState(null);

  async function carregar() {
    setCarregando(true);
    try {
      setStatus(await statusTokenBoraVender());
      setSemToken(false);
    } catch (erro) {
      if (erro?.status === 409) setSemToken(true);
      else setMsg({ erro: true, texto: erro?.message || 'Falha ao carregar o status.' });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setMsg(null);
    try {
      const novo = await salvarTokenBoraVender(token.trim());
      setStatus(novo);
      setSemToken(false);
      setToken('');
      setMsg({ erro: false, texto: 'Token atualizado com sucesso.' });
    } catch (erro) {
      setMsg({ erro: true, texto: erro?.message || 'Não foi possível salvar o token.' });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="admin-integracao">
      <h1>Integração — Bora Vender</h1>

      {carregando ? (
        <p>Carregando…</p>
      ) : semToken ? (
        <p className="admin-erro">Nenhum token cadastrado ainda. Cole um token abaixo para ativar a integração.</p>
      ) : (
        status && <CartaoStatus status={status} />
      )}

      <form className="admin-form" onSubmit={salvar} style={{ marginTop: 20 }}>
        <label className="campo">
          <span>Novo token do Bora Vender</span>
          <textarea
            rows={5}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Cole aqui o token (JWT) obtido no Bora Vender"
            required
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </label>
        {msg && <p className={msg.erro ? 'admin-erro' : 'admin-ok'}>{msg.texto}</p>}
        <button type="submit" className="btn btn--primary" disabled={salvando || !token.trim()}>
          {salvando ? 'Salvando…' : 'Salvar token'}
        </button>
      </form>
    </div>
  );
}

function CartaoStatus({ status }) {
  const restante = useContagem(status.expira_em);
  const nivel = classificar(restante.segundos, status.expirado);

  return (
    <div className="integracao-status" style={estilos.cartao(nivel)}>
      <div style={estilos.linhaTopo}>
        <span style={estilos.selo(nivel)}>
          {status.expirado ? 'TOKEN EXPIRADO' : `Expira em ${restante.texto}`}
        </span>
      </div>
      <dl style={estilos.dl}>
        <Item rotulo="Usuário" valor={status.usuario} />
        <Item rotulo="Atividade" valor={status.atividade} />
        <Item rotulo="E-mail" valor={status.email} />
        <Item rotulo="Validade" valor={formatarData(status.expira_em)} />
        <Item rotulo="Atualizado em" valor={formatarData(status.atualizado_em)} />
        <Item rotulo="Por" valor={status.atualizado_por} />
      </dl>
    </div>
  );
}

function Item({ rotulo, valor }) {
  if (!valor) return null;
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <dt style={{ fontWeight: 600, minWidth: 110 }}>{rotulo}</dt>
      <dd style={{ margin: 0 }}>{valor}</dd>
    </div>
  );
}

// Reconta a cada segundo a partir da validade (expira_em, ISO).
function useContagem(expiraEmIso) {
  const [segundos, setSegundos] = useState(() => calcularSegundos(expiraEmIso));
  const ref = useRef(expiraEmIso);
  ref.current = expiraEmIso;
  useEffect(() => {
    setSegundos(calcularSegundos(ref.current));
    const id = setInterval(() => setSegundos(calcularSegundos(ref.current)), 1000);
    return () => clearInterval(id);
  }, [expiraEmIso]);
  return { segundos, texto: formatarDuracao(segundos) };
}

function calcularSegundos(iso) {
  if (!iso) return null;
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
}

function formatarDuracao(seg) {
  if (seg == null) return '—';
  if (seg <= 0) return 'expirado';
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

function formatarData(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

// < 2h: alerta; expirado: crítico; senão: ok.
function classificar(segundos, expirado) {
  if (expirado || segundos === 0) return 'critico';
  if (segundos != null && segundos < 7200) return 'alerta';
  return 'ok';
}

const CORES = {
  ok: { borda: '#1f9d55', fundo: '#e9f8ef', texto: '#145c33' },
  alerta: { borda: '#b7791f', fundo: '#fdf6e3', texto: '#7a4f12' },
  critico: { borda: '#c0392b', fundo: '#fdecea', texto: '#8a241b' },
};

const estilos = {
  cartao: (n) => ({
    border: `1px solid ${CORES[n].borda}`,
    background: CORES[n].fundo,
    borderRadius: 12,
    padding: 16,
  }),
  linhaTopo: { marginBottom: 12 },
  selo: (n) => ({
    display: 'inline-block',
    fontWeight: 700,
    color: CORES[n].texto,
    border: `1px solid ${CORES[n].borda}`,
    borderRadius: 999,
    padding: '4px 12px',
    fontSize: 13,
  }),
  dl: { display: 'grid', gap: 6, margin: 0 },
};
