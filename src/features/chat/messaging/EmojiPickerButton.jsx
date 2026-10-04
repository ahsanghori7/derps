import { useState, useRef } from "react";
import PropTypes from "prop-types";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useClickOutside } from "../shared/hooks";
import { EmojiIcon } from "../shared/icons";

/** Composer "insert emoji into text" button + full emoji-picker-react popover. */
const EmojiPickerButton = ({ onEmojiClick, disabled = false }) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);

  useClickOutside([pickerRef, buttonRef], () => setShowPicker(false), {
    active: showPicker,
  });

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setShowPicker((v) => !v)}
        className="p-2 chat-hover rounded-full transition-colors"
        disabled={disabled}
        aria-label="Add emoji"
        title="Add emoji"
      >
        <EmojiIcon className="w-5 h-5 chat-text-muted" />
      </button>

      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute bottom-full left-0 mb-2 z-50 overflow-hidden rounded-xl border chat-border shadow-lg"
          role="dialog"
          aria-label="Emoji picker"
        >
          <EmojiPicker
            className="chat-emoji-picker"
            onEmojiClick={(emojiData) => {
              onEmojiClick(emojiData.emoji);
              setShowPicker(false);
            }}
            theme={
              document.documentElement.classList.contains("dark")
                ? Theme.DARK
                : Theme.LIGHT
            }
            width={320}
            height={400}
            previewConfig={{ showPreview: false }}
            lazyLoadEmojis
            style={{
              "--epr-picker-border-radius": "0px",
            }}
          />
        </div>
      )}
    </div>
  );
};

EmojiPickerButton.propTypes = {
  onEmojiClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default EmojiPickerButton;
