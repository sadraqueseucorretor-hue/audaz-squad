import { useEffect, useState } from 'react';
import { acessoConhecido, arquivoEhPublico } from './pastaDrive.js';

/**
 * O item do Drive (id) está público? true | false | null (verificando / sem como saber).
 * Usa o resultado guardado quando existe e confere de novo pela API em segundo plano.
 */
export default function useAcessoDrive(id) {
  const [publico, setPublico] = useState(() => (id ? acessoConhecido(id) : null));
  useEffect(() => {
    if (!id) return setPublico(null);
    setPublico(acessoConhecido(id));
    let ativo = true;
    arquivoEhPublico(id).then((r) => ativo && r !== null && setPublico(r));
    return () => { ativo = false; };
  }, [id]);
  return publico;
}
