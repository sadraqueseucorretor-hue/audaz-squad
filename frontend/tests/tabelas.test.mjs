// Testes da escolha da tabela de valores (Direcional / Riva). Rodar: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escolherFonte, fontesCadastradas, fonteDoEmpreendimento } from '../src/utils/tabelas.js';

const ambos = { tabelaValoresUrl: 'https://d', tabelaValoresRivaUrl: 'https://r' };
const soDirecional = { tabelaValoresUrl: 'https://d' };
const soRiva = { tabelaValoresRivaUrl: 'https://r' };

test('tabelas cadastradas e escolha pela URL', () => {
  assert.deepEqual(fontesCadastradas(ambos).map((f) => f.chave), ['direcional', 'riva']);
  assert.equal(escolherFonte(ambos, 'riva').chave, 'riva');
  assert.equal(escolherFonte(ambos, null).chave, 'direcional');
  assert.equal(escolherFonte(soDirecional, 'riva').chave, 'direcional');
  assert.equal(escolherFonte(soRiva, null).chave, 'riva');
  assert.equal(escolherFonte({}, null), null);
});

test('tabela do empreendimento pela construtora', () => {
  assert.equal(fonteDoEmpreendimento({ construtora: 'RIVA' }, ambos).chave, 'riva');
  assert.equal(fonteDoEmpreendimento({ construtora: 'Direcional' }, ambos).chave, 'direcional');
  assert.equal(fonteDoEmpreendimento({ construtora: 'RIVA' }, soDirecional).chave, 'direcional');
  assert.equal(fonteDoEmpreendimento({ construtora: 'Direcional' }, soRiva), null);
});
