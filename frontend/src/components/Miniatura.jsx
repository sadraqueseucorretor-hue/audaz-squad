import SmartImage from './SmartImage.jsx';
import { miniaturaDo } from '../utils/empreendimentos.js';

// Miniatura quadrada do empreendimento: a logo (inteira, sobre fundo claro) ou, sem logo, a 1ª foto.
export default function Miniatura({ emp, className = '' }) {
  const { src, ehLogo } = miniaturaDo(emp);
  return <SmartImage src={src} alt={emp.nome} largura={300} className={`${className} ${ehLogo ? 'miniatura--logo' : ''}`} />;
}
