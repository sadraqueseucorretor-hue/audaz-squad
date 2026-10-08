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
