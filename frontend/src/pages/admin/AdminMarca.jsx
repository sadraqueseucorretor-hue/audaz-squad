import { useEffect, useRef, useState } from 'react';
import { useDados } from '../../context/DadosContext.jsx';
import { salvarSite, logoParaDataUrl, iconeParaDataUrl, arquivoParaDataUrl, mensagemErro } from '../../services/admin.js';
import { sanitizarUrl } from '../../utils/urls.js';
import CampoLinkFoto from './CampoLinkFoto.jsx';
import { nomeDaAba, tituloDaAba } from '../../utils/tituloAba.js';

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
  const arquivoIcone = useRef(null);
  // Imagem de origem do ícone (para refazer quando muda a opção de fundo); não é gravada.
  const [fonteIcone, setFonteIcone] = useState(null);
  const [fundoIcone, setFundoIcone] = useState(true);

  async function gerarIcone(fonte, fundo = fundoIcone) {
    try {
      const faviconUrl = await iconeParaDataUrl(fonte, { fundo });
      setFonteIcone(fonte);
      setForm((f) => ({ ...f, faviconUrl }));
      setAviso(null);
    } catch (falha) {
      setAviso({ erro: true, texto: falha.message });
    }
  }

  async function escolherIcone(e) {
    const arq = e.target.files?.[0];
    e.target.value = '';
    if (!arq) return;
    try {
      gerarIcone(await arquivoParaDataUrl(arq));
    } catch (falha) {
      setAviso({ erro: true, texto: falha.message });
    }
  }

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
      const { marca, parceiro, titulo, subtitulo, rodape, logoUrl, faviconUrl } = form;
      const nomeAba = (form.nomeAba || '').trim();
      // Logo do grupo: só link (https), como as demais imagens.
      const textoGrupo = (form.logoGrupoUrl || '').trim();
      const grupo = textoGrupo ? sanitizarUrl(textoGrupo) : null;
      if (grupo && !grupo.valida) throw new Error(`Logo do grupo: ${grupo.erro}`);
      await salvarSite({ marca, parceiro, titulo, subtitulo, rodape, logoUrl: logoUrl || null, logoGrupoUrl: grupo ? grupo.url : null, faviconUrl: faviconUrl || null, nomeAba });
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
        <legend>Aba do navegador</legend>
        <p className="admin-dica admin-dica--bloco">
          O nome e a imagem pequena que aparecem na aba do navegador, nos favoritos e no atalho do celular.
          Uma imagem simples e quadrada (ex.: só o leão) fica mais nítida que a logo com texto.
        </p>
        <label className="campo admin-icone__nome">
          <span>Nome da aba</span>
          <input
            value={form.nomeAba || ''}
            maxLength={80}
            placeholder={nomeDaAba({ ...form, nomeAba: '' })}
            onChange={(e) => setForm((f) => ({ ...f, nomeAba: e.target.value }))}
          />
          <small>Vazio = usa “{nomeDaAba({ ...form, nomeAba: '' })}”. Nas outras páginas: “{tituloDaAba(form, 'Simulador')}”, “{tituloDaAba(form, 'Nome do empreendimento')}”…</small>
        </label>
        <div className="admin-icone">
          <div className="admin-icone__abas" aria-label="Prévia da aba">
            {['clara', 'escura'].map((tema) => (
              <div key={tema} className={`admin-icone__aba admin-icone__aba--${tema}`}>
                {form.faviconUrl ? <img src={form.faviconUrl} alt="" /> : <span className="admin-icone__globo">🌐</span>}
                <span>{nomeDaAba(form)}</span>
                <i aria-hidden="true">×</i>
              </div>
            ))}
          </div>
          {form.faviconUrl && <img className="admin-icone__grande" src={form.faviconUrl} alt="Ícone atual" />}
        </div>
        <div className="admin-logo__acoes">
          <button type="button" className="btn btn--ghost btn--sm" disabled={!form.logoUrl} onClick={() => gerarIcone(form.logoUrl)}>
            Usar a logo do sistema
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => arquivoIcone.current.click()}>Enviar outra imagem</button>
          {form.faviconUrl && (
            <button type="button" className="btn btn--perigo btn--sm" onClick={() => { setForm((f) => ({ ...f, faviconUrl: null })); setFonteIcone(null); }}>
              Remover ícone
            </button>
          )}
          <input ref={arquivoIcone} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={escolherIcone} />
        </div>
        <label className="admin-check admin-icone__fundo">
          <input
            type="checkbox"
            checked={fundoIcone}
            disabled={!fonteIcone}
            onChange={(e) => { setFundoIcone(e.target.checked); if (fonteIcone) gerarIcone(fonteIcone, e.target.checked); }}
          />
          Fundo azul (recomendado para logo branca: aparece em abas claras e escuras)
        </label>
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
