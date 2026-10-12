import { useEffect } from 'react';
import { useDados } from '../context/DadosContext.jsx';

// Ícone da aba do navegador (favicon), definido no painel em "Logo e textos".
// Vem dos dados do site (guardados no navegador), então aparece logo ao abrir.
export default function IconeDaAba() {
  const { site } = useDados();
  const icone = site.faviconUrl || '';
  useEffect(() => {
    for (const rel of ['icon', 'apple-touch-icon']) {
      let link = document.head.querySelector(`link[rel="${rel}"]`);
      if (!icone) {
        link?.remove();
        continue;
      }
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.type = 'image/png';
      link.href = icone;
    }
  }, [icone]);
  return null;
}
