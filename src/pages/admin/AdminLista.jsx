import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDados } from '../../context/DadosContext.jsx';
import { STATUS, RECENTES_LIMITE } from '../../data/config.js';
import { empreendimentos as exemplos } from '../../data/empreendimentos.js';
import { excluirEmpreendimento, importarExemplos, salvarOrdem, mensagemErro } from '../../services/admin.js';
import { atualizadosRecentemente, ultimaAtualizacao } from '../../utils/empreendimentos.js';
import RecentesSection from '../../components/RecentesSection.jsx';
import { tempoRelativo } from '../../utils/format.js';
import Miniatura from '../../components/Miniatura.jsx';

export default function AdminLista() {
  const { empreendimentos, carregando, erro } = useDados();
  const { state } = useLocation();
  const [aviso, setAviso] = useState(state?.aviso || null);
  const [ocupado, setOcupado] = useState(false);

  async function executar(acao, sucesso) {
    setOcupado(true);
    try {
      await acao();
      if (sucesso) setAviso({ texto: sucesso });
    } catch (falha) {
      setAviso({ erro: true, texto: mensagemErro(falha) });
    } finally {
      setOcupado(false);
    }
  }

  const mover = (i, direcao) => {
    const lista = [...empreendimentos];
    const [item] = lista.splice(i, 1);
    lista.splice(i + direcao, 0, item);
    executar(() => salvarOrdem(lista));
  };

  const excluir = (emp) => {
    if (window.confirm(`Excluir "${emp.nome}"? Essa ação não pode ser desfeita.`)) {
      executar(() => excluirEmpreendimento(emp.slug), `"${emp.nome}" foi excluído.`);
    }
  };

  return (
    <>
      <div className="admin__cabecalho">
        <div>
          <h1>Empreendimentos</h1>
          <p>{empreendimentos.length} publicados · as alterações aparecem na hora para os corretores.</p>
        </div>
        <Link to="/admin/novo" className="btn btn--primary">+ Novo empreendimento</Link>
      </div>

      {aviso && <p className={aviso.erro ? 'admin-erro admin-aviso' : 'admin-ok admin-aviso'}>{aviso.texto}</p>}
      {erro && <p className="admin-erro admin-aviso">{mensagemErro(erro)}</p>}

      {/* Só no painel: o que foi atualizado por último (saiu da página dos corretores). */}
      {!carregando && <div className="admin-recentes"><RecentesSection itens={atualizadosRecentemente(empreendimentos, RECENTES_LIMITE)} /></div>}

      {carregando ? (
        <p>Carregando…</p>
      ) : empreendimentos.length === 0 ? (
        <div className="admin-vazio">
          <p>Nenhum empreendimento cadastrado ainda.</p>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={ocupado}
            onClick={() => executar(() => importarExemplos(exemplos), 'Exemplos importados. Edite ou exclua à vontade.')}
          >
            Importar {exemplos.length} empreendimentos de exemplo
          </button>
        </div>
      ) : (
        <ul className="admin-lista">
          {empreendimentos.map((emp, i) => (
            <li key={emp.slug} className="admin-item">
              <div className="admin-item__ordem">
                <button type="button" aria-label="Mover para cima" disabled={ocupado || i === 0} onClick={() => mover(i, -1)}>▲</button>
                <button type="button" aria-label="Mover para baixo" disabled={ocupado || i === empreendimentos.length - 1} onClick={() => mover(i, 1)}>▼</button>
              </div>
              <Miniatura emp={emp} className="admin-item__thumb" />
              <div className="admin-item__info">
                <strong>{emp.nome}</strong>
                <span>
                  {STATUS[emp.status]?.label || emp.status} · {emp.bairro} · atualizado {tempoRelativo(ultimaAtualizacao(emp).data) || '—'}
                </span>
              </div>
              <div className="admin-item__acoes">
                <Link to={`/admin/editar/${emp.slug}`} className="btn btn--ghost btn--sm">Editar</Link>
                <Link to={`/empreendimento/${emp.slug}`} target="_blank" className="btn btn--ghost btn--sm">Ver</Link>
                <button type="button" className="btn btn--perigo btn--sm" disabled={ocupado} onClick={() => excluir(emp)}>Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
