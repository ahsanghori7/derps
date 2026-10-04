import test from 'node:test';
import assert from 'node:assert/strict';
import { clampOffset, getCropSourceRect } from './profilePictureCrop.js';

test('crops the center of a wide photo at the default zoom', () => {
  const crop = getCropSourceRect({
    imageWidth: 2000,
    imageHeight: 1000,
    cropSize: 280,
    zoom: 1,
    offset: { x: 0, y: 0 },
  });

  assert.ok(Math.abs(crop.sourceY) < 0.001);
  assert.ok(Math.abs(crop.sourceSize - 1000) < 0.001);
  assert.ok(Math.abs(crop.sourceX - 500) < 0.001);
});

test('keeps a square photo fully inside the crop at the default zoom', () => {
  const crop = getCropSourceRect({
    imageWidth: 1000,
    imageHeight: 1000,
    cropSize: 280,
    zoom: 1,
    offset: { x: 0, y: 0 },
  });

  assert.ok(Math.abs(crop.sourceX) < 0.001);
  assert.ok(Math.abs(crop.sourceY) < 0.001);
  assert.ok(Math.abs(crop.sourceSize - 1000) < 0.001);
});

test('does not let the photo slide out of the crop frame', () => {
  assert.deepEqual(
    clampOffset({ x: 500, y: -500 }, 280, 280, 280),
    { x: 0, y: 0 },
  );
});
