"use client"

import { useEffect, useState } from "react"
import LabeledInput from "../LabeledInput"
import UploadFile from "../UploadFile"
import Heading from "../Heading"
import { Plus, X } from "lucide-react"
import { RxCrossCircled } from "react-icons/rx";
import { toast } from "react-toastify"
import { getRequestWithOutBody, postRequestWithBodyAndToken } from "../../Api/fetch"
import { baseURl } from "../../Config/systemConfig"
import { useSelector } from "react-redux"
import CustomTimePicker from "../CustomTimePicker"
import DropdownMenu from "../dropdownMenu";
import moment from "moment"

/* Add this CSS class to hide scrollbars */
const scrollbarHideStyles = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

const AddPricingPlan = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);

    const [loading, setLoading] = useState(false);
    const [productName, setProductName] = useState('');
    const [applicationType, setApplicationType] = useState('');
    const [description, setDescription] = useState('');
    const [serviceOptions, setServiceOptions] = useState([]);

    useEffect(() => {
        if (!isOpen || !accessToken) return;

        getRequestWithOutBody(`${baseURl}item-category/`, accessToken)
            .then((result) => {
                const list =
                    result?.data?.data
                    || result?.data?.results
                    || (Array.isArray(result?.data) ? result.data : [])
                    || [];
                setServiceOptions(
                    (Array.isArray(list) ? list : [])
                        .map((item) => ({
                            id: item.id,
                            text: item.title || item.name || item.solution || '',
                            value: item.solution || item.title || item.name || '',
                        }))
                        .filter((opt) => opt.text && opt.value)
                );
            })
            .catch(() => setServiceOptions([]));
    }, [isOpen, accessToken]);

    const handleProductNameChange = (e) => {
        setProductName(e.target.value)
    }
    const handleApplicationTypeChange = (year) => {
        setApplicationType(year);
    };
    const handleDescriptionChange = (e) => {
        setDescription(e.target.value)
    }

    if (!isOpen) return null

    const handleSubmit = async () => {
        setLoading(true);
        if (
            productName === null ||
            applicationType === null ||
            description === null
        ) {
            toast.error("All fields are required");
            setLoading(false);
            return;
        }

        try {

            const payload = {
                name: productName,
                description: description,
                service: applicationType,
            };

            const result = await postRequestWithBodyAndToken(`${baseURl}price-plan`, accessToken, payload)
            toast.success(result.message);
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }
    return (
        <div className="fixed inset-0 flex items-center justify-center  z-504 bg-black bg-opacity-30" style={{ zIndex: 9999 }}>
            <div className="bg-[var(--dashboard-card-bg)] rounded-xl shadow-lg p-6 w-full max-w-2xl relative max-h-[80vh] overflow-y-auto scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                <button onClick={onClose} className="absolute top-4 text-[var(--sidebar-text-primary)] right-4 text-2xl">
                    ×
                </button>

                <h2 className="text-xl text-[var(--sidebar-text-primary)] font-semibold mb-4">Add Pricing Plan</h2>

                <div className='flex items-center gap-5 mt-5 mb-2'>
                    <div>
                        <Heading
                            Fontweight={500}
                            color={'var(--fieldsTitle)'}
                            Heading={'Service'}
                            Fontsize={10}
                            mb={2}
                        />
                        <DropdownMenu menuItems={serviceOptions} addAgent={true} defaultText={'Application Type'} onSelect={handleApplicationTypeChange} />
                    </div>
                    <LabeledInput
                        label={"Plan Name"}
                        inputPlaceholder={"Enter Name"}
                        inputValue={productName}
                        addAgent={true}
                        onInputChange={handleProductNameChange}
                    />
                </div>
                <div>
                    <Heading
                        Fontweight={500}
                        color={'var(--fieldsTitle)'}
                        Heading={'Description'}
                        Fontsize={10}
                    />
                    <div className="flex justify-start">
                        <textarea
                            type="text"
                            placeholder="Description"
                            value={description}
                            onChange={handleDescriptionChange}
                            className={`mt-1 p-2 w-[98%] `}
                            rows={4}
                            style={{ border: '1px solid var(--sidebar-selected-bg)', fontSize: 12, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)', color: 'var(--sidebar-text-primary)' }}
                        />
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    <button onClick={handleSubmit}
                        disabled={loading}
                        className={`px-6 py-2 text-white rounded-lg ${loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-[#0C79F7] hover:bg-blue-600'}`}>
                        {loading ? 'Adding...' : 'Add'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AddPricingPlan