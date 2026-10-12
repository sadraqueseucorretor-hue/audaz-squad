// Exporta a coleção `empreendimentos` e o doc `config/site` do Firestore
// para um arquivo JSON (firestore-export.json), que depois é importado no Postgres.
//
// Leitura é pública (firestore.rules: allow read: if true), então não precisa
// de login nem de service account.
//
// Como rodar (na raiz do projeto, onde está o node_modules com o firebase):
//   node scripts/exportar-firestore.mjs
//
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { writeFileSync } from 'node:fs';
import { FIREBASE_CONFIG } from '../src/data/firebaseConfig.js';

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

const snap = await getDocs(collection(db, 'empreendimentos'));
const empreendimentos = snap.docs.map((d) => ({ slug: d.id, ...d.data() }));

const siteSnap = await getDoc(doc(db, 'config', 'site'));
const site = siteSnap.exists() ? siteSnap.data() : {};

const saida = { empreendimentos, site, exportadoEm: new Date().toISOString() };
writeFileSync('firestore-export.json', JSON.stringify(saida, null, 2), 'utf-8');

console.log(`✓ ${empreendimentos.length} empreendimentos + config do site -> firestore-export.json`);
process.exit(0);
