import Icon from './Icon.jsx';

export default function SearchBar({ valor, onChange, placeholder = 'Buscar por nome, bairro ou construtora' }) {
  return (
    <label className="search">
      <Icon name="search" className="search__icon" />
      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Buscar empreendimentos"
      />
      {valor && (
        <button type="button" className="search__clear" onClick={() => onChange('')} aria-label="Limpar busca">
          <Icon name="close" size={18} />
        </button>
      )}
    </label>
  );
}
