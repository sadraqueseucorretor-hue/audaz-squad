import { Link } from 'react-router-dom';
import SmartImage from './SmartImage.jsx';
import Icon from './Icon.jsx';
import { tempoRelativo, formatarDataHora } from '../utils/format.js';

// Lista horizontal (mobile) / grade (desktop) com os empreendimentos atualizados por último.
export default function RecentesSection({ itens }) {
  if (!itens.length) return null;
  return (
    <section className="secao" aria-labelledby="recentes-titulo">
      <div className="secao__head">
        <h2 id="recentes-titulo" className="secao__titulo">
          <span className="ponto-vivo" aria-hidden="true" /> Atualizados recentemente
        </h2>
      </div>
      <ul className="recentes">
        {itens.map(({ emp, data, oQue }) => (
          <li key={emp.slug}>
            <Link to={`/empreendimento/${emp.slug}`} className="recente">
              <SmartImage src={emp.imagem} alt={emp.nome} className="recente__thumb" />
              <div className="recente__info">
                <strong>{emp.nome}</strong>
                <span className="recente__oque">{oQue} atualizada</span>
                <time dateTime={data} title={formatarDataHora(data)}>
                  <Icon name="clock" size={13} /> {tempoRelativo(data)}
                </time>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
