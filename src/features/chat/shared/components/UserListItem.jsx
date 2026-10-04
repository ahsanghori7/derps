import PropTypes from 'prop-types';
import Avatar from './Avatar';
import { CheckIcon } from '../icons';

/**
 * A reusable row for rendering a user inside a list.
 *
 * Use the `variant` prop to switch between:
 *  - "default"     : avatar + name/email, no trailing affordance
 *  - "selectable"  : adds a square checkbox indicator driven by `selected`
 *  - "custom"      : caller supplies trailing UI via `trailing`
 */
const UserListItem = ({
    user,
    onClick,
    selected = false,
    variant = 'default',
    trailing,
    avatarSize = 'md',
    nameClassName = 'font-medium chat-text',
    emailClassName = 'text-sm chat-text-muted',
    containerClassName = '',
}) => {
    if (!user) return null;

    const rowClasses =
        'flex items-center justify-between p-3 chat-hover rounded-lg cursor-pointer transition-colors';

    return (
        <div
            onClick={() => onClick?.(user)}
            className={`${rowClasses} ${containerClassName}`}
        >
            <div className="flex items-center gap-3 min-w-0">
                <Avatar id={user.id} name={user.name} user={user} size={avatarSize} />
                <div className="min-w-0">
                    <p className={`${nameClassName} truncate`}>{user.name}</p>
                    {user.email && (
                        <p className={`${emailClassName} truncate`}>{user.email}</p>
                    )}
                </div>
            </div>

            {variant === 'selectable' && (
                <div
                    className={`w-5 h-5 border-2 rounded ${
                        selected
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                    } flex items-center justify-center`}
                >
                    {selected && <CheckIcon className="w-3 h-3 text-white" />}
                </div>
            )}

            {variant === 'custom' && trailing}
        </div>
    );
};

UserListItem.propTypes = {
    user: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        name: PropTypes.string,
        email: PropTypes.string,
    }),
    onClick: PropTypes.func,
    selected: PropTypes.bool,
    variant: PropTypes.oneOf(['default', 'selectable', 'custom']),
    trailing: PropTypes.node,
    avatarSize: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
    nameClassName: PropTypes.string,
    emailClassName: PropTypes.string,
    containerClassName: PropTypes.string,
};

export default UserListItem;
