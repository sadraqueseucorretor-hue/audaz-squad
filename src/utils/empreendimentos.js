// Regras de negócio sobre os dados: busca, filtros, materiais visíveis e "atualizados recentemente".
// Funções puras: recebem a lista (vinda do Firestore ou dos dados de exemplo) por parâmetro.
import { categoriaPorChave } from '../data/tiposMateriais.js';
import { listarMateriais } from './materiais.js';
import { normalizar } from './format.js';

// Ordem definida pelo admin (campo `ordem`); sem ordem, vai para o fim em ordem alfabética.
export const ordenar = (lista) =>
  [...lista].sort((a, b) => (a.ordem ?? 1e9) - (b.ordem ?? 1e9) || (a.nome || '').localeCompare(b.nome || ''));

export const buscarPorSlug = (lista, slug) => lista.find((e) => e.slug === slug);

export const opcoesUnicas = (lista, campo) => [...new Set(lista.map((e) => e[campo]).filter(Boolean))].sort();

export function filtrarEmpreendimentos(lista, { busca = '', status = '', cidade = '' }) {
  const termo = normalizar(busca);
  return lista.filter((e) => {
    if (status && e.status !== status) return false;
    if (cidade && e.cidade !== cidade) return false;
    if (!termo) return true;
    const alvo = normalizar(`${e.nome} ${e.bairro} ${e.cidade} ${e.construtora}`);
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
