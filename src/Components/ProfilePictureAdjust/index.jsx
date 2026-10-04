import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import { getCropSourceRect } from '../../Utils/profilePictureCrop';
import { prepareImageForPreview } from '../../Utils/heicConvert';

const CROP_SIZE = 280;
const OUTPUT_SIZE = 512;

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Unable to read this image.'));
  image.src = src;
});

const ProfilePictureAdjust = ({ file, open, onCancel, onConfirm }) => {
  const previewUrlRef = useRef('');
  const dragRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageSize, setImageSize] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !file) return undefined;

    let cancelled = false;
    setPreparing(true);
    setError('');
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setImageSize(null);

    prepareImageForPreview(file)
      .then(async (prepared) => {
        if (cancelled || !prepared?.previewUrl) {
          if (prepared?.previewUrl) URL.revokeObjectURL(prepared.previewUrl);
          return;
        }
        const image = await loadImage(prepared.previewUrl);
        if (cancelled) {
          URL.revokeObjectURL(prepared.previewUrl);
          return;
        }
        previewUrlRef.current = prepared.previewUrl;
        setPreviewUrl(prepared.previewUrl);
        setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError?.message || 'Unable to read this image.');
      })
      .finally(() => {
        if (!cancelled) setPreparing(false);
      });

    return () => {
      cancelled = true;
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = '';
      }
    };
  }, [file, open]);

  const crop = imageSize
    ? getCropSourceRect({
      imageWidth: imageSize.width,
      imageHeight: imageSize.height,
      cropSize: CROP_SIZE,
      zoom,
      offset,
    })
    : null;

  const updateOffset = (next) => {
    if (!imageSize) return;
    const framed = getCropSourceRect({
      imageWidth: imageSize.width,
      imageHeight: imageSize.height,
      cropSize: CROP_SIZE,
      zoom,
      offset: next,
    });
    setOffset(framed.offset);
  };

  const handlePointerDown = (event) => {
    if (!crop) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      offset,
    };
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current) return;
    updateOffset({
      x: dragRef.current.offset.x + (event.clientX - dragRef.current.x),
      y: dragRef.current.offset.y + (event.clientY - dragRef.current.y),
    });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleZoom = (_, value) => {
    const nextZoom = Array.isArray(value) ? value[0] : value;
    setZoom(nextZoom);
    if (!imageSize) return;
    const framed = getCropSourceRect({
      imageWidth: imageSize.width,
      imageHeight: imageSize.height,
      cropSize: CROP_SIZE,
      zoom: nextZoom,
      offset,
    });
    setOffset(framed.offset);
  };

  const handleConfirm = async () => {
    if (!previewUrl || !crop) return;
    setSaving(true);
    setError('');
    try {
      const image = await loadImage(previewUrl);
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext('2d');
      context.drawImage(
        image,
        crop.sourceX,
        crop.sourceY,
        crop.sourceSize,
        crop.sourceSize,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error('Unable to prepare this photo.'));
        }, 'image/jpeg', 0.92);
      });
      onConfirm(new File([blob], 'profile-picture.jpg', { type: 'image/jpeg' }));
    } catch (requestError) {
      setError(requestError?.message || 'Unable to prepare this photo.');
    } finally {
      setSaving(false);
    }
  };

  const left = crop ? (CROP_SIZE - crop.displayWidth) / 2 + crop.offset.x : 0;
  const top = crop ? (CROP_SIZE - crop.displayHeight) / 2 + crop.offset.y : 0;

  return (
    <Dialog open={open} onClose={() => { if (!saving) onCancel(); }} fullWidth maxWidth="xs">
      <DialogTitle>Adjust photo</DialogTitle>
      <DialogContent>
        <Stack alignItems="center" gap={2} pt={1}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Drag the photo to reposition it. Use the slider if the image is too large.
          </Typography>
          <Box
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            sx={{
              width: CROP_SIZE,
              height: CROP_SIZE,
              borderRadius: '50%',
              overflow: 'hidden',
              position: 'relative',
              bgcolor: '#111827',
              cursor: crop ? 'grab' : 'default',
              touchAction: 'none',
              boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.7)',
            }}
          >
            {previewUrl && crop && (
              <Box
                component="img"
                src={previewUrl}
                alt=""
                draggable={false}
                sx={{
                  position: 'absolute',
                  width: `${crop.displayWidth}px`,
                  height: `${crop.displayHeight}px !important`,
                  left,
                  top,
                  maxWidth: 'none',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              />
            )}
          </Box>
          <Box sx={{ width: '100%', px: 1 }}>
            <Typography variant="caption" color="text.secondary">Zoom</Typography>
            <Slider
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={handleZoom}
              disabled={!crop || saving}
              aria-label="Zoom"
            />
          </Box>
          {preparing && (
            <Typography variant="body2" color="text.secondary">Loading photo...</Typography>
          )}
          {error && (
            <Typography variant="body2" color="error">{error}</Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={!crop || preparing || saving}>
          {saving ? 'Saving...' : 'Use photo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfilePictureAdjust;
