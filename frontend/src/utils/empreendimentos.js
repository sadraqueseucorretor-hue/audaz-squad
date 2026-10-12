// Regras de negócio sobre os dados: busca, filtros, materiais visíveis e "atualizados recentemente".
// Funções puras: recebem a lista (vinda do Firestore ou dos dados de exemplo) por parâmetro.
import { SELOS, STATUS } from '../data/config.js';
import { categoriaPorChave } from '../data/tiposMateriais.js';
import { listarMateriais } from './materiais.js';
import { anoEntrega } from './entrega.js';
import { normalizar } from './format.js';

// Ordem definida pelo admin (campo `ordem`); sem ordem, vai para o fim em ordem alfabética.
export const ordenar = (lista) =>
  [...lista].sort((a, b) => (a.ordem ?? 1e9) - (b.ordem ?? 1e9) || (a.nome || '').localeCompare(b.nome || ''));

export const buscarPorSlug = (lista, slug) => lista.find((e) => e.slug === slug);

// Valores distintos de um campo, sem duplicar por maiúsculas/acentos ("FORTALEZA" = "Fortaleza").
// Entre as grafias, prefere a que não está toda em maiúsculas.
export function opcoesUnicas(lista, campo) {
  const porChave = new Map();
  for (const e of lista) {
    const valor = (e[campo] || '').trim();
    if (!valor) continue;
    const chave = normalizar(valor);
    const atual = porChave.get(chave);
    if (!atual || (atual === atual.toUpperCase() && valor !== valor.toUpperCase())) porChave.set(chave, valor);
  }
  return [...porChave.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// Selos válidos do empreendimento, na ordem de prioridade de SELOS.
export const selosDo = (emp) => Object.keys(SELOS).filter((s) => Array.isArray(emp?.selos) && emp.selos.includes(s));

// O que o corretor vê: sem os empreendimentos ocultados no painel. Com "Ordem padrão", os que têm
// selo vêm primeiro (destaque → campanha → condição especial), mantendo a ordem do painel entre eles.
export function visiveis(lista) {
  const prioridade = (e) => {
    const primeiro = selosDo(e)[0];
    return primeiro ? Object.keys(SELOS).indexOf(primeiro) : Infinity;
  };
  return lista
    .filter((e) => e.ativo !== false)
    .map((e, i) => ({ e, i, p: prioridade(e) }))
    .sort((a, b) => a.p - b.p || a.i - b.i)
    .map((x) => x.e);
}

// Texto em que a busca procura: dados do cadastro, status, selos, observações e nomes dos materiais
// ("pronto" encontra "Pronto para morar"; "campanha" encontra os marcados com esse selo).
function textoDeBusca(e) {
  return normalizar([
    e.nome, e.bairro, e.cidade, e.uf, e.construtora, e.endereco, e.entrega, e.observacoes,
    STATUS[e.status]?.label,
    ...selosDo(e).map((s) => SELOS[s].label),
    ...listarMateriais(e).filter((m) => m.ativo !== false).map((m) => m.titulo),
  ].filter(Boolean).join(' '));
}

export function filtrarEmpreendimentos(lista, { busca = '', status = '', cidade = '', construtora = '', ano = '', selo = '' }) {
  const termo = normalizar(busca);
  return lista.filter((e) => {
    if (status && e.status !== status) return false;
    if (selo && !selosDo(e).includes(selo)) return false;
    if (cidade && normalizar(e.cidade) !== normalizar(cidade)) return false;
    if (construtora && normalizar(e.construtora) !== normalizar(construtora)) return false;
    if (ano && String(anoEntrega(e.entrega)) !== String(ano)) return false;
    if (!termo) return true;
    const alvo = textoDeBusca(e);
    return termo.split(/\s+/).every((parte) => alvo.includes(parte));
  });
}

// Descobre a atualização mais recente (dados gerais ou algum material ativo) e o que foi atualizado.
export function ultimaAtualizacao(emp) {
  let melhor = { data: emp.atualizadoEm || null, oQue: 'Informações' };
  for (const m of listarMateriais(emp)) {
    if (m.ativo === false || !m.updatedAt) continue;
    if (!melhor.data || new Date(m.updatedAt) >= new Date(melhor.data)) {
      melhor = { data: m.updatedAt, oQue: categoriaPorChave(m.categoria).label };
    }
  }
  return melhor;
}

export function atualizadosRecentemente(lista, limite = 4) {
  return lista
    .map((emp) => ({ emp, ...ultimaAtualizacao(emp) }))
    .filter((x) => x.data)
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .slice(0, limite);
}

// Fotos do carrossel do card. Empreendimentos antigos (só `imagem`) viram uma lista de 1 foto.
export const fotosDo = (emp) =>
  (Array.isArray(emp?.fotos) && emp.fotos.length ? emp.fotos : [emp?.imagem]).filter(Boolean);

// Miniatura (atualizados recentemente, lista do admin): a logo do empreendimento; sem logo, a 1ª foto.
export const miniaturaDo = (emp) => (emp?.logo ? { src: emp.logo, ehLogo: true } : { src: fotosDo(emp)[0], ehLogo: false });
