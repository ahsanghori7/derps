import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractUploadedProfilePicture,
  getProfilePictureUrl,
  getUserDisplayName,
  getUserInitials,
  isProfileImageFile,
} from './profile.js';

test('uses the best available user display name', () => {
  assert.equal(getUserDisplayName({ name: 'Ada Lovelace', username: 'ada' }), 'Ada Lovelace');
  assert.equal(getUserDisplayName({ firstName: 'Grace', lastName: 'Hopper' }), 'Grace Hopper');
  assert.equal(getUserDisplayName({ username: 'operator' }), 'operator');
  assert.equal(getUserInitials({ name: 'Ada Lovelace' }), 'AL');
});

test('reads profile picture urls from user and upload payloads', () => {
  assert.equal(getProfilePictureUrl({ profilePicture: 'https://cdn.example/a.png' }), 'https://cdn.example/a.png');
  assert.equal(getProfilePictureUrl({ profilePicture: { url: 'https://cdn.example/b.png' } }), 'https://cdn.example/b.png');
  assert.equal(getProfilePictureUrl({ profilePicture: null }), '');
  assert.equal(getProfilePictureUrl({ profileImage: 'https://cdn.example/e.png' }), 'https://cdn.example/e.png');
  assert.equal(extractUploadedProfilePicture({
    data: { profilePicture: { url: 'https://cdn.example/c.png' } },
  }), 'https://cdn.example/c.png');
  assert.equal(extractUploadedProfilePicture({
    data: { fileUrl: { url: 'https://cdn.example/d.png' } },
  }), 'https://cdn.example/d.png');
  assert.equal(isProfileImageFile({ type: 'image/png', name: 'photo.png' }), true);
  assert.equal(isProfileImageFile({ type: 'application/pdf', name: 'notes.pdf' }), false);
});
