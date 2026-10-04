import AppButton from '../AppButton';

const BottonCustom = (props) => {
    const {
        onClick,
        disabled,
        className,
        title,
        backgroundColor,
        width,
        height,
        color,
        fontSize,
        fontWeight,
        mb,
        mt,
        border,
        type,
    } = props;

    return (
        <AppButton
            variant="plain"
            nativeType
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={className}
            title={title}
            style={{
                backgroundColor,
                width,
                height,
                marginTop: mt,
                color,
                fontSize,
                fontWeight,
                borderRadius: 8,
                marginBottom: mb,
                border,
            }}
        />
    );
};

export default BottonCustom;
