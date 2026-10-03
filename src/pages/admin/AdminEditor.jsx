import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDados } from '../../context/DadosContext.jsx';
import { STATUS } from '../../data/config.js';
import { salvarEmpreendimento, mensagemErro } from '../../services/admin.js';
import { buscarPorSlug } from '../../utils/empreendimentos.js';
import { normalizar } from '../../utils/format.js';
import { analisarUrlMaterial, listarMateriais } from '../../utils/materiais.js';
import { sanitizarUrl } from '../../utils/urls.js';
import CampoLinkFoto from './CampoLinkFoto.jsx';
import MateriaisEditor from './MateriaisEditor.jsx';

const VAZIO = {
  slug: '', nome: '', construtora: 'Direcional', status: 'lancamento', bairro: '', cidade: '', uf: 'CE', endereco: '',
  precoInicial: '', entrega: '', tipologias: [], quartos: '', suites: '', metragem: '', vagas: '', torres: '', unidades: '',
  imagem: '', banner: '', materiaisLista: [],
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
    // Materiais no formato antigo (agrupados por tipo) são convertidos para a lista nova aqui;
    // ao salvar, o empreendimento passa a usar só a lista nova.
    setForm(original ? { ...VAZIO, ...structuredClone(original), materiaisLista: structuredClone(listarMateriais(original)) } : { ...VAZIO });
  }, [form, carregando, original]);

  if (!form) return <p>{carregando ? 'Carregando…' : ''}</p>;
  if (slug && !original) return <p>Empreendimento não encontrado. <Link to="/admin">Voltar</Link></p>;

  const campo = (chave) => (e) => setForm((f) => ({ ...f, [chave]: e.target.value }));
  const definir = (chave, valor) => setForm((f) => ({ ...f, [chave]: valor }));

  async function salvar(e) {
    e.preventDefault();
    const slugFinal = slug || gerarSlug(form.slug || form.nome);
    if (!slugFinal) return setErro('Informe o nome do empreendimento.');
    if (!slug && buscarPorSlug(empreendimentos, slugFinal)) return setErro(`Já existe um empreendimento com o endereço "${slugFinal}". Mude o nome ou o endereço da página.`);

    // Valida os materiais: nome obrigatório e link seguro (https, sem javascript:/data:/HTML).
    const problemas = [];
    const analises = form.materiaisLista.map((m, i) => {
      const a = analisarUrlMaterial(m.urlOriginal);
      if (!m.titulo.trim()) problemas.push(`Material ${i + 1}: informe o nome.`);
      if (!a.valido) problemas.push(`Material ${i + 1}${m.titulo.trim() ? ` (${m.titulo.trim()})` : ''}: ${a.erro}`);
      return a;
    });
    // Fotos: só link (https). Vazio é permitido (o site mostra as iniciais).
    const fotos = {};
    for (const [chave, rotulo] of [['imagem', 'Foto do card'], ['banner', 'Banner']]) {
      const texto = (form[chave] || '').trim();
      if (!texto) { fotos[chave] = ''; continue; }
      const r = sanitizarUrl(texto);
      if (r.valida) fotos[chave] = r.url;
      else problemas.unshift(`${rotulo}: ${r.erro}`);
    }
    if (problemas.length) return setErro(problemas.join(' '));

    const agora = new Date().toISOString();
    const anteriores = new Map((original ? listarMateriais(original) : []).map((m) => [m.id, m]));
    // Só metadados + URL são gravados — o arquivo continua no Google Drive/origem.
    const materiaisLista = form.materiaisLista.map((m, ordem) => {
      const a = analises[ordem];
      const antes = anteriores.get(m.id);
      const mudou =
        !antes || antes.titulo !== m.titulo.trim() || antes.categoria !== m.categoria ||
        antes.urlOriginal !== a.urlOriginal || (antes.ativo !== false) !== (m.ativo !== false);
      return {
        id: m.id,
        empreendimentoId: slugFinal,
        titulo: m.titulo.trim(),
        categoria: m.categoria,
        urlOriginal: a.urlOriginal,
        urlPreview: a.urlPreview,
        tipoOrigem: a.tipoOrigem,
        ordem,
        ativo: m.ativo !== false,
        createdAt: antes?.createdAt || agora,
        updatedAt: mudou ? agora : antes.updatedAt || agora,
      };
    });

    // `materiais` (formato antigo) sai do documento: a partir daqui vale só `materiaisLista`.
    const { materiais: _formatoAntigo, ...dados } = form;
    const emp = {
      ...dados,
      slug: slugFinal,
      nome: form.nome.trim(),
      precoInicial: numeroOuNada(form.precoInicial),
      torres: numeroOuNada(form.torres),
      unidades: numeroOuNada(form.unidades),
      tipologias: (Array.isArray(form.tipologias) ? form.tipologias : String(form.tipologias).split(','))
        .map((t) => t.trim())
        .filter(Boolean),
      ...fotos,
      materiaisLista,
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
          <Campo rotulo="Foto do card" dica="Link da foto no Google Drive (Compartilhar → “Qualquer pessoa com o link” → Copiar link)." largo>
            <CampoLinkFoto valor={form.imagem} onChange={(v) => definir('imagem', v)} />
          </Campo>
          <Campo rotulo="Banner da página" dica="Opcional — link da foto no Google Drive. Sem banner, usa a foto do card." largo>
            <CampoLinkFoto valor={form.banner} onChange={(v) => definir('banner', v)} />
          </Campo>
        </div>
      </fieldset>

      <fieldset className="admin-bloco">
        <legend>Materiais do empreendimento</legend>
        <p className="admin-dica admin-dica--bloco">
          Os arquivos ficam no <strong>Google Drive</strong> (ou outro serviço) — aqui você cadastra só o link.
          No Drive: clique no arquivo → <strong>Compartilhar</strong> → acesso “Qualquer pessoa com o link” → <strong>Copiar link</strong>.
        </p>
        <MateriaisEditor
          materiais={form.materiaisLista}
          onChange={(lista) => definir('materiaisLista', lista)}
          contexto={form.nome}
        />
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
