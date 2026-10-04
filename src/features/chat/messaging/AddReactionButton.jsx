import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { EmojiIcon, PlusIcon } from "../shared/icons";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

/**
 * Hover-reveal "react to this message" affordance, rendered beside the bubble
 * (relies on the row it's placed in to have flex-row/flex-row-reverse + `group`,
 * so it naturally lands on the inner side of the bubble for own vs. others' messages).
 */
const AddReactionButton = ({ isOwn = false, disabled = false, onPick }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);

  const closePicker = () => {
    setShowPicker(false);
    setShowFullPicker(false);
  };

  useEffect(() => {
    if (!showPicker) return undefined;
    const onMouseDown = (e) => {
      if (pickerRef.current?.contains(e.target)) return;
      if (buttonRef.current?.contains(e.target)) return;
      closePicker();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [showPicker]);

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (showPicker ? closePicker() : setShowPicker(true))}
        disabled={disabled}
        title="Add reaction"
        aria-label="Add reaction"
        className={`chat-text-muted chat-hover rounded-full p-0 leading-none transition-opacity ${
          showPicker ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
        }`}
      >
        <EmojiIcon className="w-4 h-4" />
      </button>

      {showPicker && !showFullPicker && (
        <div
          ref={pickerRef}
          role="dialog"
          aria-label="Pick a reaction"
          className={`absolute bottom-full mb-2 z-50 flex items-center gap-1 rounded-full border chat-border chat-popover shadow-lg px-2 py-1 ${
            isOwn ? "right-0" : "left-0"
          }`}
        >
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="text-lg chat-hover rounded p-1"
              onClick={() => {
                onPick(emoji);
                closePicker();
              }}
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            title="More emojis"
            aria-label="More emojis"
            className="chat-text-muted chat-hover rounded-full p-1"
            onClick={() => setShowFullPicker(true)}
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {showPicker && showFullPicker && (
        <div
          ref={pickerRef}
          role="dialog"
          aria-label="Pick a reaction"
          className={`absolute bottom-full mb-2 z-50 overflow-hidden rounded-xl border chat-border shadow-lg ${
            isOwn ? "right-0" : "left-0"
          }`}
        >
          <EmojiPicker
            className="chat-emoji-picker"
            onEmojiClick={(emojiData) => {
              onPick(emojiData.emoji);
              closePicker();
            }}
            theme={document.documentElement.classList.contains("dark") ? Theme.DARK : Theme.LIGHT}
            width={320}
            height={400}
            previewConfig={{ showPreview: false }}
            lazyLoadEmojis
          />
        </div>
      )}
    </div>
  );
};

AddReactionButton.propTypes = {
  isOwn: PropTypes.bool,
  disabled: PropTypes.bool,
  onPick: PropTypes.func.isRequired,
};

export default AddReactionButton;
