// Testes das regras de links (Drive, Maps, segurança) e materiais. Rodar: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analisarLinkDrive, urlImagem } from '../src/utils/drive.js';
import { sanitizarUrl } from '../src/utils/urls.js';
import { analisarLinkMaps, mapaDoEmpreendimento } from '../src/utils/mapa.js';
import {
  analisarUrlMaterial, listarMateriais, materiaisPorCategoria, miniaturaDoMaterial, seloDoMaterial,
} from '../src/utils/materiais.js';
import { fotosDo, miniaturaDo, opcoesUnicas, filtrarEmpreendimentos } from '../src/utils/empreendimentos.js';

const ID = '1zo8oxpBEQlhhXPDYylohFX6bY1giBaWj';

test('Drive: formatos de link de arquivo viram /preview', () => {
  for (const url of [
    `https://drive.google.com/file/d/${ID}/view?usp=drive_link`,
    `https://drive.google.com/file/d/${ID}/edit`,
    `https://drive.google.com/open?id=${ID}`,
    `https://drive.google.com/uc?id=${ID}&export=download`,
    `https://drive.google.com/u/0/file/d/${ID}/view`,
  ]) {
    const d = analisarLinkDrive(url);
    assert.equal(d.valido, true, url);
    assert.equal(d.id, ID);
    assert.equal(d.urlPreview, `https://drive.google.com/file/d/${ID}/preview`);
  }
});

test('Drive: pasta, planilha (com aba) e link sem ID', () => {
  assert.equal(analisarLinkDrive(`https://drive.google.com/drive/u/0/folders/${ID}?usp=sharing`).urlPreview,
    `https://drive.google.com/embeddedfolderview?id=${ID}#grid`);
  const p = analisarLinkDrive(`https://docs.google.com/spreadsheets/d/${ID}/edit?gid=1806500562#gid=1806500562`);
  assert.equal(p.tipo, 'planilha');
  assert.equal(p.urlPreview, `https://docs.google.com/spreadsheets/d/${ID}/preview#gid=1806500562`);
  assert.equal(analisarLinkDrive(`https://docs.google.com/spreadsheets/d/${ID}/edit`).urlPreview, `https://docs.google.com/spreadsheets/d/${ID}/preview`);
  assert.equal(analisarUrlMaterial('https://drive.google.com/drive/my-drive').valido, false);
});

test('Drive: foto vira miniatura direta; outros links ficam iguais', () => {
  assert.equal(urlImagem(`https://drive.google.com/file/d/${ID}/view?usp=sharing`, 1200), `https://drive.google.com/thumbnail?id=${ID}&sz=w1200`);
  assert.equal(urlImagem('https://site.com/a.jpg'), 'https://site.com/a.jpg');
});

test('Segurança: só https, sem javascript:/data:/HTML/espaços/senha', () => {
  for (const ruim of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,<script>alert(1)</script>',
    'http://site.com/a.pdf', 'https://site.com/<script>', 'https://exemplo.com/a b.pdf',
    '"><img src=x onerror=alert(1)>', 'https://user:senha@site.com/a', 'vbscript:msgbox', 'file:///etc/passwd', '']) {
    assert.equal(sanitizarUrl(ruim).valida, false, ruim);
  }
  assert.equal(sanitizarUrl(`drive.google.com/file/d/${ID}/view`).url, `https://drive.google.com/file/d/${ID}/view`);
});

test('Materiais: YouTube, imagem, PDF, site bloqueado e Maps', () => {
  assert.equal(analisarUrlMaterial('https://youtu.be/dQw4w9WgXcQ').modo, 'iframe');
  assert.equal(analisarUrlMaterial('https://site.com/planta.JPG').modo, 'imagem');
  assert.equal(seloDoMaterial({ urlOriginal: 'https://site.com/book.pdf' }), 'PDF');
  assert.equal(analisarUrlMaterial('https://instagram.com/p/x').modo, 'externo');
  assert.equal(analisarUrlMaterial('https://maps.app.goo.gl/AbC').modo, 'externo');
  assert.match(analisarUrlMaterial('https://www.google.com/maps/search/?api=1&query=Parangaba').urlPreview, /output=embed/);
});

test('Materiais: miniaturas', () => {
  assert.equal(miniaturaDoMaterial({ urlOriginal: `https://drive.google.com/file/d/${ID}/view` }), `https://drive.google.com/thumbnail?id=${ID}&sz=w800`);
  assert.equal(miniaturaDoMaterial({ urlOriginal: 'https://youtu.be/dQw4w9WgXcQ' }), 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  assert.equal(miniaturaDoMaterial({ urlOriginal: `https://drive.google.com/drive/folders/${ID}` }), null);
});

test('Materiais: formato antigo continua aparecendo; inativos ficam ocultos', () => {
  const antigo = { slug: 'x', materiais: {
    book: [{ titulo: 'Book', url: `https://drive.google.com/file/d/${ID}/view`, atualizadoEm: '2026-10-03T01:50:32.557Z' }],
    informacoes: [{ titulo: 'Campanha', url: 'https://site.com/c.pdf' }] } };
  const l = listarMateriais(antigo);
  assert.deepEqual([l[0].id, l[0].categoria, l[0].tipoOrigem], ['book-0', 'book', 'google_drive']);
  assert.equal(l[1].categoria, 'material-comercial');
  const g = materiaisPorCategoria({ materiaisLista: [
    { id: 'a', categoria: 'book', urlOriginal: 'https://x.com/a.pdf', ordem: 1, ativo: true },
    { id: 'b', categoria: 'book', urlOriginal: 'https://x.com/b.pdf', ordem: 0, ativo: false } ] });
  assert.deepEqual(g.map((c) => c.itens.map((i) => i.id)), [['a']]);
});

test('Maps: link curto, place com pin, embed, rejeições e fallback no endereço', () => {
  assert.equal(analisarLinkMaps('https://maps.app.goo.gl/AbC').urlEmbed, null);
  assert.match(analisarLinkMaps('https://www.google.com/maps/place/X/@-3.8,-38.57,17z/data=!3d-3.8012!4d-38.5698').urlEmbed, /q=-3\.8012%2C-38\.5698/);
  assert.equal(analisarLinkMaps('<iframe src="https://www.google.com/maps/embed?pb=!1m18" width="600"></iframe>').urlEmbed, 'https://www.google.com/maps/embed?pb=!1m18');
  assert.equal(analisarLinkMaps('<iframe src="javascript:alert(1)"></iframe>').valido, false);
  assert.equal(analisarLinkMaps('https://evil.com/maps').valido, false);
  assert.match(mapaDoEmpreendimento({ endereco: 'Rua X' }).urlEmbed, /Rua%20X/);
  assert.equal(mapaDoEmpreendimento({}), null);
});

test('Empreendimentos: fotos antigas, miniatura com logo e cidades sem duplicar', () => {
  assert.deepEqual(fotosDo({ imagem: 'a' }), ['a']);
  assert.deepEqual(fotosDo({ fotos: ['b', 'c'], imagem: 'a' }), ['b', 'c']);
  assert.deepEqual(miniaturaDo({ logo: 'L', fotos: ['f'] }), { src: 'L', ehLogo: true });
  const lista = [{ cidade: 'FORTALEZA' }, { cidade: 'Fortaleza' }, { cidade: 'Eusébio' }];
  assert.deepEqual(opcoesUnicas(lista, 'cidade'), ['Eusébio', 'Fortaleza']);
  assert.equal(filtrarEmpreendimentos(lista, { cidade: 'Fortaleza' }).length, 2);
});

import { extrairAbas, urlAbaPlanilha } from '../src/utils/planilha.js';

test('Planilha: extrai as abas (nome + gid) do HTML do Google', () => {
  const html = `items.push({name: "MENU", pageUrl: "https:\\/\\/docs.google.com\\/x?headers\\x3dtrue&gid=1", gid: "1806500562"});
  items.push({name: "Condições Comerciais ", pageUrl: "https:\\/\\/x", gid: "1606980535"});
  items.push({name: "A \\x26 B", pageUrl: "https:\\/\\/x", gid: "7"});`;
  assert.deepEqual(extrairAbas(html), [
    { nome: 'MENU', gid: '1806500562' },
    { nome: 'Condições Comerciais', gid: '1606980535' },
    { nome: 'A & B', gid: '7' },
  ]);
  assert.equal(urlAbaPlanilha('ID', '7'), 'https://docs.google.com/spreadsheets/d/ID/htmlview/sheet?headers=false&gid=7');
  assert.equal(urlAbaPlanilha('ID', ''), 'https://docs.google.com/spreadsheets/d/ID/preview');
});

test('Planilha: HTML real tem as abas da tabela unificada', async () => {
  const { readFile } = await import('node:fs/promises');
  const arquivo = process.env.HTML_PLANILHA;
  if (!arquivo) return;
  const abas = extrairAbas(await readFile(arquivo, 'utf8'));
  assert.ok(abas.length > 10);
  assert.ok(abas.some((a) => a.nome === 'Conquista Maraponga' && a.gid === '1334182049'));
});

import { agruparArquivos, grupoDoArquivo, nomeAmigavel } from '../src/utils/pastaDrive.js';

test('Pasta de tabelas: nomes amigáveis e grupos por linha', () => {
  assert.equal(nomeAmigavel('Tabela - Viva Vida Siqueira - SETEMBRO 2026.pdf'), 'Viva Vida Siqueira - SETEMBRO 2026');
  assert.equal(nomeAmigavel('Nature Arbo - SETEMBRO_26 V2.pptx.pdf'), 'Nature Arbo - SETEMBRO 26 V2');
  assert.equal(grupoDoArquivo('Vida Nova Caucaia-SETEMBRO.pdf'), 'Viva Vida');
  assert.equal(grupoDoArquivo('Viva Vida Tropical-SETEMBRO ajustada.pdf'), 'Viva Vida');
  assert.equal(grupoDoArquivo('Estilo Passaré. SETEMBRO.26.pdf'), 'Estilo');
  assert.equal(grupoDoArquivo('Lúmina Fátima - Set26.pdf'), 'Lúmina');
  const g = agruparArquivos([
    { id: '1', nome: 'Conquista Sabiá - SETEMBRO.pdf' },
    { id: '2', nome: 'Conquista Maraponga SETEMBRO 2026.pdf' },
    { id: '3', nome: 'Viva Vida Sul - SETEMBRO 26.pptx.pdf' },
  ]);
  assert.deepEqual(g.map((x) => [x.nome, x.itens.map((i) => i.id)]), [['Conquista', ['2', '1']], ['Viva Vida', ['3']]]);
  assert.deepEqual(agruparArquivos([{ id: '1', nome: 'Conquista Sabiá.pdf' }, { id: '2', nome: 'Nature Arbo.pdf' }], 'sabia').map((x) => x.nome), ['Conquista']);
});

import { mesDasTabelas, nomeEmpreendimento } from '../src/utils/pastaDrive.js';

test('Pasta de tabelas: nome do empreendimento sem mês/versão e mês do título', () => {
  const casos = {
    'Nature Arbo - SETEMBRO_26 V2.pptx.pdf': 'Nature Arbo',
    'Viva Vida Tropical-SETEMBRO ajustada.pdf': 'Viva Vida Tropical',
    'Estilo Passaré. SETEMBRO.26.pdf': 'Estilo Passaré',
    'Lúmina Fátima - Set26.pdf': 'Lúmina Fátima',
    'Conquista Maraponga SETEMBRO 2026.pdf': 'Conquista Maraponga',
    'Seano Beach e home - Setembro.26.pdf': 'Seano Beach e home',
    'Viva Vida Maracanaú - SETEMBRO.pdf': 'Viva Vida Maracanaú',
    'Tabela - Viva Vida Siqueira - SETEMBRO 2026.pdf': 'Viva Vida Siqueira',
  };
  for (const [arquivo, esperado] of Object.entries(casos)) assert.equal(nomeEmpreendimento(arquivo), esperado, arquivo);
  assert.equal(mesDasTabelas(Object.keys(casos).map((nome) => ({ nome }))), 'Setembro 2026');
  assert.equal(mesDasTabelas([{ nome: 'Tabela geral.pdf' }]), '');
});

import { nomeDeExibicao, tipoDoArquivo } from '../src/utils/pastaDrive.js';

test('Navegador de pasta: nome de exibição e tipo do arquivo', () => {
  assert.equal(nomeDeExibicao('01 - Abril - Vista aérea_7a5bb693-d43c-4f13-a0f6-c0706ca0604e.jpg'), '01 - Abril - Vista aérea');
  assert.equal(nomeDeExibicao('Mapa de vaga Lúmina (1).pdf'), 'Mapa de vaga Lúmina (1)');
  assert.equal(nomeDeExibicao('Logo -'), 'Logo');
  assert.equal(tipoDoArquivo({ tipo: 'image/jpeg' }), 'imagem');
  assert.equal(tipoDoArquivo({ tipo: 'video/mp4' }), 'video');
  assert.equal(tipoDoArquivo({ tipo: 'application/pdf' }), 'pdf');
  assert.equal(tipoDoArquivo({ tipo: 'application/vnd.google-apps.spreadsheet' }), 'documento');
  assert.equal(tipoDoArquivo({ tipo: 'application/zip' }), 'outro');
});

import { chaveEntrega, ordenarPorEntrega } from '../src/utils/entrega.js';

test('Entrega: entende formatos variados e ordena', () => {
  assert.equal(chaveEntrega('31/01/2027'), 20270131);
  assert.equal(chaveEntrega('31/06/2028'), 20280630); // dia inexistente → último dia do mês
  assert.equal(chaveEntrega('31/09/2026'), 20260930);
  assert.equal(chaveEntrega('JUNHO /2029'), 20290630);
  assert.equal(chaveEntrega('janeiro 2027'), 20270131);
  assert.equal(chaveEntrega('Jun/2028'), 20280630);
  assert.equal(chaveEntrega('03/2027'), 20270331);
  assert.equal(chaveEntrega('2028'), 20281231);
  assert.equal(chaveEntrega(''), null);
  assert.equal(chaveEntrega('a definir'), null);
  const lista = [{ n: 'C', entrega: '' }, { n: 'B', entrega: 'JUNHO /2029' }, { n: 'A', entrega: '31/10/2026' }];
  assert.deepEqual(ordenarPorEntrega(lista).map((e) => e.n), ['A', 'B', 'C']);
  assert.deepEqual(ordenarPorEntrega(lista, true).map((e) => e.n), ['B', 'A', 'C']);
});

import { camposFirestore } from '../src/services/publico.js';

test('Leitura pública: converte o formato do Firestore REST em valores comuns', () => {
  const campos = camposFirestore({
    nome: { stringValue: 'Nature Arbo' },
    ordem: { integerValue: '3' },
    preco: { doubleValue: 1.5 },
    ativo: { booleanValue: true },
    logo: { nullValue: null },
    fotos: { arrayValue: { values: [{ stringValue: 'a' }, { stringValue: 'b' }] } },
    vazio: { arrayValue: {} },
    materiaisLista: { arrayValue: { values: [{ mapValue: { fields: { titulo: { stringValue: 'BOOK' }, ativo: { booleanValue: false } } } }] } },
  });
  assert.deepEqual(campos, {
    nome: 'Nature Arbo', ordem: 3, preco: 1.5, ativo: true, logo: null, fotos: ['a', 'b'], vazio: [],
    materiaisLista: [{ titulo: 'BOOK', ativo: false }],
  });
});
