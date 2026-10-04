import noImageAvailable from "../../assets/noImageAvailable.png";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiCheck } from "react-icons/fi";

const ProductItem = (props) => {
    const { data, addToCart, editProduct, isSelected, updateQuantity, quantityFromParent, productModal, supprtTicket } = props;
    const navigate = useNavigate();
    const [quantity, setQuantity] = useState(quantityFromParent || 1);

    const editProductPage = () => {
        navigate('/home/editItem', { state: { itemData: data } });
    };

    const handleIncrease = () => {
        const newQuantity = quantity + 1;
        setQuantity(newQuantity);
        updateQuantity(data, newQuantity);
    };

    const handleDecrease = () => {
        if (quantity > 1) {
            const newQuantity = quantity - 1;
            setQuantity(newQuantity);
            updateQuantity(data, newQuantity);
        }
    };

    const tags = data?.category?.solution
        ? [data.category.solution]
        : data?.category?.name
        ? [data.category.name]
        : [];

    const cardWidth = productModal ? 200 : supprtTicket ? 180 : 190;

    return (
        <div
            style={{
                backgroundColor: isSelected ? 'var(--dashboard-badge-bg)' : 'var(--dashboard-tab-box)',
                border: isSelected ? '2px solid var(--dashboard-tab-active)' : '1px solid var(--dashboard-box-border)',
                borderRadius: 12,
                width: cardWidth,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: isSelected
                    ? '0 0 0 3px rgba(67,121,238,0.15)'
                    : '0 1px 4px rgba(0,0,0,0.07)',
                flexShrink: 0,
            }}
        >
            <img
                src={data?.fileUrl?.[0]?.url || data?.pictureUrl?.[0]?.url || noImageAvailable}
                alt="icon"
                style={{
                    objectFit: 'cover',
                    width: '100%',
                    height: supprtTicket ? 100 : 120,
                    borderTopLeftRadius: 10,
                    borderTopRightRadius: 10,
                    display: 'block',
                }}
            />
            <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                {tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {tags.map((tag, idx) => (
                            <span
                                key={idx}
                                style={{
                                    fontSize: 11,
                                    fontWeight: 500,
                                    backgroundColor: 'var(--dashboard-badge-bg)',
                                    color: 'var(--dashboard-tab-active)',
                                    borderRadius: 4,
                                    padding: '2px 7px',
                                    border: '1px solid var(--dashboard-box-border)',
                                }}
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--sidebar-text-primary)', lineHeight: '1.3' }}>
                    {data?.name?.length > 22 ? data.name.slice(0, 22) + '...' : data?.name}
                </div>
                {!editProduct && !addToCart && (
                    <div style={{ fontSize: 12, color: 'var(--dashboard-text-secondary)', fontWeight: 500 }}>
                        Quantity: {data?.quantity ?? 'N/A'}
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--sidebar-text-primary)' }}>
                        {data?.sellingPrice || data?.price ? `$${data?.sellingPrice || data?.price}` : 'N/A'}
                    </span>
                    {addToCart && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            {isSelected && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <button
                                        onClick={handleDecrease}
                                        style={{
                                            width: 24, height: 24,
                                            borderRadius: 4,
                                            border: '1px solid var(--dashboard-box-border)',
                                            backgroundColor: 'var(--dashboard-tab-box)',
                                            color: 'var(--sidebar-text-primary)',
                                            fontWeight: 700,
                                            fontSize: 14,
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}
                                    >
                                        −
                                    </button>
                                    <span style={{ fontWeight: 700, fontSize: 13, minWidth: 16, textAlign: 'center', color: 'var(--dashboard-text-primary)' }}>{quantity}</span>
                                    <button
                                        onClick={handleIncrease}
                                        style={{
                                            width: 24, height: 24,
                                            borderRadius: 4,
                                            border: '1px solid var(--dashboard-box-border)',
                                            backgroundColor: 'var(--dashboard-tab-box)',
                                            color: 'var(--sidebar-text-primary)',
                                            fontWeight: 700,
                                            fontSize: 14,
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}
                                    >
                                        +
                                    </button>
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    if (!isSelected) setQuantity(1);
                                    addToCart(data, isSelected ? quantity : 1);
                                }}
                                style={{
                                    backgroundColor: isSelected ? 'var(--sidebar-selected-bg)' : 'transparent',
                                    color: isSelected ? 'var(--sidebar-text-selected)' : 'var(--sidebar-text-primary)',
                                    border: isSelected ? 'none' : '1px solid var(--dashboard-box-border)',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    padding: '5px 10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {isSelected && <FiCheck size={13} />}
                                {isSelected ? 'Added' : 'Add to Cart'}
                            </button>
                        </div>
                    )}
                    {editProduct && (
                        <button
                            onClick={editProductPage}
                            style={{
                                backgroundColor: 'var(--dashboard-card-bg2)',
                                color: 'var(--dashboard-text-primary)',
                                fontSize: 12,
                                fontWeight: 700,
                                borderRadius: 4,
                                cursor: 'pointer',
                                padding: '4px 8px',
                            }}
                        >
                            Edit Product
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductItem;
