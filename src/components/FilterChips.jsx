// Linha de chips roláveis horizontalmente. `opcoes`: [{ valor, label }]. Valor '' = "Todos".
export default function FilterChips({ rotulo, opcoes, valor, onChange, rotuloTodos = 'Todos' }) {
  const todas = [{ valor: '', label: rotuloTodos }, ...opcoes];
  return (
    <div className="chips" role="group" aria-label={rotulo}>
      <span className="chips__label">{rotulo}</span>
      <div className="chips__row">
        {todas.map((op) => (
          <button
            key={op.valor || 'todos'}
            type="button"
            className={`chip ${valor === op.valor ? 'chip--ativo' : ''}`}
            aria-pressed={valor === op.valor}
            onClick={() => onChange(op.valor)}
          >
            {op.label}
          </button>
        ))}
      </div>
    </div>
  );
}
