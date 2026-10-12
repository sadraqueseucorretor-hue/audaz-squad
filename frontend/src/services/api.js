// Cliente único do backend AudazSquad (FastAPI).
// Base: VITE_API_BASE_URL (.env). Vazio = mesma origem — em dev o Vite faz proxy
// de /api para http://localhost:8000; em produção a API/nginx servem na mesma origem.
const BASE = (import.meta.env?.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const V1 = `${BASE}/api/v1`;
const CHAVE_SESSAO = 'audaz-sessao-v1';

// ---- sessão (token JWT da aplicação) ----
export function lerSessao() {
  try {
    return localStorage.getItem(CHAVE_SESSAO) || null;
  } catch {
    return null;
  }
}
export function gravarSessao(token) {
  try {
    if (token) localStorage.setItem(CHAVE_SESSAO, token);
    else localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // sem armazenamento: segue sem persistir
  }
}

async function requisicao(caminho, { metodo = 'GET', corpo, auth = false } = {}) {
  const headers = {};
  if (corpo !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const t = lerSessao();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  let r;
  try {
    r = await fetch(`${V1}${caminho}`, {
      method: metodo,
      headers,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new Error('Não foi possível falar com o servidor. Verifique sua conexão.');
  }
  if (r.status === 204) return null;
  const texto = await r.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (!r.ok) {
    const erro = new Error(dados?.detalhe || `Erro ${r.status}`);
    erro.status = r.status;
    throw erro;
  }
  return dados;
}

const get = (c, auth = false) => requisicao(c, { auth });
const put = (c, corpo, auth = true) => requisicao(c, { metodo: 'PUT', corpo, auth });
const post = (c, corpo, auth = false) => requisicao(c, { metodo: 'POST', corpo, auth });
const del = (c, auth = true) => requisicao(c, { metodo: 'DELETE', auth });

// ---- autenticação ----
export async function login(email, senha) {
  const sessao = await post('/auth/login', { email, senha });
  gravarSessao(sessao.access_token);
  return sessao.usuario;
}
export const logout = () => gravarSessao(null);
export const usuarioAtual = () => get('/auth/me', true);
export const temSessao = () => Boolean(lerSessao());

// ---- administradores (gestão de acessos ao painel) ----
export const listarUsuarios = () => get('/usuarios', true);
export const criarUsuario = (dados) => post('/usuarios', dados, true);
export const excluirUsuario = (id) => del(`/usuarios/${id}`);

// ---- catálogo (ex-Firestore) ----
export const listarCatalogo = () => get('/catalogo/empreendimentos');
export const obterDoCatalogo = (slug) => get(`/catalogo/empreendimentos/${encodeURIComponent(slug)}`);
export const salvarEmpreendimento = (slug, documento) =>
  put(`/catalogo/empreendimentos/${encodeURIComponent(slug)}`, documento);
export const excluirEmpreendimento = (slug) => del(`/catalogo/empreendimentos/${encodeURIComponent(slug)}`);
export const reordenarCatalogo = (slugs) => put('/catalogo/ordem', { slugs });
export const obterConfigSite = () => get('/catalogo/config/site');
export const salvarConfigSite = (dados) => put('/catalogo/config/site', dados);

// ---- integração Bora Vender (token guardado no servidor) ----
export const salvarTokenBoraVender = (token) => put('/integracao/bora-vender/token', { token });
export const statusTokenBoraVender = () => get('/integracao/bora-vender/token/status', true);

// ---- Bora Vender ao vivo (usa o token guardado no servidor) ----
export const listarEmpreendimentosBV = ({ somenteDisponiveis = false } = {}) =>
  get(`/empreendimentos${somenteDisponiveis ? '?somente_disponiveis=true' : ''}`);
export const obterDisponibilidade = (idEmpreendimento) =>
  get(`/empreendimentos/${encodeURIComponent(idEmpreendimento)}/disponibilidade`);
