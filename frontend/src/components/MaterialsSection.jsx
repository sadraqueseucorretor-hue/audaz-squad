import MaterialCard from './MaterialCard.jsx';
import { materiaisPorCategoria } from '../utils/materiais.js';

export default function MaterialsSection({ emp, onAbrir }) {
  const categorias = materiaisPorCategoria(emp);
  return (
    <section className="secao" id="materiais" aria-labelledby="materiais-titulo">
      <div className="secao__head">
        <h2 id="materiais-titulo" className="secao__titulo">Materiais</h2>
        <span className="secao__contador">{categorias.length} {categorias.length === 1 ? 'categoria' : 'categorias'}</span>
      </div>
      {categorias.length ? (
        <div className="materiais">
          {categorias.map((categoria) => (
            <MaterialCard key={categoria.chave} categoria={categoria} onAbrir={onAbrir} />
          ))}
        </div>
      ) : (
        <p className="vazio">Os materiais deste empreendimento serão publicados em breve.</p>
      )}
    </section>
  );
}
