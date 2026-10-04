import AppButton from '../AppButton';

const BottonWithIcon = (props) => {
    const {
        onClick,
        disabled,
        style,
        className,
        title,
        icon,
        svg,
        backgroundColor,
        width,
        height,
        color,
        fontSize,
        fontWeight,
        border,
        borderRadius,
        iconSize,
        type,
    } = props;

    const iconNode = (icon || svg) ? (
        <>
            {icon ? (
                <img
                    src={icon}
                    alt=""
                    className={`${iconSize ? iconSize : 'w-4 h-4'} mr-1 sm:mr-3`}
                />
            ) : null}
            {svg || null}
        </>
    ) : null;

    return (
        <AppButton
            variant="plain"
            nativeType
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`mb-2 mx-2 gap-0 ${className || ''}`.trim()}
            title={title}
            icon={iconNode}
            style={{
                backgroundColor,
                width,
                height,
                color,
                fontSize,
                fontWeight,
                border,
                borderRadius,
                ...style,
            }}
        />
    );
};

export default BottonWithIcon;
