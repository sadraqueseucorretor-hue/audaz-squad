import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import SmartImage from './SmartImage.jsx';

/**
 * Carrossel de fotos do card. No celular, arrasta com o dedo (scroll-snap nativo);
 * no computador, setas aparecem ao passar o mouse. Cada foto é um link para o empreendimento.
 * Só a primeira foto carrega de imediato — as demais esperam (lazy-load).
 */
export default function Carrossel({ fotos, alt, href, eager = false }) {
  const trilho = useRef(null);
  const [atual, setAtual] = useState(0);

  const irPara = (i) => {
    const el = trilho.current;
    if (!el) return;
    const destino = (i + fotos.length) % fotos.length;
    el.scrollTo({ left: destino * el.clientWidth, behavior: 'smooth' });
  };
  const aoRolar = () => {
    const el = trilho.current;
    if (el) setAtual(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (fotos.length <= 1) {
    return (
      <Link to={href} tabIndex={-1} aria-hidden="true" className="carrossel__slide">
        <SmartImage src={fotos[0]} alt={alt} eager={eager} />
      </Link>
    );
  }

  return (
    <div className="carrossel" aria-roledescription="carrossel" aria-label={`Fotos de ${alt}`}>
      <div className="carrossel__trilho" ref={trilho} onScroll={aoRolar}>
        {fotos.map((src, i) => (
          <Link key={`${src}-${i}`} to={href} tabIndex={-1} className="carrossel__slide" aria-label={`${alt} — foto ${i + 1} de ${fotos.length}`}>
            <SmartImage src={src} alt={`${alt} — foto ${i + 1}`} eager={eager && i === 0} />
          </Link>
        ))}
      </div>
      <button type="button" className="carrossel__seta carrossel__seta--esq" aria-label="Foto anterior" onClick={() => irPara(atual - 1)}>
        <Icon name="arrowLeft" size={18} />
      </button>
      <button type="button" className="carrossel__seta carrossel__seta--dir" aria-label="Próxima foto" onClick={() => irPara(atual + 1)}>
        <Icon name="arrowRight" size={18} />
      </button>
      <div className="carrossel__pontos" aria-hidden="true">
        {fotos.map((_, i) => <span key={i} className={i === atual ? 'ativo' : ''} />)}
      </div>
    </div>
  );
}
