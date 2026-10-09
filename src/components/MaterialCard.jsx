import { useState } from 'react';
import Icon from './Icon.jsx';
import { formatarDataHora, ehRecente } from '../utils/format.js';
import { analisarUrlMaterial, miniaturaDoMaterial, seloDoMaterial } from '../utils/materiais.js';
import { urlImagem } from '../utils/drive.js';
import { temChaveDrive } from '../utils/pastaDrive.js';
import PreviaPasta from './PreviaPasta.jsx';

// Pré-visualização do material, em ordem de preferência:
// 1) imagem de capa cadastrada no admin; 2) miniatura gerada pelo Drive/YouTube;
// 3) a 1ª página do próprio arquivo pelo visualizador do Drive, em tamanho reduzido
//    (para PDFs grandes, que o Drive não gera miniatura); 4) o ícone da categoria.
function Previa({ material, icone }) {
  const capa = material.capaUrl ? urlImagem(material.capaUrl, 800) : null;
  const miniatura = capa || miniaturaDoMaterial(material);
  const analise = analisarUrlMaterial(material.urlOriginal);
  // Arquivos e pastas do Drive (a pasta aparece como grade de fotos) podem ser mostrados reduzidos.
  const podeEmbutir = analise.valido && analise.tipoOrigem === 'google_drive' && analise.drive.tipo !== 'formulario';
  const [etapa, setEtapa] = useState(miniatura ? 'imagem' : podeEmbutir ? 'pagina' : 'icone');

  // Pasta do Drive (sem capa definida): mosaico com as fotos de dentro, em vez da grade do Google.
  if (!capa && analise.valido && analise.drive?.tipo === 'pasta' && temChaveDrive()) {
    return (
      <span className="material__previa" aria-hidden="true">
        <PreviaPasta pastaId={analise.drive.id} />
      </span>
    );
  }

  if (etapa === 'imagem') {
    return (
      <span className="material__previa" aria-hidden="true">
        <img src={miniatura} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
          onError={() => setEtapa(podeEmbutir ? 'pagina' : 'icone')} />
      </span>
    );
  }
  if (etapa === 'pagina') {
    return (
      <span className="material__previa material__previa--pagina" aria-hidden="true">
        <span className="material__previa-carregando"><Icon name={icone} size={30} /></span>
        <iframe src={analise.urlPreview} title="" tabIndex={-1} loading="lazy" sandbox="allow-scripts allow-same-origin" />
      </span>
    );
  }
  return (
    <span className="material__previa material__previa--icone" aria-hidden="true">
      <Icon name={icone} size={34} />
    </span>
  );
}

// Um card por CATEGORIA (Book, Tabela...). Cada material mostra a pré-visualização e abre no visualizador.
export default function MaterialCard({ categoria, onAbrir }) {
  const ehTabela = categoria.chave === 'tabela';

  return (
    <article className={`material ${ehTabela ? 'material--tabela' : ''}`}>
      <header className="material__head">
        <span className="material__icone">
          <Icon name={categoria.icone} size={22} />
        </span>
        <div>
          <h3>{categoria.label}</h3>
          <p>{categoria.descricao}</p>
        </div>
      </header>

      <ul className={`material__lista ${categoria.itens.length > 1 ? 'material__lista--varios' : ''}`}>
        {categoria.itens.map((item) => (
          <li key={item.id}>
            <button type="button" className="material__item" onClick={() => onAbrir(item)} aria-label={`Visualizar ${item.titulo}`}>
              <Previa material={item} icone={categoria.icone} />
              <span className="material__link">
                <span className="material__titulo">{item.titulo}</span>
                <span className="material__acoes">
                  <span className="formato">{seloDoMaterial(item)}</span>
                  <Icon name="eye" size={17} />
                </span>
              </span>
            </button>
            {item.updatedAt && (
              <p className={`material__data ${ehRecente(item.updatedAt) ? 'material__data--nova' : ''}`}>
                <Icon name="clock" size={14} /> Atualizada em {formatarDataHora(item.updatedAt)}
              </p>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}
