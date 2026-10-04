import PropTypes from 'prop-types';

/**
 * Centered text used by chat modals for loading / no-results / no-data states.
 */
const EmptyState = ({ children, className = 'py-8' }) => (
    <div className={`text-center chat-text-muted ${className}`}>
        {children}
    </div>
);

EmptyState.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
};

export default EmptyState;
