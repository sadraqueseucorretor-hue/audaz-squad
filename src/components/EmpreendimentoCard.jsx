import { Link } from 'react-router-dom';
import Carrossel from './Carrossel.jsx';
import StatusBadge from './StatusBadge.jsx';
import Icon from './Icon.jsx';
import { SELOS } from '../data/config.js';
import { fotosDo, selosDo } from '../utils/empreendimentos.js';

export default function EmpreendimentoCard({ emp, prioridade = false, emLista = false }) {
  const url = `/empreendimento/${emp.slug}`;
  const local = [emp.bairro, emp.cidade].filter(Boolean).join(' · ');
  return (
    <article className={`emp-card ${emLista ? 'emp-card--lista' : ''} ${selosDo(emp).length ? 'emp-card--selo' : ''}`}>
      <div className="emp-card__media">
        <Carrossel fotos={fotosDo(emp)} alt={emp.nome} href={url} eager={prioridade} />
        <StatusBadge status={emp.status} className="emp-card__status" />
        {selosDo(emp).length > 0 && (
          <div className="emp-card__selos">
            {selosDo(emp).map((s) => (
              <span key={s} className={`selo selo-${s}`} title={SELOS[s].label}>
                <Icon name={SELOS[s].icone} size={14} /> {SELOS[s].label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="emp-card__body">
        <h3 className="emp-card__nome">
          <Link to={url}>{emp.nome}</Link>
        </h3>
        <p className="emp-card__local">
          {emp.construtora && <span className="emp-card__construtora">{emp.construtora}</span>}
          {emp.construtora && local && <span className="emp-card__ponto" aria-hidden="true">•</span>}
          {local && <span><Icon name="pin" size={15} /> {local}</span>}
        </p>
        {emp.entrega?.trim() && (
          <p className="emp-card__entrega">
            <Icon name="key" size={15} /> Entrega: <strong>{emp.entrega.trim()}</strong>
          </p>
        )}

        <div className="emp-card__botoes">
          <Link to={`${url}?ir=materiais`} className="btn btn--ghost emp-card__btn">
            <Icon name="folder" size={17} /> <span className="rotulo-longo">Ver materiais</span><span className="rotulo-curto">Materiais</span>
          </Link>
          <Link to={url} className="btn btn--primary emp-card__btn">
            <span className="rotulo-longo">Ver empreendimento</span><span className="rotulo-curto">Abrir</span> <Icon name="arrowRight" size={17} />
          </Link>
        </div>
      </div>
    </article>
  );
}
