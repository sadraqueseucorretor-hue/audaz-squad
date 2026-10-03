import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { FIREBASE_CONFIG, ADMIN_EMAILS } from './data/firebaseConfig.js';

export const firebaseAtivo = Boolean(FIREBASE_CONFIG.apiKey);

const app = firebaseAtivo ? initializeApp(FIREBASE_CONFIG) : null;

export const auth = app && getAuth(app);
// ignoreUndefinedProperties: campos opcionais vazios no formulário não quebram o salvamento.
export const db = app && initializeFirestore(app, { ignoreUndefinedProperties: true });

export const ehAdmin = (usuario) => Boolean(usuario?.email && ADMIN_EMAILS.includes(usuario.email.toLowerCase()));
