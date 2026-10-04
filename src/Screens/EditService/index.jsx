import { useState, useEffect } from "react";
import Heading from "../../Components/Heading";
import { IoIosArrowBack } from "react-icons/io";
import { Switch } from "@headlessui/react";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import BottonCustom from "../../Components/ButtonCustom";
import GoBack from "../../Components/GoBack";
import LabeledInput from "../../Components/LabeledInput";
import UploadFile from "../../Components/UploadFile";
import { postRequestWithBodyAndToken, postRequestWithFormData, putRequestWithBodyAndToken, getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { Button } from "@mui/material";

const parseApiError = (error) => {
    try {
        return JSON.parse(error.message);
    } catch {
        return { message: error.message, code: null };
    }
};

const EditService = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();
    const location = useLocation();
    const serviceData = location.state?.serviceData;

    const [enabled, setEnabled] = useState(true)
    const [serviceName, setServiceName] = useState("")
    const [barcode, setBarcode] = useState("")
    const [sku, setSku] = useState("")
    const [description, setDescription] = useState("")
    const [loading, setLoading] = useState(false);
    const [uploadedFile, setUploadedFiles] = useState([]);
    const [serviceId, setServiceId] = useState(null);
    
    // Pricing states
    const [costPrice, setCostPrice] = useState("")
    const [costAccount, setCostAccount] = useState("")
    const [costSubAccount, setCostSubAccount] = useState("")
    const [sellingPrice, setSellingPrice] = useState("")
    const [sellingAccount, setSellingAccount] = useState("")
    const [sellingSubAccount, setSellingSubAccount] = useState("")
    const [taxExempt, setTaxExempt] = useState(false);

    const isEmpty = (value) => !value || value.trim() === "";

    const isValidPrice = (value) => {
        const num = Number(value);
        return !isNaN(num) && num > 0;
    };

    const isValidSKU = (value) => {
        return /^[a-zA-Z0-9-_]+$/.test(value);
    };

    useEffect(() => {
        if (serviceData) {
            setServiceId(serviceData.id);
            setServiceName(serviceData.name || "");
            setBarcode(serviceData.barcode || "");
            setSku(serviceData.sku || "");
            setDescription(serviceData.description || "");
            setEnabled(serviceData.status === 'active');
            setCostPrice(serviceData.costPrice || "");
            setSellingPrice(serviceData.sellingPrice || "");
            setTaxExempt(serviceData.taxExempt || false);
            
            // Set account IDs if available
            if (serviceData.accountIds && serviceData.accountIds.length > 0) {
                setCostAccount(serviceData.accountIds[0]?.toString() || "");
                setSellingAccount(serviceData.accountIds[1]?.toString() || "");
            }
            
            // Handle existing files
            if (serviceData.fileUrl && Array.isArray(serviceData.fileUrl)) {
                setUploadedFiles(serviceData.fileUrl);
            }
        } else {
            toast.error("No service data provided");
            navigate(-1);
        }
    }, [serviceData, navigate]);

    const handleFileUpload = (files) => {
        const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
        const newFiles = Array.from(files).filter(file => validImageTypes.includes(file.type));

        if (newFiles.length > 0) {
            setUploadedFiles(prevFiles => [...prevFiles, ...newFiles]);
        } else {
            toast.error("Please upload valid image files (JPEG, PNG, GIF)");
        }
    };

    const handleServiceNameChange = (e) => {
        setServiceName(e.target.value);
    };
    
    const handleBarcodeChange = (e) => {
        setBarcode(e.target.value);
    };
    
    const handleCostPriceChange = (e) => {
        setCostPrice(e.target.value.replace(/[^0-9.]/g, ""));
    };
    
    const handleSellingPriceChange = (e) => {
        setSellingPrice(e.target.value.replace(/[^0-9.]/g, ""));
    };
    
    const handleSkuChange = (e) => {
        setSku(e.target.value);
    };
    
    const handleDescriptionChange = (e) => {
        setDescription(e.target.value);
    };
    
    const handleTaxExemptChange = () => {
        setTaxExempt(!taxExempt);
    };

    const handleUpdateService = async () => {
        // Service Name
        if (isEmpty(serviceName)) {
            toast.error("Service name is required");
            return;
        }

        // Barcode
        if (isEmpty(barcode)) {
            toast.error("Barcode is required");
            return;
        }

        // SKU
        if (isEmpty(sku)) {
            toast.error("SKU is required");
            return;
        }

        if (!isValidSKU(sku)) {
            toast.error("SKU can only contain letters, numbers, - or _");
            return;
        }

        // Description
        if (isEmpty(description)) {
            toast.error("Description is required");
            return;
        }

        if (description.length < 10) {
            toast.error("Description must be at least 10 characters");
            return;
        }

        // Cost Price
        if (!isValidPrice(costPrice)) {
            toast.error("Cost price must be greater than 0");
            return;
        }

        // Selling Price
        if (!isValidPrice(sellingPrice)) {
            toast.error("Selling price must be greater than 0");
            return;
        }

        // Selling >= Cost
        if (Number(sellingPrice) < Number(costPrice)) {
            toast.error("Selling price cannot be less than cost price");
            return;
        }

        // Proceed with API call
        setLoading(true);
        let apiData;

        try {
            let uploadedFiles = [...uploadedFile]; // Start with existing files
            
            // Upload new files if any
            const newFiles = uploadedFile.filter(file => file instanceof File);
            if (newFiles.length > 0) {
                for (const file of newFiles) {
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("type", 'services');

                    const result1 = await postRequestWithFormData(`${baseURl}files`, accessToken, formData)
                    uploadedFiles.push({
                        url: result1?.data?.fileUrl?.url,
                        mimetype: result1?.data?.fileUrl?.mimetype,
                        originalname: result1?.data?.fileUrl?.originalname,
                    });
                }
            }

            apiData = {
                type: "service",
                name: serviceName.trim(),
                barcode: barcode.trim(),
                sku: sku.trim(),
                description: description.trim(),
                costPrice: Number(costPrice),
                sellingPrice: Number(sellingPrice),
                fileUrl: uploadedFiles,
                status: enabled ? "active" : "in-active",
                taxExempt,
                accountIds: [costAccount, sellingAccount].filter(Boolean).map((id) => Number(id)),
            };
            
            const result = await putRequestWithBodyAndToken(`${baseURl}item-services/${serviceId}`, accessToken, apiData)
            toast.success(result.message);
            navigate(-1);
        } catch (error) {
            const parsed = parseApiError(error);

            if (parsed.code === "SERVICE_ACCOUNT_ENTRIES_EXIST" && apiData) {
                if (window.confirm("This service has existing account entries. Do you want to move them?")) {
                    try {
                        const result = await putRequestWithBodyAndToken(
                            `${baseURl}item-services/${serviceId}`,
                            accessToken,
                            { ...apiData, moveEntriesConfirm: true }
                        )
                        toast.success(result.message);
                        navigate(-1);
                    } catch (moveError) {
                        const moveParsed = parseApiError(moveError);
                        toast.error(moveParsed.message || moveError.message || "Failed to move account entries");
                    }
                }
            } else {
                toast.error(parsed.message || error.message || "Something went wrong");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <Button
                    onClick={() => navigate(-1)}
                    style={{
                        minWidth: 40,
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: 'var(--dashboard-card-bg)',
                        border: '1px solid var(--dashboard-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        marginTop: 4
                    }}
                >
                    <IoIosArrowBack size={18} color="var(--dashboard-text-secondary)" />
                </Button>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Edit Service'}
                    Fontsize={30}
                />
            </div>

            <div className="w-full" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ borderRadius: 14 }} className="sm:m-2 p-3 sm:p-4 m-2">
                    <div className="flex justify-between gap-3 flex-wrap">
                        <GoBack />
                        <div className="flex items-center gap-4">
                            {enabled ?
                                <Heading
                                    Fontweight={500}
                                    color={'var(--Gray)'}
                                    Heading={'Active'}
                                    Fontsize={16}
                                /> :
                                <Heading
                                    Fontweight={500}
                                    color={'var(--Gray)'}
                                    Heading={'In-Active'}
                                    Fontsize={16}
                                />
                            }
                            <Switch
                                checked={enabled}
                                onChange={setEnabled}
                                className="group relative flex h-7 w-14 cursor-pointer rounded-full bg-[#A7ABAD] p-1 transition-colors duration-200 ease-in-out focus:outline-none data-[focus]:outline-1 data-[focus]:outline-[#0FA958] data-[checked]:bg-[#0FA958]"
                            >
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none inline-block size-5 translate-x-0 rounded-full bg-white ring-0 shadow-lg transition duration-200 ease-in-out group-data-[checked]:translate-x-7"
                                />
                            </Switch>
                        </div>
                    </div>

                    {/* Service Information Section */}
                    <div className="mt-6">
                        <Heading
                            Fontweight={600}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Service Information'}
                            Fontsize={20}
                        />
                        <div className="border-b border-gray-300 mt-2 mb-4"></div>
                        
                        <div className="flex flex-col mt-4 gap-4">
                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Service Name"}
                                        Fontsize={16}
                                        required={true}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Service Name"
                                    inputValue={serviceName}
                                    onInputChange={handleServiceNameChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Barcode"}
                                        Fontsize={16}
                                        required={true}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Barcode"
                                    inputValue={barcode}
                                    onInputChange={handleBarcodeChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"SKU"}
                                        Fontsize={16}
                                        required={true}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="SKU"
                                    inputValue={sku}
                                    onInputChange={handleSkuChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Status"}
                                        Fontsize={16}
                                        required={true}
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <label style={{ color: 'var(--sidebar-text-primary)', fontSize: 16 }}>
                                        <input
                                            type="radio"
                                            name="status"
                                            value="active"
                                            checked={enabled}
                                            onChange={() => setEnabled(true)}
                                            style={{ marginRight: 8 }}
                                        />
                                        Active
                                    </label>
                                    <label style={{ color: 'var(--sidebar-text-primary)', fontSize: 16 }}>
                                        <input
                                            type="radio"
                                            name="status"
                                            value="inactive"
                                            checked={!enabled}
                                            onChange={() => setEnabled(false)}
                                            style={{ marginRight: 8 }}
                                        />
                                        Inactive
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="mt-2">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Service Description"}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <textarea
                                type="text"
                                placeholder="Service Description"
                                value={description}
                                onChange={handleDescriptionChange}
                                className={`mt-1 p-3 w-[60%]`}
                                rows={4}
                                style={{
                                    border: '1px solid var(--sidebar-selected-bg)',
                                    fontSize: 14,
                                    borderRadius: 8,
                                    backgroundColor: 'var(--dashboard-tab-box)',
                                    color: 'var(--sidebar-text-primary)'
                                }}
                            />
                        </div>

                        <div className="mt-2">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Upload Image"}
                                    Fontsize={16}
                                />
                            </div>
                            <div style={{ 
                                backgroundColor: 'var(--dashboard-tab-box)', 
                                border: '1px solid var(--sidebar-selected-bg)', 
                                borderRadius: 8, 
                                overflow: 'hidden',
                                width: '60%',
                                marginTop: 4
                            }} className="min-h-28 p-2 flex flex-col items-center">
                                <UploadFile backgroundColor={'var(--scroll-thumb)'} addTicket={true} onFileChange={handleFileUpload} />
                            </div>
                        </div>
                    </div>

                    {/* Pricing Section */}
                    <div className="mt-8">
                        <Heading
                            Fontweight={600}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Pricing'}
                            Fontsize={20}
                        />
                        <div className="border-b border-gray-300 mt-2 mb-4"></div>
                        
                        <div className="flex flex-col mt-4 gap-4">
                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Cost Price"}
                                        Fontsize={16}
                                        required={true}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="0.00"
                                    inputValue={costPrice}
                                    onInputChange={handleCostPriceChange}
                                    isDecimal={true}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Account"}
                                        Fontsize={16}
                                    />
                                </div>
                                <select
                                    value={costAccount}
                                    onChange={(e) => setCostAccount(e.target.value)}
                                    className="h-8 w-80 px-2 rounded"
                                    style={{
                                        border: '1px solid var(--sidebar-selected-bg)',
                                        backgroundColor: 'var(--dashboard-tab-box)',
                                        color: 'var(--sidebar-text-primary)'
                                    }}
                                >
                                    <option value="">Select Account</option>
                                    <option value="101">Account 101</option>
                                    <option value="102">Account 102</option>
                                    <option value="103">Account 103</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Sub-Account"}
                                        Fontsize={16}
                                    />
                                </div>
                                <select
                                    value={costSubAccount}
                                    onChange={(e) => setCostSubAccount(e.target.value)}
                                    className="h-8 w-80 px-2 rounded"
                                    style={{
                                        border: '1px solid var(--sidebar-selected-bg)',
                                        backgroundColor: 'var(--dashboard-tab-box)',
                                        color: 'var(--sidebar-text-primary)'
                                    }}
                                >
                                    <option value="">Select Sub-Account</option>
                                    <option value="201">Sub-Account 201</option>
                                    <option value="202">Sub-Account 202</option>
                                    <option value="203">Sub-Account 203</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Selling Price"}
                                        Fontsize={16}
                                        required={true}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="0.00"
                                    inputValue={sellingPrice}
                                    onInputChange={handleSellingPriceChange}
                                    isDecimal={true}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Account"}
                                        Fontsize={16}
                                    />
                                </div>
                                <select
                                    value={sellingAccount}
                                    onChange={(e) => setSellingAccount(e.target.value)}
                                    className="h-8 w-80 px-2 rounded"
                                    style={{
                                        border: '1px solid var(--sidebar-selected-bg)',
                                        backgroundColor: 'var(--dashboard-tab-box)',
                                        color: 'var(--sidebar-text-primary)'
                                    }}
                                >
                                    <option value="">Select Account</option>
                                    <option value="101">Account 101</option>
                                    <option value="102">Account 102</option>
                                    <option value="103">Account 103</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Sub-Account"}
                                        Fontsize={16}
                                    />
                                </div>
                                <select
                                    value={sellingSubAccount}
                                    onChange={(e) => setSellingSubAccount(e.target.value)}
                                    className="h-8 w-80 px-2 rounded"
                                    style={{
                                        border: '1px solid var(--sidebar-selected-bg)',
                                        backgroundColor: 'var(--dashboard-tab-box)',
                                        color: 'var(--sidebar-text-primary)'
                                    }}
                                >
                                    <option value="">Select Sub-Account</option>
                                    <option value="201">Sub-Account 201</option>
                                    <option value="202">Sub-Account 202</option>
                                    <option value="203">Sub-Account 203</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Tax Exempt"}
                                        Fontsize={16}
                                    />
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id='taxExempt'
                                        checked={taxExempt}
                                        onChange={handleTaxExemptChange}
                                        className={'ml-2'}
                                        style={{ transform: 'scale(1.5)' }}
                                    />
                                    <label style={{ color: 'var(--Gray)', fontSize: 16 }} className="ml-4">Tax Exempt on Payment</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <BottonCustom
                            backgroundColor={"transparent"}
                            width={130}
                            title={"Cancel"}
                            height={40}
                            color={"var(--dashboard-text-primary)"}
                            fontSize={16}
                            fontWeight={500}
                            border={"1px solid var(--sidebar-selected-bg)"}
                            onClick={() => navigate(-1)}
                        />
                        <BottonCustom
                            backgroundColor={'rgba(67, 121, 238, 1)'}
                            width={130}
                            title={loading ? "Updating..." : "Update"}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={handleUpdateService}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditService;
