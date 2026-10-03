import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { FORMATOS } from '../data/tiposMateriais.js';
import { formatarDataHora, ehRecente } from '../utils/format.js';

// Um card por TIPO de material (Book, Tabela...). Cada arquivo do tipo vira um botão.
export default function MaterialCard({ tipo, slug }) {
  const ehTabela = tipo.chave === 'tabela';
  const unico = tipo.itens.length === 1;

  return (
    <article className={`material ${ehTabela ? 'material--tabela' : ''}`}>
      <header className="material__head">
        <span className="material__icone">
          <Icon name={tipo.icone} size={22} />
        </span>
        <div>
          <h3>{tipo.label}</h3>
          <p>{tipo.descricao}</p>
        </div>
      </header>

      <ul className="material__lista">
        {tipo.itens.map((item) => (
          <li key={`${item.url}-${item.indice}`}>
            <Link
              className={`material__link ${unico ? 'material__link--unico' : ''}`}
              to={`/empreendimento/${slug}/ver/${tipo.chave}/${item.indice}`}
            >
              <span className="material__titulo">{item.titulo}</span>
              <span className="material__acoes">
                {item.formato && <span className="formato">{FORMATOS[item.formato] || item.formato}</span>}
                <Icon name="eye" size={17} />
              </span>
            </Link>
            {item.atualizadoEm && (
              <p className={`material__data ${ehRecente(item.atualizadoEm) ? 'material__data--nova' : ''}`}>
                <Icon name="clock" size={14} /> Atualizada em {formatarDataHora(item.atualizadoEm)}
              </p>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}
