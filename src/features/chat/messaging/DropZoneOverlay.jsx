import { UploadCloudIcon } from "../shared/icons";

/** Full-bleed "drop files here" overlay shown while dragging a file over the chat window. */
const DropZoneOverlay = () => (
  <div
    className="absolute inset-0 z-20 flex items-center justify-center bg-blue-500/10 dark:bg-blue-400/20 border-2 border-dashed border-blue-500 dark:border-blue-400 rounded-lg m-2 pointer-events-none"
    aria-hidden
  >
    <div className="flex flex-col items-center gap-2 px-6 py-4 chat-overlay-surface rounded-xl shadow-lg">
      <UploadCloudIcon className="w-12 h-12 chat-accent-muted" />
      <span className="text-sm font-medium chat-text-secondary">
        Drop images or files here
      </span>
    </div>
  </div>
);

export default DropZoneOverlay;
