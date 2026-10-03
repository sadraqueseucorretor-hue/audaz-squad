import { Link } from 'react-router-dom';
import { useDados } from '../context/DadosContext.jsx';

// Logo da marca. Se SITE.logoUrl estiver preenchido, usa a imagem; senão, o logotipo tipográfico.
export default function Logo({ compacto = false }) {
  const { site: SITE, siteCarregado } = useDados();
  // Antes da 1ª resposta do Firebase, reserva o espaço vazio em vez de mostrar o logotipo padrão.
  if (!siteCarregado) return <span className={`logo logo--reservado ${compacto ? 'logo--compacto' : ''}`} aria-hidden="true" />;
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
