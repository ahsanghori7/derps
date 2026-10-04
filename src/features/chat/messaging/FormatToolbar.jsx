import PropTypes from "prop-types";
import { MOD_LABEL } from "../shared/utils/textFormatting";
import {
  BulletListIcon,
  FormatCodeIcon,
  NumberedListIcon,
} from "../shared/icons";

/** Reusable inline formatting toolbar (B / I / S / <> / 1. / - / 99). */
const FormatToolbar = ({ onFormat }) => (
  <div
    className="inline-flex items-center gap-0.5 rounded-full border chat-border chat-surface shadow-lg px-2 py-1"
    onMouseDown={(e) => {
      // Prevent textarea from losing focus / selection when clicking the toolbar.
      e.preventDefault();
    }}
  >
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onFormat("bold"); }}
      className="px-2 py-1 rounded-full chat-hover chat-text-secondary font-bold text-sm transition-colors focus:outline-none"
      title={`Bold (${MOD_LABEL}+B)`}
      aria-label="Bold"
    >
      B
    </button>
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onFormat("italic"); }}
      className="px-2 py-1 rounded-full chat-hover chat-text-secondary italic text-sm transition-colors focus:outline-none"
      title={`Italic (${MOD_LABEL}+I)`}
      aria-label="Italic"
    >
      i
    </button>
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onFormat("strikethrough"); }}
      className="px-2 py-1 rounded-full chat-hover chat-text-secondary text-sm transition-colors focus:outline-none"
      title={`Strikethrough (${MOD_LABEL}+Shift+X)`}
      aria-label="Strikethrough"
    >
      <span style={{ textDecoration: "line-through" }}>S</span>
    </button>
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onFormat("code"); }}
      className="px-2 py-1 rounded-full chat-hover chat-text-secondary text-sm transition-colors focus:outline-none"
      title={`Inline code (${MOD_LABEL}+E)`}
      aria-label="Inline code"
    >
      <FormatCodeIcon />
    </button>
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onFormat("numbered"); }}
      className="px-2 py-1 rounded-full chat-hover chat-text-secondary text-sm transition-colors focus:outline-none"
      title={`Numbered list (${MOD_LABEL}+Shift+7)`}
      aria-label="Numbered list"
    >
      <NumberedListIcon />
    </button>
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onFormat("bullet"); }}
      className="px-2 py-1 rounded-full chat-hover chat-text-secondary text-sm transition-colors focus:outline-none"
      title={`Bullet list (${MOD_LABEL}+Shift+8)`}
      aria-label="Bullet list"
    >
      <BulletListIcon />
    </button>
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onFormat("quote"); }}
      className="px-2 py-1 rounded-full chat-hover chat-text-secondary font-semibold text-xs transition-colors focus:outline-none"
      title={`Quote (${MOD_LABEL}+Shift+9)`}
      aria-label="Quote"
    >
      99
    </button>
  </div>
);
FormatToolbar.propTypes = {
  onFormat: PropTypes.func.isRequired,
};

export default FormatToolbar;
