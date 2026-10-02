import { Link } from 'react-router-dom';
import { useDados } from '../context/DadosContext.jsx';
import Logo from './Logo.jsx';

export default function Footer() {
  const { site } = useDados();
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <Logo compacto />
        <p>{site.rodape}</p>
        <Link to="/admin" className="footer__admin">Área do administrador</Link>
      </div>
    </footer>
  );
}
