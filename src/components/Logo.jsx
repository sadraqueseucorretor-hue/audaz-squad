import { Link } from 'react-router-dom';
import { useDados } from '../context/DadosContext.jsx';

// Logo da marca. Se SITE.logoUrl estiver preenchido, usa a imagem; senão, o logotipo tipográfico.
export default function Logo({ compacto = false }) {
  const { site: SITE } = useDados();
  return (
    <Link to="/" className={`logo ${compacto ? 'logo--compacto' : ''}`} aria-label={`${SITE.marca} — início`}>
      {SITE.logoUrl ? (
        <img className="logo__img" src={SITE.logoUrl} alt={SITE.marca} />
      ) : (
        <>
          <span className="logo__mark" aria-hidden="true">A</span>
          <span className="logo__text">
            <strong>AUDAZ</strong> SQUAD
            {!compacto && <small>parceiro {SITE.parceiro}</small>}
          </span>
        </>
      )}
    </Link>
  );
}
