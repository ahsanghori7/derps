import PropTypes from 'prop-types';

/**
 * Pill-style on/off switch used across chat surfaces (e.g. mute toggles).
 * Plain Tailwind, not MUI, to stay consistent with the chat module's
 * bespoke `chat-*` theme classes rather than pulling in MUI's own styling.
 */
const ToggleSwitch = ({ checked, onChange, disabled = false, ariaLabel }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
    >
        <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                checked ? 'translate-x-6' : 'translate-x-1'
            }`}
        />
    </button>
);

ToggleSwitch.propTypes = {
    checked: PropTypes.bool,
    onChange: PropTypes.func,
    disabled: PropTypes.bool,
    ariaLabel: PropTypes.string,
};

export default ToggleSwitch;
