import { useRef, useState } from 'react';
import '../styles/plano.css';

// Monta o "plano de pagamento resumido" a partir do código do simulador (base64 → JSON).
// Tudo roda no navegador; nada depende do iframe (o corretor copia o código e cola aqui).

const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function parseData(s) {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) { const [a, m, d] = s.slice(0, 10).split('-'); return new Date(+a, +m - 1, +d); }
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) { const [d, m, a] = s.slice(0, 10).split('/'); return new Date(+a, +m - 1, +d); }
  return null;
}
const fmt = (dt) => (dt ? String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0') + '/' + dt.getFullYear() : '—');
const mesAno = (dt) => (dt ? (MES[dt.getMonth()][0].toUpperCase() + MES[dt.getMonth()].slice(1)) + ' de ' + dt.getFullYear() : '—');
function addMeses(dt, n) { if (!dt) return null; const x = new Date(dt); x.setMonth(x.getMonth() + n); return x; }
function mesesEntre(a, b) { return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()); }

function decodificar(cod) {
  let s = (cod || '').trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  s += '='.repeat((4 - (s.length % 4)) % 4);
  return JSON.parse(decodeURIComponent(escape(atob(s))));
}

function calcular(o) {
  const d = o.data;
  const desc = (d.bonusAdimplencia || 0) + (d.bonusCampanha || 0) + (d.descontoCoordenador || 0) + (d.voltaAoCaixa || 0) + (d.folgaTabela || 0);
  const imovel = (d.valorUnidade || 0) - desc;
  const subs = (d.subsidioFederalValor || 0) + (d.subsidioEstadualValor || 0) + (d.fgtsValor || 0);
  const entrada = imovel - (d.financiamentoValor || 0) - subs;
  const sinalComTotal = (d.sinalComQuantidade || 0) * (d.sinalComValor || 0);
  const restante = entrada - (d.sinalAtoValor || 0) - sinalComTotal;
  const qtd = d.quantidadeParcelasValor || 0;
  const mensal = qtd ? +(restante / qtd).toFixed(2) : 0;
  const pctFin = d.valorUnidade ? (d.financiamentoValor / d.valorUnidade) * 100 : 0;
  const dtEntrega = parseData(d.dataEntrega);
  const dtSinalCom = parseData(d.sinalComInfo);

  const di = d.directInvestor || {};
  const liq = imovel;
  const ato = liq * (di.atoPercent || 0) / 100;
  const pre = liq * (di.prePercent || 0) / 100;
  const baloes = liq * (di.baloesPercent || 0) / 100;
  const pos = liq * (di.posPercent || 0) / 100;
  const dtIniPre = parseData(di.dataInicioPre);
  const qtdPre = dtIniPre && dtEntrega ? Math.max(1, mesesEntre(dtIniPre, dtEntrega) + 1) : (di.numMensaisPre || 0);
  const parcPre = qtdPre ? pre / qtdPre : 0;
  const qtdPos = di.numMensaisPos || 0;
  const parcPos = qtdPos ? pos / qtdPos : 0;
  const dtIniPos = parseData(di.dataInicioPos) || (dtIniPre ? addMeses(dtIniPre, qtdPre) : null);
  const atoData = parseData((di.sinais && di.sinais[0] && di.sinais[0].data) || d.sinalAtoInfo);

  return {
    d, di, desc, imovel, subs, entrada, sinalComTotal, restante, qtd, mensal, totalParc: mensal * qtd, pctFin,
    liq, ato, pre, baloes, pos, qtdPre, parcPre, qtdPos, parcPos, dtIniPre, dtIniPos, atoData,
    dtEntrega, dtSinalCom, dtAto: parseData(d.sinalAtoInfo), dtSinalComUlt: addMeses(dtSinalCom, (d.sinalComQuantidade || 1) - 1), dtMensal: parseData(d.valorParcelaInfo),
  };
}

const linha = (t, s, big, sm) =>
  `<div class="pp-linha"><div class="pp-esq"><div class="pp-t">${t}</div>${s ? `<div class="pp-s">${s}</div>` : ''}</div>` +
  `<div class="pp-dir"><div class="pp-big">${big}</div>${sm ? `<div class="pp-sm">${sm}</div>` : ''}</div></div>`;

function bodyAssociativo(c, d) {
  const pct = c.pctFin.toFixed(1).replace('.', ',');
  const sinalCom = d.sinalComQuantidade > 0
    ? linha('Sinal Com <span style="color:var(--pp-suave);font-weight:600">(sem juros)</span>',
      `1ª em ${fmt(c.dtSinalCom)} · última em ${fmt(c.dtSinalComUlt)} · total ${brl(c.sinalComTotal)}`,
      `${d.sinalComQuantidade}× ${brl(d.sinalComValor)}`, '')
    : '';
  const itensSub = [];
  if (d.subsidioFederalValor > 0) itensSub.push(['Subsídio federal', d.subsidioFederalValor]);
  if (d.subsidioEstadualValor > 0) itensSub.push(['Subsídio estadual', d.subsidioEstadualValor]);
  if (d.fgtsValor > 0) itensSub.push(['FGTS', d.fgtsValor]);
  const secSub = c.subs > 0 && itensSub.length
    ? `<h3 class="pp-sectit">Subsídios e FGTS</h3><div class="pp-mini">` +
      itensSub.map(([t, v]) => `<div class="pp-mi"><span>${t}</span><b>${brl(v)}</b></div>`).join('') +
      `<div class="pp-mi pp-total"><span>Total</span><b>${brl(c.subs)}</b></div></div>`
    : '';
  return `
    <div class="pp-cards">
      <div class="pp-card"><div class="pp-lab">Financiamento</div><div class="pp-val">${brl(d.financiamentoValor)}</div><div class="pp-obs">${pct}% do valor da unidade</div></div>
      <div class="pp-card"><div class="pp-lab">Subsídios + FGTS</div><div class="pp-val">${brl(c.subs)}</div></div>
      <div class="pp-card"><div class="pp-lab">Entrada total</div><div class="pp-val">${brl(c.entrada)}</div></div>
    </div>
    ${secSub}
    <h3 class="pp-sectit">Como fica a entrada</h3>
    <div class="pp-linhas">
      ${linha('Sinal / Ato', `em ${fmt(c.dtAto)}`, brl(d.sinalAtoValor), '')}
      ${sinalCom}
      ${linha('Mensais', `1ª parcela em ${fmt(c.dtMensal)} · total ${brl(c.totalParc)}`, `${c.qtd}× ${brl(c.mensal)}`, '')}
    </div>
    <h3 class="pp-sectit">Financiamento habitacional</h3>
    <div class="pp-linhas">
      ${linha('Valor financiado', `${pct}% do valor da unidade`, brl(d.financiamentoValor), `parcela estimada ${brl(d.valorParcelaFinanciamentoValor)}`)}
    </div>`;
}

function bodyDireta(c) {
  let L = linha(`Ato <span class="pp-tag">${c.di.atoPercent || 0}%</span>`, c.atoData ? `em ${fmt(c.atoData)}` : '', brl(c.ato), '');
  if (c.pre > 0) L += linha(`Pré-chaves <span class="pp-tag">INCC · ${c.di.prePercent}%</span>`, `início ${fmt(c.dtIniPre)} · total ${brl(c.pre)}`, `${c.qtdPre}× ${brl(c.parcPre)}`, '');
  if (c.baloes > 0) L += linha(`Balões <span class="pp-tag">${c.di.baloesPercent}%</span>`, '', brl(c.baloes), '');
  if (c.pos > 0) L += linha(`Pós-chaves <span class="pp-tag">1% + IPCA · ${c.di.posPercent}%</span>`, `início ${fmt(c.dtIniPos)} · total ${brl(c.pos)}`, `${c.qtdPos}× ${brl(c.parcPos)}`, '');
  return `<h3 class="pp-sectit">Plano de pagamento — Tabela Direta</h3><div class="pp-linhas">${L}</div>`;
}

function bodyInvestidor(c) {
  let L = linha(`Ato <span class="pp-tag">${c.di.atoPercent || 0}%</span>`, c.atoData ? `em ${fmt(c.atoData)}` : '', brl(c.ato), '');
  if (c.baloes > 0) L += linha(`Balões <span class="pp-tag">${c.di.baloesPercent}%</span>`, '', brl(c.baloes), '');
  return `<h3 class="pp-sectit">Plano de pagamento — Tabela Investidor</h3>
    <div class="pp-linhas">${L}</div>
    <div class="pp-nota">⚠️ O layout do <b>Investidor</b> (Ato · Mensais sem correção · Balões) está em finalização. Gere um código no plano Investidor já preenchido para fecharmos as mensais.</div>`;
}

function renderHtml(o) {
  const c = calcular(o);
  const d = o.data;
  const planoNome = { associativo: 'Crédito Associativo', direta: 'Tabela Direta', investidor: 'Tabela Investidor' }[d.planType] || 'Proposta';
  const labelValor = d.planType === 'associativo' ? 'Valor do imóvel' : 'Valor líquido';
  const destaque = c.desc > 0
    ? `<div class="pp-destaque">
        <div class="pp-dl"><span>Valor da unidade</span><b class="pp-risco">${brl(d.valorUnidade)}</b></div>
        <div class="pp-dl"><span>Desconto</span><b class="pp-verde">− ${brl(c.desc)}</b></div>
        <div class="pp-dl pp-total"><span>${labelValor}</span><b>${brl(c.imovel)}</b></div>
      </div>`
    : `<div class="pp-destaque"><div class="pp-dl pp-total"><span>${labelValor}</span><b>${brl(c.imovel)}</b></div></div>`;
  const obs = d.observacoes ? `<div class="pp-obsbox"><b>Observações:</b> ${d.observacoes}</div>` : '';
  const rodape = `<div class="pp-rodape">Simulação sujeita a análise de crédito e às regras vigentes na data do fechamento; valores estimados, podem variar. Não constitui proposta nem garantia de condições. Proposta de ${d.data || ''} · renda informada ${brl(d.renda)}.</div>`;

  let corpo;
  if (d.planType === 'direta') corpo = bodyDireta(c);
  else if (d.planType === 'investidor') corpo = bodyInvestidor(c);
  else corpo = bodyAssociativo(c, d);

  return `
    <div class="pp-topo">
      <div><div class="pp-sel">Plano de pagamento</div><h1>${d.empreendimento || 'Empreendimento'}</h1>
        <div class="pp-sub">${planoNome} · Entrega prevista ${mesAno(c.dtEntrega)}</div></div>
      <div class="pp-marca">AUDAZ<small>SQUAD</small></div>
    </div>
    <div class="pp-ident">
      <div><span>Cliente</span><strong>${d.cliente || '—'}</strong></div>
      <div><span>Unidade</span><strong>${d.unidade || '—'}</strong></div>
      <div><span>Ranking</span><strong>${d.ranking || '—'}</strong></div>
    </div>
    <div class="pp-corpo">${destaque}${corpo}${obs}${rodape}</div>`;
}

let _h2p;
function carregarHtml2pdf() {
  if (window.html2pdf) return Promise.resolve(window.html2pdf);
  if (_h2p) return _h2p;
  _h2p = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js';
    s.onload = () => res(window.html2pdf);
    s.onerror = () => rej(new Error('Não foi possível carregar o gerador de PDF (verifique a internet).'));
    document.head.appendChild(s);
  });
  return _h2p;
}

export default function PlanoModal({ aberto, aoFechar }) {
  const folhaRef = useRef(null);
  const clienteRef = useRef('cliente');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [pronto, setPronto] = useState(false);
  const [baixando, setBaixando] = useState(false);

  if (!aberto) return null;

  function gerar() {
    setErro('');
    try {
      const o = decodificar(codigo);
      folhaRef.current.innerHTML = renderHtml(o);
      clienteRef.current = (o.data.cliente || 'cliente').replace(/\s+/g, '-');
      setPronto(true);
    } catch (e) {
      setPronto(false);
      setErro('Código inválido: ' + e.message);
    }
  }

  async function baixar() {
    if (!pronto) return;
    setBaixando(true);
    setErro('');
    try {
      const html2pdf = await carregarHtml2pdf();
      await html2pdf().set({
        margin: 0,
        filename: 'Plano-' + clienteRef.current + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(folhaRef.current).save();
    } catch (e) {
      setErro(e.message || 'Falha ao gerar o PDF.');
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div className="pp-overlay" onClick={aoFechar}>
      <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="pp-close" onClick={aoFechar} aria-label="Fechar">×</button>
        <div className="pp-painel">
          <div className="pp-tit">Cole o código para gerar o plano</div>
          <div className="pp-row">
            <button type="button" className="pp-btn" onClick={gerar}>Gerar plano</button>
            <input
              className="pp-input"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Cole aqui o código do simulador (botão “Código”)"
            />
            <button type="button" className="pp-btn pp-btn--out" onClick={baixar} disabled={!pronto || baixando}>
              {baixando ? 'Gerando…' : 'Baixar PDF'}
            </button>
          </div>
          {erro && <div className="pp-erro">{erro}</div>}
        </div>
        <div className="pp-scroll">
          <div className="pp-folha" ref={folhaRef}>
            <div className="pp-vazio">Cole o código do simulador e clique em “Gerar plano” para ver a prévia.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
