import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { login, logout, usuarioAtual, temSessao } from '../../services/api.js';
import { useDados } from '../../context/DadosContext.jsx';
import { tituloDaAba } from '../../utils/tituloAba.js';
import Logo from '../../components/Logo.jsx';

// Porta de entrada do /admin: login por JWT próprio (backend FastAPI).
export default function AdminGate() {
  const [usuario, setUsuario] = useState(undefined); // undefined=carregando, null=deslogado

  useEffect(() => {
    let vivo = true;
    if (!temSessao()) {
      setUsuario(null);
      return undefined;
    }
    usuarioAtual()
      .then((u) => vivo && setUsuario(u))
      .catch(() => {
        logout();
        if (vivo) setUsuario(null);
      });
    return () => {
      vivo = false;
    };
  }, []);

  // No painel, a lista acompanha as alterações automaticamente.
  const { ativarTempoReal, site } = useDados();
  useEffect(() => {
    if (usuario) ativarTempoReal();
  }, [usuario, ativarTempoReal]);
  useEffect(() => {
    document.title = tituloDaAba(site, 'Painel');
  }, [site]);

  function sair() {
    logout();
    setUsuario(null);
  }

  if (usuario === undefined) return <Tela titulo="Carregando…" />;
  if (!usuario) return <LoginView aoEntrar={setUsuario} />;

  return (
    <div className="admin">
      <header className="admin__topo">
        <div className="container admin__topo-inner">
          <Logo compacto />
          <nav className="admin__nav">
            <NavLink to="/admin" end>Empreendimentos</NavLink>
            <NavLink to="/admin/tabela">Tabela de valores</NavLink>
            <NavLink to="/admin/integracao">Integração</NavLink>
            <NavLink to="/admin/marca">Logo e textos</NavLink>
            <Link to="/disponibilidade" target="_blank">Disponibilidade</Link>
            <Link to="/" target="_blank">Ver site</Link>
          </nav>
          <button type="button" className="admin__sair" onClick={sair} title={usuario.email}>Sair</button>
        </div>
      </header>
      <main className="container admin__main">
        <Outlet />
      </main>
    </div>
  );
}

function Tela({ titulo, children }) {
  return (
    <main className="admin-login">
      <div className="admin-login__card">
        <Logo compacto />
        <h1>{titulo}</h1>
        {children}
        <Link to="/" className="admin-login__voltar">← Voltar ao site</Link>
      </div>
    </main>
  );
}

function LoginView({ aoEntrar }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [msg, setMsg] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setEnviando(true);
    setMsg(null);
    try {
      const usuario = await login(email.trim(), senha);
      aoEntrar(usuario);
    } catch (erro) {
      setMsg(erro?.status === 401 ? 'E-mail ou senha incorretos.' : erro?.message || 'Não foi possível entrar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela titulo="Área do administrador">
      <form className="admin-form" onSubmit={entrar}>
        <label className="campo">
          <span>E-mail</span>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="campo">
          <span>Senha</span>
          <input type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </label>
        {msg && <p className="admin-erro">{msg}</p>}
        <button type="submit" className="btn btn--primary btn--block" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </Tela>
  );
}
