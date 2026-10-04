import PropTypes from "prop-types";
import { CloseIcon, FileDocumentIcon } from "../shared/icons";

/** Confirm/cancel/schedule overlay shown after picking files to upload (paste, drag-drop, or file picker). */
const UploadConfirmOverlay = ({
  files,
  previewUrls = [],
  maxFiles,
  onClose,
  onRemoveFile,
  onSchedule,
  onSend,
}) => (
  <div
    className="absolute inset-0 z-20 flex items-center justify-center bg-blue-500/10 dark:bg-blue-400/20 border-2 border-dashed border-blue-500 dark:border-blue-400 rounded-lg m-2"
    onClick={onClose}
    role="dialog"
    aria-modal="true"
    aria-labelledby="upload-confirm-title"
  >
    <div
      className="flex flex-col chat-surface rounded-xl shadow-xl max-w-sm w-full overflow-hidden border chat-border"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4 chat-chrome-alt min-h-[120px] max-h-[320px] overflow-y-auto">
        {files.length > 1 && (
          <p className="text-xs chat-text-muted mb-3 text-center">
            {files.length} of {maxFiles} files
          </p>
        )}
        <div className={files.length > 1 ? "grid grid-cols-3 gap-2" : "flex justify-center"}>
          {files.map((file, index) => {
            const previewUrl = previewUrls[index];
            return (
              <div
                key={`${file.name}-${index}`}
                className="relative flex flex-col items-center gap-1"
              >
                <button
                  type="button"
                  onClick={() => onRemoveFile(index)}
                  className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-gray-700/80 hover:bg-gray-900 text-white flex items-center justify-center"
                  aria-label={`Remove ${file.name}`}
                >
                  <CloseIcon className="w-3 h-3" />
                </button>
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className={
                      files.length > 1
                        ? "w-full h-20 object-cover rounded"
                        : "max-h-64 w-auto object-contain rounded"
                    }
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 chat-text-muted px-2 py-3">
                    <FileDocumentIcon className="w-8 h-8 chat-text-muted" />
                    <span className="text-xs font-medium truncate max-w-[100px]">
                      {file.name}
                    </span>
                    <span className="text-[10px]">
                      {file.size >= 1024 * 1024
                        ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                        : `${(file.size / 1024).toFixed(1)} KB`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex chat-divider-t">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 chat-text-muted chat-hover font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSchedule}
          className="flex-1 py-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-medium border-l chat-divider-l"
        >
          Schedule
        </button>
        <button
          type="button"
          onClick={onSend}
          className="flex-1 py-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-semibold border-l chat-divider-l"
        >
          Send{files.length > 1 ? ` (${files.length})` : ""}
        </button>
      </div>
    </div>
  </div>
);

UploadConfirmOverlay.propTypes = {
  files: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      size: PropTypes.number,
    }),
  ).isRequired,
  previewUrls: PropTypes.arrayOf(PropTypes.string), // entries may be null for non-image files
  maxFiles: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  onRemoveFile: PropTypes.func.isRequired,
  onSchedule: PropTypes.func.isRequired,
  onSend: PropTypes.func.isRequired,
};

export default UploadConfirmOverlay;
