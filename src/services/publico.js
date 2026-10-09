// Leitura PÚBLICA dos dados (catálogo e configuração do site) pela API REST do Firestore.
// Não carrega a biblioteca do Firebase (pesada): a página dos corretores abre bem mais rápido.
// A biblioteca completa só é usada no painel admin (login, edição e tempo real).
import { FIREBASE_CONFIG } from '../data/firebaseConfig.js';

const BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

// Converte o formato tipado do Firestore REST ({ stringValue: "…" }) em valores JS comuns.
export function valorFirestore(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(valorFirestore);
  if ('mapValue' in v) return camposFirestore(v.mapValue.fields);
  return null;
}

export const camposFirestore = (fields = {}) =>
  Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, valorFirestore(v)]));

async function buscar(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Firestore ${r.status}`);
  return r.json();
}

/** Configuração do site (config/site) — {} se ainda não foi salva. */
export async function carregarSite() {
  const doc = await buscar(`${BASE}/config/site?key=${FIREBASE_CONFIG.apiKey}`);
  return doc ? camposFirestore(doc.fields) : {};
}

/** Todos os empreendimentos (com paginação), já com `slug` = id do documento. */
export async function carregarEmpreendimentos() {
  const lista = [];
  let pagina = '';
  do {
    const dados = await buscar(
      `${BASE}/empreendimentos?pageSize=300&key=${FIREBASE_CONFIG.apiKey}${pagina ? `&pageToken=${encodeURIComponent(pagina)}` : ''}`
    );
    for (const d of dados?.documents || []) lista.push({ ...camposFirestore(d.fields), slug: d.name.split('/').pop() });
    pagina = dados?.nextPageToken || '';
  } while (pagina);
  return lista;
}
