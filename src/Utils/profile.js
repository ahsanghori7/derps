export const getUserDisplayName = (user) => {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return user?.name || user?.displayName || fullName || user?.username || user?.email || 'My Profile';
};

export const getUserInitials = (user) => {
  const name = getUserDisplayName(user);
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)[0]}` : name.slice(0, 2)).toUpperCase();
};

export const PROFILE_PICTURE_FILE_TYPE = 'user-profile-picture';

const pictureUrlFromValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = pictureUrlFromValue(item);
      if (url) return url;
    }
    return '';
  }
  if (typeof value === 'object') {
    if (typeof value.url === 'string' && value.url.trim()) return value.url.trim();
    if (typeof value.path === 'string' && value.path.trim()) return value.path.trim();
  }
  return '';
};

export const getProfilePictureUrl = (user) => {
  if (!user || typeof user !== 'object') return '';
  return pictureUrlFromValue(
    user.profilePicture
    ?? user.profilePictureUrl
    ?? user.profileImage
    ?? user.avatar
    ?? user.photo
    ?? user.image,
  );
};

export const extractUploadedProfilePicture = (result) => {
  const data = result?.data ?? result ?? {};
  const candidates = [
    data.profilePicture,
    data.userProfilePicture,
    data['user-profile-picture'],
    data.uploadedFiles,
    data.fileUrl,
    data.file,
  ];

  for (const candidate of candidates) {
    const url = pictureUrlFromValue(candidate);
    if (url) return url;
  }

  return pictureUrlFromValue(data);
};

export const isProfileImageFile = (file) => {
  if (!file) return false;
  if (String(file.type || '').startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif|svg)$/i.test(file.name || '');
};
