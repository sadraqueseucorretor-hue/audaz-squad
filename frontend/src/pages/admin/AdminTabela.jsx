import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { useDados } from '../../context/DadosContext.jsx';
import { salvarSite, mensagemErro } from '../../services/admin.js';
import { analisarUrlMaterial } from '../../utils/materiais.js';
import { FONTES_TABELA } from '../../utils/tabelas.js';

const linksDoSite = (site) => Object.fromEntries(FONTES_TABELA.map((f) => [f.campo, site[f.campo] || '']));

// Admin → Tabela de valores: um link por construtora (Direcional, Riva), exibidos na aba
// "Tabela de valores" do site, cada um com seu botão.
export default function AdminTabela() {
  const { site } = useDados();
  const [urls, setUrls] = useState(() => linksDoSite(site));
  const [aviso, setAviso] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const salvos = FONTES_TABELA.map((f) => site[f.campo] || '').join('\n');
  useEffect(() => setUrls(linksDoSite(site)), [salvos]); // eslint-disable-line react-hooks/exhaustive-deps

  const analises = Object.fromEntries(
    FONTES_TABELA.map((f) => [f.campo, urls[f.campo].trim() ? analisarUrlMaterial(urls[f.campo]) : null]),
  );
  const algumCadastrado = FONTES_TABELA.some((f) => site[f.campo]);

  async function salvar(e) {
    e.preventDefault();
    const invalida = FONTES_TABELA.find((f) => analises[f.campo] && !analises[f.campo].valido);
    if (invalida) return setAviso({ erro: true, texto: `${invalida.rotulo}: ${analises[invalida.campo].erro}` });
    setSalvando(true);
    try {
      await salvarSite(
        Object.fromEntries(FONTES_TABELA.map((f) => [f.campo, analises[f.campo] ? analises[f.campo].urlOriginal : null])),
      );
      const algum = FONTES_TABELA.some((f) => analises[f.campo]);
      setAviso({ texto: algum ? 'Salvo! As tabelas já estão no ar.' : 'Tabelas removidas do site.' });
    } catch (falha) {
      setAviso({ erro: true, texto: mensagemErro(falha) });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="admin-editor" onSubmit={salvar}>
      <div className="admin__cabecalho">
        <div>
          <h1>Tabela de valores</h1>
          <p>Aparece no site na aba “Tabela de valores”, para todos os corretores — um botão para cada tabela cadastrada.</p>
        </div>
        {algumCadastrado && <Link to="/tabela-valores" target="_blank" className="btn btn--ghost">Ver no site</Link>}
      </div>

      {FONTES_TABELA.map((f) => (
        <CampoTabela
          key={f.campo}
          titulo={`Tabela ${f.rotulo}`}
          url={urls[f.campo]}
          analise={analises[f.campo]}
          onChange={(valor) => setUrls((u) => ({ ...u, [f.campo]: valor }))}
        />
      ))}

      <div className="admin-rodape">
        {aviso && <p className={aviso.erro ? 'admin-erro' : 'admin-ok'}>{aviso.texto}</p>}
        <button type="submit" className="btn btn--primary" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar e publicar'}</button>
      </div>
    </form>
  );
}

function CampoTabela({ titulo, url, analise, onChange }) {
  let status = <p className="admin-dica">Pasta com as tabelas em PDF (ou uma planilha do Google). No Drive: Compartilhar → “Qualquer pessoa com o link” → Copiar link. Deixe vazio para não mostrar.</p>;
  if (analise && !analise.valido) status = <p className="link-status link-status--erro"><Icon name="alert" size={15} /> {analise.erro}</p>;
  else if (analise?.drive?.tipo === 'pasta') status = <p className="link-status link-status--ok"><Icon name="check" size={15} /> Pasta do Google Drive reconhecida — o site mostra todas as tabelas (PDFs) da pasta, com prévia e busca.</p>;
  else if (analise?.drive?.tipo === 'planilha') status = <p className="link-status link-status--ok"><Icon name="check" size={15} /> Planilha do Google reconhecida — abre dentro do Audaz Squad (incluindo as abas).</p>;
  else if (analise?.modo === 'externo') status = <p className="link-status link-status--aviso"><Icon name="external" size={15} /> Link válido, mas esse site não permite exibir aqui dentro — o corretor abre em nova aba.</p>;
  else if (analise) status = <p className="link-status link-status--ok"><Icon name="check" size={15} /> Link válido — abre dentro do Audaz Squad.</p>;

  return (
    <fieldset className="admin-bloco">
      <legend>{titulo}</legend>
      <label className="campo">
        <span>Link da pasta do Drive ou da planilha do Google</span>
        <input
          type="url"
          inputMode="url"
          maxLength={2000}
          value={url}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/… ou https://docs.google.com/spreadsheets/d/…"
        />
        {status}
      </label>
      {analise?.valido && analise.modo === 'iframe' && (
        <iframe
          className="admin-tabela__previa"
          src={analise.urlPreview}
          title={`Prévia — ${titulo}`}
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        />
      )}
    </fieldset>
  );
}
