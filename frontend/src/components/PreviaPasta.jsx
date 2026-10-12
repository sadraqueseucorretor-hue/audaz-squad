import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { listarItensPasta, nomeDeExibicao, tipoDoArquivo } from '../utils/pastaDrive.js';

// Fotos e vídeos têm miniatura gerada pelo Drive (o vídeo mostra um quadro dele).
const temMiniatura = (i) => i.tipo.startsWith('image/') || i.tipo.startsWith('video/');

// Procura até `limite` fotos na pasta e, se faltar, nas subpastas (um nível) — para o mosaico.
async function coletarPrevia(pastaId, limite = 4) {
  const r = await listarItensPasta(pastaId);
  if (r.erro) return null;
  const pastas = r.itens.filter((i) => i.ehPasta);
  const arquivos = r.itens.filter((i) => !i.ehPasta);
  const fotos = arquivos.filter(temMiniatura);
  for (const sub of pastas.slice(0, 6)) {
    if (fotos.length >= limite) break;
    const s = await listarItensPasta(sub.id);
    if (!s.erro) fotos.push(...s.itens.filter(temMiniatura));
  }
  return { pastas, arquivos, fotos: fotos.slice(0, limite) };
}

/**
 * Prévia de uma pasta do Drive no card do material: mosaico com as fotos de dentro
 * (ou blocos com os nomes das subpastas) e um selo com quantas pastas/arquivos há.
 */
export default function PreviaPasta({ pastaId }) {
  const [dados, setDados] = useState(undefined);
  const [falhas, setFalhas] = useState([]);

  useEffect(() => {
    let ativo = true;
    coletarPrevia(pastaId).then((d) => ativo && setDados(d));
    return () => {
      ativo = false;
    };
  }, [pastaId]);

  if (dados === undefined) {
    return <span className="previa-pasta previa-pasta--carregando"><span className="visor__spinner" /></span>;
  }
  if (dados === null) {
    return <span className="previa-pasta previa-pasta--vazia"><Icon name="folder" size={36} /></span>;
  }

  const fotos = dados.fotos.filter((f) => !falhas.includes(f.id));
  const resumo = [
    dados.pastas.length && `${dados.pastas.length} ${dados.pastas.length === 1 ? 'pasta' : 'pastas'}`,
    dados.arquivos.length && `${dados.arquivos.length} ${dados.arquivos.length === 1 ? 'arquivo' : 'arquivos'}`,
  ].filter(Boolean).join(' · ');

  return (
    <span className="previa-pasta">
      {fotos.length > 0 ? (
        <span className={`previa-pasta__mosaico previa-pasta__mosaico--${Math.min(fotos.length, 4)}`}>
          {fotos.map((f) => (
            <img
              key={f.id}
              src={`https://drive.google.com/thumbnail?id=${f.id}&sz=w500`}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setFalhas((x) => [...x, f.id])}
            />
          ))}
        </span>
      ) : (
        <span className="previa-pasta__blocos">
          {(dados.pastas.length ? dados.pastas : dados.arquivos).slice(0, 4).map((i) => (
            <span key={i.id} className="previa-pasta__bloco">
              <Icon name={i.ehPasta ? 'folder' : { imagem: 'image', video: 'play' }[tipoDoArquivo(i)] || 'doc'} size={18} />
              <span>{nomeDeExibicao(i.nome)}</span>
            </span>
          ))}
          {!dados.pastas.length && !dados.arquivos.length && <span className="previa-pasta__bloco">Pasta vazia</span>}
        </span>
      )}
      {resumo && (
        <span className="previa-pasta__selo">
          <Icon name="folder" size={14} /> {resumo}
        </span>
      )}
    </span>
  );
}
