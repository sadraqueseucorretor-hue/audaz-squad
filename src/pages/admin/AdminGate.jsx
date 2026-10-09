import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { auth, ehAdmin, firebaseAtivo } from '../../firebase.js';
import { useDados } from '../../context/DadosContext.jsx';
import Logo from '../../components/Logo.jsx';

// Porta de entrada do /admin: login com Firebase Auth e checagem do e-mail admin.
export default function AdminGate() {
  const [usuario, setUsuario] = useState(undefined);

  useEffect(() => (firebaseAtivo ? onAuthStateChanged(auth, setUsuario) : undefined), []);

  // No painel, a lista acompanha as alterações em tempo real.
  const { ativarTempoReal } = useDados();
  useEffect(() => {
    ativarTempoReal();
  }, [ativarTempoReal]);

  if (!firebaseAtivo) {
    return (
      <Tela titulo="Firebase não configurado">
        <p>Preencha as credenciais em <code>src/data/firebaseConfig.js</code> para ativar o painel.</p>
      </Tela>
    );
  }
  if (usuario === undefined) return <Tela titulo="Carregando…" />;
  if (!usuario) return <Login />;
  if (!ehAdmin(usuario)) {
    return (
      <Tela titulo="Sem permissão">
        <p>A conta {usuario.email} não tem acesso ao painel.</p>
        <button type="button" className="btn btn--ghost" onClick={() => signOut(auth)}>Sair</button>
      </Tela>
    );
  }

  return (
    <div className="admin">
      <header className="admin__topo">
        <div className="container admin__topo-inner">
          <Logo compacto />
          <nav className="admin__nav">
            <NavLink to="/admin" end>Empreendimentos</NavLink>
            <NavLink to="/admin/tabela">Tabela de valores</NavLink>
            <NavLink to="/admin/marca">Logo e textos</NavLink>
            <Link to="/" target="_blank">Ver site</Link>
          </nav>
          <button type="button" className="admin__sair" onClick={() => signOut(auth)} title={usuario.email}>Sair</button>
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

const ERROS_LOGIN = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
  'auth/network-request-failed': 'Sem conexão com a internet.',
};

function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [msg, setMsg] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setEnviando(true);
    setMsg(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
    } catch (erro) {
      setMsg({ erro: true, texto: ERROS_LOGIN[erro.code] || 'Não foi possível entrar.' });
    } finally {
      setEnviando(false);
    }
  }

  async function esqueci() {
    if (!email.trim()) return setMsg({ erro: true, texto: 'Digite seu e-mail acima primeiro.' });
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMsg({ erro: false, texto: 'Enviamos um link para redefinir a senha no seu e-mail.' });
    } catch (erro) {
      setMsg({ erro: true, texto: ERROS_LOGIN[erro.code] || 'Não foi possível enviar o e-mail.' });
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
        {msg && <p className={msg.erro ? 'admin-erro' : 'admin-ok'}>{msg.texto}</p>}
        <button type="submit" className="btn btn--primary btn--block" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
        <button type="button" className="admin-link" onClick={esqueci}>Esqueci minha senha</button>
      </form>
    </Tela>
  );
}
