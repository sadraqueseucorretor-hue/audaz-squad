import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDados } from '../../context/DadosContext.jsx';
import { STATUS } from '../../data/config.js';
import { TIPOS_MATERIAIS, FORMATOS } from '../../data/tiposMateriais.js';
import { salvarEmpreendimento, formatoDoArquivo, mensagemErro } from '../../services/admin.js';
import { buscarPorSlug } from '../../utils/empreendimentos.js';
import { normalizar, formatarDataHora } from '../../utils/format.js';
import CampoArquivo from './CampoArquivo.jsx';

const VAZIO = {
  slug: '', nome: '', construtora: 'Direcional', status: 'lancamento', bairro: '', cidade: '', uf: 'CE', endereco: '',
  precoInicial: '', entrega: '', tipologias: [], quartos: '', suites: '', metragem: '', vagas: '', torres: '', unidades: '',
  imagem: '', banner: '', materiais: {},
};

const gerarSlug = (nome) => normalizar(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const numeroOuNada = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

export default function AdminEditor() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { empreendimentos, carregando } = useDados();
  const original = slug ? buscarPorSlug(empreendimentos, slug) : null;
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Inicializa o formulário uma vez, quando os dados chegam do Firestore.
  useEffect(() => {
    if (form || carregando) return;
    setForm(original ? { ...VAZIO, ...structuredClone(original) } : { ...VAZIO });
  }, [form, carregando, original]);

  if (!form) return <p>{carregando ? 'Carregando…' : ''}</p>;
  if (slug && !original) return <p>Empreendimento não encontrado. <Link to="/admin">Voltar</Link></p>;

  const campo = (chave) => (e) => setForm((f) => ({ ...f, [chave]: e.target.value }));
  const definir = (chave, valor) => setForm((f) => ({ ...f, [chave]: valor }));

  const itensDe = (tipo) => form.materiais?.[tipo] || [];
  const definirItens = (tipo, itens) => setForm((f) => ({ ...f, materiais: { ...f.materiais, [tipo]: itens } }));
  const alterarItem = (tipo, i, mudancas) => definirItens(tipo, itensDe(tipo).map((it, j) => (j === i ? { ...it, ...mudancas } : it)));
  const moverItem = (tipo, i, d) => {
    const itens = [...itensDe(tipo)];
    [itens[i], itens[i + d]] = [itens[i + d], itens[i]];
    definirItens(tipo, itens);
  };

  async function salvar(e) {
    e.preventDefault();
    const slugFinal = slug || gerarSlug(form.slug || form.nome);
    if (!slugFinal) return setErro('Informe o nome do empreendimento.');
    if (!slug && buscarPorSlug(empreendimentos, slugFinal)) return setErro(`Já existe um empreendimento com o endereço "${slugFinal}". Mude o nome ou o endereço da página.`);

    const agora = new Date().toISOString();
    const antigos = original?.materiais || {};
    // Material novo ou com link/título alterado ganha a data de agora ("Atualizada em…").
    const materiais = Object.fromEntries(
      TIPOS_MATERIAIS.map(({ chave }) => [
        chave,
        itensDe(chave)
          .filter((it) => it.url?.trim())
          .map((it) => {
            const anterior = (antigos[chave] || []).find((a) => a.url === it.url && a.titulo === it.titulo);
            return { titulo: it.titulo?.trim() || 'Arquivo', url: it.url.trim(), formato: it.formato || 'link', atualizadoEm: anterior?.atualizadoEm || agora };
          }),
      ]).filter(([, itens]) => itens.length)
    );

    const emp = {
      ...form,
      slug: slugFinal,
      nome: form.nome.trim(),
      precoInicial: numeroOuNada(form.precoInicial),
      torres: numeroOuNada(form.torres),
      unidades: numeroOuNada(form.unidades),
      tipologias: (Array.isArray(form.tipologias) ? form.tipologias : String(form.tipologias).split(','))
        .map((t) => t.trim())
        .filter(Boolean),
      materiais,
      ordem: original?.ordem ?? empreendimentos.length,
      atualizadoEm: agora,
    };

    setSalvando(true);
    setErro('');
    try {
      await salvarEmpreendimento(emp);
      navigate('/admin', { state: { aviso: { texto: `"${emp.nome}" foi salvo e já está no ar.` } } });
    } catch (falha) {
      setErro(mensagemErro(falha));
      setSalvando(false);
    }
  }

  const pasta = `empreendimentos/${slug || gerarSlug(form.nome) || 'novo'}`;

  return (
    <form className="admin-editor" onSubmit={salvar}>
      <div className="admin__cabecalho">
        <div>
          <Link to="/admin" className="admin-link">← Empreendimentos</Link>
          <h1>{slug ? `Editar ${original.nome}` : 'Novo empreendimento'}</h1>
        </div>
      </div>

      <fieldset className="admin-bloco">
        <legend>Informações principais</legend>
        <div className="admin-grade">
          <Campo rotulo="Nome do empreendimento *" largo>
            <input value={form.nome} onChange={campo('nome')} required />
          </Campo>
          <Campo rotulo="Endereço da página" dica={slug ? 'Não pode ser alterado depois de criado.' : 'Gerado a partir do nome.'}>
            <input value={slug || form.slug || gerarSlug(form.nome)} onChange={campo('slug')} disabled={Boolean(slug)} />
          </Campo>
          <Campo rotulo="Status">
            <select value={form.status} onChange={campo('status')}>
              {Object.entries(STATUS).map(([valor, { label }]) => <option key={valor} value={valor}>{label}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Construtora"><input value={form.construtora} onChange={campo('construtora')} /></Campo>
          <Campo rotulo="Valor inicial (R$)" dica="Só números. Vazio mostra “Consulte”.">
            <input type="number" min="0" step="100" value={form.precoInicial ?? ''} onChange={campo('precoInicial')} />
          </Campo>
          <Campo rotulo="Entrega"><input value={form.entrega} onChange={campo('entrega')} placeholder="Ex.: Jun/2028" /></Campo>
          <Campo rotulo="Bairro"><input value={form.bairro} onChange={campo('bairro')} /></Campo>
          <Campo rotulo="Cidade"><input value={form.cidade} onChange={campo('cidade')} /></Campo>
          <Campo rotulo="UF"><input value={form.uf} onChange={campo('uf')} maxLength={2} /></Campo>
          <Campo rotulo="Endereço completo" largo><input value={form.endereco} onChange={campo('endereco')} /></Campo>
        </div>
      </fieldset>

      <fieldset className="admin-bloco">
        <legend>Detalhes</legend>
        <div className="admin-grade">
          <Campo rotulo="Tipologias" dica="Separe por vírgula." largo>
            <input
              value={Array.isArray(form.tipologias) ? form.tipologias.join(', ') : form.tipologias}
              onChange={(e) => definir('tipologias', e.target.value)}
              placeholder="2 quartos, 2 quartos com suíte"
            />
          </Campo>
          <Campo rotulo="Quartos"><input value={form.quartos} onChange={campo('quartos')} /></Campo>
          <Campo rotulo="Suítes"><input value={form.suites} onChange={campo('suites')} /></Campo>
          <Campo rotulo="Metragem"><input value={form.metragem} onChange={campo('metragem')} placeholder="41 a 48 m²" /></Campo>
          <Campo rotulo="Vagas"><input value={form.vagas} onChange={campo('vagas')} /></Campo>
          <Campo rotulo="Torres"><input type="number" min="0" value={form.torres ?? ''} onChange={campo('torres')} /></Campo>
          <Campo rotulo="Unidades"><input type="number" min="0" value={form.unidades ?? ''} onChange={campo('unidades')} /></Campo>
        </div>
      </fieldset>

      <fieldset className="admin-bloco">
        <legend>Fotos</legend>
        <div className="admin-grade">
          <Campo rotulo="Foto do card" largo>
            <CampoArquivo valor={form.imagem} onChange={(v) => definir('imagem', v)} pasta={`${pasta}/fotos`} aceitar="image/*" />
            {form.imagem && <img className="admin-preview" src={form.imagem} alt="" />}
          </Campo>
          <Campo rotulo="Banner da página" dica="Opcional. Sem banner, usa a foto do card." largo>
            <CampoArquivo valor={form.banner} onChange={(v) => definir('banner', v)} pasta={`${pasta}/fotos`} aceitar="image/*" />
            {form.banner && <img className="admin-preview" src={form.banner} alt="" />}
          </Campo>
        </div>
      </fieldset>

      <fieldset className="admin-bloco">
        <legend>Materiais comerciais</legend>
        <p className="admin-dica">Envie o arquivo (PDF, imagem, planilha) ou cole um link. Itens sem link não são publicados.</p>
        {TIPOS_MATERIAIS.map((tipo) => (
          <div key={tipo.chave} className="admin-material">
            <div className="admin-material__head">
              <strong>{tipo.label}</strong>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => definirItens(tipo.chave, [...itensDe(tipo.chave), { titulo: tipo.label, url: '', formato: 'pdf' }])}
              >
                + Adicionar
              </button>
            </div>
            {itensDe(tipo.chave).map((it, i, itens) => (
              <div key={i} className="admin-material__item">
                <div className="admin-material__linha">
                  <input value={it.titulo} onChange={(e) => alterarItem(tipo.chave, i, { titulo: e.target.value })} placeholder="Título (ex.: Tabela Outubro/2026)" />
                  <select value={it.formato || 'link'} onChange={(e) => alterarItem(tipo.chave, i, { formato: e.target.value })}>
                    {Object.entries(FORMATOS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <div className="admin-material__botoes">
                    <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => moverItem(tipo.chave, i, -1)}>▲</button>
                    <button type="button" aria-label="Descer" disabled={i === itens.length - 1} onClick={() => moverItem(tipo.chave, i, 1)}>▼</button>
                    <button type="button" aria-label="Remover" className="perigo" onClick={() => definirItens(tipo.chave, itens.filter((_, j) => j !== i))}>✕</button>
                  </div>
                </div>
                <CampoArquivo
                  valor={it.url}
                  onChange={(url) => alterarItem(tipo.chave, i, { url })}
                  onArquivo={(arq) => alterarItem(tipo.chave, i, { formato: formatoDoArquivo(arq) })}
                  pasta={`${pasta}/${tipo.chave}`}
                />
                {it.atualizadoEm && <p className="admin-dica">Atualizado em {formatarDataHora(it.atualizadoEm)}</p>}
              </div>
            ))}
          </div>
        ))}
      </fieldset>

      <div className="admin-rodape">
        {erro && <p className="admin-erro">{erro}</p>}
        <Link to="/admin" className="btn btn--ghost">Cancelar</Link>
        <button type="submit" className="btn btn--primary" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar e publicar'}</button>
      </div>
    </form>
  );
}

function Campo({ rotulo, dica, largo, children }) {
  return (
    <label className={`campo ${largo ? 'campo--largo' : ''}`}>
      <span>{rotulo}</span>
      {children}
      {dica && <small>{dica}</small>}
    </label>
  );
}
