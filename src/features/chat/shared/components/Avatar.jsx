import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { getAvatarColor, getInitial } from '../utils/chatUtility';
import { getProfilePictureUrl } from '../../../../Utils/profile';

const SIZE_MAP = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
};

const Avatar = ({
    id,
    name,
    size = 'md',
    fallback = 'U',
    className = '',
    title,
    src,
    user,
}) => {
    const imageUrl = src || getProfilePictureUrl(user);
    const [failed, setFailed] = useState(false);
    const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;

    useEffect(() => {
        setFailed(false);
    }, [imageUrl]);

    if (imageUrl && !failed) {
        return (
            <img
                src={imageUrl}
                alt=""
                title={title || name}
                onError={() => setFailed(true)}
                className={`flex-shrink-0 rounded-full object-cover ${sizeClasses} ${className}`}
            />
        );
    }

    return (
        <div
            className={`flex-shrink-0 rounded-full ${getAvatarColor(id)} ${sizeClasses} flex items-center justify-center text-white font-semibold ${className}`}
            title={title}
        >
            {getInitial(name, fallback)}
        </div>
    );
};

Avatar.propTypes = {
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
    fallback: PropTypes.string,
    className: PropTypes.string,
    title: PropTypes.string,
    src: PropTypes.string,
    user: PropTypes.object,
};

export default Avatar;
