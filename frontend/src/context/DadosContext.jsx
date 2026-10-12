import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { empreendimentos as exemplos } from '../data/empreendimentos.js';
import { SITE } from '../data/config.js';
import { ordenar } from '../utils/empreendimentos.js';
import { carregarEmpreendimentos, carregarSite } from '../services/publico.js';

// Fonte única dos dados do site. Lê o catálogo e a config do backend (FastAPI + Postgres).
// - Corretores: leitura ao abrir a página e ao voltar para a aba; a última versão fica no
//   navegador (cache) para a tela aparecer na hora ao recarregar.
// - Painel admin: chama `ativarTempoReal()` e passa a atualizar sozinho por polling.
const DadosContext = createContext(null);
const CHAVE_CACHE = 'audaz-dados-v1';
const INTERVALO_MINIMO_MS = 30_000; // ao voltar para a aba, no máximo 1 nova leitura a cada 30 s
const POLL_ADMIN_MS = 15_000; // no painel, recarrega a cada 15 s

function lerCache() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_CACHE)) || null;
  } catch {
    return null;
  }
}
function gravarCache(parcial) {
  try {
    localStorage.setItem(CHAVE_CACHE, JSON.stringify({ ...lerCache(), ...parcial }));
  } catch {
    // Sem armazenamento (aba anônima, cota cheia): segue sem cache.
  }
}

export function DadosProvider({ children }) {
  const cache = lerCache();
  const [estado, setEstado] = useState({
    empreendimentos: cache?.empreendimentos || [],
    site: { ...SITE, ...(cache?.site || {}) },
    siteCarregado: Boolean(cache?.site),
    carregando: !cache?.empreendimentos,
    erro: null,
  });
  const ultimaLeitura = useRef(0);
  const pollRef = useRef(null);

  const aplicarSite = useCallback((site) => {
    setEstado((s) => ({ ...s, site: { ...SITE, ...site }, siteCarregado: true }));
    gravarCache({ site });
  }, []);
  const aplicarLista = useCallback((lista) => {
    const ordenada = ordenar(lista);
    setEstado((s) => ({ ...s, empreendimentos: ordenada, carregando: false, erro: null }));
    gravarCache({ empreendimentos: ordenada });
  }, []);

  const recarregar = useCallback(async () => {
    ultimaLeitura.current = Date.now();
    try {
      const [site, lista] = await Promise.all([carregarSite(), carregarEmpreendimentos()]);
      aplicarSite(site);
      aplicarLista(lista);
    } catch (erro) {
      // Sem dados e sem cache: mostra os exemplos para a tela não ficar vazia.
      setEstado((s) => ({
        ...s,
        empreendimentos: s.empreendimentos.length ? s.empreendimentos : exemplos,
        carregando: false,
        siteCarregado: true,
        erro,
      }));
    }
  }, [aplicarSite, aplicarLista]);

  useEffect(() => {
    recarregar();
    const aoVoltar = () => {
      if (document.visibilityState === 'visible' && Date.now() - ultimaLeitura.current > INTERVALO_MINIMO_MS) recarregar();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, [recarregar]);

  // Painel admin: atualização automática por polling (substitui o tempo real do Firestore).
  const ativarTempoReal = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(recarregar, POLL_ADMIN_MS);
  }, [recarregar]);
  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  return <DadosContext.Provider value={{ ...estado, recarregar, ativarTempoReal }}>{children}</DadosContext.Provider>;
}

export const useDados = () => useContext(DadosContext);
