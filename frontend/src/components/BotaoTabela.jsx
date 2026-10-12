import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { analisarUrlMaterial } from '../utils/materiais.js';
import { listarPastaDrive, temChaveDrive } from '../utils/pastaDrive.js';
import { tabelaDoEmpreendimento } from '../utils/tabelaDoEmpreendimento.js';

// "Tabela de valores" na página do empreendimento: procura, na pasta da Tabela de valores, o arquivo
// com o nome do empreendimento e abre direto nele. Sem tabela reconhecida, abre a lista de tabelas.
export default function BotaoTabela({ emp, site }) {
  const analise = site.tabelaValoresUrl ? analisarUrlMaterial(site.tabelaValoresUrl) : null;
  const pastaId = analise?.valido && analise.drive?.tipo === 'pasta' && temChaveDrive() ? analise.drive.id : null;
  const [tabela, setTabela] = useState(null);

  useEffect(() => {
    if (!pastaId) return undefined;
    let ativo = true;
    // A listagem da pasta fica em memória: abrir outros empreendimentos não consulta o Drive de novo.
    listarPastaDrive(pastaId).then((r) => ativo && setTabela(tabelaDoEmpreendimento(r.arquivos, emp.nome)));
    return () => { ativo = false; };
  }, [pastaId, emp.nome]);

  if (!site.tabelaValoresUrl) return null;
  return (
    <Link
      to={tabela ? `/tabela-valores?tabela=${tabela.id}` : '/tabela-valores'}
      className="btn btn--ghost"
      title={tabela ? `Abrir ${tabela.nome}` : 'Abrir a lista de tabelas'}
    >
      <Icon name="table" size={18} /> Tabela de valores
    </Link>
  );
}
