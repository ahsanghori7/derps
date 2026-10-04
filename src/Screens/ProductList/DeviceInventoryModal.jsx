import { useEffect, useMemo, useState } from "react";
import { HiSearch } from "react-icons/hi";
import ProductItem from "../../Components/ProductItem";
import BottonCustom from "../../Components/ButtonCustom";
import NoDataFound from "../../Components/NoDataFound";

const DeviceInventoryModal = ({
    isOpen,
    onClose,
    items = [],
    serviceOptions = [],
    selectedProductIds = [],
    selectedHardwares = [],
    getItemServiceId,
    getActiveHardware,
    onAddToCart,
    onUpdateQuantity,
    serviceLabel,
}) => {
    const [searchText, setSearchText] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");

    useEffect(() => {
        if (!isOpen) return;
        setSearchText("");
        setCategoryFilter("");
    }, [isOpen]);

    const categoryFilters = useMemo(() => {
        const options = (serviceOptions || []).map((option) => ({
            value: option.value,
            label: option.text || option.value,
        }));
        const hasUncategorized = (items || []).some((item) => !item?.category);
        if (hasUncategorized) {
            options.push({ value: "uncategorized", label: "Uncategorized" });
        }
        return options;
    }, [serviceOptions, items]);

    const filteredItems = useMemo(() => {
        const query = searchText.trim().toLowerCase();
        return (items || [])
            .filter((item) => {
                const matchesSearch = (item.name || "").toLowerCase().includes(query);
                if (!matchesSearch) return false;
                if (!categoryFilter) return true;
                if (categoryFilter === "uncategorized") return !item?.category;
                return (item?.category?.solution || "").toLowerCase() === categoryFilter.toLowerCase();
            })
            .sort((a, b) => {
                if (Boolean(a.inStock) === Boolean(b.inStock)) return 0;
                return a.inStock ? -1 : 1;
            });
    }, [items, searchText, categoryFilter]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-[2100] px-3"
            onClick={onClose}
        >
            <div
                className="w-full max-w-5xl relative max-h-[90vh] overflow-hidden flex flex-col"
                style={{
                    backgroundColor: "var(--dashboard-card-bg)",
                    borderRadius: 14,
                    boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
                }}
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-3 right-4 text-2xl"
                    style={{ color: "var(--sidebar-text-primary)" }}
                    aria-label="Close device inventory"
                >
                    ×
                </button>

                <div className="px-5 pt-5 pb-3 pr-12">
                    <h2
                        style={{
                            fontWeight: 700,
                            fontSize: 24,
                            color: "var(--sidebar-text-primary)",
                            marginBottom: 4,
                        }}
                    >
                        Device Inventory
                    </h2>
                    <p
                        style={{
                            fontWeight: 400,
                            fontSize: 14,
                            color: "var(--dashboard-text-secondary)",
                            fontFamily: "Nunito",
                            margin: 0,
                            lineHeight: 1.45,
                        }}
                    >
                        Browse all available devices
                        {serviceLabel ? ` and add them to ${serviceLabel}` : ""}.
                    </p>
                </div>

                <div className="px-5 pb-3">
                    <div
                        style={{
                            borderRadius: 8,
                            backgroundColor: "var(--dashboard-tab-box)",
                            height: 40,
                            borderColor: "var(--dashboard-border)",
                            borderWidth: 1,
                        }}
                        className="w-full max-w-xl relative gap-2 items-center rounded-full flex"
                    >
                        <HiSearch className="text-[22px] text-dashboard-card-text-primary-light dark:text-dashboard-card-text-primary-dark ml-3" />
                        <input
                            type="text"
                            placeholder="Search by Name"
                            className="bg-transparent outline-none text-[14px] p-1 notranslate flex-1"
                            style={{ color: "var(--dashboard-text-primary)" }}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                        <button
                            type="button"
                            onClick={() => setCategoryFilter("")}
                            style={{
                                borderRadius: 999,
                                padding: "6px 12px",
                                fontSize: 13,
                                fontWeight: 600,
                                fontFamily: "Nunito",
                                cursor: "pointer",
                                border: categoryFilter === ""
                                    ? "1px solid var(--dashboard-tab-active)"
                                    : "1px solid var(--dashboard-border)",
                                backgroundColor: categoryFilter === ""
                                    ? "var(--sidebar-selected-bg)"
                                    : "var(--dashboard-tab-box)",
                                color: categoryFilter === ""
                                    ? "var(--sidebar-text-selected)"
                                    : "var(--dashboard-text-primary)",
                            }}
                        >
                            All Devices
                        </button>
                        {categoryFilters.map((option) => {
                            const isActive = categoryFilter === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setCategoryFilter(option.value)}
                                    style={{
                                        borderRadius: 999,
                                        padding: "6px 12px",
                                        fontSize: 13,
                                        fontWeight: 600,
                                        fontFamily: "Nunito",
                                        cursor: "pointer",
                                        border: isActive
                                            ? "1px solid var(--dashboard-tab-active)"
                                            : "1px solid var(--dashboard-border)",
                                        backgroundColor: isActive
                                            ? "var(--sidebar-selected-bg)"
                                            : "var(--dashboard-tab-box)",
                                        color: isActive
                                            ? "var(--sidebar-text-selected)"
                                            : "var(--dashboard-text-primary)",
                                    }}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="px-5 pb-2 overflow-y-auto flex-1">
                    {filteredItems.length === 0 ? (
                        <NoDataFound title="No Data Found" description="No devices found in inventory." />
                    ) : (
                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 16,
                                paddingBottom: 12,
                            }}
                        >
                            {filteredItems.map((item) => (
                                <ProductItem
                                    key={`inventory-${item.id}`}
                                    data={item}
                                    productModal
                                    addToCart={onAddToCart}
                                    isSelected={selectedProductIds.includes(item.id)}
                                    updateQuantity={onUpdateQuantity}
                                    quantityFromParent={
                                        getActiveHardware(selectedHardwares).find(
                                            (hw) => String(getItemServiceId(hw)) === String(item.id)
                                        )?.quantity || 1
                                    }
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-5 py-4 flex justify-end" style={{ borderTop: "1px solid var(--dashboard-border)" }}>
                    <BottonCustom
                        backgroundColor="var(--sidebar-selected-bg)"
                        width={130}
                        title="Done"
                        height={40}
                        color="var(--sidebar-text-selected)"
                        fontSize={16}
                        fontWeight={500}
                        onClick={onClose}
                    />
                </div>
            </div>
        </div>
    );
};

export default DeviceInventoryModal;
