const SearchIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
    </svg>
);

const ListSearchField = ({
    value,
    onChange,
    onEnter,
    placeholder = 'Search...',
    layout = 'block',
    className = '',
}) => {
    const layoutClass = layout === 'inline' ? 'list-search-field--inline' : 'list-search-field--block';

    return (
        <div className={`list-search-field ${layoutClass} ${className}`.trim()}>
            <SearchIcon size={layout === 'inline' ? 16 : 18} />
            <input
                type="text"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    onEnter?.();
                }}
            />
        </div>
    );
};

export default ListSearchField;
