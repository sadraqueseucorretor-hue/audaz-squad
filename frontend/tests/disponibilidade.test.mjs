// Testes da busca de unidade e do agrupamento do espelho. Rodar: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { termosDeBusca, unidadeCombina, numeroCurto, agruparEspelho } from '../src/utils/disponibilidade.js';

const u = (identificador, bloco, andar, tipo_planta = 'TIPO 2Q') => ({ identificador, bloco, andar, tipo_planta, tipo: 'Apartamento' });
const acha = (texto, unidade) => unidadeCombina(unidade, termosDeBusca(texto));

test('busca: unidade e bloco em vários formatos', () => {
  const x = u('BL03-0401', 'BL-03', 4);
  for (const t of ['bl03 401', 'BL03-0401', 'bloco 3', 'bloco 03 apto 401', 'BL-03', '0401', '401', 'bl3', 'tipo 2q', '']) {
    assert.ok(acha(t, x), t);
  }
  for (const t of ['bl04', 'bloco 4', '402', 'terreo']) assert.ok(!acha(t, x), t);
});

test('busca: bloco 1 não traz o bloco 10', () => {
  assert.ok(acha('bloco 1', u('BL01-0101', 'BL-01', 1)));
  assert.ok(!acha('bloco 1', u('BL10-0101', 'BL-10', 1)));
  assert.ok(!acha('bl1', u('BL11-0101', 'BL-11', 1)));
});

test('busca: planta com acento e barra', () => {
  assert.ok(acha('térreo c/ap', u('BL01-0101', 'BL-01', 1, 'TERREO 2Q C/AP')));
});

test('numeroCurto', () => {
  assert.equal(numeroCurto('BL03-0401'), '0401');
  assert.equal(numeroCurto('101'), '101');
});

test('espelho: blocos em ordem e andares do mais alto ao térreo', () => {
  const g = agruparEspelho([u('BL10-0101', 'BL-10', 1), u('BL02-0402', 'BL-02', 4), u('BL02-0101', 'BL-02', 1), u('BL02-0401', 'BL-02', 4)]);
  assert.deepEqual(g.map((b) => b.bloco), ['BL-02', 'BL-10']);
  assert.deepEqual(g[0].andares.map((a) => a.andar), [4, 1]);
  assert.deepEqual(g[0].andares[0].unidades.map((x) => x.identificador), ['BL02-0401', 'BL02-0402']);
});
