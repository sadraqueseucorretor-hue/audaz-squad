// Credenciais do projeto Firebase (Console → Configurações do projeto → Seus apps → Web).
// Estes valores são públicos por natureza: a segurança vem das regras em firestore.rules e storage.rules.
// Enquanto apiKey estiver vazia, o site mostra os dados de exemplo de empreendimentos.js.
export const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

// E-mails com acesso ao painel /admin. Precisa bater com a lista em firestore.rules e storage.rules.
export const ADMIN_EMAILS = ['sadraqueseucorretor@gmail.com'];
