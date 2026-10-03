import MaterialCard from './MaterialCard.jsx';
import { materiaisVisiveis } from '../utils/empreendimentos.js';

export default function MaterialsSection({ emp }) {
  const tipos = materiaisVisiveis(emp);
  return (
    <section className="secao" id="materiais" aria-labelledby="materiais-titulo">
      <div className="secao__head">
        <h2 id="materiais-titulo" className="secao__titulo">Materiais Comerciais</h2>
        <span className="secao__contador">{tipos.length} {tipos.length === 1 ? 'categoria' : 'categorias'}</span>
      </div>
      {tipos.length ? (
        <div className="materiais">
          {tipos.map((tipo) => (
            <MaterialCard key={tipo.chave} tipo={tipo} slug={emp.slug} />
          ))}
        </div>
      ) : (
        <p className="vazio">Os materiais deste empreendimento serão publicados em breve.</p>
      )}
    </section>
  );
}
