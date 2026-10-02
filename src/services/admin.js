// Operações de escrita do painel admin (Firestore + Storage). As regras do Firebase garantem
// que só o e-mail admin consegue gravar; aqui só montamos as chamadas.
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase.js';

export const salvarEmpreendimento = (emp) => setDoc(doc(db, 'empreendimentos', emp.slug), emp);

export const excluirEmpreendimento = (slug) => deleteDoc(doc(db, 'empreendimentos', slug));

export const salvarSite = (dados) => setDoc(doc(db, 'config', 'site'), dados, { merge: true });

// Grava a posição de cada empreendimento conforme a ordem da lista recebida.
export async function salvarOrdem(lista) {
  const lote = writeBatch(db);
  lista.forEach((emp, i) => lote.update(doc(db, 'empreendimentos', emp.slug), { ordem: i }));
  await lote.commit();
}

export async function importarExemplos(lista) {
  const lote = writeBatch(db);
  lista.forEach((emp, i) => lote.set(doc(db, 'empreendimentos', emp.slug), { ...emp, ordem: i }));
  await lote.commit();
}

const nomeSeguro = (nome) => nome.normalize('NFD').replace(/[^\w.-]+/g, '-').toLowerCase();

// Envia um arquivo ao Firebase Storage e devolve a URL pública. onProgresso recebe 0–100.
export function enviarArquivo(arquivo, pasta, onProgresso = () => {}) {
  const destino = ref(storage, `${pasta}/${Date.now()}-${nomeSeguro(arquivo.name)}`);
  const tarefa = uploadBytesResumable(destino, arquivo, { contentType: arquivo.type || undefined });
  return new Promise((resolve, reject) => {
    tarefa.on(
      'state_changed',
      (s) => onProgresso(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
      reject,
      () => getDownloadURL(tarefa.snapshot.ref).then(resolve, reject)
    );
  });
}

// A logo fica gravada direto no Firestore (como data URL reduzida), sem depender do Storage.
export function logoParaDataUrl(arquivo, ladoMax = 600) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    leitor.onload = () => {
      if (arquivo.type === 'image/svg+xml') return resolve(leitor.result);
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo de imagem inválido.'));
      img.onload = () => {
        const escala = Math.min(1, ladoMax / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

export function formatoDoArquivo(arquivo) {
  const tipo = arquivo.type || '';
  if (tipo === 'application/pdf') return 'pdf';
  if (tipo.startsWith('image/')) return 'imagem';
  if (tipo.startsWith('video/')) return 'video';
  if (/sheet|excel|csv/.test(tipo) || /\.(xlsx?|csv|ods)$/i.test(arquivo.name)) return 'planilha';
  return 'link';
}

export function mensagemErro(erro) {
  const codigo = erro?.code || '';
  if (codigo.includes('permission-denied') || codigo.includes('unauthorized'))
    return 'Sem permissão para salvar. Confira se as regras do Firebase foram publicadas e se você entrou com o e-mail admin.';
  if (codigo.startsWith('storage/'))
    return 'Não foi possível enviar o arquivo. O Storage do Firebase precisa estar ativado (plano Blaze). Enquanto isso, cole um link do Google Drive no campo.';
  return erro?.message || 'Algo deu errado. Tente novamente.';
}
