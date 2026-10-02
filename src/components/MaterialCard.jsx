import Icon from './Icon.jsx';
import { FORMATOS } from '../data/tiposMateriais.js';
import { formatarDataHora, ehRecente } from '../utils/format.js';

// Um card por TIPO de material (Book, Tabela...). Cada arquivo do tipo vira um botão.
export default function MaterialCard({ tipo }) {
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
        {tipo.itens.map((item, i) => (
          <li key={`${item.url}-${i}`}>
            <a
              className={`material__link ${unico ? 'material__link--unico' : ''}`}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="material__titulo">{item.titulo}</span>
              <span className="material__acoes">
                {item.formato && <span className="formato">{FORMATOS[item.formato] || item.formato}</span>}
                <Icon name="external" size={17} />
              </span>
            </a>
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
