// Operações de escrita do painel admin — agora via API FastAPI (antes Firestore).
// As assinaturas foram mantidas para as telas de admin continuarem iguais.
import * as api from './api.js';

export const salvarEmpreendimento = (emp) => api.salvarEmpreendimento(emp.slug, emp);

// Ocultar/mostrar para os corretores sem perder o resto do cadastro:
// lê o atual, troca só `ativo`/`atualizadoEm` e regrava.
export async function definirVisibilidade(slug, ativo) {
  const atual = await api.obterDoCatalogo(slug);
  return api.salvarEmpreendimento(slug, { ...atual, ativo, atualizadoEm: new Date().toISOString() });
}

export const excluirEmpreendimento = (slug) => api.excluirEmpreendimento(slug);

export const salvarSite = (dados) => api.salvarConfigSite(dados);

// Grava a nova ordem conforme a sequência da lista recebida.
export const salvarOrdem = (lista) => api.reordenarCatalogo(lista.map((e) => e.slug));

export async function importarExemplos(lista) {
  for (let i = 0; i < lista.length; i += 1) {
    await api.salvarEmpreendimento(lista[i].slug, { ...lista[i], ordem: i });
  }
}

// A logo é reduzida e enviada como data URL (sem depender do Storage).
// As margens transparentes são cortadas para a logo ocupar todo o topo.
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

// Ícone da aba do navegador (favicon): recorta as margens transparentes e centraliza num
// quadrado azul-escuro arredondado (logo branca sem fundo some na aba clara).
export function iconeParaDataUrl(fonte, { fundo = true, lado = 128 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Não foi possível ler a imagem do ícone.'));
    img.onload = () => {
      const { x, y, largura, altura } = areaVisivel(img);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = lado;
      const ctx = canvas.getContext('2d');
      if (fundo) {
        const r = lado * 0.22;
        ctx.fillStyle = '#021d40';
        ctx.beginPath();
        ctx.moveTo(r, 0); ctx.arcTo(lado, 0, lado, lado, r); ctx.arcTo(lado, lado, 0, lado, r);
        ctx.arcTo(0, lado, 0, 0, r); ctx.arcTo(0, 0, lado, 0, r); ctx.closePath(); ctx.fill();
      }
      const area = lado * (fundo ? 0.76 : 0.96);
      const escala = area / Math.max(largura, altura);
      const w = largura * escala;
      const h = altura * escala;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, x, y, largura, altura, (lado - w) / 2, (lado - h) / 2, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = fonte;
  });
}

export const arquivoParaDataUrl = (arquivo) =>
  new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    leitor.onload = () => resolve(leitor.result);
    leitor.readAsDataURL(arquivo);
  });

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
  if (erro?.status === 401) return 'Sessão expirada. Entre novamente para salvar.';
  if (erro?.status === 403) return 'Sem permissão para esta ação.';
  return erro?.message || 'Algo deu errado. Tente novamente.';
}
