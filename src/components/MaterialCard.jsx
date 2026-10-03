import Icon from './Icon.jsx';
import { formatarDataHora, ehRecente } from '../utils/format.js';
import { seloDoMaterial } from '../utils/materiais.js';

// Um card por CATEGORIA (Book, Tabela...). Cada material abre no visualizador do próprio site.
export default function MaterialCard({ categoria, onAbrir }) {
  const ehTabela = categoria.chave === 'tabela';
  const unico = categoria.itens.length === 1;

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

      <ul className="material__lista">
        {categoria.itens.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`material__link ${unico ? 'material__link--unico' : ''}`}
              onClick={() => onAbrir(item)}
            >
              <span className="material__titulo">{item.titulo}</span>
              <span className="material__acoes">
                <span className="formato">{seloDoMaterial(item)}</span>
                <Icon name="eye" size={17} />
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
