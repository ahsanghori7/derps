import { useEffect, useState } from "react";
import Heading from "../../Components/Heading";
import { IoIosArrowBack } from "react-icons/io";
import { LuPackage, LuWrench } from "react-icons/lu";
import { Switch } from "@headlessui/react";
import BottonCustom from "../../Components/ButtonCustom";
import LabeledInput from "../../Components/LabeledInput";
import UploadFile from "../../Components/UploadFile";
import DropdownMenu from "../../Components/dropdownMenu";
import { getRequestWithOutBody, postProductData, postRequestWithBodyAndToken, postRequestWithFormData } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Button } from "@mui/material";

const parseApiError = (error) => {
    try {
        return JSON.parse(error.message);
    } catch {
        return { message: error.message, code: null };
    }
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];

const isEmpty = (value) => {
    if (value === undefined || value === null) return true;
    if (typeof value === "string") return value.trim() === "";
    return false;
};

const isValidName = (value) => {
    const trimmed = String(value).trim();
    return trimmed.length >= 2 && trimmed.length <= 100;
};

const isValidBarcode = (value) => /^[a-zA-Z0-9-_]+$/.test(String(value).trim());

const isValidSKU = (value) => /^[a-zA-Z0-9-_]+$/.test(String(value).trim());

const isValidPrice = (value) => {
    if (isEmpty(value)) return false;
    const str = String(value).trim();
    if (!/^\d+(\.\d{1,2})?$/.test(str)) return false;
    const num = Number(str);
    return !isNaN(num) && num > 0;
};

const isValidDescription = (value) => {
    const trimmed = String(value).trim();
    return trimmed.length >= 10 && trimmed.length <= 1000;
};

const FieldError = ({ message }) =>
    message ? <p style={{ color: '#DC2626', fontSize: 12, marginTop: 4 }}>{message}</p> : null;

const getInputStyle = (hasError) => ({
    border: hasError ? '1px solid #DC2626' : '1px solid #D1D5DC',
    fontSize: 14,
    borderRadius: 8,
    backgroundColor: 'var(--dashboard-tab-box)',
    color: 'var(--sidebar-text-primary)',
});

const textareaStyle = {
    border: '1px solid #D1D5DC',
    fontSize: 14,
    borderRadius: 8,
    backgroundColor: 'var(--dashboard-tab-box)',
    color: 'var(--sidebar-text-primary)',
};

const uploadBoxStyle = {
    border: '1px dashed #D1D5DC',
    backgroundColor: 'var(--dashboard-tab-box)',
    borderRadius: 8,
    overflow: 'hidden',
    width: '60%',
    marginTop: 4,
    minHeight: 160,
};

const StatusToggle = ({ enabled, onChange }) => (
    <div className="flex items-center gap-3">
        <Switch
            checked={enabled}
            onChange={onChange}
            className="group relative flex h-7 w-14 cursor-pointer rounded-full bg-[#A7ABAD] p-1 transition-colors duration-200 ease-in-out focus:outline-none data-[focus]:outline-1 data-[focus]:outline-[#0FA958] data-[checked]:bg-[#0FA958]"
        >
            <span
                aria-hidden="true"
                className="pointer-events-none inline-block size-5 translate-x-0 rounded-full bg-white ring-0 shadow-lg transition duration-200 ease-in-out group-data-[checked]:translate-x-7"
            />
        </Switch>
        <span
            style={{
                backgroundColor: enabled ? '#1a1a1a' : '#6B7280',
                color: '#fff',
                fontSize: 12,
                fontWeight: 500,
                padding: '3px 14px',
                borderRadius: 999,
            }}
        >
            {enabled ? 'Active' : 'Inactive'}
        </span>
    </div>
);

const getAccountLabel = (accounts, accountId) => {
    const account = accounts.find((item) => String(item.id) === String(accountId));
    if (!account) return "";
    return account.code ? `${account.name} (${account.code})` : account.name;
};

const getParentAccounts = (accounts) =>
    (accounts || []).filter((account) => !account.parentId);

const getSubAccounts = (accounts, parentId) =>
    parentId
        ? (accounts || []).filter((account) => String(account.parentId) === String(parentId))
        : [];

const AccountSelect = ({ value, onChange, accounts, defaultText = "--select account--" }) => (
    <DropdownMenu
        menuItems={(accounts || []).map((account) => ({
            id: account.id,
            name: account.code ? `${account.name} (${account.code})` : account.name,
        }))}
        idSet={true}
        businessType={true}
        searchable={true}
        defaultText={defaultText}
        onSelect={(id) => onChange(String(id))}
        selectedValue={value ? getAccountLabel(accounts, value) : undefined}
    />
);

const AccountFieldGroup = ({
    accounts,
    parentValue,
    subValue,
    onParentChange,
    onSubChange,
    parentError,
    subError,
}) => {
    const parentAccounts = getParentAccounts(accounts);
    const subAccounts = getSubAccounts(accounts, parentValue);

    return (
        <>
            <div className="flex items-start gap-x-6 flex-wrap">
                <div className="w-48 pt-2">
                    <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Account"} Fontsize={16} required={true} />
                </div>
                <div>
                    <AccountSelect
                        value={parentValue}
                        onChange={(id) => {
                            onParentChange(id);
                            onSubChange("");
                        }}
                        accounts={parentAccounts}
                    />
                    <FieldError message={parentError} />
                </div>
            </div>
            {parentValue && subAccounts.length > 0 && (
                <div className="flex items-start gap-x-6 flex-wrap">
                    <div className="w-48 pt-2">
                        <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Sub-Account"} Fontsize={16} required={true} />
                    </div>
                    <div>
                        <AccountSelect
                            value={subValue}
                            onChange={onSubChange}
                            accounts={subAccounts}
                            defaultText="--select sub-account--"
                        />
                        <FieldError message={subError} />
                    </div>
                </div>
            )}
        </>
    );
};

const ItemServiceToggle = ({ activeTab, onTabChange }) => (
    <div
        style={{
            backgroundColor: '#E8ECF0',
            borderRadius: 999,
            padding: 4,
            display: 'flex',
            gap: 4,
            zIndex: 9999,
        }}
    >
        {[
            { id: 0, label: 'Item', icon: LuPackage },
            { id: 1, label: 'Service', icon: LuWrench },
        ].map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
                <div
                    key={id}
                    onClick={() => onTabChange(id)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '8px 24px',
                        borderRadius: 999,
                        backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                        boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
                        color: 'var(--sidebar-text-primary)',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        minWidth: 110,
                        userSelect: 'none',
                    }}
                >
                    <Icon size={16} />
                    {label}
                </div>
            );
        })}
    </div>
);

const AddItem = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(0);

    // Item states
    const [enabled, setEnabled] = useState(true)
    const [itemName, setItemName] = useState("")
    const [barcode, setBarcode] = useState("")
    const [itemCostPrice, setItemCostPrice] = useState()
    const [itemSellingPrice, setItemSellingPrice] = useState()
    const [sku, setSku] = useState("")
    const [description, setDescription] = useState("")
    const [loading, setLoading] = useState(false);
    const [isChecked, setIsChecked] = useState(false);
    const [uploadedFile, setUploadedFiles] = useState([]);

    // Service states
    const [serviceName, setServiceName] = useState("")
    const [costPrice, setCostPrice] = useState("")
    const [costAccount, setCostAccount] = useState("")
    const [costSubAccount, setCostSubAccount] = useState("")
    const [sellingPrice, setSellingPrice] = useState("")
    const [sellingAccount, setSellingAccount] = useState("")
    const [sellingSubAccount, setSellingSubAccount] = useState("")
    const [taxExempt, setTaxExempt] = useState(false);
    const [expenseAccounts, setExpenseAccounts] = useState([]);
    const [revenueAccounts, setRevenueAccounts] = useState([]);
    const [itemCategories, setItemCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [errors, setErrors] = useState({});

    const clearError = (field) => {
        setErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const validateAccounts = (nextErrors) => {
        if (!costAccount) {
            nextErrors.costAccount = "Cost account is required";
        } else if (getSubAccounts(expenseAccounts, costAccount).length > 0 && !costSubAccount) {
            nextErrors.costSubAccount = "Cost sub-account is required";
        }

        if (!sellingAccount) {
            nextErrors.sellingAccount = "Selling account is required";
        } else if (getSubAccounts(revenueAccounts, sellingAccount).length > 0 && !sellingSubAccount) {
            nextErrors.sellingSubAccount = "Selling sub-account is required";
        }
    };

    const validateSharedFields = (nextErrors, nameField, nameLabel, requireSkuBarcode = true) => {
        const nameValue = nameField === "itemName" ? itemName : serviceName;

        if (isEmpty(nameValue)) {
            nextErrors[nameField] = `${nameLabel} is required`;
        } else if (!isValidName(nameValue)) {
            nextErrors[nameField] = `${nameLabel} must be between 2 and 100 characters`;
        }

        if (requireSkuBarcode) {
            if (isEmpty(barcode)) {
                nextErrors.barcode = "Barcode is required";
            } else if (!isValidBarcode(barcode)) {
                nextErrors.barcode = "Barcode can only contain letters, numbers, - or _";
            }

            if (isEmpty(sku)) {
                nextErrors.sku = "SKU is required";
            } else if (!isValidSKU(sku)) {
                nextErrors.sku = "SKU can only contain letters, numbers, - or _";
            }
        }

        if (isEmpty(description)) {
            nextErrors.description = "Description is required";
        } else if (!isValidDescription(description)) {
            nextErrors.description = "Description must be between 10 and 1000 characters";
        }

        // if (isEmpty(selectedCategory)) {
        //     nextErrors.category = "Category is required";
        // }
    };

    const validatePricing = (nextErrors, costValue, sellingValue, costField, sellingField) => {
        if (isEmpty(costValue)) {
            nextErrors[costField] = "Cost price is required";
        } else if (!isValidPrice(costValue)) {
            nextErrors[costField] = "Enter a valid cost price greater than 0 (max 2 decimals)";
        }

        if (isEmpty(sellingValue)) {
            nextErrors[sellingField] = "Selling price is required";
        } else if (!isValidPrice(sellingValue)) {
            nextErrors[sellingField] = "Enter a valid selling price greater than 0 (max 2 decimals)";
        } else if (isValidPrice(costValue) && Number(sellingValue) < Number(costValue)) {
            nextErrors[sellingField] = "Selling price cannot be less than cost price";
        }

        validateAccounts(nextErrors);
    };

    const validateItemForm = () => {
        const nextErrors = {};
        validateSharedFields(nextErrors, "itemName", "Item name");
        validatePricing(nextErrors, itemCostPrice, itemSellingPrice, "itemCostPrice", "itemSellingPrice");
        return nextErrors;
    };

    const validateServiceForm = () => {
        const nextErrors = {};
        validateSharedFields(nextErrors, "serviceName", "Service name", false);
        validatePricing(nextErrors, costPrice, sellingPrice, "costPrice", "sellingPrice");
        return nextErrors;
    };

    const showValidationErrors = (nextErrors) => {
        const messages = Object.values(nextErrors).filter(Boolean);
        if (messages.length === 0) {
            setErrors({});
            return true;
        }
        setErrors(nextErrors);
        toast.error(messages[0]);
        return false;
    };

    const normalizeAccounts = (result) => {
        const list = result?.data?.data || [];
        const flat = Array.isArray(list) ? list : [];
        return flat.map((account) => ({
            id: account.id,
            name: account.name || account.accountName || "",
            code: account.code || account.accountCode || "",
            parentId: account.parentId ?? account.parent?.id ?? null,
        }));
    };

    const normalizeItemCategories = (result) => {
        const list = result?.data?.data || result?.data?.results || result?.data || [];
        const flat = Array.isArray(list) ? list : [];
        return flat
            .map((category) => ({
                id: category.id,
                name: category.name || category.title || "",
            }))
            .reverse();
    };

    const resolveAccountId = (parentId, subId) => subId || parentId || "";

    const getAccountIdsPayload = () =>
        [
            resolveAccountId(costAccount, costSubAccount),
            resolveAccountId(sellingAccount, sellingSubAccount),
        ]
            .filter(Boolean)
            .map((id) => Number(id));

    const buildItemPayload = (uploadedFiles = []) => ({
        type: "item",
        name: itemName.trim(),
        barcode: barcode.trim(),
        sku: sku.trim(),
        description: description.trim(),
        costPrice: Number(itemCostPrice),
        sellingPrice: Number(itemSellingPrice),
        status: enabled ? "active" : "in-active",
        taxExempt: isChecked,
        accountIds: getAccountIdsPayload(),
        ...(selectedCategory && { categoryId: Number(selectedCategory) }),
        ...(uploadedFiles.length > 0 && { fileUrl: uploadedFiles }),
    });

    const buildServicePayload = (uploadedFiles = []) => ({
        type: "service",
        name: serviceName.trim(),
        description: description.trim(),
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        status: enabled ? "active" : "in-active",
        taxExempt,
        accountIds: getAccountIdsPayload(),
        ...(selectedCategory && { categoryId: Number(selectedCategory) }),
        ...(uploadedFiles.length > 0 && { fileUrl: uploadedFiles }),
    });

    const fetchAccounts = async () => {
        if (!accessToken) return;
        try {
            const expenseParams = new URLSearchParams({ type: 'expense', page: '1', limit: '200' });
            const revenueParams = new URLSearchParams({ type: 'revenue', page: '1', limit: '200' });
            const [expenseResult, revenueResult] = await Promise.all([
                getRequestWithOutBody(`${baseURl}account/?${expenseParams.toString()}`, accessToken),
                getRequestWithOutBody(`${baseURl}account/?${revenueParams.toString()}`, accessToken),
            ]);
            setExpenseAccounts(normalizeAccounts(expenseResult));
            setRevenueAccounts(normalizeAccounts(revenueResult));
        } catch (error) {
            console.error('Error fetching accounts:', error);
            toast.error('Failed to fetch accounts');
        }
    };

    const fetchItemCategories = async () => {
        if (!accessToken) return;
        try {
            const result = await getRequestWithOutBody(`${baseURl}item-category/`, accessToken);
            setItemCategories(normalizeItemCategories(result));
        } catch (error) {
            console.error('Error fetching item categories:', error);
            toast.error('Failed to fetch item categories');
        }
    };

    useEffect(() => {
        fetchAccounts();
        fetchItemCategories();
    }, [accessToken]);

    useEffect(() => {
        setErrors({});
    }, [activeTab]);

    const handleFileUpload = (files) => {
        const incomingFiles = Array.from(files);
        const validTypeFiles = incomingFiles.filter((file) => VALID_IMAGE_TYPES.includes(file.type));
        const validFiles = validTypeFiles.filter((file) => file.size <= MAX_IMAGE_SIZE);

        if (validTypeFiles.length === 0) {
            toast.error("Please upload valid image files (PNG, JPG, GIF)");
            return;
        }

        if (validFiles.length < validTypeFiles.length) {
            toast.error("Each image must be 10MB or less");
        }

        if (validFiles.length > 0) {
            setUploadedFiles((prevFiles) => [...prevFiles, ...validFiles]);
            clearError("uploadedFile");
        }
    };

    const handleItemNameChange = (e) => {
        setItemName(e.target.value);
        clearError("itemName");
    };
    const handleBarcodeChange = (e) => {
        setBarcode(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ""));
        clearError("barcode");
    };
    const handleItemCostPriceChange = (e) => {
        setItemCostPrice(e.target.value.replace(/[^0-9.]/g, ""));
        clearError("itemCostPrice");
        clearError("itemSellingPrice");
    };

    const handleItemSellingPriceChange = (e) => {
        setItemSellingPrice(e.target.value.replace(/[^0-9.]/g, ""));
        clearError("itemSellingPrice");
    };

    const handleSkuChange = (e) => {
        setSku(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ""));
        clearError("sku");
    };
    const handleDescriptionChange = (e) => {
        setDescription(e.target.value);
        clearError("description");
    };
    const handleCheckboxChange = () => {
        setIsChecked(!isChecked);
    };

    const handleServiceNameChange = (e) => {
        setServiceName(e.target.value);
        clearError("serviceName");
    };

    const handleCostPriceChange = (e) => {
        setCostPrice(e.target.value.replace(/[^0-9.]/g, ""));
        clearError("costPrice");
        clearError("sellingPrice");
    };

    const handleSellingPriceChange = (e) => {
        setSellingPrice(e.target.value.replace(/[^0-9.]/g, ""));
        clearError("sellingPrice");
    };

    const handleCostAccountChange = (id) => {
        setCostAccount(id);
        setCostSubAccount("");
        clearError("costAccount");
        clearError("costSubAccount");
    };

    const handleCostSubAccountChange = (id) => {
        setCostSubAccount(id);
        clearError("costSubAccount");
    };

    const handleSellingAccountChange = (id) => {
        setSellingAccount(id);
        setSellingSubAccount("");
        clearError("sellingAccount");
        clearError("sellingSubAccount");
    };

    const handleSellingSubAccountChange = (id) => {
        setSellingSubAccount(id);
        clearError("sellingSubAccount");
    };

    const handleCategoryChange = (id) => {
        setSelectedCategory(String(id));
        clearError("category");
    };

    const getCategoryLabel = (categoryId) => {
        const category = itemCategories.find((item) => String(item.id) === String(categoryId));
        return category?.name || "";
    };

    const handleTaxExemptChange = () => {
        setTaxExempt(!taxExempt);
    };

    const handleCreateItem = async () => {
        // Enhanced validation checks
        const validationErrors = validateItemForm();
        if (!showValidationErrors(validationErrors)) return;

        // Additional validation for critical fields
        if (!itemName || itemName.trim() === "") {
            toast.error("Item name is required");
            return;
        }

        if (!sku || sku.trim() === "") {
            toast.error("SKU is required");
            return;
        }

        if (!itemCostPrice || itemCostPrice <= 0) {
            toast.error("Cost price must be greater than 0");
            return;
        }

        if (!itemSellingPrice || itemSellingPrice <= 0) {
            toast.error("Selling price must be greater than 0");
            return;
        }

        if (itemCostPrice > itemSellingPrice) {
            toast.error("Cost price cannot be greater than selling price");
            return;
        }

        if (!accessToken) {
            toast.error("Authentication token not available");
            return;
        }

        setLoading(true);
        try {
            let uploadedFiles = [];
            
            // Upload files with error handling
            if (uploadedFile.length > 0) {
                for (const file of uploadedFile) {
                    if (!file) {
                        toast.error("Invalid file detected");
                        return;
                    }
                    
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("type", 'items');

                    try {
                        const result1 = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);
                        
                        if (!result1?.data?.fileUrl) {
                            toast.error(`Failed to upload file: ${file.name}`);
                            return;
                        }
                        
                        uploadedFiles.push({
                            url: result1.data.fileUrl.url,
                            mimetype: result1.data.fileUrl.mimetype,
                            originalname: result1.data.fileUrl.originalname,
                        });
                    } catch (fileError) {
                        toast.error(`Failed to upload file: ${file.name}. ${fileError.message}`);
                        return;
                    }
                }
            }

            const apiData = buildItemPayload(uploadedFiles);
            
            // Validate payload before sending
            if (!apiData || !apiData.name || !apiData.sku) {
                toast.error("Invalid item data");
                return;
            }

            const result = await postRequestWithBodyAndToken(`${baseURl}item-services`, accessToken, apiData);
            
            if (!result || !result.message) {
                toast.error("Invalid response from server");
                return;
            }
            
            // WooCommerce integration (non-blocking)
            // const newApiData = {
            //     name: itemName,
            //     sku: sku,
            //     description: description,
            //     regular_price: itemCostPrice,
            //     sale_price: itemSellingPrice,
            //     images: uploadedFiles.map(file => ({ src: file.url })),
            //     meta_data: [
            //         {
            //             key: "__crm_item_id",
            //         }
            //     ]
            // };
            
            // const url = "https://godms.com/wp-json/wc/v3/products?oauth_consumer_key=ck_d4d98165e0d07b526f6fc2583bdc8780f1f13316&oauth_signature_method=HMAC-SHA1&oauth_version=1.0&oauth_signature=7stGjgQCdfrr8n15USqzB%2BML2tk%3D";

            // Non-blocking WooCommerce sync
            // postProductData(url, newApiData).catch(error => {
            //     console.warn('WooCommerce sync failed:', error);
            // });
            
            toast.success(result.message);
            navigate(-1);
        } catch (error) {
            console.error('Item creation error:', error);
            
            // Enhanced error handling
            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    toast.error(error.response.data?.message || "Invalid item data provided");
                } else if (status === 401) {
                    toast.error("Authentication failed. Please login again.");
                } else if (status === 403) {
                    toast.error("You don't have permission to create items");
                } else if (status === 409) {
                    toast.error("Item with this SKU already exists");
                } else if (status >= 500) {
                    toast.error("Server error. Please try again later.");
                } else {
                    const parsed = parseApiError(error);
                    toast.error(parsed.message || error.response.data?.message || "Something went wrong");
                }
            } else if (error.request) {
                toast.error("Network error. Please check your connection.");
            } else {
                const parsed = parseApiError(error);
                toast.error(parsed.message || error.message || "Something went wrong");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateService = async () => {
        // Enhanced validation checks
        const validationErrors = validateServiceForm();
        if (!showValidationErrors(validationErrors)) return;

        // Additional validation for critical fields
        if (!serviceName || serviceName.trim() === "") {
            toast.error("Service name is required");
            return;
        }

        if (!costPrice || Number(costPrice) <= 0) {
            toast.error("Service cost price must be greater than 0");
            return;
        }

        if (!sellingPrice || Number(sellingPrice) <= 0) {
            toast.error("Service selling price must be greater than 0");
            return;
        }

        if (Number(costPrice) > Number(sellingPrice)) {
            toast.error("Service cost price cannot be greater than selling price");
            return;
        }

        if (!accessToken) {
            toast.error("Authentication token not available");
            return;
        }

        setLoading(true);
        try {
            let uploadedFiles = [];
            
            // Upload files with error handling
            if (uploadedFile.length > 0) {
                for (const file of uploadedFile) {
                    if (!file) {
                        toast.error("Invalid file detected");
                        return;
                    }
                    
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("type", 'items');

                    try {
                        const result1 = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);
                        
                        if (!result1?.data?.fileUrl) {
                            toast.error(`Failed to upload file: ${file.name}`);
                            return;
                        }
                        
                        uploadedFiles.push({
                            url: result1.data.fileUrl.url,
                            mimetype: result1.data.fileUrl.mimetype,
                            originalname: result1.data.fileUrl.originalname,
                        });
                    } catch (fileError) {
                        toast.error(`Failed to upload file: ${file.name}. ${fileError.message}`);
                        return;
                    }
                }
            }

            const apiData = buildServicePayload(uploadedFiles);
            
            // Validate payload before sending (services have no SKU)
            if (!apiData || !apiData.name) {
                toast.error("Invalid service data");
                return;
            }

            const result = await postRequestWithBodyAndToken(`${baseURl}item-services`, accessToken, apiData);
            
            if (!result || !result.message) {
                toast.error("Invalid response from server");
                return;
            }
            
            // WooCommerce integration (non-blocking)
            // const newApiData = {
            //     name: serviceName,
            //     sku: serviceSku,
            //     description: serviceDescription,
            //     regular_price: serviceCostPrice,
            //     sale_price: serviceSellingPrice,
            //     images: uploadedFiles.map(file => ({ src: file.url })),
            //     meta_data: [
            //         {
            //             key: "__crm_service_id",
            //         }
            //     ]
            // };
            
            // const url = "https://godms.com/wp-json/wc/v3/products?oauth_consumer_key=ck_d4d98165e0d07b526f6fc2583bdc8780f1f13316&oauth_signature_method=HMAC-SHA1&oauth_version=1.0&oauth_signature=7stGjgQCdfrr8n15USqzB%2BML2tk%3D";

            // // Non-blocking WooCommerce sync
            // postProductData(url, newApiData).catch(error => {
            //     console.warn('WooCommerce sync failed:', error);
            // });
            
            toast.success(result.message);
            navigate(-1);
        } catch (error) {
            console.error('Service creation error:', error);
            
            // Enhanced error handling
            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    toast.error(error.response.data?.message || "Invalid service data provided");
                } else if (status === 401) {
                    toast.error("Authentication failed. Please login again.");
                } else if (status === 403) {
                    toast.error("You don't have permission to create services");
                } else if (status === 409) {
                    toast.error("Service with this SKU already exists");
                } else if (status >= 500) {
                    toast.error("Server error. Please try again later.");
                } else {
                    const parsed = parseApiError(error);
                    toast.error(parsed.message || error.response.data?.message || "Something went wrong");
                }
            } else if (error.request) {
                toast.error("Network error. Please check your connection.");
            } else {
                const parsed = parseApiError(error);
                toast.error(parsed.message || error.message || "Something went wrong");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = () => {
        if (activeTab === 0) {
            handleCreateItem();
        } else {
            handleCreateService();
        }
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                        }}
                    >
                        <IoIosArrowBack size={18} color="var(--dashboard-text-secondary)" />
                    </Button>
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={'Add Item'}
                        Fontsize={30}
                    />
                </div>

                <ItemServiceToggle activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            <div className="w-full" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ borderRadius: 14 }} className="p-4 sm:p-6">
                    {activeTab === 0 ? (
                        <div>
                            <Heading
                                Fontweight={600}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Item Information:'}
                                Fontsize={18}
                            />

                            <div className="flex flex-col mt-5 gap-5">
                                <div className="flex items-start gap-x-6 flex-wrap">
                                    <div className="w-48 pt-2">
                                        <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Item Name"} Fontsize={16} required={true} />
                                    </div>
                                    <div>
                                        <LabeledInput inputPlaceholder="Enter item name" inputValue={itemName} onInputChange={handleItemNameChange} addAgent={true} className="h-10 w-80 px-3" inputStyle={getInputStyle(errors.itemName)} />
                                        <FieldError message={errors.itemName} />
                                    </div>
                                </div>

                                <div className="flex items-start gap-x-6 flex-wrap">
                                    <div className="w-48 pt-2">
                                        <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Barcode"} Fontsize={16} required={true} />
                                    </div>
                                    <div>
                                        <LabeledInput inputPlaceholder="Enter code" inputValue={barcode} onInputChange={handleBarcodeChange} addAgent={true} className="h-10 w-80 px-3" inputStyle={getInputStyle(errors.barcode)} />
                                        <FieldError message={errors.barcode} />
                                    </div>
                                </div>

                                <div className="flex items-start gap-x-6 flex-wrap">
                                    <div className="w-48 pt-2">
                                        <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"SKU"} Fontsize={16} required={true} />
                                    </div>
                                    <div>
                                        <LabeledInput inputPlaceholder="Enter sku" inputValue={sku} onInputChange={handleSkuChange} addAgent={true} className="h-10 w-80 px-3" inputStyle={getInputStyle(errors.sku)} />
                                        <FieldError message={errors.sku} />
                                    </div>
                                </div>

                                <div className="flex items-start gap-x-6 flex-wrap">
                                    <div className="w-48 pt-2">
                                        <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Category"} Fontsize={16} />
                                    </div>
                                    <div>
                                        <DropdownMenu
                                            menuItems={itemCategories}
                                            onSelect={handleCategoryChange}
                                            defaultText="--Select Category--"
                                            meetingLink={true}
                                            idSet={true}
                                            searchable={true}
                                            businessType={true}
                                            selectedValue={selectedCategory ? getCategoryLabel(selectedCategory) : undefined}
                                        />
                                        <FieldError message={errors.category} />
                                    </div>
                                </div>

                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Status"} Fontsize={16} />
                                    </div>
                                    <StatusToggle enabled={enabled} onChange={setEnabled} />
                                </div>

                                <div className="flex items-start gap-x-6 flex-wrap">
                                    <div className="w-48 pt-2">
                                        <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Item Description"} Fontsize={16} required={true} />
                                    </div>
                                    <div>
                                        <textarea
                                            placeholder="Enter Description"
                                            value={description}
                                            onChange={handleDescriptionChange}
                                            className="p-3 w-80"
                                            rows={4}
                                            style={{ ...textareaStyle, ...(errors.description ? { border: '1px solid #DC2626' } : {}) }}
                                        />
                                        <FieldError message={errors.description} />
                                    </div>
                                </div>

                                <div className="flex items-start gap-x-6 flex-wrap">
                                    <div className="w-48 pt-2">
                                        <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Upload Image"} Fontsize={16} />
                                    </div>
                                    <div style={uploadBoxStyle} className="p-4 flex flex-col items-center justify-center">
                                        <UploadFile backgroundColor={'transparent'} addTicket={true} onFileChange={handleFileUpload} />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8">
                                <Heading Fontweight={600} color={'var(--sidebar-text-primary)'} Heading={'Pricing:'} Fontsize={18} />

                                <div className="flex flex-col mt-5 gap-5">
                                    <div className="flex items-start gap-x-6 flex-wrap">
                                        <div className="w-48 pt-2">
                                            <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Cost Price"} Fontsize={16} required={true} />
                                        </div>
                                        <div>
                                            <LabeledInput inputPlaceholder="0.00" inputValue={itemCostPrice} onInputChange={handleItemCostPriceChange} isDecimal={true} addAgent={true} className="h-10 w-80 px-3" inputStyle={getInputStyle(errors.itemCostPrice)} />
                                            <FieldError message={errors.itemCostPrice} />
                                        </div>
                                    </div>

                                    <AccountFieldGroup
                                        accounts={expenseAccounts}
                                        parentValue={costAccount}
                                        subValue={costSubAccount}
                                        onParentChange={handleCostAccountChange}
                                        onSubChange={handleCostSubAccountChange}
                                        parentError={errors.costAccount}
                                        subError={errors.costSubAccount}
                                    />

                                    <div className="flex items-start gap-x-6 flex-wrap">
                                        <div className="w-48 pt-2">
                                            <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Selling Price"} Fontsize={16} required={true} />
                                        </div>
                                        <div>
                                            <LabeledInput inputPlaceholder="0.00" inputValue={itemSellingPrice} onInputChange={handleItemSellingPriceChange} isDecimal={true} addAgent={true} className="h-10 w-80 px-3" inputStyle={getInputStyle(errors.itemSellingPrice)} />
                                            <FieldError message={errors.itemSellingPrice} />
                                        </div>
                                    </div>

                                    <AccountFieldGroup
                                        accounts={revenueAccounts}
                                        parentValue={sellingAccount}
                                        subValue={sellingSubAccount}
                                        onParentChange={handleSellingAccountChange}
                                        onSubChange={handleSellingSubAccountChange}
                                        parentError={errors.sellingAccount}
                                        subError={errors.sellingSubAccount}
                                    />

                                    <div className="flex items-center gap-x-6 flex-wrap">
                                        <div className="w-48">
                                            <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Tax Exempt"} Fontsize={16} />
                                        </div>
                                        <div className="flex items-center">
                                            <input type="checkbox" id="itemTaxExempt" checked={isChecked} onChange={handleCheckboxChange} style={{ transform: 'scale(1.2)', accentColor: '#0C79F7' }} />
                                            <label htmlFor="itemTaxExempt" style={{ color: 'var(--Gray)', fontSize: 14 }} className="ml-3">Tax Exempt on Payment</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <Heading Fontweight={600} color={'var(--sidebar-text-primary)'} Heading={'Service Information:'} Fontsize={18} />

                            <div className="flex flex-col mt-5 gap-5">
                                <div className="flex items-start gap-x-6 flex-wrap">
                                    <div className="w-48 pt-2">
                                        <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Service Name"} Fontsize={16} required={true} />
                                    </div>
                                    <div>
                                        <LabeledInput inputPlaceholder="Enter item name" inputValue={serviceName} onInputChange={handleServiceNameChange} addAgent={true} className="h-10 w-80 px-3" inputStyle={getInputStyle(errors.serviceName)} />
                                        <FieldError message={errors.serviceName} />
                                    </div>
                                </div>

                                <div className="flex items-start gap-x-6 flex-wrap">
                                    <div className="w-48 pt-2">
                                        <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Category"} Fontsize={16} required={true} />
                                    </div>
                                    <div>
                                        <DropdownMenu
                                            menuItems={itemCategories}
                                            onSelect={handleCategoryChange}
                                            defaultText="--Select Category--"
                                            meetingLink={true}
                                            idSet={true}
                                            searchable={true}
                                            businessType={true}
                                            selectedValue={selectedCategory ? getCategoryLabel(selectedCategory) : undefined}
                                        />
                                        <FieldError message={errors.category} />
                                    </div>
                                </div>

                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Status"} Fontsize={16} />
                                    </div>
                                    <StatusToggle enabled={enabled} onChange={setEnabled} />
                                </div>

                                <div className="flex items-start gap-x-6 flex-wrap">
                                    <div className="w-48 pt-2">
                                        <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Service Description"} Fontsize={16} required={true} />
                                    </div>
                                    <div>
                                        <textarea
                                            placeholder="Enter Description"
                                            value={description}
                                            onChange={handleDescriptionChange}
                                            className="p-3 w-80"
                                            rows={4}
                                            style={{ ...textareaStyle, ...(errors.description ? { border: '1px solid #DC2626' } : {}) }}
                                        />
                                        <FieldError message={errors.description} />
                                    </div>
                                </div>

                                <div className="flex items-start gap-x-6 flex-wrap">
                                    <div className="w-48 pt-2">
                                        <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Upload Image"} Fontsize={16} />
                                    </div>
                                    <div style={uploadBoxStyle} className="p-4 flex flex-col items-center justify-center">
                                        <UploadFile backgroundColor={'transparent'} addTicket={true} onFileChange={handleFileUpload} />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8">
                                <Heading Fontweight={600} color={'var(--sidebar-text-primary)'} Heading={'Pricing:'} Fontsize={18} />

                                <div className="flex flex-col mt-5 gap-5">
                                    <div className="flex items-start gap-x-6 flex-wrap">
                                        <div className="w-48 pt-2">
                                            <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Cost Price"} Fontsize={16} required={true} />
                                        </div>
                                        <div>
                                            <LabeledInput inputPlaceholder="0.00" inputValue={costPrice} onInputChange={handleCostPriceChange} isDecimal={true} addAgent={true} className="h-10 w-80 px-3" inputStyle={getInputStyle(errors.costPrice)} />
                                            <FieldError message={errors.costPrice} />
                                        </div>
                                    </div>

                                    <AccountFieldGroup
                                        accounts={expenseAccounts}
                                        parentValue={costAccount}
                                        subValue={costSubAccount}
                                        onParentChange={handleCostAccountChange}
                                        onSubChange={handleCostSubAccountChange}
                                        parentError={errors.costAccount}
                                        subError={errors.costSubAccount}
                                    />

                                    <div className="flex items-start gap-x-6 flex-wrap">
                                        <div className="w-48 pt-2">
                                            <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Selling Price"} Fontsize={16} required={true} />
                                        </div>
                                        <div>
                                            <LabeledInput inputPlaceholder="0.00" inputValue={sellingPrice} onInputChange={handleSellingPriceChange} isDecimal={true} addAgent={true} className="h-10 w-80 px-3" inputStyle={getInputStyle(errors.sellingPrice)} />
                                            <FieldError message={errors.sellingPrice} />
                                        </div>
                                    </div>

                                    <AccountFieldGroup
                                        accounts={revenueAccounts}
                                        parentValue={sellingAccount}
                                        subValue={sellingSubAccount}
                                        onParentChange={handleSellingAccountChange}
                                        onSubChange={handleSellingSubAccountChange}
                                        parentError={errors.sellingAccount}
                                        subError={errors.sellingSubAccount}
                                    />

                                    <div className="flex items-center gap-x-6 flex-wrap">
                                        <div className="w-48">
                                            <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Tax Exempt"} Fontsize={16} />
                                        </div>
                                        <div className="flex items-center">
                                            <input type="checkbox" id="serviceTaxExempt" checked={taxExempt} onChange={handleTaxExemptChange} style={{ transform: 'scale(1.2)', accentColor: '#0C79F7' }} />
                                            <label htmlFor="serviceTaxExempt" style={{ color: 'var(--Gray)', fontSize: 14 }} className="ml-3">Tax Exempt on Payment</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-8">
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
                            title={loading ? "Saving..." : "Save"}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={handleSubmit}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddItem;