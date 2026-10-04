"use client"

import { useEffect, useState } from "react";
import { HiSearch } from "react-icons/hi";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import Stepper from "../Stepper";
import Loader from "../Loader";
import BottonCustom from "../ButtonCustom";
import ProductItem from "../ProductItem";
import Heading from "../Heading";
import { getRequestWithOutBody, postRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";

const ProductListModal = ({ isOpen, onClose, selectedProductIds, selectedHardwares, application, onSuccess }) => {
    const accessToken = useSelector(state => state.auth.accessToken);
    const userData = useSelector(state => state.userData.userDetails);

    const [itemServicesList, setItemServicesList] = useState([]);
    const [selectedProductIdsState, setSelectedProductIdsState] = useState(selectedProductIds);
    const [selectedHardwaresState, setSelectedHardwaresState] = useState(selectedHardwares);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");

    useEffect(() => {
        if (!isOpen) return;
        fetchItemServices();
    }, [accessToken, isOpen]);

    const fetchItemServices = () => {
        setLoading(true);
        getRequestWithOutBody(`${baseURl}item-services`, accessToken)
            .then(result => {
                setItemServicesList(result?.data || []);
                setLoading(false);
            })
            .catch(err => {
                setLoading(false);
            });
    };

    const handleAddToCart = (item, quantity) => {
        const isSelected = selectedProductIdsState.includes(item.id);
        if (isSelected) {
            setSelectedProductIdsState(prev => prev.filter(id => id !== item.id));
            setSelectedHardwaresState(prev =>
                prev.map(hw =>
                    hw.itemServiceId === item.id ? { ...hw, isDeleted: true } : hw
                )
            );
            toast.info("Product removed from cart");
        } else {
            setSelectedProductIdsState(prev => [...prev, item.id]);
            setSelectedHardwaresState(prev => [
                ...prev,
                { ...item, quantity, isDeleted: false },
            ]);
            toast.success("Product added to cart");
        }
    };

    const handleUpdateQuantity = (item, quantity) => {
        if (selectedProductIdsState.includes(item.id)) {
            setSelectedHardwaresState(prev =>
                prev.map(hw =>
                    hw.itemServiceId === item.id ? { ...hw, quantity } : hw
                )
            );
        }
    };

    const handleNextClick = async () => {
        if (selectedHardwaresState.length === 0) return toast.error("Select at least one product");

        setLoading(true);
        try {
            const updatedHardwares = selectedHardwaresState.map(hw => {
                const item = {
                    applicationId: application?.id,
                    itemServiceId: hw?.itemServiceId || hw?.id,
                    pictureUrl: hw?.fileUrl,
                    name: hw?.name,
                    price: hw?.sellingPrice,
                    quantity: hw?.quantity,
                    inStock: hw?.inStock,
                    ...(hw?.isDeleted && { isDeleted: hw?.isDeleted }),
                    // Track who performed the update on this hardware line
                    updatedBy: userData?.id,
                };
                // Always include the existing hardware record id if present
                if (hw?.id) item.id = hw.id;
                return item;
            });

            const apiData = {
                currentStep: 9,
                hardware: updatedHardwares,
                agentId: userData?.id,
                applicationId: application?.id,
            };

            await postRequestWithBodyAndToken(`${baseURl}application`, accessToken, apiData);
            toast.success("Submitted successfully");
            onClose();
            onSuccess()
        } catch (error) {
            toast.error(error.message || "Submission failed");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-[2100]">
            <div className="bg-[var(--dashboard-card-bg)] rounded-xl shadow-lg p-2 w-full max-w-5xl relative max-h-[85vh] overflow-y-auto scrollbar-hide">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-[var(--sidebar-text-primary)] text-2xl"
                >
                    ×
                </button>

                <Heading
                    Fontweight={700}
                    color="var(--sidebar-text-primary)"
                    Heading="Select Hardware"
                    Fontsize={26}
                    ml={10}
                />

                <div className="mt-2 flex items-center bg-[var(--dashboard-tab-box)] border-2 border-blue-400 rounded-full px-4 py-2 w-full max-w-xl">
                    <HiSearch className="text-[22px] mr-2" />
                    <input
                        type="text"
                        placeholder="Search by Name"
                        className="flex-grow bg-transparent outline-none text-sm"
                        style={{ color: 'var(--dashboard-text-primary)' }}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value.toLowerCase())}
                    />
                </div>

                {loading ? (
                    <div className="w-full flex justify-center py-10">
                        <Loader message="Loading..." subMessage="Please wait" />
                    </div>
                ) : (
                    <div className="mt-4 flex flex-wrap overflow-y-auto items-center justify-center max-h-[400px]">
                        {itemServicesList.length > 0 ? (
                            itemServicesList
                                .filter(item => item.name?.toLowerCase().includes(searchText))
                                .map(item => (
                                    <ProductItem
                                        key={item.id}
                                        data={item}
                                        productModal={true}
                                        addToCart={handleAddToCart}
                                        isSelected={selectedProductIdsState.includes(item.id)}
                                        updateQuantity={handleUpdateQuantity}
                                        quantityFromParent={
                                            selectedHardwaresState.find(hw => hw.itemServiceId === item.id)?.quantity || 1
                                        }
                                    />
                                ))
                        ) : (
                            <div className="text-gray-500">No hardware found.</div>
                        )}
                    </div>
                )}

                <div className="mt-6 flex justify-end gap-3 flex-wrap">
                    <BottonCustom
                        title="Cancel"
                        backgroundColor="#D0D0D0"
                        color="black"
                        fontSize={16}
                        fontWeight={500}
                        width={120}
                        height={40}
                        onClick={onClose}
                    />
                    <BottonCustom
                        title="Next"
                        backgroundColor="rgba(67, 121, 238, 1)"
                        color="white"
                        fontSize={16}
                        fontWeight={500}
                        width={120}
                        height={40}
                        onClick={handleNextClick}
                    />
                </div>
            </div>
        </div>
    );
};

export default ProductListModal;
