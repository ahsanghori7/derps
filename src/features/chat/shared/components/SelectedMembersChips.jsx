import PropTypes from 'prop-types';
import Avatar from './Avatar';
import { CloseIcon } from '../icons';

/**
 * Renders a row of selected-user chips with an optional remove (X) button.
 *
 * @param {Array<number|string>} selectedIds Ids currently selected.
 * @param {Array} users Source list to resolve ids -> user object.
 * @param {(userId: number|string) => void} [onRemove] If provided, each chip
 *   shows an X to remove the user. If omitted the chips are read-only.
 */
const SelectedMembersChips = ({
    selectedIds,
    users,
    onRemove,
    className = '',
}) => {
    if (!selectedIds || selectedIds.length === 0) return null;

    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {selectedIds.map((userId) => {
                const user = users.find((u) => u.id === userId);
                if (!user) return null;
                return (
                    <div
                        key={userId}
                        className="flex items-center gap-2 chat-control px-3 py-1 rounded-full"
                    >
                        <Avatar id={userId} name={user.name} user={user} size="xs" />
                        <span className="text-sm chat-text">
                            {user.name}
                        </span>
                        {onRemove && (
                            <button
                                type="button"
                                onClick={() => onRemove(userId)}
                                className="chat-text-muted hover:text-gray-700 dark:hover:text-gray-300"
                                aria-label={`Remove ${user.name}`}
                            >
                                <CloseIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

SelectedMembersChips.propTypes = {
    selectedIds: PropTypes.arrayOf(
        PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    ),
    users: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            name: PropTypes.string,
        })
    ),
    onRemove: PropTypes.func,
    className: PropTypes.string,
};

export default SelectedMembersChips;
