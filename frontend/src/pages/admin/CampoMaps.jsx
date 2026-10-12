import Icon from '../../components/Icon.jsx';
import { analisarLinkMaps, embedPorEndereco } from '../../utils/mapa.js';

/** Campo do link do Google Maps com validação e prévia do mapa. */
export default function CampoMaps({ valor, endereco, onChange }) {
  const texto = valor || '';
  const a = texto.trim() ? analisarLinkMaps(texto) : null;

  let status;
  if (!a) {
    status = endereco?.trim()
      ? <p className="admin-dica">Sem link, o mapa usa o endereço completo acima.</p>
      : <p className="admin-dica">Cole o link do local no Google Maps (Compartilhar → Copiar link).</p>;
  } else if (!a.valido) {
    status = <p className="link-status link-status--erro"><Icon name="alert" size={15} /> {a.erro}</p>;
  } else if (a.exato) {
    status = <p className="link-status link-status--ok"><Icon name="check" size={15} /> Local reconhecido — o mapa mostra exatamente este ponto.</p>;
  } else {
    status = (
      <p className="link-status link-status--aviso">
        <Icon name="info" size={15} /> Link curto aceito: o botão “Abrir no Google Maps” usa este link e o mapa da página usa o endereço.
        Para o pin exato no mapa, no Google Maps use Compartilhar → <strong>Incorporar um mapa</strong> → Copiar HTML e cole aqui.
      </p>
    );
  }

  const previa = (a?.valido && a.urlEmbed) || embedPorEndereco(endereco);
  return (
    <div className="campo-maps">
      <input
        value={texto}
        maxLength={4000}
        placeholder="https://maps.app.goo.gl/… ou https://www.google.com/maps/place/…"
        onChange={(e) => onChange(e.target.value)}
      />
      {status}
      {previa && (!a || a.valido) && (
        <iframe className="campo-maps__previa" src={previa} title="Prévia do mapa" loading="lazy" referrerPolicy="no-referrer-when-downgrade" sandbox="allow-scripts allow-same-origin" />
      )}
    </div>
  );
}
