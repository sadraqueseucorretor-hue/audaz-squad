import { useState } from 'react';
import Icon from './Icon.jsx';

// Compartilha o link da página (WhatsApp, etc.) pelo menu nativo; no desktop, copia o link.
export default function ShareButton({ titulo, className = '' }) {
  const [copiado, setCopiado] = useState(false);

  async function compartilhar() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: titulo, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* usuário cancelou o compartilhamento */
    }
  }

  return (
    <button type="button" className={`btn btn--ghost ${className}`} onClick={compartilhar}>
      <Icon name={copiado ? 'check' : 'share'} size={18} />
      {copiado ? 'Link copiado' : 'Compartilhar'}
    </button>
  );
}
