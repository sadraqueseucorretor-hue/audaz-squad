import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { useDados } from '../../context/DadosContext.jsx';
import { salvarSite, mensagemErro } from '../../services/admin.js';
import { analisarUrlMaterial } from '../../utils/materiais.js';

// Admin → Tabela de valores: link da planilha do Google exibida na aba "Tabela de valores" do site.
export default function AdminTabela() {
  const { site } = useDados();
  const [url, setUrl] = useState(site.tabelaValoresUrl || '');
  const [aviso, setAviso] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => setUrl(site.tabelaValoresUrl || ''), [site.tabelaValoresUrl]);

  const analise = url.trim() ? analisarUrlMaterial(url) : null;

  let status = <p className="admin-dica">No Google Planilhas: Compartilhar → “Qualquer pessoa com o link” (Leitor) → Copiar link.</p>;
  if (analise && !analise.valido) status = <p className="link-status link-status--erro"><Icon name="alert" size={15} /> {analise.erro}</p>;
  else if (analise?.drive?.tipo === 'planilha') status = <p className="link-status link-status--ok"><Icon name="check" size={15} /> Planilha do Google reconhecida — abre dentro do Audaz Squad (incluindo as abas).</p>;
  else if (analise?.modo === 'externo') status = <p className="link-status link-status--aviso"><Icon name="external" size={15} /> Link válido, mas esse site não permite exibir aqui dentro — o corretor abre em nova aba.</p>;
  else if (analise) status = <p className="link-status link-status--ok"><Icon name="check" size={15} /> Link válido — abre dentro do Audaz Squad.</p>;

  async function salvar(e) {
    e.preventDefault();
    if (analise && !analise.valido) return setAviso({ erro: true, texto: analise.erro });
    setSalvando(true);
    try {
      await salvarSite({ tabelaValoresUrl: analise ? analise.urlOriginal : null });
      setAviso({ texto: analise ? 'Salvo! A tabela já está no ar.' : 'Tabela removida do site.' });
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
          <p>Aparece no site na aba “Tabela de valores”, para todos os corretores.</p>
        </div>
        {site.tabelaValoresUrl && <Link to="/tabela-valores" target="_blank" className="btn btn--ghost">Ver no site</Link>}
      </div>

      <fieldset className="admin-bloco">
        <legend>Link da planilha</legend>
        <label className="campo">
          <span>Link do Google Planilhas</span>
          <input
            type="url"
            inputMode="url"
            maxLength={2000}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/…/edit?gid=…"
          />
          {status}
        </label>
        {analise?.valido && analise.modo === 'iframe' && (
          <iframe
            className="admin-tabela__previa"
            src={analise.urlPreview}
            title="Prévia da tabela"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
        )}
      </fieldset>

      <div className="admin-rodape">
        {aviso && <p className={aviso.erro ? 'admin-erro' : 'admin-ok'}>{aviso.texto}</p>}
        <button type="submit" className="btn btn--primary" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar e publicar'}</button>
      </div>
    </form>
  );
}
