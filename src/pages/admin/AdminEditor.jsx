import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDados } from '../../context/DadosContext.jsx';
import { STATUS } from '../../data/config.js';
import { salvarEmpreendimento, mensagemErro } from '../../services/admin.js';
import { buscarPorSlug, fotosDo } from '../../utils/empreendimentos.js';
import { normalizar } from '../../utils/format.js';
import { analisarUrlMaterial, listarMateriais } from '../../utils/materiais.js';
import { sanitizarUrl } from '../../utils/urls.js';
import CampoLinkFoto from './CampoLinkFoto.jsx';
import FotosEditor from './FotosEditor.jsx';
import CampoMaps from './CampoMaps.jsx';
import { analisarLinkMaps } from '../../utils/mapa.js';
import MateriaisEditor from './MateriaisEditor.jsx';

const VAZIO = {
  slug: '', nome: '', construtora: 'Direcional', status: 'lancamento', bairro: '', cidade: '', uf: 'CE', endereco: '',
  entrega: '', observacoes: '',
  logo: '', fotos: [''], banner: '', mapsUrl: '', materiaisLista: [],
};

const gerarSlug = (nome) => normalizar(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

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
    setForm(original ? { ...VAZIO, ...structuredClone(original), materiaisLista: structuredClone(listarMateriais(original)), fotos: fotosDo(original).length ? fotosDo(original) : [''] } : { ...VAZIO });
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
      if (m.capaUrl?.trim() && !sanitizarUrl(m.capaUrl).valida) problemas.push(`Material ${i + 1}: ${sanitizarUrl(m.capaUrl).erro} (imagem de capa)`);
      return a;
    });
    // Fotos e logo: só link (https). Vazio é permitido (o site mostra as iniciais).
    const validarFoto = (texto, rotulo) => {
      if (!texto?.trim()) return '';
      const r = sanitizarUrl(texto);
      if (!r.valida) problemas.unshift(`${rotulo}: ${r.erro}`);
      return r.valida ? r.url : '';
    };
    const logo = validarFoto(form.logo, 'Logo do empreendimento');
    const banner = validarFoto(form.banner, 'Banner');
    const listaFotos = (form.fotos || [])
      .map((f, i) => validarFoto(f, `Foto ${i + 1} do card`))
      .filter(Boolean);
    // `imagem` continua gravada (= 1ª foto) para compatibilidade com quem lia o campo antigo.
    const maps = (form.mapsUrl || '').trim() ? analisarLinkMaps(form.mapsUrl) : null;
    if (maps && !maps.valido) problemas.unshift(`Google Maps: ${maps.erro}`);
    // Só a URL do mapa é guardada (do código de incorporação, aproveita apenas o src).
    const fotos = { logo, banner, fotos: listaFotos, imagem: listaFotos[0] || '', mapsUrl: maps?.valido ? maps.url : '' };
    if (problemas.length) return setErro(problemas.join(' '));

    const agora = new Date().toISOString();
    const anteriores = new Map((original ? listarMateriais(original) : []).map((m) => [m.id, m]));
    // Só metadados + URL são gravados — o arquivo continua no Google Drive/origem.
    const materiaisLista = form.materiaisLista.map((m, ordem) => {
      const a = analises[ordem];
      const antes = anteriores.get(m.id);
      const mudou =
        !antes || antes.titulo !== m.titulo.trim() || antes.categoria !== m.categoria ||
        antes.urlOriginal !== a.urlOriginal || (antes.ativo !== false) !== (m.ativo !== false) ||
        (antes.capaUrl || '') !== (m.capaUrl || '').trim();
      return {
        id: m.id,
        empreendimentoId: slugFinal,
        titulo: m.titulo.trim(),
        categoria: m.categoria,
        urlOriginal: a.urlOriginal,
        urlPreview: a.urlPreview,
        tipoOrigem: a.tipoOrigem,
        capaUrl: m.capaUrl?.trim() ? sanitizarUrl(m.capaUrl).url : '',
        ordem,
        ativo: m.ativo !== false,
        createdAt: antes?.createdAt || agora,
        updatedAt: mudou ? agora : antes.updatedAt || agora,
      };
    });

    // Saem do documento: `materiais` (formato antigo — agora vale só `materiaisLista`) e os
    // dados que deixaram de ser usados (valor, tipologia, quartos, suítes, metragem, vagas, torres, unidades).
    const {
      materiais: _formatoAntigo,
      precoInicial: _p, tipologias: _t, quartos: _q, suites: _s, metragem: _m, vagas: _v, torres: _to, unidades: _u,
      ...dados
    } = form;
    const emp = {
      ...dados,
      slug: slugFinal,
      nome: form.nome.trim(),
      observacoes: (form.observacoes || '').trim(),
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
          <Campo rotulo="Entrega"><input value={form.entrega} onChange={campo('entrega')} placeholder="Ex.: Jun/2028" /></Campo>
          <Campo rotulo="Bairro"><input value={form.bairro} onChange={campo('bairro')} /></Campo>
          <Campo rotulo="Cidade"><input value={form.cidade} onChange={campo('cidade')} /></Campo>
          <Campo rotulo="UF"><input value={form.uf} onChange={campo('uf')} maxLength={2} /></Campo>
          <Campo rotulo="Endereço completo" largo><input value={form.endereco} onChange={campo('endereco')} /></Campo>
          <Campo
            rotulo="Observações para o corretor"
            dica="Opcional. Aparece em destaque na página do empreendimento (ex.: campanha do mês, condição especial, avisos). Use Enter para separar parágrafos."
            largo
          >
            <textarea rows={4} maxLength={2000} value={form.observacoes || ''} onChange={campo('observacoes')} placeholder="Ex.: Campanha de outubro: ITBI e registro grátis para contratos assinados até 31/10." />
          </Campo>
          <Campo rotulo="Localização no Google Maps" largo>
            <CampoMaps valor={form.mapsUrl} endereco={form.endereco} onChange={(v) => definir('mapsUrl', v)} />
          </Campo>
        </div>
      </fieldset>

      <fieldset className="admin-bloco">
        <legend>Logo e fotos</legend>
        <p className="admin-dica admin-dica--bloco">
          Tudo por link do <strong>Google Drive</strong>: clique na imagem → <strong>Compartilhar</strong> →
          “Qualquer pessoa com o link” → <strong>Copiar link</strong> e cole aqui.
        </p>
        <div className="admin-grade">
          <Campo rotulo="Logo do empreendimento" dica="Aparece nas miniaturas (Atualizados recentemente e lista do painel). PNG com fundo transparente fica melhor.">
            <CampoLinkFoto valor={form.logo} onChange={(v) => definir('logo', v)} />
          </Campo>
          <div className="campo campo--largo">
            <span>Fotos do card (carrossel)</span>
            <FotosEditor fotos={form.fotos} onChange={(lista) => definir('fotos', lista)} />
            <small>A primeira foto é a capa. O corretor arrasta (celular) ou usa as setas (computador) para ver as outras.</small>
          </div>
          <Campo rotulo="Banner da página" dica="Opcional — sem banner, usa a primeira foto do card." largo>
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
