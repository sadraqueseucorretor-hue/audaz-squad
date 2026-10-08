// Credenciais do projeto Firebase (Console → Configurações do projeto → Seus apps → Web).
// Estes valores são públicos por natureza: a segurança vem das regras em firestore.rules.
// Enquanto apiKey estiver vazia, o site mostra os dados de exemplo de empreendimentos.js.
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyD26BDFxPhQrk8II-Wior_R8zQgCRqz-zo',
  authDomain: 'audazsquad.firebaseapp.com',
  projectId: 'audazsquad',
  storageBucket: 'audazsquad.firebasestorage.app',
  messagingSenderId: '898340863504',
  appId: '1:898340863504:web:444ab16e2387a7b126d495',
};

// E-mails com acesso ao painel /admin. Precisa bater com a lista em firestore.rules.
export const ADMIN_EMAILS = ['sadraqueseucorretor@gmail.com'];

// Chave do Google para LER pastas públicas do Drive (lista de PDFs da Tabela de valores).
// Criada no Google Cloud (projeto audazsquad) com: API restrita ao "Google Drive API" e
// uso restrito ao site (referenciadores HTTP). Só lê arquivos compartilhados como
// "Qualquer pessoa com o link" — não dá acesso a nada privado.
export const GOOGLE_DRIVE_API_KEY = '';
