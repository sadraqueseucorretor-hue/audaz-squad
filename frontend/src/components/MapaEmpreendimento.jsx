import Icon from './Icon.jsx';
import { mapaDoEmpreendimento } from '../utils/mapa.js';

// Mapa do Google embutido na página do empreendimento, com atalhos para abrir e traçar rota.
export default function MapaEmpreendimento({ emp }) {
  const mapa = mapaDoEmpreendimento(emp);
  if (!mapa) return null;
  return (
    <div className="mapa">
      <div className="mapa__quadro">
        <iframe
          src={mapa.urlEmbed}
          title={`Mapa — ${emp.nome}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          allowFullScreen
        />
      </div>
      <div className="mapa__acoes">
        <a className="btn btn--ghost" href={mapa.urlAbrir} target="_blank" rel="noopener noreferrer">
          <Icon name="map" size={18} /> Abrir no Google Maps
        </a>
        {emp.endereco && (
          <a className="btn btn--ghost" href={mapa.urlRota} target="_blank" rel="noopener noreferrer">
            <Icon name="pin" size={18} /> Como chegar
          </a>
        )}
      </div>
    </div>
  );
}
