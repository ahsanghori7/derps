// Platform-aware modifier label for keyboard-shortcut tooltips.
const IS_MAC =
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad|ipod/i.test(navigator.platform || "");
export const MOD_LABEL = IS_MAC ? "⌘" : "Ctrl";

/**
 * Apply markdown-style formatting to a textarea's current selection.
 * Pure helper; the React layer wires it to a specific textarea + state setter.
 *   - bold           => **text**          (Mod+B)
 *   - italic         => _text_            (Mod+I)
 *   - strikethrough  => ~~text~~          (Mod+Shift+X)
 *   - code           => `text`            (Mod+E)
 *   - numbered       => prefix lines      (Mod+Shift+7)
 *   - bullet         => prefix lines      (Mod+Shift+8)
 *   - quote          => prefix lines      (Mod+Shift+9)
 * If nothing is selected, inline marks are inserted around the caret;
 * block marks are applied to the line(s) the caret/selection touches.
 */
export const formatTextInTextarea = ({ textarea, value, setValue, onSelectionChange }, type) => {
  if (!textarea) return;
  const start = typeof textarea.selectionStart === "number" ? textarea.selectionStart : 0;
  const end = typeof textarea.selectionEnd === "number" ? textarea.selectionEnd : start;
  const source = String(value || "");

  const INLINE_MARKS = { bold: "**", italic: "_", strikethrough: "~~", code: "`" };

  if (INLINE_MARKS[type]) {
    const mark = INLINE_MARKS[type];
    const selected = source.slice(start, end);
    const wrapped = `${mark}${selected}${mark}`;
    const next = source.slice(0, start) + wrapped + source.slice(end);
    setValue(next);

    requestAnimationFrame(() => {
      try {
        textarea.focus();
        const newStart = start + mark.length;
        const newEnd = selected ? newStart + selected.length : newStart;
        textarea.setSelectionRange(newStart, newEnd);
        if (onSelectionChange) {
          onSelectionChange(newEnd > newStart ? { start: newStart, end: newEnd } : null);
        }
      } catch (_) {
        // ignore
      }
    });
    return;
  }

  if (type === "numbered" || type === "bullet" || type === "quote") {
    let blockStart = start;
    while (blockStart > 0 && source[blockStart - 1] !== "\n") blockStart--;
    let blockEnd = end;
    while (blockEnd < source.length && source[blockEnd] !== "\n") blockEnd++;

    const lines = source.slice(blockStart, blockEnd).split("\n");
    let transformed;
    if (type === "numbered") transformed = lines.map((l, i) => `${i + 1}. ${l}`).join("\n");
    else if (type === "bullet") transformed = lines.map((l) => `- ${l}`).join("\n");
    else transformed = lines.map((l) => `> ${l}`).join("\n");

    const next = source.slice(0, blockStart) + transformed + source.slice(blockEnd);
    setValue(next);

    requestAnimationFrame(() => {
      try {
        textarea.focus();
        const newStart = blockStart;
        const newEnd = blockStart + transformed.length;
        textarea.setSelectionRange(newStart, newEnd);
        if (onSelectionChange) {
          onSelectionChange(newEnd > newStart ? { start: newStart, end: newEnd } : null);
        }
      } catch (_) {
        // ignore
      }
    });
  }
};

/**
 * Handler factory for the textarea `onKeyDown` that dispatches formatting
 * shortcuts (Mod+B/I/E/Shift+X/Shift+7/8/9). Returns true if a shortcut
 * fired so the caller can early-return.
 */
export const handleFormatShortcut = (e, applyFn) => {
  const isMod = e.ctrlKey || e.metaKey;
  if (!isMod || e.altKey || e.isComposing) return false;
  const k = (e.key || "").toLowerCase();
  if (!e.shiftKey) {
    if (k === "b") { e.preventDefault(); applyFn("bold"); return true; }
    if (k === "i") { e.preventDefault(); applyFn("italic"); return true; }
    if (k === "e") { e.preventDefault(); applyFn("code"); return true; }
  } else {
    if (k === "x") { e.preventDefault(); applyFn("strikethrough"); return true; }
    if (e.code === "Digit7") { e.preventDefault(); applyFn("numbered"); return true; }
    if (e.code === "Digit8") { e.preventDefault(); applyFn("bullet"); return true; }
    if (e.code === "Digit9") { e.preventDefault(); applyFn("quote"); return true; }
  }
  return false;
};
