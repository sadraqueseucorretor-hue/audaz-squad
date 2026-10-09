import { useEffect, useRef, useState } from 'react';
import { useDados } from '../../context/DadosContext.jsx';
import { salvarSite, logoParaDataUrl, mensagemErro } from '../../services/admin.js';
import { sanitizarUrl } from '../../utils/urls.js';
import CampoLinkFoto from './CampoLinkFoto.jsx';

const CAMPOS = [
  { chave: 'marca', rotulo: 'Nome da marca' },
  { chave: 'parceiro', rotulo: 'Parceiro' },
  { chave: 'titulo', rotulo: 'Título da página inicial' },
  { chave: 'subtitulo', rotulo: 'Subtítulo', area: true },
  { chave: 'rodape', rotulo: 'Texto do rodapé', area: true },
];

export default function AdminMarca() {
  const { site } = useDados();
  const [form, setForm] = useState(site);
  const [aviso, setAviso] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const arquivo = useRef(null);

  useEffect(() => setForm(site), [site]);

  async function escolherLogo(e) {
    const arq = e.target.files?.[0];
    e.target.value = '';
    if (!arq) return;
    try {
      const dataUrl = await logoParaDataUrl(arq);
      if (dataUrl.length > 900_000) throw new Error('Logo muito pesada. Use uma imagem menor (até ~600 KB).');
      setForm((f) => ({ ...f, logoUrl: dataUrl }));
      setAviso(null);
    } catch (falha) {
      setAviso({ erro: true, texto: falha.message });
    }
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      const { marca, parceiro, titulo, subtitulo, rodape, logoUrl } = form;
      // Logo do grupo: só link (https), como as demais imagens.
      const textoGrupo = (form.logoGrupoUrl || '').trim();
      const grupo = textoGrupo ? sanitizarUrl(textoGrupo) : null;
      if (grupo && !grupo.valida) throw new Error(`Logo do grupo: ${grupo.erro}`);
      await salvarSite({ marca, parceiro, titulo, subtitulo, rodape, logoUrl: logoUrl || null, logoGrupoUrl: grupo ? grupo.url : null });
      setAviso({ texto: 'Salvo! Já está no ar.' });
    } catch (falha) {
      setAviso({ erro: true, texto: mensagemErro(falha) });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="admin-editor" onSubmit={salvar}>
      <div className="admin__cabecalho">
        <h1>Logo e textos</h1>
      </div>

      <fieldset className="admin-bloco">
        <legend>Logo do sistema</legend>
        <div className="admin-logo">
          <div className="admin-logo__preview">
            {form.logoUrl ? <img src={form.logoUrl} alt="Logo atual" /> : <span>Sem logo — usando o logotipo em texto</span>}
          </div>
          <div className="admin-logo__acoes">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => arquivo.current.click()}>
              {form.logoUrl ? 'Trocar logo' : 'Enviar logo'}
            </button>
            {form.logoUrl && (
              <button type="button" className="btn btn--perigo btn--sm" onClick={() => setForm((f) => ({ ...f, logoUrl: null }))}>
                Remover logo
              </button>
            )}
            <input ref={arquivo} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={escolherLogo} />
          </div>
          <p className="admin-dica">PNG ou SVG com fundo transparente fica melhor. Ela aparece sobre o fundo azul-escuro do topo.</p>
        </div>
      </fieldset>

      <fieldset className="admin-bloco">
        <legend>Logo do grupo</legend>
        <p className="admin-dica admin-dica--bloco">
          Aparece no topo da página inicial, ao lado da logo da Audaz, no lugar do texto “Grupo … / construtoras”.
          Cole o link da imagem no Google Drive (Compartilhar → “Qualquer pessoa com o link” → Copiar link).
          PNG com fundo transparente e letras claras fica melhor, porque o topo é escuro.
        </p>
        <CampoLinkFoto valor={form.logoGrupoUrl || ''} onChange={(v) => setForm((f) => ({ ...f, logoGrupoUrl: v }))} />
      </fieldset>

      <fieldset className="admin-bloco">
        <legend>Textos</legend>
        <div className="admin-grade">
          {CAMPOS.map(({ chave, rotulo, area }) => (
            <label key={chave} className={`campo ${area ? 'campo--largo' : ''}`}>
              <span>{rotulo}</span>
              {area ? (
                <textarea rows={2} value={form[chave] || ''} onChange={(e) => setForm((f) => ({ ...f, [chave]: e.target.value }))} />
              ) : (
                <input value={form[chave] || ''} onChange={(e) => setForm((f) => ({ ...f, [chave]: e.target.value }))} />
              )}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="admin-rodape">
        {aviso && <p className={aviso.erro ? 'admin-erro' : 'admin-ok'}>{aviso.texto}</p>}
        <button type="submit" className="btn btn--primary" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar e publicar'}</button>
      </div>
    </form>
  );
}
