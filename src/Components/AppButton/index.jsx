const VARIANT_CLASS = {
    primary: 'chrome-btn chrome-btn--primary',
    secondary: 'chrome-btn chrome-btn--secondary',
    danger: 'chrome-btn chrome-btn--danger',
    plain: 'chrome-btn',
};

const AppButton = ({
    variant = 'primary',
    title,
    children,
    icon,
    onClick,
    disabled,
    type,
    nativeType = false,
    className = '',
    style,
}) => {
    const iconNode = !icon
        ? null
        : typeof icon === 'string'
            ? <img src={icon} alt="" className="w-4 h-4" />
            : icon;

    const buttonType = type != null ? type : (nativeType ? undefined : 'button');

    return (
        <button
            type={buttonType}
            onClick={onClick}
            disabled={disabled}
            className={`${VARIANT_CLASS[variant] || VARIANT_CLASS.primary} ${className}`.trim()}
            style={style}
        >
            {iconNode}
            {title || children}
        </button>
    );
};

export default AppButton;
