import { forwardRef } from "react";
import PropTypes from "prop-types";
import { CloseIcon, SearchIcon } from "../shared/icons";

/** Search-messages input bar shown under the header when search mode is open. */
const MessageSearchBar = forwardRef(
  (
    {
      searchKeyword,
      onSearchKeywordChange,
      onSearch,
      onClearSearch,
      searchLoading = false,
      searchError = "",
      isShowingSearchContext = false,
      onResetSearchContext,
    },
    ref,
  ) => (
    <div className="px-4 py-3 chat-divider-b chat-chrome-alt">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border chat-border-strong chat-surface">
          <SearchIcon className="w-4 h-4 chat-text-muted" />
          <input
            ref={ref}
            value={searchKeyword}
            onChange={(e) => onSearchKeywordChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSearch();
              }
            }}
            placeholder="Search messages"
            className="w-full bg-transparent text-sm chat-text placeholder:text-[var(--chat-input-placeholder)] focus:outline-none"
          />
          {searchKeyword && (
            <button
              type="button"
              className="chat-text-muted hover:text-gray-700 dark:hover:text-gray-200"
              onClick={onClearSearch}
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="button" 
          onClick={onSearch}
          disabled={!searchKeyword.trim() || searchLoading}
          className="px-3 py-2 text-sm rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed chat-call-btn-primary"
        >
          {searchLoading ? "Searching..." : "Search"}
        </button>
      </div>
      {searchError && (
        <p className="mt-2 text-xs text-red-500 dark:text-red-400">{searchError}</p>
      )}
      {isShowingSearchContext && (
        <div className="mt-2 text-xs text-blue-600 dark:text-blue-300 flex items-center justify-between gap-2">
          <span>
            Showing context around searched message
          </span>
          <button
            type="button"
            onClick={onResetSearchContext}
            className="underline hover:opacity-80"
          >
            Back to normal chat
          </button>
        </div>
      )}
    </div>
  ),
);

MessageSearchBar.displayName = "MessageSearchBar";

MessageSearchBar.propTypes = {
  searchKeyword: PropTypes.string.isRequired,
  onSearchKeywordChange: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  onClearSearch: PropTypes.func.isRequired,
  searchLoading: PropTypes.bool,
  searchError: PropTypes.string,
  isShowingSearchContext: PropTypes.bool,
  onResetSearchContext: PropTypes.func.isRequired,
};

export default MessageSearchBar;
