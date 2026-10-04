import PropTypes from "prop-types";
import { CloseIcon, SearchIcon } from "../icons";

const SearchBar = ({
  value,
  onChange,
  placeholder = "Search",
  className = "",
  sticky = false,
}) => {
  const baseClasses = "relative";

  const stickyClasses = sticky
    ? "sticky top-0 z-10 chat-surface pb-2"
    : "";

  const hasValue = Boolean(value?.trim());

  const handleClear = () => {
    onChange?.({ target: { value: "" } });
  };

  return (
    <div className={`${baseClasses} ${stickyClasses} ${className}`}>
      <input
        type='text'
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full pl-10 py-2 border chat-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 chat-input-field chat-text ${hasValue ? "pr-10" : "pr-4"}`}
      />

      <SearchIcon className="absolute left-3 top-2.5 w-5 h-5 chat-text-subtle pointer-events-none" />

      {hasValue && (
        <button
          type='button'
          onClick={handleClear}
          className='absolute right-2 -translate-y-1/2 p-1 rounded-full chat-text-subtle chat-hover focus:outline-none focus:ring-2 focus:ring-blue-500'
          aria-label='Clear search'
          style={{ top: "40%" }}
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

SearchBar.propTypes = {
  value: PropTypes.string,

  onChange: PropTypes.func,

  placeholder: PropTypes.string,

  className: PropTypes.string,

  sticky: PropTypes.bool,
};

export default SearchBar;
