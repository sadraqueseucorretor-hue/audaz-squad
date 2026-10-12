import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import VisualizadorMaterial from '../../components/VisualizadorMaterial.jsx';
import { CATEGORIAS_MATERIAL } from '../../data/tiposMateriais.js';
import { formatarDataHora } from '../../utils/format.js';
import { analisarUrlMaterial } from '../../utils/materiais.js';
import CampoLinkFoto, { AvisoRestrito } from './CampoLinkFoto.jsx';
import useAcessoDrive from '../../utils/useAcessoDrive.js';

const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : `m-${Date.now()}-${Math.random().toString(36).slice(2)}`);

export const novoMaterial = () => ({ id: novoId(), titulo: '', categoria: 'book', urlOriginal: '', ativo: true });

/** Explica ao admin o que o sistema entendeu do link digitado. */
function StatusDoLink({ url }) {
  const analise = url.trim() ? analisarUrlMaterial(url) : null;
  const acesso = useAcessoDrive(analise?.valido && analise.tipoOrigem === 'google_drive' ? analise.drive.id : null);
  if (acesso === false) return <AvisoRestrito />;
  if (!url.trim()) return <p className="admin-dica">Cole o link de compartilhamento do Google Drive (ou outro link https).</p>;
  const a = analisarUrlMaterial(url);
  if (!a.valido) return <p className="link-status link-status--erro"><Icon name="alert" size={15} /> {a.erro}</p>;
  if (a.tipoOrigem === 'google_drive') {
    const oQue = { pasta: 'pasta', documento: 'documento', planilha: 'planilha', apresentacao: 'apresentação', formulario: 'formulário' }[a.drive.tipo] || 'arquivo';
    return <p className="link-status link-status--ok"><Icon name="check" size={15} /> Google Drive · {oQue} reconhecido — abre dentro do Audaz Squad.</p>;
  }
  if (a.modo === 'externo') {
    return <p className="link-status link-status--aviso"><Icon name="external" size={15} /> Link válido. Esse site não permite exibir aqui dentro — o corretor abre em nova aba.</p>;
  }
  return <p className="link-status link-status--ok"><Icon name="check" size={15} /> Link válido — abre dentro do Audaz Squad.</p>;
}

/**
 * Seção "Materiais do empreendimento" do editor. Trabalha só com metadados + URL
 * (o arquivo continua no Google Drive ou no serviço de origem — nada é enviado ao sistema).
 */
export default function MateriaisEditor({ materiais, onChange, contexto }) {
  const [testando, setTestando] = useState(null);
  const [copiado, setCopiado] = useState(null);

  const alterar = (id, mudancas) => onChange(materiais.map((m) => (m.id === id ? { ...m, ...mudancas } : m)));
  const remover = (m) => {
    if (!m.urlOriginal.trim() || window.confirm(`Excluir o material "${m.titulo || 'sem nome'}"?`)) {
      onChange(materiais.filter((x) => x.id !== m.id));
    }
  };
  const mover = (i, d) => {
    const lista = [...materiais];
    [lista[i], lista[i + d]] = [lista[i + d], lista[i]];
    onChange(lista);
  };
  async function copiar(m) {
    const a = analisarUrlMaterial(m.urlOriginal);
    try {
      await navigator.clipboard.writeText(a.valido ? a.urlOriginal : m.urlOriginal);
      setCopiado(m.id);
      setTimeout(() => setCopiado(null), 1800);
    } catch {
      window.prompt('Copie o link:', m.urlOriginal);
    }
  }

  return (
    <div className="materiais-editor">
      {materiais.length === 0 && (
        <p className="admin-vazio-linha">Nenhum material cadastrado. Adicione o book, a tabela e os demais materiais pelo link do Google Drive.</p>
      )}

      {materiais.map((m, i) => {
        const valido = analisarUrlMaterial(m.urlOriginal).valido;
        return (
          <div key={m.id} className={`material-linha ${m.ativo === false ? 'material-linha--inativo' : ''}`}>
            <div className="material-linha__topo">
              <span className="material-linha__num">{i + 1}</span>
              <label className="interruptor">
                <input type="checkbox" checked={m.ativo !== false} onChange={(e) => alterar(m.id, { ativo: e.target.checked })} />
                <span>{m.ativo !== false ? 'Ativo' : 'Inativo'}</span>
              </label>
              <div className="material-linha__botoes">
                <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>▲</button>
                <button type="button" aria-label="Descer" disabled={i === materiais.length - 1} onClick={() => mover(i, 1)}>▼</button>
              </div>
            </div>

            <div className="material-linha__campos">
              <label className="campo">
                <span>Nome do material</span>
                <input value={m.titulo} onChange={(e) => alterar(m.id, { titulo: e.target.value })} placeholder="Ex.: Book do Empreendimento" maxLength={120} />
              </label>
              <label className="campo">
                <span>Categoria</span>
                <select value={m.categoria} onChange={(e) => alterar(m.id, { categoria: e.target.value })}>
                  {CATEGORIAS_MATERIAL.map((c) => <option key={c.chave} value={c.chave}>{c.label}</option>)}
                </select>
              </label>
              <label className="campo campo--largo">
                <span>Link do arquivo</span>
                <input
                  type="url"
                  inputMode="url"
                  value={m.urlOriginal}
                  onChange={(e) => alterar(m.id, { urlOriginal: e.target.value })}
                  placeholder="https://drive.google.com/file/d/…/view?usp=sharing"
                  maxLength={2000}
                />
                <StatusDoLink url={m.urlOriginal} />
              </label>
              <label className="campo campo--largo">
                <span>Imagem de capa <small>(opcional)</small></span>
                <CampoLinkFoto valor={m.capaUrl || ''} onChange={(v) => alterar(m.id, { capaUrl: v })} />
                <small>Link de uma imagem no Drive para aparecer no card (ex.: a 1ª página do book). Sem capa, o sistema usa a pré-visualização do próprio arquivo.</small>
              </label>
            </div>

            <div className="material-linha__acoes">
              <button type="button" className="btn btn--ghost btn--sm" disabled={!valido} onClick={() => setTestando(m)}>
                <Icon name="eye" size={16} /> Testar / visualizar
              </button>
              <button type="button" className="btn btn--ghost btn--sm" disabled={!m.urlOriginal.trim()} onClick={() => copiar(m)}>
                <Icon name={copiado === m.id ? 'check' : 'copy'} size={16} /> {copiado === m.id ? 'Copiado!' : 'Copiar link'}
              </button>
              <button type="button" className="btn btn--perigo btn--sm" onClick={() => remover(m)}>Excluir</button>
              {m.updatedAt && <span className="admin-dica material-linha__data">Atualizado em {formatarDataHora(m.updatedAt)}</span>}
            </div>
          </div>
        );
      })}

      <button type="button" className="btn btn--ghost" onClick={() => onChange([...materiais, novoMaterial()])}>
        + Adicionar material
      </button>

      {testando && (
        <VisualizadorMaterial
          key={testando.id + testando.urlOriginal}
          material={{ ...testando, titulo: testando.titulo || 'Material sem nome' }}
          contexto={`Pré-visualização · ${contexto || 'novo empreendimento'}`}
          onFechar={() => setTestando(null)}
        />
      )}
    </div>
  );
}
