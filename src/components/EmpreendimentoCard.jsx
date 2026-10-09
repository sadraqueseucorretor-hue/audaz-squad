import { Link } from 'react-router-dom';
import Carrossel from './Carrossel.jsx';
import StatusBadge from './StatusBadge.jsx';
import Icon from './Icon.jsx';
import { fotosDo } from '../utils/empreendimentos.js';

export default function EmpreendimentoCard({ emp, prioridade = false }) {
  const url = `/empreendimento/${emp.slug}`;
  return (
    <article className="emp-card">
      <div className="emp-card__media">
        <Carrossel fotos={fotosDo(emp)} alt={emp.nome} href={url} eager={prioridade} />
        <StatusBadge status={emp.status} className="emp-card__status" />
      </div>

      <div className="emp-card__body">
        <p className="emp-card__construtora">{emp.construtora}</p>
        <h3 className="emp-card__nome">
          <Link to={url}>{emp.nome}</Link>
        </h3>
        <p className="emp-card__local">
          <Icon name="pin" size={15} /> {emp.bairro} · {emp.cidade}/{emp.uf}
        </p>
        {emp.entrega?.trim() && (
          <p className="emp-card__entrega">
            <Icon name="key" size={15} /> Entrega: <strong>{emp.entrega.trim()}</strong>
          </p>
        )}

        <Link to={url} className="btn btn--primary btn--block emp-card__botao">
          Acessar Materiais <Icon name="arrowRight" size={18} />
        </Link>
      </div>
    </article>
  );
}
