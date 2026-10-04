const Heading = (props) => {
    const {
        Stylefont,
        Fontweight,
        Fontsize,
        txtAlign,
        ml,
        mt,
        p,
        lh,
        Heading,
        mx,
        color,
        as,
        onClick,
        backgroundColor,
        borderRadius,
        aI,
        width,
        mv,
        mb,
        ls,
        fontfamily,
        required = false,
        className, // add this to accept className prop
    } = props;

    return (
        <>
            <p className={`${className}`} style={{ fontFamily: 'Nunito', fontSize: Fontsize, color: color, fontWeight: Fontweight, marginLeft: ml, marginTop: mt, textAlign: txtAlign, marginBottom: mb, width: width, backgroundColor: backgroundColor, borderRadius: borderRadius }} onClick={onClick}>
                {Heading}{" "}
                {required && <span style={{ color: "red", fontSize: "14px", lineHeight: "0" }}>*</span>}
            </p>
        </>
    );
};

export default Heading;
