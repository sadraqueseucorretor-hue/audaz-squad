import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { FIREBASE_CONFIG } from '../data/firebaseConfig.js';
import { empreendimentos as exemplos } from '../data/empreendimentos.js';
import { SITE } from '../data/config.js';
import { ordenar } from '../utils/empreendimentos.js';
import { carregarEmpreendimentos, carregarSite } from '../services/publico.js';

// Fonte única dos dados do site.
// - Corretores: leitura leve pela API REST (sem a biblioteca do Firebase), ao abrir a página e
//   ao voltar para a aba. A última versão fica no navegador: ao recarregar, tudo aparece na hora.
// - Painel admin: chama `ativarTempoReal()` e passa a escutar o Firestore em tempo real
//   (a biblioteca do Firebase só é baixada nesse momento).
const DadosContext = createContext(null);

const firebaseAtivo = Boolean(FIREBASE_CONFIG.apiKey);
const CHAVE_CACHE = 'audaz-dados-v1';
const INTERVALO_MINIMO_MS = 30_000; // ao voltar para a aba, no máximo 1 nova leitura a cada 30 s

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
  const [estado, setEstado] = useState(() => {
    if (!firebaseAtivo) return { empreendimentos: exemplos, site: SITE, siteCarregado: true, carregando: false, erro: null };
    const cache = lerCache();
    return {
      empreendimentos: cache?.empreendimentos || [],
      site: { ...SITE, ...(cache?.site || {}) },
      siteCarregado: Boolean(cache?.site),
      carregando: !cache?.empreendimentos,
      erro: null,
    };
  });
  const tempoReal = useRef(false);
  const ultimaLeitura = useRef(0);

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
    if (!firebaseAtivo || tempoReal.current) return;
    ultimaLeitura.current = Date.now();
    try {
      const [site, lista] = await Promise.all([carregarSite(), carregarEmpreendimentos()]);
      if (tempoReal.current) return;
      aplicarSite(site);
      aplicarLista(lista);
    } catch (erro) {
      setEstado((s) => ({ ...s, carregando: false, siteCarregado: true, erro }));
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

  // Painel admin: escuta em tempo real (o que for salvo aparece na hora na lista do painel).
  const pararTempoReal = useRef(null);
  const ativarTempoReal = useCallback(async () => {
    if (!firebaseAtivo || tempoReal.current) return;
    tempoReal.current = true;
    const [{ collection, doc, onSnapshot }, { db }] = await Promise.all([import('firebase/firestore'), import('../firebase.js')]);
    const pararEmp = onSnapshot(
      collection(db, 'empreendimentos'),
      (snap) => aplicarLista(snap.docs.map((d) => ({ ...d.data(), slug: d.id }))),
      (erro) => setEstado((s) => ({ ...s, carregando: false, erro }))
    );
    const pararSite = onSnapshot(doc(db, 'config', 'site'), (snap) => aplicarSite(snap.data() || {}));
    pararTempoReal.current = () => {
      pararEmp();
      pararSite();
    };
  }, [aplicarLista, aplicarSite]);
  useEffect(() => () => pararTempoReal.current?.(), []);

  return <DadosContext.Provider value={{ ...estado, recarregar, ativarTempoReal }}>{children}</DadosContext.Provider>;
}

export const useDados = () => useContext(DadosContext);
