import { useState } from 'react';
import Icon from './Icon.jsx';
import { formatarDataHora, ehRecente } from '../utils/format.js';
import { miniaturaDoMaterial, seloDoMaterial } from '../utils/materiais.js';

// Pré-visualização do material: miniatura do arquivo ou, sem miniatura, o ícone da categoria.
function Previa({ material, icone }) {
  const src = miniaturaDoMaterial(material);
  const [falhou, setFalhou] = useState(false);
  if (!src || falhou) {
    return (
      <span className="material__previa material__previa--icone" aria-hidden="true">
        <Icon name={icone} size={34} />
      </span>
    );
  }
  return (
    <span className="material__previa" aria-hidden="true">
      <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFalhou(true)} />
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
