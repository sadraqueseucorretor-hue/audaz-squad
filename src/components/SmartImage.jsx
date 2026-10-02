import { useState } from 'react';

// Imagem com lazy-load e fallback elegante (gradiente da marca + iniciais) caso a URL falhe.
export default function SmartImage({ src, alt, className = '', eager = false }) {
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
      onError={() => setErro(true)}
    />
  );
}
