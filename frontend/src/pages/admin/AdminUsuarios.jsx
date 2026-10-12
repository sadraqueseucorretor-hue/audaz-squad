import { useEffect, useState } from 'react';
import { listarUsuarios, criarUsuario, excluirUsuario } from '../../services/api.js';
import { mensagemErro } from '../../services/admin.js';

// Gestão de administradores do painel. Cadastro é sempre feito por um admin
// logado (não há registro público). O backend impede remover o último.
export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState({ email: '', nome: '', senha: '' });
  const [aviso, setAviso] = useState(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    try {
      setUsuarios(await listarUsuarios());
    } catch (erro) {
      setAviso({ erro: true, texto: mensagemErro(erro) });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function adicionar(e) {
    e.preventDefault();
    setSalvando(true);
    setAviso(null);
    try {
      await criarUsuario({
        email: form.email.trim(),
        nome: form.nome.trim() || undefined,
        senha: form.senha,
      });
      setForm({ email: '', nome: '', senha: '' });
      setAviso({ erro: false, texto: 'Administrador cadastrado.' });
      await carregar();
    } catch (erro) {
      setAviso({ erro: true, texto: mensagemErro(erro) });
    } finally {
      setSalvando(false);
    }
  }

  async function remover(u) {
    if (!window.confirm(`Remover o acesso de ${u.email}?`)) return;
    setAviso(null);
    try {
      await excluirUsuario(u.id);
      await carregar();
    } catch (erro) {
      setAviso({ erro: true, texto: mensagemErro(erro) });
    }
  }

  const unico = usuarios.length <= 1;

  return (
    <div className="admin-editor">
      <div className="admin__cabecalho">
        <h1>Administradores</h1>
      </div>

      <fieldset className="admin-bloco">
        <legend>Novo administrador</legend>
        <form className="admin-form" onSubmit={adicionar}>
          <label className="campo">
            <span>E-mail</span>
            <input
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label className="campo">
            <span>Nome <small>(opcional)</small></span>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </label>
          <label className="campo">
            <span>Senha <small>(mínimo 6 caracteres)</small></span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              required
            />
          </label>
          {aviso && <p className={aviso.erro ? 'admin-erro' : 'admin-ok'}>{aviso.texto}</p>}
          <button type="submit" className="btn btn--primary" disabled={salvando}>
            {salvando ? 'Cadastrando…' : 'Cadastrar administrador'}
          </button>
        </form>
      </fieldset>

      <fieldset className="admin-bloco">
        <legend>Com acesso ao painel</legend>
        {carregando ? (
          <p className="admin-dica">Carregando…</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {usuarios.map((u) => (
              <li
                key={u.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 12, padding: '10px 12px', border: '1px solid var(--borda)',
                  borderRadius: 'var(--raio-sm)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <strong>{u.nome || u.email}</strong>
                  {u.nome && (
                    <span style={{ color: 'var(--texto-suave)', fontSize: 13 }}>{u.email}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn--perigo btn--sm"
                  onClick={() => remover(u)}
                  disabled={unico}
                  title={unico ? 'Não é possível remover o último administrador' : 'Remover acesso'}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    </div>
  );
}
