import { useState } from 'react';
import { urlImagem } from '../utils/drive.js';

// Imagem com lazy-load e fallback elegante (gradiente da marca + iniciais) caso a URL falhe.
// Aceita link normal de compartilhamento do Google Drive (convertido para imagem direta).
export default function SmartImage({ src: original, alt, className = '', eager = false, largura = 1200 }) {
  const src = urlImagem(original, largura);
  const [erro, setErro] = useState(!src);
  const iniciais = alt?.split(' ').slice(0, 2).map((p) => p[0]).join('') || 'AS';

  if (erro) {
    return (
      <div className={`smart-img smart-img--fallback ${className}`} role="img" aria-label={alt}>
        <span>{iniciais}</span>
      </div>
    );
  }
  return (
    <img
      className={`smart-img ${className}`}
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setErro(true)}
    />
  );
}
