// Regras de negócio sobre os dados: busca, filtros, materiais visíveis e "atualizados recentemente".
// Funções puras: recebem a lista (vinda do Firestore ou dos dados de exemplo) por parâmetro.
import { TIPOS_MATERIAIS } from '../data/tiposMateriais.js';
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

// Retorna só os tipos de material que têm pelo menos um arquivo, na ordem do catálogo.
export function materiaisVisiveis(emp) {
  const materiais = emp?.materiais || {};
  return TIPOS_MATERIAIS.map((tipo) => ({
    ...tipo,
    itens: (materiais[tipo.chave] || []).filter((item) => item && item.url),
  })).filter((tipo) => tipo.itens.length > 0);
}

// Descobre a atualização mais recente (geral ou de algum material) e o que foi atualizado.
export function ultimaAtualizacao(emp) {
  let melhor = { data: emp.atualizadoEm || null, oQue: 'Informações' };
  for (const tipo of materiaisVisiveis(emp)) {
    for (const item of tipo.itens) {
      if (item.atualizadoEm && (!melhor.data || new Date(item.atualizadoEm) >= new Date(melhor.data))) {
        melhor = { data: item.atualizadoEm, oQue: tipo.label };
      }
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
