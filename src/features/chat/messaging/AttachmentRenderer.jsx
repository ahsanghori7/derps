import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import { getAttachmentUrl } from "../api/chatApi";
import { getErrorMessage } from "@utils/errorHandler";
import { FileDocumentIcon } from "../shared/icons";
import {
  registerMediaPlaying,
  unregisterMediaElement,
} from "../shared/utils/mediaPlaybackManager";

const AttachmentRenderer = ({ attachment, token, onImageClick }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const mediaRef = useRef(null);

  useEffect(() => {
    const mediaElement = mediaRef.current;
    return () => unregisterMediaElement(mediaElement);
  }, []);

  const isImage = attachment.mimeType?.startsWith("image/");
  const isVideo = attachment.mimeType?.startsWith("video/");
  const isAudio = attachment.mimeType?.startsWith("audio/");
  const fallbackUrl = getAttachmentUrl(
    attachment.filePath || attachment.fileName,
  );
  const mediaUrl = attachment.url || fallbackUrl;

  const downloadFile = async (e) => {
    if (attachment.url) return;

    e.preventDefault();
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(fallbackUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = attachment.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Error downloading file. Please check your internet connection and try again."));
    } finally {
      setIsDownloading(false);
    }
  };

  if (isImage) {
    return (
      <div className="mb-2">
        <button
          type="button"
          onClick={() => onImageClick?.(mediaUrl)}
          className="block w-full text-left rounded overflow-hidden cursor-zoom-in hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          aria-label="View image full screen"
        >
          <img
            src={mediaUrl}
            alt={attachment.fileName}
            className="max-w-full h-auto rounded block"
            style={{ maxHeight: "300px" }}
            draggable={false}
          />
        </button>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="mb-2 rounded overflow-hidden bg-black">
        <video
          ref={mediaRef}
          src={mediaUrl}
          controls
          playsInline
          preload="metadata"
          className="max-w-full max-h-[300px] w-auto block"
          style={{ maxHeight: "300px" }}
          onPlay={(e) => registerMediaPlaying(e.currentTarget)}
          onError={(e) => {
            toast.error(getErrorMessage(e, "Please check your internet connection and try again."));
          }}
        >
          <track kind="captions" />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className="mb-2 rounded chat-control w-[300px] md:w-[400px]">
        <audio
          ref={mediaRef}
          src={mediaUrl}
          controls
          preload="metadata"
          className="w-full"
          onPlay={(e) => registerMediaPlaying(e.currentTarget)}
          onError={(e) => toast.error(getErrorMessage(e, "Please check your internet connection and try again."))}
        >
          <track kind="captions" />
          Your browser does not support the audio element.
        </audio>
      </div>
    );
  }

  return (
    <div className="chat-control p-3 rounded flex items-center gap-2">
      <FileDocumentIcon className="w-6 h-6 chat-text-muted" />
      <div className="flex-1">
        <p className="text-sm font-medium chat-text-muted">
          {attachment.fileName}
        </p>
        <p className="text-xs chat-text-muted">
          {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>
      <a
        href={mediaUrl}
        download={attachment.fileName}
        target="_blank"
        rel="noopener noreferrer"
        className="chat-accent-muted chat-accent"
        onClick={downloadFile}
      >
        {isDownloading ? "Downloading..." : "Download"}
      </a>
    </div>
  );
};

AttachmentRenderer.propTypes = {
  attachment: PropTypes.shape({
    mimeType: PropTypes.string,
    fileName: PropTypes.string,
    filePath: PropTypes.string,
    fileSize: PropTypes.number,
    url: PropTypes.string,
  }).isRequired,
  token: PropTypes.string,
  onImageClick: PropTypes.func,
};

export default AttachmentRenderer;
