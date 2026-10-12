import CampoLinkFoto from './CampoLinkFoto.jsx';

/** Lista de fotos do carrossel do card: cada foto é um link do Google Drive. */
export default function FotosEditor({ fotos, onChange }) {
  const alterar = (i, valor) => onChange(fotos.map((f, j) => (j === i ? valor : f)));
  const mover = (i, d) => {
    const lista = [...fotos];
    [lista[i], lista[i + d]] = [lista[i + d], lista[i]];
    onChange(lista);
  };

  return (
    <div className="fotos-editor">
      {fotos.map((foto, i) => (
        <div key={i} className="foto-linha">
          <div className="material-linha__topo">
            <span className="material-linha__num">{i + 1}</span>
            <strong className="foto-linha__rotulo">{i === 0 ? 'Foto principal' : `Foto ${i + 1}`}</strong>
            <div className="material-linha__botoes">
              <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>▲</button>
              <button type="button" aria-label="Descer" disabled={i === fotos.length - 1} onClick={() => mover(i, 1)}>▼</button>
              <button type="button" aria-label="Remover foto" className="perigo" onClick={() => onChange(fotos.filter((_, j) => j !== i))}>✕</button>
            </div>
          </div>
          <CampoLinkFoto valor={foto} onChange={(v) => alterar(i, v)} />
        </div>
      ))}
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange([...fotos, ''])}>+ Adicionar foto</button>
    </div>
  );
}
