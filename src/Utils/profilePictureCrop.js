export const getCoverScale = (imageWidth, imageHeight, cropSize) => {
  if (!imageWidth || !imageHeight || !cropSize) return 1;
  return Math.max(cropSize / imageWidth, cropSize / imageHeight);
};

const clampAxis = (value, max) => {
  const next = Math.min(max, Math.max(-max, value || 0));
  return next === 0 ? 0 : next;
};

export const clampOffset = (offset, displayWidth, displayHeight, cropSize) => {
  const maxX = Math.max(0, (displayWidth - cropSize) / 2);
  const maxY = Math.max(0, (displayHeight - cropSize) / 2);
  return {
    x: clampAxis(offset?.x, maxX),
    y: clampAxis(offset?.y, maxY),
  };
};

export const getCropSourceRect = ({
  imageWidth,
  imageHeight,
  cropSize,
  zoom = 1,
  offset = { x: 0, y: 0 },
}) => {
  const safeZoom = Math.max(zoom || 1, 1);
  const scale = getCoverScale(imageWidth, imageHeight, cropSize) * safeZoom;
  const displayWidth = imageWidth * scale;
  const displayHeight = imageHeight * scale;
  const clamped = clampOffset(offset, displayWidth, displayHeight, cropSize);
  const sourceSize = cropSize / scale;

  return {
    sourceX: ((displayWidth - cropSize) / 2 - clamped.x) / scale,
    sourceY: ((displayHeight - cropSize) / 2 - clamped.y) / scale,
    sourceSize,
    scale,
    displayWidth,
    displayHeight,
    offset: clamped,
  };
};
