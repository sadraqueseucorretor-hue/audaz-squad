import { Link } from 'react-router-dom';
import SmartImage from './SmartImage.jsx';
import StatusBadge from './StatusBadge.jsx';
import Icon from './Icon.jsx';
import { formatarPreco } from '../utils/format.js';

export default function EmpreendimentoCard({ emp, prioridade = false }) {
  const url = `/empreendimento/${emp.slug}`;
  return (
    <article className="emp-card">
      <Link to={url} className="emp-card__media" tabIndex={-1} aria-hidden="true">
        <SmartImage src={emp.imagem} alt={emp.nome} eager={prioridade} />
        <StatusBadge status={emp.status} className="emp-card__status" />
      </Link>

      <div className="emp-card__body">
        <p className="emp-card__construtora">{emp.construtora}</p>
        <h3 className="emp-card__nome">
          <Link to={url}>{emp.nome}</Link>
        </h3>
        <p className="emp-card__local">
          <Icon name="pin" size={15} /> {emp.bairro} · {emp.cidade}/{emp.uf}
        </p>

        <div className="emp-card__meta">
          <div>
            <span className="emp-card__meta-label">A partir de</span>
            <strong className="emp-card__preco">{formatarPreco(emp.precoInicial)}</strong>
          </div>
          <div className="emp-card__tipologia">
            <span className="emp-card__meta-label">Tipologia</span>
            <span>{emp.quartos} quartos · {emp.metragem}</span>
          </div>
        </div>

        <Link to={url} className="btn btn--primary btn--block">
          Acessar Materiais <Icon name="arrowRight" size={18} />
        </Link>
      </div>
    </article>
  );
}
