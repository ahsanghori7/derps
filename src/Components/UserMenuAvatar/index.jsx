import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import { getProfilePictureUrl } from '../../Utils/profile';

const UserMenuAvatar = ({ user, size = 28 }) => {
  const url = getProfilePictureUrl(user);
  if (!url) return <AccountCircleOutlinedIcon />;

  return (
    <img
      src={url}
      alt=""
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        display: 'block',
      }}
    />
  );
};

export default UserMenuAvatar;
