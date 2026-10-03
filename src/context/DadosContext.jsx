import { createContext, useContext, useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db, firebaseAtivo } from '../firebase.js';
import { empreendimentos as exemplos } from '../data/empreendimentos.js';
import { SITE } from '../data/config.js';
import { ordenar } from '../utils/empreendimentos.js';

// Fonte única dos dados do site. Com Firebase configurado, escuta o Firestore em tempo real:
// o que o admin salva aparece na hora para todos os corretores, sem publicar nada.
const DadosContext = createContext(null);

// Guarda a última versão recebida no navegador: ao recarregar, logo e empreendimentos aparecem
// na hora (sem piscar o logotipo padrão) e o Firestore atualiza por cima em seguida.
const CHAVE_CACHE = 'audaz-dados-v1';

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

  useEffect(() => {
    if (!firebaseAtivo) return undefined;
    const pararEmp = onSnapshot(
      collection(db, 'empreendimentos'),
      (snap) => {
        const lista = ordenar(snap.docs.map((d) => ({ ...d.data(), slug: d.id })));
        setEstado((s) => ({ ...s, empreendimentos: lista, carregando: false, erro: null }));
        gravarCache({ empreendimentos: lista });
      },
      (erro) => setEstado((s) => ({ ...s, carregando: false, erro }))
    );
    const pararSite = onSnapshot(
      doc(db, 'config', 'site'),
      (snap) => {
        const site = snap.data() || {};
        setEstado((s) => ({ ...s, site: { ...SITE, ...site }, siteCarregado: true }));
        gravarCache({ site });
      },
      () => setEstado((s) => ({ ...s, siteCarregado: true }))
    );
    return () => {
      pararEmp();
      pararSite();
    };
  }, []);

  return <DadosContext.Provider value={estado}>{children}</DadosContext.Provider>;
}

export const useDados = () => useContext(DadosContext);
