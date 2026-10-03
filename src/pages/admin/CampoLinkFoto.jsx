import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { analisarLinkDrive, urlImagem } from '../../utils/drive.js';
import { sanitizarUrl } from '../../utils/urls.js';

/**
 * Campo de foto por LINK (sem upload): cole o link de compartilhamento da imagem no
 * Google Drive (ou outro link https de imagem). Mostra a prévia e avisa se não carregar.
 */
export default function CampoLinkFoto({ valor, onChange }) {
  const [falhou, setFalhou] = useState(false);
  const texto = valor || '';
  const limpo = texto.trim() ? sanitizarUrl(texto) : null;
  const drive = limpo?.valida ? analisarLinkDrive(limpo.url) : null;

  let status = null;
  if (limpo && !limpo.valida) {
    status = <p className="link-status link-status--erro"><Icon name="alert" size={15} /> {limpo.erro}</p>;
  } else if (drive?.ehDrive && drive.tipo !== 'arquivo') {
    status = <p className="link-status link-status--erro"><Icon name="alert" size={15} /> Use o link de uma imagem (arquivo), não de uma pasta ou documento.</p>;
  } else if (limpo?.valida && falhou) {
    status = (
      <p className="link-status link-status--erro">
        <Icon name="alert" size={15} /> A foto não carregou. No Drive, compartilhe como “Qualquer pessoa com o link” e confira se o arquivo é uma imagem.
      </p>
    );
  } else if (drive?.ehDrive) {
    status = <p className="link-status link-status--ok"><Icon name="check" size={15} /> Foto do Google Drive reconhecida.</p>;
  }

  return (
    <div className="campo-link-foto">
      <input
        type="url"
        inputMode="url"
        value={texto}
        maxLength={2000}
        placeholder="https://drive.google.com/file/d/…/view?usp=sharing"
        onChange={(e) => {
          setFalhou(false);
          onChange(e.target.value);
        }}
      />
      {status}
      {limpo?.valida && !falhou && (
        <img
          key={limpo.url}
          className="admin-preview"
          src={urlImagem(limpo.url, 600)}
          referrerPolicy="no-referrer"
          alt="Prévia da foto"
          onError={() => setFalhou(true)}
        />
      )}
    </div>
  );
}
