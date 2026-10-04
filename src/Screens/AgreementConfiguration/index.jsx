import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { IoIosArrowBack } from "react-icons/io";
import { FaCheck, FaLayerGroup, FaRegFilePdf } from "react-icons/fa6";
import { FiSettings, FiGrid } from "react-icons/fi";
import { LuShield } from "react-icons/lu";
import DropdownMenu from "../../Components/dropdownMenu";
import MultiSelectDropdown from "../../Components/MultiSelectDropdown";
import { toast } from "react-toastify";
import {
    getRequestWithOutBody,
    postRequestWithBodyAndToken,
    putRequestWithBodyAndToken,
} from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";

const STEPS = ["Service", "Relationship", "Conditions", "Agreement", "Preview"];

const RELATIONSHIP_TYPES = [
    {
        id: "service_only",
        label: "Service Only",
        description: "Agreement always shows when this service is selected.",
        Icon: FaLayerGroup,
    },
    {
        id: "service_plan",
        label: "Service + Plan",
        description: "Agreement is triggered when a specific plan is chosen.",
        Icon: LuShield,
    },
    {
        id: "service_hardware",
        label: "Service + Hardware",
        description: "Agreement is triggered based on selected hardware.",
        Icon: FiSettings,
    },
    {
        id: "service_plan_hardware",
        label: "Service + Hardware + Plan",
        description: "Agreement is triggered when both a specific plan and hardware are chosen.",
        Icon: FiGrid,
    },
];

const SelectField = ({ label, required, value, onChange, options, error, placeholder = "--select --" }) => {
    const menuItems = options.map((opt) => ({ id: opt.value, title: opt.label }));
    const selectedLabel = options.find((opt) => String(opt.value) === String(value))?.label;

    return (
        <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="max-w-md">
                <DropdownMenu
                    menuItems={menuItems}
                    idSet
                    defaultText={placeholder}
                    selectedValue={selectedLabel}
                    onSelect={(id) => onChange(String(id))}
                    fullWidth
                    searchable
                    error={error}
                />
            </div>
            {error && <p className="mt-1 text-xs text-red-500">This field is required</p>}
        </div>
    );
};

const ReadOnlyField = ({ label, value }) => (
    <div className="mb-5">
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
        <div className="max-w-md rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
            {value}
        </div>
    </div>
);

const Stepper = ({ activeStep }) => (
    <div className="flex items-start justify-center px-2 pt-8 pb-6 sm:px-10">
        {STEPS.map((label, index) => {
            const isCompleted = index < activeStep;
            const isActive = index === activeStep;
            return (
                <div key={label} className={`flex items-start ${index > 0 ? "flex-1" : ""}`}>
                    {index > 0 && (
                        <div
                            className={`mt-3.5 h-px flex-1 mx-1 sm:mx-2 ${
                                isCompleted || isActive ? "bg-blue-500" : "bg-gray-300"
                            }`}
                        />
                    )}
                    <div className="flex w-14 sm:w-20 flex-col items-center">
                        <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                                isCompleted || isActive
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-400 border border-gray-300"
                            }`}
                        >
                            {isCompleted ? <FaCheck size={11} /> : index + 1}
                        </div>
                        <span
                            className={`mt-1.5 text-[11px] text-center ${
                                isActive ? "text-blue-600 font-semibold" : "text-gray-400"
                            }`}
                        >
                            {label}
                        </span>
                    </div>
                </div>
            );
        })}
    </div>
);

const StepHeading = ({ title, subtitle }) => (
    <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </div>
);

const AgreementConfiguration = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);

    const editRule = location.state?.editRule || null;
    const isEdit = Boolean(editRule?.id);

    const [activeStep, setActiveStep] = useState(0);
    const [errors, setErrors] = useState({});

    const [services, setServices] = useState([]);
    const [plans, setPlans] = useState([]);
    const [items, setItems] = useState([]);
    const [agreements, setAgreements] = useState([]);

    const [serviceId, setServiceId] = useState(() => {
        const rc = editRule?.ruleCategories?.[0];
        return rc ? String(rc.categoryId ?? rc.category?.id ?? "") : "";
    });
    const [relationship, setRelationship] = useState(() => {
        if (editRule?.rulePlans?.length && editRule?.ruleItems?.length) return "service_plan_hardware";
        if (editRule?.rulePlans?.length) return "service_plan";
        if (editRule?.ruleItems?.length) return "service_hardware";
        return "service_only";
    });
    const [planId, setPlanId] = useState("");
    const [selectedHardwareItems, setSelectedHardwareItems] = useState([]);
    const [selectedAgreements, setSelectedAgreements] = useState([]);
    const [ruleTitle, setRuleTitle] = useState(editRule?.title || "");
    const [saving, setSaving] = useState(false);

    // Prefill plan/hardware selections once the lists are loaded (edit mode)
    useEffect(() => {
        if (!editRule?.rulePlans?.length || !plans.length) return;
        const rp = editRule.rulePlans[0];
        const planName = rp?.plan?.name || (typeof rp?.plan === "string" ? rp.plan : rp?.name);
        const solution = editRule?.ruleCategories?.[0]?.category?.solution;
        const match = plans.find(
            (p) => p.name === planName && (!solution || p.service === solution)
        );
        if (match) setPlanId(String(match.id));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plans]);

    useEffect(() => {
        if (!editRule?.ruleItems?.length || !items.length) return;
        const ids = editRule.ruleItems
            .map((ri) => ri?.itemServiceId ?? ri?.item?.id)
            .filter(Boolean)
            .map(String);
        const matched = items.filter((i) => ids.includes(String(i.id)));
        if (matched.length) setSelectedHardwareItems(matched);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    useEffect(() => {
        if (!editRule?.ruleAgreements?.length || !agreements.length) return;
        const ids = editRule.ruleAgreements
            .map((ra) => ra?.agreementId ?? ra?.agreement?.id)
            .filter(Boolean)
            .map(String);
        const matched = agreements.filter((a) => ids.includes(String(a.id)));
        if (matched.length) setSelectedAgreements(matched);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [agreements]);

    useEffect(() => {
        if (!accessToken) return;

        getRequestWithOutBody(`${baseURl}item-category/`, accessToken)
            .then((result) => {
                const list =
                    result?.data?.data
                    || result?.data?.results
                    || (Array.isArray(result?.data) ? result.data : [])
                    || [];
                setServices(
                    (Array.isArray(list) ? list : []).map((item) => ({
                        id: item.id,
                        title: item.title || item.name || "",
                        name: item.name || item.title || "",
                        solution: item.solution || "",
                    }))
                );
            })
            .catch(() => setServices([]));

        getRequestWithOutBody(`${baseURl}price-plan`, accessToken)
            .then((result) => {
                const list =
                    result?.data?.data
                    || result?.data?.results
                    || (Array.isArray(result?.data) ? result.data : [])
                    || [];
                setPlans(Array.isArray(list) ? list : []);
            })
            .catch(() => setPlans([]));

        getRequestWithOutBody(`${baseURl}item-services`, accessToken)
            .then((result) => {
                const list =
                    result?.data?.data
                    || result?.data?.results
                    || (Array.isArray(result?.data) ? result.data : [])
                    || [];
                setItems(Array.isArray(list) ? list : []);
            })
            .catch(() => setItems([]));

        getRequestWithOutBody(`${baseURl}agreement?paginate=true&page=1`, accessToken)
            .then((result) => {
                const rows =
                    result?.data?.data
                    || result?.data?.results
                    || (Array.isArray(result?.data) ? result.data : [])
                    || [];
                setAgreements(Array.isArray(rows) ? rows : []);
            })
            .catch(() => setAgreements([]));
    }, [accessToken]);

    const selectedService = useMemo(
        () => services.find((s) => String(s.id) === String(serviceId)),
        [services, serviceId]
    );

    // plan.service holds the category's solution slug (e.g. "atm", "credit-card")
    const filteredPlans = useMemo(
        () => plans.filter((p) => p?.service === selectedService?.solution),
        [plans, selectedService]
    );

    const filteredItems = useMemo(
        () =>
            items.filter(
                (i) =>
                    String(i?.categoryId) === String(selectedService?.id) ||
                    i?.category?.solution === selectedService?.solution
            ),
        [items, selectedService]
    );

    const selectedPlan = useMemo(
        () => filteredPlans.find((p) => String(p.id) === String(planId)),
        [filteredPlans, planId]
    );

    const serviceName = selectedService?.title || selectedService?.name || "";

    const relationshipLabel = useMemo(
        () => RELATIONSHIP_TYPES.find((r) => r.id === relationship)?.label ?? "",
        [relationship]
    );

    const selectedAgreementNames = useMemo(
        () => selectedAgreements.map((a) => a.title).filter(Boolean).join(", "),
        [selectedAgreements]
    );

    const clearError = (field) =>
        setErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));

    const needsPlan = relationship === "service_plan" || relationship === "service_plan_hardware";
    const needsHardware = relationship === "service_hardware" || relationship === "service_plan_hardware";

    const validateStep = () => {
        const fieldErrors = {};
        if (activeStep === 0 && !serviceId) fieldErrors.service = true;
        if (activeStep === 2) {
            if (needsPlan && !planId) fieldErrors.plan = true;
            if (needsHardware && !selectedHardwareItems.length) fieldErrors.item = true;
        }
        if (activeStep === 3 && !selectedAgreements.length) fieldErrors.agreement = true;
        if (activeStep === 4 && !ruleTitle.trim()) fieldErrors.ruleTitle = true;

        setErrors(fieldErrors);
        return Object.keys(fieldErrors).length === 0;
    };

    const goBackToList = () =>
        navigate("/home/supportSetup", { state: { tab: "agreements", agreementSubTab: "rules" } });

    const handleSave = async () => {
        try {
            setSaving(true);
            const payload = {
                title: ruleTitle.trim(),
                categoryIds: [Number(serviceId)],
                agreementIds: selectedAgreements.map((a) => Number(a.id)),
                plans: needsPlan && selectedPlan ? [selectedPlan.name] : [],
                items: needsHardware
                    ? selectedHardwareItems.map((i) => ({ itemServiceId: Number(i.id) }))
                    : [],
            };
            const result = isEdit
                ? await putRequestWithBodyAndToken(`${baseURl}agreement-rule/${editRule.id}`, accessToken, payload)
                : await postRequestWithBodyAndToken(`${baseURl}agreement-rule`, accessToken, payload);
            toast.success(
                result?.message ||
                    (isEdit ? "Agreement rule updated successfully" : "Agreement rule created successfully")
            );
            goBackToList();
        } catch (error) {
            toast.error(error?.message || "Failed to save agreement rule");
        } finally {
            setSaving(false);
        }
    };

    const handleContinue = () => {
        if (!validateStep()) return;
        if (activeStep < STEPS.length - 1) {
            if (activeStep === 3 && !ruleTitle.trim()) {
                setRuleTitle([serviceName, selectedAgreementNames].filter(Boolean).join(" - "));
            }
            setActiveStep((s) => s + 1);
        } else {
            handleSave();
        }
    };

    const handleBack = () => {
        setErrors({});
        if (activeStep === 0) {
            goBackToList();
        } else {
            setActiveStep((s) => s - 1);
        }
    };

    const renderServiceStep = () => (
        <>
            <StepHeading
                title="Select Service"
                subtitle="Choose the service this agreement rule applies to."
            />
            <SelectField
                label="Service"
                required
                value={serviceId}
                onChange={(val) => {
                    setServiceId(val);
                    setPlanId("");
                    setSelectedHardwareItems([]);
                    clearError("service");
                }}
                options={services.map((s) => ({
                    value: s.id,
                    label: s.title || s.name || "",
                }))}
                error={errors.service}
            />
            {serviceName && (
                <div className="flex max-w-md items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                        <FaCheck size={10} />
                    </span>
                    <p className="text-sm text-gray-600">
                        Selected: <span className="font-semibold text-blue-700">{serviceName}</span>
                    </p>
                </div>
            )}
        </>
    );

    const renderRelationshipStep = () => (
        <>
            <StepHeading title="Relationship Type" subtitle="Define how this agreement is triggered." />
            <div className="flex max-w-md flex-col gap-3">
                {RELATIONSHIP_TYPES.map(({ id, label, description, Icon }) => {
                    const selected = relationship === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => {
                                setRelationship(id);
                                setPlanId("");
                                setSelectedHardwareItems([]);
                            }}
                            className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
                                selected
                                    ? "border-blue-400 bg-blue-50/60 shadow-sm"
                                    : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                        >
                            <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                    selected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
                                }`}
                            >
                                <Icon size={16} />
                            </span>
                            <span className="flex-1">
                                <span className="block text-sm font-semibold text-gray-900">{label}</span>
                                <span className="block text-xs text-gray-500 mt-0.5">{description}</span>
                            </span>
                            {selected && (
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                                    <FaCheck size={9} />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </>
    );

    const renderConditionsStep = () => (
        <>
            <StepHeading
                title="Configure Conditions"
                subtitle="This agreement will always be shown for the selected service."
            />
            <ReadOnlyField label="Service" value={serviceName || "--"} />

            {relationship === "service_only" && (
                <div className="max-w-md rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                    <p className="text-sm text-blue-800">
                        This agreement will be shown to every customer who selects{" "}
                        <span className="font-semibold">{serviceName}</span>, regardless of plan or hardware.
                    </p>
                </div>
            )}

            {needsPlan && (
                <>
                    <SelectField
                        label="Plan"
                        required
                        value={planId}
                        onChange={(val) => {
                            setPlanId(val);
                            clearError("plan");
                        }}
                        options={filteredPlans.map((p) => ({ value: p.id, label: p.name }))}
                        error={errors.plan}
                    />
                    {!filteredPlans.length && (
                        <p className="max-w-md text-xs text-gray-400 mb-3">
                            No plans found for {serviceName || "this service"}.
                        </p>
                    )}
                </>
            )}

            {needsHardware && (
                <>
                    <div className="mb-5">
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Hardware Items <span className="text-red-500">*</span>
                        </label>
                        <div className="max-w-md">
                            <MultiSelectDropdown
                                menuItems={filteredItems}
                                selectedValue={selectedHardwareItems}
                                onChange={(items) => {
                                    setSelectedHardwareItems(items);
                                    clearError("item");
                                }}
                                defaultText="--select --"
                                eventScreen
                                error={errors.item}
                            />
                        </div>
                        {errors.item && (
                            <p className="mt-1 text-xs text-red-500">This field is required</p>
                        )}
                    </div>
                    {!filteredItems.length && (
                        <p className="max-w-md text-xs text-gray-400">
                            No hardware items found for {serviceName || "this service"}.
                        </p>
                    )}
                </>
            )}
        </>
    );

    const renderAgreementStep = () => (
        <>
            <StepHeading
                title="Select Agreement"
                subtitle="Choose from the agreement library."
            />
            <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Agreement <span className="text-red-500">*</span>
                </label>
                <div className="max-w-md">
                    <MultiSelectDropdown
                        menuItems={agreements}
                        selectedValue={selectedAgreements}
                        onChange={(items) => {
                            setSelectedAgreements(items);
                            clearError("agreement");
                        }}
                        defaultText="--select --"
                        eventScreen
                        error={errors.agreement}
                    />
                </div>
                {errors.agreement && (
                    <p className="mt-1 text-xs text-red-500">This field is required</p>
                )}
            </div>

            {selectedAgreements.length > 0 && (
                <div className="flex max-w-md flex-col gap-2">
                    {selectedAgreements.map((agreement) => (
                        <div
                            key={agreement.id}
                            className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3"
                        >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-green-200 text-red-500">
                                <FaRegFilePdf size={15} />
                            </span>
                            <span>
                                <span className="block text-sm font-semibold text-green-800">
                                    {agreement.title}
                                </span>
                                <span className="block text-xs text-green-600 mt-0.5">Ready to assign</span>
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    const previewRows = useMemo(() => {
        const rows = [
            { label: "SERVICE", value: serviceName },
            { label: "RELATIONSHIP", value: relationshipLabel },
        ];
        if (needsPlan) rows.push({ label: "PLAN", value: selectedPlan?.name });
        if (needsHardware)
            rows.push({
                label: "HARDWARE",
                value: selectedHardwareItems.map((i) => i.name).join(", "),
            });
        rows.push({ label: "AGREEMENT", value: selectedAgreementNames });
        return rows;
    }, [serviceName, relationshipLabel, needsPlan, needsHardware, selectedPlan, selectedHardwareItems, selectedAgreementNames]);

    const renderPreviewStep = () => (
        <>
            <StepHeading title="Preview" subtitle="Review the complete rule before saving." />
            <div className="mb-5 max-w-xl">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Rule Title <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={ruleTitle}
                    onChange={(e) => {
                        setRuleTitle(e.target.value);
                        clearError("ruleTitle");
                    }}
                    placeholder="Enter rule title"
                    className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-blue-500 ${
                        errors.ruleTitle ? "border-red-400" : "border-gray-300"
                    }`}
                />
                {errors.ruleTitle && (
                    <p className="mt-1 text-xs text-red-500">This field is required</p>
                )}
            </div>
            <div className="max-w-xl overflow-hidden rounded-xl border border-gray-200">
                <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
                    <span className="text-xs font-semibold tracking-wider text-gray-500">SUMMARY</span>
                </div>
                {previewRows.map((row) => (
                    <div key={row.label} className="flex items-center border-b border-gray-100 px-5 py-3.5">
                        <span className="w-40 shrink-0 text-xs font-semibold tracking-wider text-gray-400">
                            {row.label}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{row.value || "--"}</span>
                    </div>
                ))}
                <div className="flex items-center px-5 py-3.5">
                    <span className="w-40 shrink-0 text-xs font-semibold tracking-wider text-gray-400">
                        STATUS
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Active
                    </span>
                </div>
            </div>
        </>
    );

    const stepRenderers = [
        renderServiceStep,
        renderRelationshipStep,
        renderConditionsStep,
        renderAgreementStep,
        renderPreviewStep,
    ];

    return (
        <div
            style={{ marginTop: -65, backgroundColor: "var(--dashboard-bg)", minHeight: "100vh" }}
            className="p-3 sm:p-5"
        >
            <div
                className="mb-4 flex items-center gap-3"
                style={{ position: "relative", zIndex: 2 }}
            >
                <button
                    type="button"
                    onClick={goBackToList}
                    aria-label="Go back"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50"
                    style={{ position: "relative", zIndex: 2200 }}
                >
                    <IoIosArrowBack size={18} />
                </button>
                <h1
                    className="text-2xl font-bold"
                    style={{ color: "var(--sidebar-text-primary)", fontFamily: "Nunito" }}
                >
                    {isEdit ? "Edit Agreement" : "Create Agreement"}
                </h1>
            </div>

            <div
                className="mx-auto flex min-h-[78vh] flex-col rounded-2xl p-4 sm:p-8"
                style={{ backgroundColor: "var(--dashboard-card-bg)" }}
            >
                <Stepper activeStep={activeStep} />

                <div className="flex-1">{stepRenderers[activeStep]()}</div>

                <div className="mt-10 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                        {activeStep === 0 ? "Cancel" : "Back"}
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={handleContinue}
                        className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {activeStep === STEPS.length - 1
                            ? saving
                                ? "Saving..."
                                : isEdit
                                    ? "Update"
                                    : "Save"
                            : "Continue"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgreementConfiguration;
