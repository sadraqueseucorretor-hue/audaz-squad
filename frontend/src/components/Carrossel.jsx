import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import SmartImage from './SmartImage.jsx';

/**
 * Carrossel de fotos do card. No celular, arrasta com o dedo (scroll-snap nativo);
 * no computador, setas aparecem ao passar o mouse. Cada foto é um link para o empreendimento.
 * Só a 1ª foto é baixada de início; a seguinte carrega quando o corretor passa o mouse
 * ou arrasta (são dezenas de fotos na página — baixar todas deixava a abertura lenta).
 */
const LARGURA_CARD = 800; // fotos do Drive no tamanho do card (não em tamanho de tela cheia)

export default function Carrossel({ fotos, alt, href, eager = false }) {
  const trilho = useRef(null);
  const [atual, setAtual] = useState(0);
  const [carregadas, setCarregadas] = useState(1);
  const liberarAte = (i) => setCarregadas((c) => Math.max(c, Math.min(fotos.length, i + 2)));

  const irPara = (i) => {
    const el = trilho.current;
    if (!el) return;
    const destino = (i + fotos.length) % fotos.length;
    liberarAte(destino);
    el.scrollTo({ left: destino * el.clientWidth, behavior: 'smooth' });
  };
  const aoRolar = () => {
    const el = trilho.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setAtual(i);
    liberarAte(i);
  };

  if (fotos.length <= 1) {
    return (
      <Link to={href} tabIndex={-1} aria-hidden="true" className="carrossel__slide">
        <SmartImage src={fotos[0]} alt={alt} eager={eager} largura={LARGURA_CARD} />
      </Link>
    );
  }

  return (
    <div className="carrossel" aria-roledescription="carrossel" aria-label={`Fotos de ${alt}`} onMouseEnter={() => liberarAte(0)} onTouchStart={() => liberarAte(0)}>
      <div className="carrossel__trilho" ref={trilho} onScroll={aoRolar}>
        {fotos.map((src, i) => (
          <Link key={`${src}-${i}`} to={href} tabIndex={-1} className="carrossel__slide" aria-label={`${alt} — foto ${i + 1} de ${fotos.length}`}>
            {i < carregadas ? (
              <SmartImage src={src} alt={`${alt} — foto ${i + 1}`} eager={eager && i === 0} largura={LARGURA_CARD} />
            ) : (
              <span className="carrossel__vazio" />
            )}
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
