import { useEffect, useState } from "react";
import Heading from "../../Components/Heading";
import { IoIosArrowBack } from "react-icons/io";
import { Switch } from "@headlessui/react";
import BottonCustom from "../../Components/ButtonCustom";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import LabeledInput from "../../Components/LabeledInput";
import UploadFile from "../../Components/UploadFile";
import DropdownMenu from "../../Components/dropdownMenu";
import { toast } from "react-toastify";
import { deleteRequest, getRequestWithOutBody, postRequestWithFormData, putRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { Button } from "@mui/material";
import DeleteConfirmationModal from "../../Components/DeleteModal";
import UpdateConfirmationModal from "../../Components/UpdateModal";

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

const resolveAccountSelection = (accountId, accounts) => {
    if (!accountId) return { parent: "", sub: "" };
    const account = accounts.find((item) => String(item.id) === String(accountId));
    if (!account) return { parent: String(accountId), sub: "" };
    if (account.parentId) {
        return { parent: String(account.parentId), sub: String(account.id) };
    }
    return { parent: String(account.id), sub: "" };
};

const EXPENSE_ACCOUNT_TYPES = new Set(["expense", "expenses"]);
const REVENUE_ACCOUNT_TYPES = new Set(["revenue", "income"]);

const extractAccountIdsFromData = (data) => {
    if (!data) return null;

    if (Array.isArray(data.accountIds) && data.accountIds.length > 0) {
        return data.accountIds;
    }

    if (!Array.isArray(data.serviceAccounts) || data.serviceAccounts.length === 0) {
        return null;
    }

    let costId = null;
    let sellingId = null;

    data.serviceAccounts.forEach((entry) => {
        const accountId = entry.accountId ?? entry.account?.id;
        if (!accountId) return;

        const accountType = (entry.account?.type || "").toLowerCase();

        if (EXPENSE_ACCOUNT_TYPES.has(accountType)) {
            costId = accountId;
        } else if (REVENUE_ACCOUNT_TYPES.has(accountType)) {
            sellingId = accountId;
        }
    });

    if (costId || sellingId) {
        return [costId, sellingId];
    }

    const positionalIds = data.serviceAccounts
        .map((entry) => entry.accountId ?? entry.account?.id)
        .filter(Boolean);

    return positionalIds.length ? [positionalIds[0], positionalIds[1] ?? null] : null;
};

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

const EditItem = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();
    const location = useLocation();
    const itemData = location.state?.itemData;
    const [recordType, setRecordType] = useState(itemData?.type === 'service' ? 'service' : 'item');
    const isService = recordType === 'service';

    const [enabled, setEnabled] = useState(true);
    const [itemName, setItemName] = useState("");
    const [barcode, setBarcode] = useState("");
    const [itemCostPrice, setItemCostPrice] = useState("");
    const [itemSellingPrice, setItemSellingPrice] = useState("");
    const [sku, setSku] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploadedUrl, setUploadedUrl] = useState([]);
    const [isChecked, setIsChecked] = useState(false);
    const [uploadedFile, setUploadedFiles] = useState([]);

    const [serviceName, setServiceName] = useState("");
    const [costPrice, setCostPrice] = useState("");
    const [costAccount, setCostAccount] = useState("");
    const [costSubAccount, setCostSubAccount] = useState("");
    const [sellingPrice, setSellingPrice] = useState("");
    const [sellingAccount, setSellingAccount] = useState("");
    const [sellingSubAccount, setSellingSubAccount] = useState("");
    const [taxExempt, setTaxExempt] = useState(false);
    const [expenseAccounts, setExpenseAccounts] = useState([]);
    const [revenueAccounts, setRevenueAccounts] = useState([]);
    const [itemCategories, setItemCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [pendingCategoryValue, setPendingCategoryValue] = useState(null);
    const [pendingAccountIds, setPendingAccountIds] = useState(null);
    const [errors, setErrors] = useState({});
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    const clearError = (field) => {
        setErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
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
        const list = result?.data || [];
        const flat = Array.isArray(list) ? list : [];
        return flat
            .map((category) => ({
                id: category.id,
                name: category.title || category.name || "",
                value: category.solution || "",
            }))
            .reverse();
    };

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

    const applyAccountIds = (accountIds) => {
        if (!accountIds?.some(Boolean)) return;
        const cost = resolveAccountSelection(accountIds[0], expenseAccounts);
        const selling = resolveAccountSelection(accountIds[1], revenueAccounts);
        setCostAccount(cost.parent);
        setCostSubAccount(cost.sub);
        setSellingAccount(selling.parent);
        setSellingSubAccount(selling.sub);
    };

    const populateFormFromData = (data) => {
        if (!data) return;

        if (data.type) {
            setRecordType(data.type);
        }

        setBarcode(data.barcode || "");
        setSku(data.sku || "");
        setDescription(data.description || "");
        setEnabled(data.status === 'active');
        // Keep only the latest image — one image per item/service
        const fileUrls = Array.isArray(data.fileUrl) ? data.fileUrl : [];
        setUploadedUrl(fileUrls.length > 0 ? [fileUrls[fileUrls.length - 1]] : []);

        const categoryId =
            data.categoryId
            ?? (typeof data.category === "object" ? data.category?.id : null);

        if (categoryId) {
            setSelectedCategory(String(categoryId));
            setPendingCategoryValue(null);
        } else if (data.category) {
            setPendingCategoryValue(data.category);
        } else {
            setSelectedCategory("");
            setPendingCategoryValue(null);
        }

        if (data.type === 'service') {
            setServiceName(data.name || "");
            setCostPrice(data.costPrice ?? "");
            setSellingPrice(data.sellingPrice ?? "");
            setTaxExempt(data.taxExempt || false);
        } else {
            setItemName(data.name || "");
            setItemCostPrice(data.costPrice ?? "");
            setItemSellingPrice(data.sellingPrice ?? "");
            setIsChecked(data.taxExempt || false);
        }

        const accountIds = extractAccountIdsFromData(data);
        if (accountIds?.some(Boolean)) {
            setPendingAccountIds(accountIds);
        }
    };

    const fetchData = () => {
        if (!location.state?.itemData?.id) return;

        setLoading(true);
        getRequestWithOutBody(`${baseURl}item-services/${location.state.itemData.id}`, accessToken)
            .then((result) => {
                populateFormFromData(result?.data);
            })
            .catch((error) => {
                console.error('Error fetching data:', error);
                toast.error('Failed to load item details');
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchAccounts();
        fetchItemCategories();
    }, [accessToken]);

    useEffect(() => {
        fetchData();
    }, [location.state?.itemData?.id]);

    useEffect(() => {
        if (pendingAccountIds && expenseAccounts.length && revenueAccounts.length) {
            applyAccountIds(pendingAccountIds);
            setPendingAccountIds(null);
        }
    }, [pendingAccountIds, expenseAccounts, revenueAccounts]);

    useEffect(() => {
        if (!pendingCategoryValue || !itemCategories.length) return;

        const match = typeof pendingCategoryValue === "object"
            ? itemCategories.find((item) => String(item.id) === String(pendingCategoryValue?.id))
            : itemCategories.find(
                (item) =>
                    String(item.id) === String(pendingCategoryValue)
                    || String(item.value) === String(pendingCategoryValue)
            );

        if (match) {
            setSelectedCategory(String(match.id));
        }
        setPendingCategoryValue(null);
    }, [pendingCategoryValue, itemCategories]);

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

    const resolveAccountId = (parentId, subId) => subId || parentId || "";

    const getAccountIdsPayload = () =>
        [
            resolveAccountId(costAccount, costSubAccount),
            resolveAccountId(sellingAccount, sellingSubAccount),
        ]
            .filter(Boolean)
            .map((id) => Number(id));

    const submitItemServiceUpdate = async (payload, moveEntriesConfirm = false) => {
        const body = moveEntriesConfirm ? { ...payload, moveEntriesConfirm: true } : payload;
        return putRequestWithBodyAndToken(
            `${baseURl}item-services/${location.state?.itemData?.id}`,
            accessToken,
            body
        );
    };

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
            // Replace with a single image — new upload overwrites the previous one
            const latestFile = validFiles[validFiles.length - 1];
            setUploadedFiles([latestFile]);
            setUploadedUrl([]);
        }
    };

    const handleItemNameChange = (e) => { setItemName(e.target.value); clearError("itemName"); };
    const handleBarcodeChange = (e) => { setBarcode(e.target.value.replace(/[^a-zA-Z0-9-_]/g, "")); clearError("barcode"); };
    const handleItemCostPriceChange = (e) => {
        setItemCostPrice(e.target.value.replace(/[^0-9.]/g, ""));
        clearError("itemCostPrice");
        clearError("itemSellingPrice");
    };
    const handleItemSellingPriceChange = (e) => {
        setItemSellingPrice(e.target.value.replace(/[^0-9.]/g, ""));
        clearError("itemSellingPrice");
    };
    const handleSkuChange = (e) => { setSku(e.target.value.replace(/[^a-zA-Z0-9-_]/g, "")); clearError("sku"); };
    const handleDescriptionChange = (e) => { setDescription(e.target.value); clearError("description"); };
    const handleCheckboxChange = () => setIsChecked(!isChecked);
    const handleServiceNameChange = (e) => { setServiceName(e.target.value); clearError("serviceName"); };
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
    const handleCostSubAccountChange = (id) => { setCostSubAccount(id); clearError("costSubAccount"); };
    const handleSellingAccountChange = (id) => {
        setSellingAccount(id);
        setSellingSubAccount("");
        clearError("sellingAccount");
        clearError("sellingSubAccount");
    };
    const handleSellingSubAccountChange = (id) => { setSellingSubAccount(id); clearError("sellingSubAccount"); };
    const REMOVE_CATEGORY_ID = "__remove_category__";

    const categoryMenuItems = [
        { id: REMOVE_CATEGORY_ID, name: "Remove Category" },
        ...itemCategories,
    ];

    const handleCategoryChange = (id) => {
        if (!id || id === REMOVE_CATEGORY_ID) {
            setSelectedCategory("");
        } else {
            setSelectedCategory(String(id));
        }
        clearError("category");
    };

    const getCategoryLabel = (categoryId) => {
        const category = itemCategories.find((item) => String(item.id) === String(categoryId));
        return category?.name || "";
    };

    const handleTaxExemptChange = () => setTaxExempt(!taxExempt);

    const handleMaintainForm = () => {
        const isValid = !isService
            ? showValidationErrors(validateItemForm())
            : showValidationErrors(validateServiceForm());
        if (isValid) setShowUpdateModal(true);
    };

    const confirmUpdate = async () => {
        setLoading(true);
        let apiData;

        try {
            const newFiles = uploadedFile.filter((file) => file instanceof File);
            let fileUrlPayload = uploadedUrl || [];

            // New upload replaces previous image(s) — keep only one
            if (newFiles.length > 0) {
                const file = newFiles[newFiles.length - 1];
                const formData = new FormData();
                formData.append("file", file);
                formData.append("type", 'items');
                const result1 = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);
                fileUrlPayload = [{
                    url: result1?.data?.fileUrl?.url,
                    mimetype: result1?.data?.fileUrl?.mimetype,
                    originalname: result1?.data?.fileUrl?.originalname,
                }];
            } else if (fileUrlPayload.length > 1) {
                fileUrlPayload = [fileUrlPayload[fileUrlPayload.length - 1]];
            }

            if (!isService) {
                apiData = {
                    type: "item",
                    name: itemName.trim(),
                    barcode: barcode.trim(),
                    sku: sku.trim(),
                    taxExempt: isChecked,
                    description: description.trim(),
                    costPrice: Number(itemCostPrice),
                    sellingPrice: Number(itemSellingPrice),
                    fileUrl: fileUrlPayload,
                    status: enabled ? "active" : "in-active",
                    accountIds: getAccountIdsPayload(),
                    categoryId: selectedCategory ? Number(selectedCategory) : null,
                };
            } else {
                apiData = {
                    type: "service",
                    name: serviceName.trim(),
                    description: description.trim(),
                    costPrice: Number(costPrice),
                    sellingPrice: Number(sellingPrice),
                    fileUrl: fileUrlPayload,
                    status: enabled ? "active" : "in-active",
                    taxExempt,
                    accountIds: getAccountIdsPayload(),
                    categoryId: selectedCategory ? Number(selectedCategory) : null,
                };
            }

            const result = await submitItemServiceUpdate(apiData);
            setShowUpdateModal(false);
            toast.success(result.message);
            navigate(-1);
        } catch (error) {
            const parsed = parseApiError(error);

            if (parsed.code === "SERVICE_ACCOUNT_ENTRIES_EXIST" && isService && apiData) {
                if (window.confirm("This service has existing account entries. Do you want to move them?")) {
                    try {
                        const result = await submitItemServiceUpdate(apiData, true);
                        setShowUpdateModal(false);
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

    const entityName = isService ? serviceName : itemName;

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
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
                    Heading={isService ? 'Edit Service' : 'Edit Item'}
                    Fontsize={30}
                />
            </div>

            <div className="w-full" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ borderRadius: 14 }} className="p-4 sm:p-6">
                    {!isService ? (
                        <div>
                            <Heading Fontweight={600} color={'var(--sidebar-text-primary)'} Heading={'Item Information:'} Fontsize={18} />

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
                                            menuItems={categoryMenuItems}
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
                                        <Heading Fontweight={500} color={"var(--sidebar-text-primary)"} Heading={"Category"} Fontsize={16} />
                                    </div>
                                    <div>
                                        <DropdownMenu
                                            menuItems={categoryMenuItems}
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

                    {(uploadedFile?.length > 0 || uploadedUrl?.length > 0) && (
                        <div
                            onClick={() => {
                                if (uploadedUrl?.[0]?.url) {
                                    window.open(uploadedUrl[0].url, '_blank');
                                }
                            }}
                            className="px-4 cursor-pointer mt-3 w-[60%]"
                            style={{
                                border: '1px solid var(--sidebar-selected-bg)',
                                fontSize: 14,
                                borderRadius: 9,
                                backgroundColor: 'var(--dashboard-tab-box)',
                                paddingTop: 8,
                                paddingBottom: 8,
                                color: 'blue',
                            }}
                        >
                            <Heading
                                Fontweight={500}
                                color={'blue'}
                                Heading={
                                    uploadedFile?.[0]?.name
                                    || uploadedUrl?.[uploadedUrl.length - 1]?.originalname
                                    || 'Image'
                                }
                                Fontsize={16}
                            />
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
                            backgroundColor={''}
                            width={isService ? 150 : 130}
                            title={isService ? 'Remove Service' : 'Delete'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            className={"bg-red-500"}
                            onClick={() => setShowDeleteModal(true)}
                        />
                        <BottonCustom
                            backgroundColor={'rgba(67, 121, 238, 1)'}
                            width={130}
                            title={loading ? "Saving..." : "Save"}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={handleMaintainForm}
                        />
                    </div>
                </div>
            </div>

            <DeleteConfirmationModal
                open={showDeleteModal}
                title={isService ? "Remove Service" : "Delete Item"}
                subtitle={isService ? "Are you sure you want to remove" : "Are you sure you want to delete"}
                entityName={entityName || "this record"}
                warningMessage="This action cannot be undone. The record will be permanently removed from the system."
                onCancel={() => setShowDeleteModal(false)}
                onDelete={async () => {
                    setLoading(true);
                    try {
                        await deleteRequest(`${baseURl}item-services/${location.state?.itemData?.id}`, accessToken);
                        toast.success(isService ? 'Service has been removed successfully.' : 'Item has been deleted successfully.');
                        setShowDeleteModal(false);
                        navigate(-1);
                    } catch (error) {
                        const parsed = parseApiError(error);
                        toast.error(parsed.message || error.message || "Something went wrong");
                    } finally {
                        setLoading(false);
                    }
                }}
                isLoading={loading}
            />
            <UpdateConfirmationModal
                open={showUpdateModal}
                title={isService ? "Update Service" : "Update Item"}
                subtitle="Are you sure you want to update"
                entityName={entityName || "this record"}
                updateMessage="This action will update the details with the current changes."
                onCancel={() => setShowUpdateModal(false)}
                onUpdate={confirmUpdate}
                isLoading={loading}
            />
        </div>
    );
};

export default EditItem;
