// Operações de escrita do painel admin (Firestore). As regras do Firebase garantem
// que só o e-mail admin consegue gravar; aqui só montamos as chamadas.
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase.js';

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

// A logo fica gravada direto no Firestore (como data URL reduzida), sem depender do Storage.
// As margens transparentes são cortadas para a logo ocupar todo o espaço disponível no topo.
export function logoParaDataUrl(arquivo, ladoMax = 600) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    leitor.onload = () => {
      if (arquivo.type === 'image/svg+xml') return resolve(leitor.result);
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo de imagem inválido.'));
      img.onload = () => {
        const { x, y, largura, altura } = areaVisivel(img);
        const escala = Math.min(1, ladoMax / Math.max(largura, altura));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(largura * escala);
        canvas.height = Math.round(altura * escala);
        canvas.getContext('2d').drawImage(img, x, y, largura, altura, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

// Retângulo que contém os pixels não transparentes da imagem (a imagem inteira se não houver transparência).
function areaVisivel(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, img.width, img.height);
  let minX = img.width, minY = img.height, maxX = -1, maxY = -1;
  for (let py = 0; py < img.height; py++) {
    for (let px = 0; px < img.width; px++) {
      if (data[(py * img.width + px) * 4 + 3] > 8) {
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }
  }
  if (maxX < 0) return { x: 0, y: 0, largura: img.width, altura: img.height };
  return { x: minX, y: minY, largura: maxX - minX + 1, altura: maxY - minY + 1 };
}

export function mensagemErro(erro) {
  const codigo = erro?.code || '';
  if (codigo.includes('permission-denied') || codigo.includes('unauthorized'))
    return 'Sem permissão para salvar. Confira se as regras do Firebase foram publicadas e se você entrou com o e-mail admin.';
  return erro?.message || 'Algo deu errado. Tente novamente.';
}
