import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { analisarUrlMaterial } from '../utils/materiais.js';
import { listarPastaDrive, temChaveDrive } from '../utils/pastaDrive.js';
import { tabelaDoEmpreendimento } from '../utils/tabelaDoEmpreendimento.js';
import { fonteDoEmpreendimento } from '../utils/tabelas.js';

// "Tabela de valores" na página do empreendimento: procura, na pasta da Tabela de valores, o arquivo
// com o nome do empreendimento e abre direto nele. Sem tabela reconhecida, abre a lista de tabelas.
// Empreendimento da Riva usa a tabela da Riva (quando cadastrada); os demais, a da Direcional.
export default function BotaoTabela({ emp, site }) {
  const fonte = fonteDoEmpreendimento(emp, site);
  const url = fonte ? site[fonte.campo] : '';
  const analise = url ? analisarUrlMaterial(url) : null;
  const pastaId = analise?.valido && analise.drive?.tipo === 'pasta' && temChaveDrive() ? analise.drive.id : null;
  const [tabela, setTabela] = useState(null);

  useEffect(() => {
    if (!pastaId) return undefined;
    let ativo = true;
    // A listagem da pasta fica em memória: abrir outros empreendimentos não consulta o Drive de novo.
    listarPastaDrive(pastaId).then((r) => ativo && setTabela(tabelaDoEmpreendimento(r.arquivos, emp.nome)));
    return () => { ativo = false; };
  }, [pastaId, emp.nome]);

  if (!fonte) return null;
  const busca = new URLSearchParams({ fonte: fonte.chave, ...(tabela ? { tabela: tabela.id } : {}) });
  return (
    <Link
      to={`/tabela-valores?${busca}`}
      className="btn btn--ghost"
      title={tabela ? `Abrir ${tabela.nome}` : 'Abrir a lista de tabelas'}
    >
      <Icon name="table" size={18} /> Tabela de valores
    </Link>
  );
}
