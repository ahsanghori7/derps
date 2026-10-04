import { useEffect, useState } from "react";
import Heading from "../../Components/Heading";
import { IoIosArrowBack } from "react-icons/io";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import BottonCustom from "../../Components/ButtonCustom";
import LabeledInput from "../../Components/LabeledInput";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import DropdownMenu from "../../Components/dropdownMenu";
import CustomDatePicker from "../../Components/CustomDatePicker";
import CustomTimePicker from "../../Components/CustomTimePicker";
import { Switch } from "@headlessui/react";
import dayjs from "dayjs";
import { getRequestWithOutBody, putRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { styled } from '@mui/material/styles';
import { getPreferenceOptions, getMissingRequiredPreferences, isPreferenceRequired, isPreferenceValueFilled, isSecureInput } from "../../Utils/preferenceExtra";

const sortByOrder = (items = []) =>
    [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    width: '100%',
    textAlign: 'left',
    marginTop: '20px',
    flexWrap: 'wrap',
    gap: 10
});
 
const ApplicationPreferences = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();
    const location = useLocation();
    
    const { application, merchant } = location.state || {};
    const solution = application?.solution || '';
    console.log('application', application)

    const [merchantIdValue, setMerchantIdValue] = useState(merchant?.merchantIds?.[0]?.merchantId || "");
    const [loading, setLoading] = useState(false);
    const [preferencesData, setPreferencesData] = useState([]);
    const [formValues, setFormValues] = useState({});
    const [initialFormValues, setInitialFormValues] = useState({});
    const [initialMerchantIdValue, setInitialMerchantIdValue] = useState(merchant?.merchantIds?.[0]?.merchantId || "");
    const [dirtyFieldNames, setDirtyFieldNames] = useState([]);
    const [isMerchantIdDirty, setIsMerchantIdDirty] = useState(false);
    const [visibleSecureFields, setVisibleSecureFields] = useState({});
    const [showRequiredErrors, setShowRequiredErrors] = useState(false);
    const applicationId = application?.id || location?.state?.applicationId || merchant?.applicationId;
    const customerId = merchant?.id || location?.state?.itemData?.id || location?.state?.customerId;

    // Map solution to formName for API
    const getFormName = (solution) => {
        const formNameMap = {
            'credit-card': 'credit-card',
            'atm': 'atm',
            'cash-advance': 'cash-advance',
            'pos': 'pos',
            'ebt': 'ebt',
            'airvac': 'airvac',
            'website': 'website',
            'ach-processing': 'ach-processing'
        };
        return formNameMap[solution] || 'preferences';
    };

    // Map solution to display name for heading
    const getSolutionDisplayName = (solution) => {
        const displayNameMap = {
            'credit-card': 'Credit Card Processing',
            'atm': 'ATM Solutions',
            'cash-advance': 'Cash Advance',
            'pos': 'Point-Of-Sale Solutions',
            'ebt': 'EBT Processing',
            'airvac': 'AIRVAC Systems',
            'website': 'Website Services',
            'ach-processing': 'ACH Processing'
        };
        return displayNameMap[solution] || solution;
    };

    // Load order: (1) saved values for this form + application, (2) field schema for the form.
    // GET path: application-preference-values/form/{formName}?applicationId={id} — formName follows solution (e.g. credit-card).
    useEffect(() => {
        if (!solution || !accessToken) return;

        const formName = getFormName(solution);
        let cancelled = false;

        const parseSavedValuesPayload = (result) => {
            const raw = result?.data ?? result;
            let nextValues = {};

            if (Array.isArray(raw)) {
                nextValues = raw.reduce((acc, item) => {
                    if (!item?.fieldName) return acc;
                    acc[item.fieldName] = item?.fieldValue ?? "";
                    return acc;
                }, {});
            } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
                const skipKeys = new Set(["id", "applicationId", "formName", "createdAt", "updatedAt"]);
                Object.entries(raw).forEach(([key, val]) => {
                    if (skipKeys.has(key)) return;
                    if (val !== null && val !== undefined && typeof val === "object" && "fieldValue" in val) {
                        nextValues[key] = val.fieldValue ?? "";
                    } else {
                        nextValues[key] = val ?? "";
                    }
                });
            }
            return nextValues;
        };

        const applySavedValues = (nextValues) => {
            setFormValues((prev) => ({ ...prev, ...nextValues }));
            setInitialFormValues(nextValues);
            setDirtyFieldNames([]);
            setIsMerchantIdDirty(false);
            if (nextValues.merchantID !== undefined && nextValues.merchantID !== null) {
                const merchantId = String(nextValues.merchantID);
                setMerchantIdValue(merchantId);
                setInitialMerchantIdValue(merchantId);
            }
        };

        setLoading(true);

        (async () => {
            try {
                if (applicationId) {
                    const valuesUrl = `${baseURl}application-preference-values/form/${formName}?applicationId=${applicationId}`;
                    try {
                        const valuesResult = await getRequestWithOutBody(valuesUrl, accessToken);
                        if (cancelled) return;

                        const raw = valuesResult?.data ?? valuesResult;
                        const isEmptyResponse =
                            raw === null ||
                            raw === undefined ||
                            (Array.isArray(raw) && raw.length === 0);

                        if (isEmptyResponse) {
                            setFormValues({});
                            setInitialFormValues({});
                            setDirtyFieldNames([]);
                            setIsMerchantIdDirty(false);
                        } else {
                            const nextValues = parseSavedValuesPayload(valuesResult);
                            applySavedValues(nextValues);
                        }
                    } catch {
                        // Schema still loads below
                    }
                }

                if (cancelled) return;

                const schemaUrl = `${baseURl}application-preferences?formName=${formName}`;
                const schemaResult = await getRequestWithOutBody(schemaUrl, accessToken);
                if (!cancelled) {
                    setPreferencesData(schemaResult?.data || []);
                }
            } catch {
                if (!cancelled) {
                    toast.error("Failed to load preferences");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [solution, accessToken, applicationId]);

    const handleMerchantIdChange = (e) => {
        setMerchantIdValue(e.target.value);
        setIsMerchantIdDirty(true);
    };

    const handleFieldChange = (name, value) => {
        setFormValues(prev => ({
            ...prev,
            [name]: value
        }));
        setDirtyFieldNames((prev) => (prev.includes(name) ? prev : [...prev, name]));
    };

    // Filter by formName, then sort by order (0, 1, 2, …)
    const filteredPreferences = sortByOrder(
        preferencesData.filter((field) => field.formName === getFormName(solution))
    );

    // Render preference field based on preference type from API
    const renderPreferenceField = (field) => {
        const { preference, name, extra } = field;
        const required = isPreferenceRequired(extra);
        const fieldError = showRequiredErrors
            && required
            && !isPreferenceValueFilled(preference, formValues[name]);

        switch (preference) {
            case 'textField':
                const isHiddenField = isSecureInput(extra);
                const displayValue = formValues[name] || "";
                const isVisible = visibleSecureFields[name] || false;
                const inputType = isHiddenField ? (isVisible ? "text" : "password") : "text";
                return (
                    <div key={name} className="flex items-center gap-x-6 flex-wrap">
                        <div className="w-48">
                            <Heading
                                Fontweight={500}
                                color={"var(--sidebar-text-primary)"}
                                Heading={name}
                                Fontsize={16}
                                required={required}
                            />
                        </div>
                        <LabeledInput
                            inputPlaceholder={name}
                            inputValue={displayValue}
                            onInputChange={(e) => handleFieldChange(name, e.target.value)}
                            addAgent={true}
                            // className="h-8 w-80 px-2"
                            inputType={inputType}
                            error={fieldError}
                            rightIcon={
                                isHiddenField ? (
                                    <button
                                        type="button"
                                        onClick={() => setVisibleSecureFields(prev => ({ ...prev, [name]: !prev[name] }))}
                                        className="text-gray-500 hover:text-gray-700 mb-4"
                                    >
                                        {isVisible ? <FaRegEyeSlash /> : <FaRegEye />}
                                    </button>
                                ) : null
                            }
                        />
                    </div>
                );
            case 'dropdown':
                return (
                    <div key={name} className="flex items-center gap-x-6 flex-wrap">
                        <div className="w-48">
                            <Heading
                                Fontweight={500}
                                color={"var(--sidebar-text-primary)"}
                                Heading={name}
                                Fontsize={16}
                                required={required}
                            />
                        </div>
                        <DropdownMenu
                            menuItems={getPreferenceOptions(extra)}
                            businessType={true}
                            defaultText={name}
                            onSelect={(selectedValue) => handleFieldChange(name, selectedValue)}
                            selectedValue={formValues[name] || ""}
                            error={fieldError}
                        />
                    </div>
                );
            case 'datePicker':
                return (
                    <div key={name} className="flex items-center gap-x-6 flex-wrap">
                        <div className="w-48">
                            <Heading
                                Fontweight={500}
                                color={"var(--sidebar-text-primary)"}
                                Heading={name}
                                Fontsize={16}
                                required={required}
                            />
                        </div>
                        <CustomDatePicker
                            label={name}
                            onChange={(selectedDate) => handleFieldChange(name, selectedDate)}
                            value={formValues[name] || null}
                            ownerInfo={true}
                            error={fieldError}
                        />
                    </div>
                );
            case 'timePicker':
                return (
                    <div key={name} className="flex items-center gap-x-6 flex-wrap">
                        <div className="w-48">
                            <Heading
                                Fontweight={500}
                                color={"var(--sidebar-text-primary)"}
                                Heading={name}
                                Fontsize={16}
                                required={required}
                            />
                        </div>
                        <CustomTimePicker
                            value={formValues[name] ? dayjs(formValues[name]) : null}
                            editApplication={true}
                            onChange={(newValue) => handleFieldChange(name, newValue)}
                            error={fieldError}
                        />
                    </div>
                );
            case 'switch':
                return (
                    <div key={name} className="flex items-center gap-x-6 flex-wrap">
                        <div className="w-48">
                            <Heading
                                Fontweight={500}
                                color={"var(--sidebar-text-primary)"}
                                Heading={name}
                                Fontsize={16}
                                required={required}
                            />
                        </div>
                        <Switch
                            checked={formValues[name] || false}
                            onChange={(checked) => handleFieldChange(name, checked)}
                            className="group relative flex h-7 w-14 cursor-pointer rounded-full bg-[#A7ABAD] p-1 transition-colors duration-200 ease-in-out focus:outline-none data-[focus]:outline-1 data-[focus]:outline-[#0FA958] data-[checked]:bg-[#0FA958]"
                        >
                            <span
                                aria-hidden="true"
                                className="pointer-events-none inline-block size-5 translate-x-0 rounded-full bg-white ring-0 shadow-lg transition duration-200 ease-in-out group-data-[checked]:translate-x-7"
                            />
                        </Switch>
                    </div>
                );
            default:
                return null;
        }
    };

    const handleGoBack = () => {
        if (merchant) {
            navigate('/home/editCustomer', {
                state: {
                    itemData: merchant,
                    activeTab: 'processingInfo'
                }
            });
            return;
        }
        navigate('/home/customerList');
    };

    const handleSave = async () => {
        const missing = getMissingRequiredPreferences(filteredPreferences, formValues);
        if (missing.length) {
            setShowRequiredErrors(true);
            toast.error(
                `Please fill required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`
            );
            return;
        }

        setLoading(true);
        try {
            if (!applicationId) {
                toast.error("Application ID not found");
                return;
            }

            if (!customerId) {
                toast.error("Customer ID not found");
                return;
            }

            const formName = getFormName(solution);
            const applicationProcessing = dirtyFieldNames
                .map((fieldName) => [fieldName, formValues[fieldName]])
                .filter(([fieldName, value]) => {
                    const initialValue = initialFormValues[fieldName] ?? "";
                    return String(value ?? "") !== String(initialValue ?? "");
                })
                .map(([fieldName, rawValue]) => {
                    const serializedValue = dayjs.isDayjs(rawValue)
                        ? rawValue.toISOString()
                        : rawValue instanceof Date
                            ? rawValue.toISOString()
                            : rawValue;

                    return {
                        formName,
                        fieldName,
                        fieldValue: serializedValue ?? ""
                    };
                });

            if (isMerchantIdDirty && String(merchantIdValue ?? "") !== String(initialMerchantIdValue ?? "")) {
                applicationProcessing.push({
                    formName,
                    fieldName: "merchantID",
                    fieldValue: merchantIdValue ?? ""
                });
            }

            if (!applicationProcessing.length) {
                toast.info("No changes to save");
                return;
            }

            const customerSaveUrl = `${baseURl}customer/${customerId}`;
            const apiBody = {
                applicationId,
                applicationProcessing
            };

            await putRequestWithBodyAndToken(customerSaveUrl, accessToken, apiBody);

            setInitialFormValues({ ...initialFormValues, ...formValues });
            setInitialMerchantIdValue(merchantIdValue);
            setDirtyFieldNames([]);
            setIsMerchantIdDirty(false);

            toast.success("Preferences saved successfully");
            handleGoBack();
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        handleGoBack();
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            {/* Header Wrapper */}
            {/* <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}> */}
                <HeaderWrapper>

                <button
                    onClick={handleGoBack}
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
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={merchant?.dbaName || merchant?.legalBusinessName || 'Application Preferences'}
                        Fontsize={30}
                    />
                    {solution && (
                        <span style={{ 
                            backgroundColor: 'var(--sidebar-selected-bg)', 
                            color: 'var(--sidebar-text-selected)',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: 500
                        }}>
                            {getSolutionDisplayName(solution)}
                        </span>
                    )}
                </div>
                </HeaderWrapper>
            {/* </div> */}

            <div className="w-full" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ borderRadius: 14 }} className="sm:m-2 p-3 sm:p-4 m-2">
                    {/* Solution Header */}
                    <div className="flex justify-between items-center mt-4 mb-6">
                        <Heading
                            Fontweight={600}
                            color={'var(--sidebar-text-primary)'}
                            Heading={getSolutionDisplayName(solution)}
                            Fontsize={20}
                        />
                        {/* <div className="flex gap-3">
                            <button
                                style={{
                                    backgroundColor: 'transparent',
                                    border: '1px solid var(--sidebar-selected-bg)',
                                    color: 'var(--dashboard-text-primary)',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                                onClick={() => toast.info('Email functionality coming soon...')}
                            >
                                Email
                            </button>
                            <button
                                style={{
                                    backgroundColor: 'transparent',
                                    border: '1px solid var(--sidebar-selected-bg)',
                                    color: 'var(--dashboard-text-primary)',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                                onClick={() => window.print()}
                            >
                                Print
                            </button>
                        </div> */}
                    </div>

                    {/* Credit Card Processing Form */}
                    <div className="flex flex-col mt-4 gap-4">
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Merchant ID"}
                                    Fontsize={16}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Merchant ID"
                                inputValue={merchantIdValue}
                                onInputChange={handleMerchantIdChange}
                                addAgent={true}
                                className="h-8 w-80 px-2"
                            />
                        </div>

                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Solution"}
                                    Fontsize={16}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Solution"
                                inputValue={solution}
                                onInputChange={() => {}}
                                addAgent={true}
                                disabled={true}
                                className="h-8 w-80 px-2"
                            />
                        </div>

                        {/* Plan */}
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Plan"}
                                    Fontsize={16}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Plan"
                                inputValue={application?.plan || '-'}
                                onInputChange={() => {}}
                                addAgent={true}
                                disabled={true}
                                className="h-8 w-80 px-2"
                            />
                        </div>

                        {/* Platform */}
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Platform"}
                                    Fontsize={16}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Platform"
                                inputValue={application?.application?.platform || '-'}
                                onInputChange={() => {}}
                                addAgent={true}
                                disabled={true}
                                className="h-8 w-80 px-2"
                            />
                        </div>

                        {/* FEIN */}
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"TAX ID"}
                                    Fontsize={16}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="TAX ID"
                                inputValue={application?.application?.feinNumber || '-'}
                                onInputChange={() => {}}
                                addAgent={true}
                                disabled={true}
                                className="h-8 w-80 px-2"
                            />
                        </div>

                        {/* Business Start Date */}
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Business Start Date"}
                                    Fontsize={16}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Business Start Date"
                                inputValue={application?.application?.businessStartDate ? new Date(application.application?.businessStartDate).toLocaleDateString() : '-'}
                                onInputChange={() => {}}
                                addAgent={true}
                                disabled={true}
                                className="h-8 w-80 px-2"
                            />
                        </div>

                        {/* Business Type */}
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Business Type"}
                                    Fontsize={16}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Business Type"
                                inputValue={application?.application?.businessType || '-'}
                                onInputChange={() => {}}
                                addAgent={true}
                                disabled={true}
                                className="h-8 w-80 px-2"
                            />
                        </div>

                        {/* Ownership Type */}
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Ownership Type"}
                                    Fontsize={16}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Ownership Type"
                                inputValue={application?.application?.ownerShipType || '-'}
                                onInputChange={() => {}}
                                addAgent={true}
                                disabled={true}
                                className="h-8 w-80 px-2"
                            />
                        </div>

                        {loading && (
                            <div className="flex justify-center py-4">
                                <div className="text-[var(--sidebar-text-primary)]">Loading preferences...</div>
                            </div>
                        )}

                        {filteredPreferences.map((field) => renderPreferenceField(field))}
                    </div>

                    {/* Buttons */}
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
                            onClick={handleCancel}
                        />
                        <BottonCustom
                            backgroundColor={'rgba(67, 121, 238, 1)'}
                            width={130}
                            title={'Save'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={handleSave}
                            loading={loading}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplicationPreferences;
