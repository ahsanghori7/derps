import { useEffect, useState } from 'react';
import { getProfilePictureUrl, getUserDisplayName } from '../../Utils/profile';

const UserProfileAvatar = ({ user, size = 28, className = '' }) => {
  const url = getProfilePictureUrl(user);
  const [failed, setFailed] = useState(false);
  const label = getUserDisplayName(user);
  const initial = (label && label !== 'My Profile' ? label : '?').trim().charAt(0).toUpperCase() || '?';

  useEffect(() => {
    setFailed(false);
  }, [url]);

  const frameStyle = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (url && !failed) {
    return (
      <span className={className} style={frameStyle}>
        <img
          src={url}
          alt=""
          width={size}
          height={size}
          onError={() => setFailed(true)}
          style={{
            width: '100%',
            height: '100%',
            maxWidth: 'none',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </span>
    );
  }

  return (
    <span
      className={className}
      aria-hidden
      style={{
        ...frameStyle,
        background: '#3B82F6',
        color: '#fff',
        fontSize: Math.max(10, Math.round(size * 0.42)),
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {initial}
    </span>
  );
};

export default UserProfileAvatar;
