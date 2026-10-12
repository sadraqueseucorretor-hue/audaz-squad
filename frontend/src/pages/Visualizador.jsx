import { Navigate, useParams } from 'react-router-dom';

// Links antigos (/empreendimento/:slug/ver/:tipo/:indice) já compartilhados com corretores:
// redirecionam para a página do empreendimento com o material aberto no visualizador.
// O id "<tipo>-<posição>" é o mesmo que os materiais antigos recebem (ver listarMateriais).
export default function Visualizador() {
  const { slug, tipo, indice } = useParams();
  return <Navigate to={`/empreendimento/${slug}?material=${encodeURIComponent(`${tipo}-${indice}`)}`} replace />;
}
