import Icon from './Icon.jsx';

// Grade de dados técnicos. Itens sem valor são omitidos automaticamente.
export default function InfoGrid({ itens }) {
  const visiveis = itens.filter((i) => i.valor !== undefined && i.valor !== null && i.valor !== '');
  return (
    <dl className="info-grid">
      {visiveis.map((i) => (
        <div key={i.label} className={`info-grid__item ${i.destaque ? 'info-grid__item--destaque' : ''} ${i.largo ? 'info-grid__item--largo' : ''}`}>
          <dt>
            <Icon name={i.icone} size={16} /> {i.label}
          </dt>
          <dd>{i.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
