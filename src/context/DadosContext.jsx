import { createContext, useContext, useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db, firebaseAtivo } from '../firebase.js';
import { empreendimentos as exemplos } from '../data/empreendimentos.js';
import { SITE } from '../data/config.js';
import { ordenar } from '../utils/empreendimentos.js';

// Fonte única dos dados do site. Com Firebase configurado, escuta o Firestore em tempo real:
// o que o admin salva aparece na hora para todos os corretores, sem publicar nada.
const DadosContext = createContext(null);

export function DadosProvider({ children }) {
  const [estado, setEstado] = useState(() =>
    firebaseAtivo
      ? { empreendimentos: [], site: SITE, carregando: true, erro: null }
      : { empreendimentos: exemplos, site: SITE, carregando: false, erro: null }
  );

  useEffect(() => {
    if (!firebaseAtivo) return undefined;
    const pararEmp = onSnapshot(
      collection(db, 'empreendimentos'),
      (snap) => {
        const lista = ordenar(snap.docs.map((d) => ({ ...d.data(), slug: d.id })));
        setEstado((s) => ({ ...s, empreendimentos: lista, carregando: false, erro: null }));
      },
      (erro) => setEstado((s) => ({ ...s, carregando: false, erro }))
    );
    const pararSite = onSnapshot(doc(db, 'config', 'site'), (snap) => {
      setEstado((s) => ({ ...s, site: { ...SITE, ...(snap.data() || {}) } }));
    });
    return () => {
      pararEmp();
      pararSite();
    };
  }, []);

  return <DadosContext.Provider value={estado}>{children}</DadosContext.Provider>;
}

export const useDados = () => useContext(DadosContext);
