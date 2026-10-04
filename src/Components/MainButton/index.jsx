import AppButton from '../AppButton';

const MainButton = (props) => {
    const {
        onClick,
        disabled,
        className,
        title,
        width,
        height,
        color,
        fontSize,
        fontWeight,
        backgroundColor,
        type,
    } = props;

    return (
        <AppButton
            variant="plain"
            nativeType
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`shadow-md ${className || ''}`.trim()}
            title={title}
            style={{
                width,
                height,
                fontSize,
                fontWeight,
                padding: 0,
                margin: 0,
                color,
                backgroundColor,
            }}
        />
    );
};

export default MainButton;
