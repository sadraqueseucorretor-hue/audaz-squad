import { useRef, useState } from 'react';
import { enviarArquivo, mensagemErro } from '../../services/admin.js';

// Campo de URL com botão de upload: o admin pode colar um link (Drive, YouTube…) ou enviar o arquivo.
export default function CampoArquivo({ valor, onChange, pasta, aceitar, onArquivo, placeholder }) {
  const input = useRef(null);
  const [progresso, setProgresso] = useState(null);
  const [erro, setErro] = useState('');

  async function enviar(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setErro('');
    setProgresso(0);
    try {
      const url = await enviarArquivo(arquivo, pasta, setProgresso);
      onChange(url);
      onArquivo?.(arquivo);
    } catch (falha) {
      setErro(mensagemErro(falha));
    } finally {
      setProgresso(null);
    }
  }

  return (
    <div className="campo-arquivo">
      <div className="campo-arquivo__linha">
        <input
          type="url"
          value={valor || ''}
          placeholder={placeholder || 'Cole um link ou envie um arquivo'}
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => input.current.click()} disabled={progresso !== null}>
          {progresso !== null ? `Enviando ${progresso}%` : 'Enviar arquivo'}
        </button>
        <input ref={input} type="file" accept={aceitar} hidden onChange={enviar} />
      </div>
      {erro && <p className="admin-erro">{erro}</p>}
    </div>
  );
}
