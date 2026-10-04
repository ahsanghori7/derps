import Heading from "../../Components/Heading";
import ProductItem from "../../Components/ProductItem";
import { useEffect, useMemo, useState } from "react";
import Stepper from "../../Components/Stepper";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import { getRequestWithOutBody, postRequestWithBodyAndToken } from "../../Api/fetch";
import { getPublicItemCategories, getPublicItemServices, submitPublicApplicationStep } from "../../features/applications/api/applicationPublicApi";
import { baseURl } from "../../Config/systemConfig";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import BottonCustom from "../../Components/ButtonCustom";
import { HiSearch } from "react-icons/hi";
import { APPLICATION_STEPS, goToPreviousWizardStep, isGuestSession } from "../../Utils/applicationNavigation";
import { writePublicApplicationDraft } from "../../features/applications/screens/PublicApplication";
import DeviceInventoryModal from "./DeviceInventoryModal";

const MIN_VISIBLE_DEVICES = 6;

const ProductList = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
    const roleTitleNormalized = (userData?.roleTitle || "").toLowerCase();
    const isGuest = isGuestSession(location);
    const tenantSlug = location.state?.tenantSlug || null;
    const applicationIds = (() => {
        if (location.state?.applicationIds?.length) return location.state.applicationIds;
        const fromApps = (location.state?.applications || [])
            .map((app) => app.applicationId || app.id)
            .filter(Boolean);
        if (fromApps.length) return fromApps;
        return [
            location.state?.applicationId
            || location.state?.fifthStep?.applicationId,
        ].filter(Boolean);
    })();

    const applications = useMemo(() => {
        const fromState = location.state?.applications || [];
        if (fromState.length > 0) {
            return fromState.filter((app) => app?.applicationId && app?.solution);
        }
        return [];
    }, [location.state?.applications]);

    const getApplicationPayloadFields = (applicationId) => {
        if (applicationIds.length > 1) {
            return { applicationIds };
        }
        return {
            applicationId:
                applicationId
                || applicationIds[0]
                || location.state?.applicationId
                || location.state?.fifthStep?.applicationId,
        };
    };

    const [itemServicesList, setItemServicesList] = useState([]);
    const [serviceOptions, setServiceOptions] = useState([]);
    const [selectedProductIdsByApp, setSelectedProductIdsByApp] = useState({});
    const [selectedHardwaresByApp, setSelectedHardwaresByApp] = useState({});
    const [hasOwnHardwareByApp, setHasOwnHardwareByApp] = useState({});
    const [loading, setLoading] = useState(false);
    const [fetchedData, setFetchedData] = useState(null);
    const [fetchedDataByApp, setFetchedDataByApp] = useState({});
    const [searchText, setSearchText] = useState("");
    const [inventoryAppId, setInventoryAppId] = useState(null);

    const getServiceMeta = (solution) => {
        const normalizedSolution = (solution || "").toLowerCase();
        return serviceOptions.find((option) => option.value === normalizedSolution) || null;
    };

    const getServiceLabel = (solution) => getServiceMeta(solution)?.text || solution;

    const getServiceDescription = (solution) => {
        const meta = getServiceMeta(solution);
        if (meta?.description) return meta.description;
        const label = getServiceLabel(solution);
        return `Select the hardware for ${label}, or mark Already have hardware if you already own it.`;
    };

    const resolvedApplications = useMemo(() => {
        if (applications.length > 0) {
            return applications;
        }

        const fallbackId =
            applicationIds[0]
            || location.state?.applicationId
            || location.state?.fifthStep?.applicationId;

        const fallbackSolution = location.state?.fifthStep?.solution || fetchedData?.solution;
        if (fallbackId && fallbackSolution) {
            return [{ applicationId: fallbackId, solution: fallbackSolution }];
        }

        return [];
    }, [applications, applicationIds, location.state?.applicationId, location.state?.fifthStep, fetchedData?.solution]);

    // Keep the same application sequence across every wizard step (by applicationIds).
    const sortedApplications = useMemo(() => {
        if (!resolvedApplications.length) return [];
        if (!applicationIds.length) return resolvedApplications;

        const byId = new Map(
            resolvedApplications.map((app) => [String(app.applicationId), app])
        );
        const ordered = [];
        const seen = new Set();

        applicationIds.forEach((id) => {
            const key = String(id);
            const app = byId.get(key);
            if (app && !seen.has(key)) {
                ordered.push(app);
                seen.add(key);
            }
        });

        resolvedApplications.forEach((app) => {
            const key = String(app.applicationId);
            if (!seen.has(key)) {
                ordered.push(app);
                seen.add(key);
            }
        });

        return ordered;
    }, [resolvedApplications, applicationIds]);

    const applicationProductGroups = useMemo(() => {
        const search = searchText || "";
        return sortedApplications.map((app) => {
            const appSolution = (app.solution || "").toLowerCase();
            const selectedIds = new Set(
                (selectedProductIdsByApp[app.applicationId] || []).map((id) => String(id))
            );

            const matchingItems = (itemServicesList || []).filter((item) => {
                const itemSolution = (item?.category?.solution || "").toLowerCase();
                return itemSolution === appSolution;
            });

            const rankedMatching = [...matchingItems].sort((a, b) => {
                if (Boolean(a.inStock) === Boolean(b.inStock)) return 0;
                return a.inStock ? -1 : 1;
            });

            const recommendedItems = search
                ? rankedMatching.filter((item) => item.name?.toLowerCase().includes(search))
                : rankedMatching.slice(0, MIN_VISIBLE_DEVICES);
            const recommendedIds = new Set(recommendedItems.map((item) => item.id));

            const selectedExtras = (itemServicesList || []).filter((item) => {
                if (!selectedIds.has(String(item.id)) || recommendedIds.has(item.id)) return false;
                return !search || item.name?.toLowerCase().includes(search);
            });

            return {
                ...app,
                items: [...recommendedItems, ...selectedExtras],
                matchingCount: matchingItems.length,
            };
        });
    }, [sortedApplications, itemServicesList, searchText, selectedProductIdsByApp]);

    const hasCatalog = (itemServicesList || []).length > 0;

    const getItemServiceId = (hw) => hw?.itemServiceId ?? hw?.id;

    const normalizeHardwareList = (hardwareData) => {
        const list = Array.isArray(hardwareData) ? hardwareData : hardwareData ? [hardwareData] : [];
        return list.filter(Boolean);
    };

    const getActiveHardware = (hardwareData) =>
        normalizeHardwareList(hardwareData).filter((hw) => !hw?.isDeleted);

    const dedupeHardwareByItemServiceId = (hardwareData) => {
        const grouped = new Map();

        getActiveHardware(hardwareData).forEach((hw) => {
            const key = String(getItemServiceId(hw));
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(hw);
        });

        return Array.from(grouped.values()).map((records) => {
            const sorted = [...records].sort((a, b) => (b.id || 0) - (a.id || 0));
            return {
                ...sorted[0],
                itemServiceId: getItemServiceId(sorted[0]),
            };
        });
    };

    // Application hardware line id — not the catalog item id
    const getHardwareRecordId = (hw) => {
        if (!hw?.id) return null;
        const serviceId = getItemServiceId(hw);
        if (serviceId != null && String(hw.id) === String(serviceId)) return null;
        return hw.id;
    };

    const mapHardwareToPayload = (hw, applicationId, { isDeleted = false } = {}) => {
        const entry = {
            applicationId,
            itemServiceId: getItemServiceId(hw),
            pictureUrl: hw?.fileUrl || hw?.pictureUrl,
            name: hw?.name,
            price: hw?.sellingPrice ?? hw?.price,
            quantity: hw?.quantity ?? 1,
            inStock: hw?.inStock,
        };

        if (isDeleted || hw?.isDeleted) {
            entry.isDeleted = true;
        }

        const hardwareRecordId = getHardwareRecordId(hw);
        if (hardwareRecordId) {
            entry.id = hardwareRecordId;
        }

        return entry;
    };

    const getHardwareForSave = (applicationId) => {
        const appData = fetchedDataByApp[applicationId] ?? fetchedData;
        const allExisting = normalizeHardwareList(appData?.hardware);
        const hasOwnHardware = hasOwnHardwareByApp[applicationId] ?? false;
        const selectedHardwares = selectedHardwaresByApp[applicationId] || [];
        const payloadMap = new Map();

        const addPayload = (entry) => {
            const key = entry.id ?? `new-${entry.itemServiceId}-${entry.isDeleted ? "deleted" : "active"}`;
            payloadMap.set(key, entry);
        };

        if (hasOwnHardware) {
            allExisting.forEach((hw) =>
                addPayload(mapHardwareToPayload(hw, applicationId, { isDeleted: true }))
            );
            return Array.from(payloadMap.values());
        }

        const activeSelected = dedupeHardwareByItemServiceId(selectedHardwares);
        const keptItemServiceIds = new Set();

        activeSelected.forEach((hw) => {
            const itemServiceId = String(getItemServiceId(hw));
            keptItemServiceIds.add(itemServiceId);

            const existingRecords = allExisting.filter(
                (record) => String(getItemServiceId(record)) === itemServiceId
            );
            const sortedExisting = [...existingRecords].sort((a, b) => (b.id || 0) - (a.id || 0));
            const primaryId = getHardwareRecordId(hw) || getHardwareRecordId(sortedExisting[0]);

            addPayload(
                mapHardwareToPayload(
                    { ...sortedExisting[0], ...hw, id: primaryId, itemServiceId: getItemServiceId(hw) },
                    applicationId
                )
            );

            sortedExisting.forEach((record) => {
                const recordId = getHardwareRecordId(record);
                if (recordId && recordId !== primaryId) {
                    addPayload(mapHardwareToPayload(record, applicationId, { isDeleted: true }));
                }
            });
        });

        allExisting.forEach((record) => {
            const itemServiceId = String(getItemServiceId(record));
            if (!keptItemServiceIds.has(itemServiceId) && getHardwareRecordId(record)) {
                addPayload(mapHardwareToPayload(record, applicationId, { isDeleted: true }));
            }
        });

        return Array.from(payloadMap.values());
    };

    const resolveInStock = (hw) => {
        if (typeof hw?.inStock === "boolean") return hw.inStock;
        const catalogItem = itemServicesList.find(
            (item) => item.id === getItemServiceId(hw)
        );
        return catalogItem?.inStock ?? false;
    };

    const mapHardwareForApi = (hw, applicationId) => {
        const inStock = resolveInStock(hw);
        const hardwareRecordId = getHardwareRecordId(hw);
        const updated = {
            applicationId,
            itemServiceId: getItemServiceId(hw),
            pictureUrl: hw?.fileUrl ?? hw?.pictureUrl,
            name: hw?.name,
            price: hw?.sellingPrice ?? hw?.price,
            quantity: hw?.quantity,
            inStock,
            ...(hw?.isDeleted && { isDeleted: hw.isDeleted }),
        };

        if (hardwareRecordId) {
            updated.id = hardwareRecordId;
        }

        return updated;
    };

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const idsToFetch = applicationIds.length
                    ? applicationIds
                    : [location.state?.applicationId || location.state?.fifthStep?.applicationId].filter(Boolean);

                const [itemServicesResult, itemCategoryResult, ...applicationResults] = await Promise.all([
                    isGuest ? getPublicItemServices({ tenantSlug }) : getRequestWithOutBody(`${baseURl}item-services`, accessToken),
                    isGuest ? getPublicItemCategories({ tenantSlug }) : getRequestWithOutBody(`${baseURl}item-category/`, accessToken),
                    // No public equivalent of `GET application/:id` is documented yet, so a
                    // guest starts this step blank instead of prefilling from an existing application.
                    ...(isGuest ? [] : idsToFetch.map((id) => getRequestWithOutBody(`${baseURl}application/${id}`, accessToken))),
                ]);

                setItemServicesList(Array.isArray(itemServicesResult?.data) ? itemServicesResult.data : []);
                setServiceOptions(
                    (itemCategoryResult?.data || []).map((item) => ({
                        id: item.id,
                        text: item.title || item.name,
                        value: item.solution,
                        description: item.description || "",
                    }))
                );

                const dataByApp = {};
                applicationResults.forEach((result, index) => {
                    const appId = idsToFetch[index];
                    if (result?.data) {
                        dataByApp[appId] = result.data;
                    }
                });
                setFetchedDataByApp(dataByApp);

                const initialOwnHardware = {};
                const initialHardwares = {};
                const initialProductIds = {};

                Object.entries(dataByApp).forEach(([appId, appData]) => {
                    initialOwnHardware[appId] = appData?.hasOwnHardware ?? false;
                    const activeHardware = dedupeHardwareByItemServiceId(appData?.hardware);
                    initialHardwares[appId] = activeHardware;
                    initialProductIds[appId] = activeHardware.map((hw) => getItemServiceId(hw));
                });

                setHasOwnHardwareByApp(initialOwnHardware);
                setSelectedHardwaresByApp(initialHardwares);
                setSelectedProductIdsByApp(initialProductIds);

                const primaryId = idsToFetch[0];
                const primaryData = primaryId ? dataByApp[primaryId] : null;
                setFetchedData(primaryData);
            } catch (error) {
                // keep UI usable even if one fetch fails
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [accessToken, applicationIds, location.state?.applicationId, location.state?.fifthStep?.applicationId, isGuest, tenantSlug]);

    useEffect(() => {
        if (!itemServicesList?.length) return;
        setSelectedHardwaresByApp((prev) => {
            const next = { ...prev };
            let changed = false;

            Object.entries(prev).forEach(([appId, hardwareList]) => {
                if (!hardwareList?.length) return;
                next[appId] = hardwareList.map((hw) => {
                    const serviceId = getItemServiceId(hw);
                    const catalogItem = itemServicesList.find((item) => item.id === serviceId);
                    if (!catalogItem) return hw;
                    changed = true;
                    return {
                        ...hw,
                        itemServiceId: serviceId,
                        inStock: hw.inStock ?? catalogItem.inStock,
                        sellingPrice: hw.sellingPrice ?? hw.price ?? catalogItem.sellingPrice,
                        fileUrl: hw.fileUrl ?? catalogItem.fileUrl,
                    };
                });
            });

            return changed ? next : prev;
        });
    }, [itemServicesList]);

    const handleAddToCart = (applicationId, item, quantity) => {
        const itemId = item.id;
        const selectedProductIds = selectedProductIdsByApp[applicationId] || [];
        const isAlreadySelected = selectedProductIds.includes(itemId);

        if (isAlreadySelected) {
            setSelectedProductIdsByApp((prev) => ({
                ...prev,
                [applicationId]: (prev[applicationId] || []).filter((id) => id !== itemId),
            }));
            setSelectedHardwaresByApp((prev) => ({
                ...prev,
                [applicationId]: (prev[applicationId] || []).flatMap((hw) => {
                    if (String(getItemServiceId(hw)) !== String(itemId)) return [hw];
                    if (hw?.id) return [{ ...hw, isDeleted: true }];
                    return [];
                }),
            }));
            toast.info("Product removed from cart");
        } else {
            setSelectedProductIdsByApp((prev) => ({
                ...prev,
                [applicationId]: [...(prev[applicationId] || []).filter((id) => id !== itemId), itemId],
            }));
            setSelectedHardwaresByApp((prev) => {
                const current = prev[applicationId] || [];
                const existingIndex = current.findIndex(
                    (hw) => String(getItemServiceId(hw)) === String(itemId)
                );
                const updatedList = existingIndex >= 0
                    ? current.map((hw, index) =>
                        index === existingIndex
                            ? {
                                ...hw,
                                ...item,
                                itemServiceId: itemId,
                                inStock: item.inStock,
                                quantity,
                                isDeleted: false,
                            }
                            : hw
                    )
                    : [
                        ...current,
                        {
                            ...item,
                            itemServiceId: itemId,
                            inStock: item.inStock,
                            quantity,
                            isDeleted: false,
                        },
                    ];

                return { ...prev, [applicationId]: updatedList };
            });
            toast.success("Product added to cart");
        }
    };

    const handleUpdateQuantity = (applicationId, item, quantity) => {
        const itemId = item.id;
        const selectedProductIds = selectedProductIdsByApp[applicationId] || [];
        if (selectedProductIds.includes(itemId)) {
            setSelectedHardwaresByApp((prev) => ({
                ...prev,
                [applicationId]: (prev[applicationId] || []).map((hw) =>
                    String(getItemServiceId(hw)) === String(itemId) && !hw.isDeleted
                        ? { ...hw, quantity }
                        : hw
                ),
            }));
        }
    };

    const handlePreviousClick = () => {
        goToPreviousWizardStep(navigate, {
            pathname: location.pathname,
            roleTitle: userData?.roleTitle,
            state: location.state,
        });
    };

    const handleHasOwnHardwareChange = (applicationId, checked) => {
        setHasOwnHardwareByApp((prev) => ({ ...prev, [applicationId]: checked }));
        if (checked) {
            setSelectedProductIdsByApp((prev) => ({ ...prev, [applicationId]: [] }));
            setSelectedHardwaresByApp((prev) => ({ ...prev, [applicationId]: [] }));
        }
    };

    const validateProductSelection = () => {
        const missingServices = sortedApplications
            .filter((app) => {
                const hasOwn = hasOwnHardwareByApp[app.applicationId];
                if (hasOwn) return false;
                const activeCount = getActiveHardware(selectedHardwaresByApp[app.applicationId] || []).length;
                return activeCount === 0;
            })
            .map((app) => getServiceLabel(app.solution));

        if (missingServices.length > 0) {
            toast.error(`Select a product or own hardware for ${missingServices.join(", ")}`);
            return false;
        }

        return true;
    };

    const saveProducts = async () => {
        if (resolvedApplications.length > 1) {
            await Promise.all(
                resolvedApplications.map((app) => {
                    const payload = {
                        currentStep: APPLICATION_STEPS.HARDWARE,
                        hardware: getHardwareForSave(app.applicationId),
                        hasOwnHardware: hasOwnHardwareByApp[app.applicationId] ?? false,
                        ...(isGuest ? { tenantSlug } : { agentId: userData?.id }),
                        applicationId: app.applicationId,
                    };
                    return isGuest
                        ? submitPublicApplicationStep(payload)
                        : postRequestWithBodyAndToken(`${baseURl}application`, accessToken, payload);
                })
            );
            return {
                currentStep: APPLICATION_STEPS.HARDWARE,
                hasOwnHardwareByApp,
                hasOwnHardware: resolvedApplications.every(
                    (app) => hasOwnHardwareByApp[app.applicationId]
                ),
                ...(isGuest ? { tenantSlug } : { agentId: userData?.id }),
                applicationIds,
            };
        }

        const primaryApp = resolvedApplications[0];
        const applicationId =
            primaryApp?.applicationId
            || applicationIds[0]
            || location.state?.fifthStep?.applicationId;
        const apiData = {
            currentStep: APPLICATION_STEPS.HARDWARE,
            hardware: getHardwareForSave(applicationId),
            hasOwnHardware: hasOwnHardwareByApp[applicationId] ?? false,
            ...(isGuest ? { tenantSlug } : { agentId: userData?.id }),
            ...getApplicationPayloadFields(applicationId),
        };
        if (isGuest) {
            await submitPublicApplicationStep(apiData);
        } else {
            await postRequestWithBodyAndToken(`${baseURl}application`, accessToken, apiData);
        }
        return apiData;
    };

    const handleButtonClick = async () => {
        if (!validateProductSelection()) {
            return;
        }
        setLoading(true);
        try {
            const apiData = await saveProducts();
            const navigationState = {
                firstStep: location.state?.firstStep,
                secondStep: location.state?.secondStep,
                thirdStep: location.state?.thirdStep,
                fourthStep: location.state?.fourthStep,
                fifthStep: location.state?.fifthStep,
                sixthStep: apiData,
                seventhStep: location.state?.seventhStep,
                hasOwnHardware: apiData.hasOwnHardware,
                hasOwnHardwareByApp,
                applications: sortedApplications,
                applicationIds,
                applicationId: applicationIds[0] || location.state?.applicationId || location.state?.fifthStep?.applicationId,
                isDuplicate: location.state?.isDuplicate,
                sourceApplicationId: location.state?.sourceApplicationId,
                duplicateFrom: location.state?.duplicateFrom,
                ...(isGuest && { tenantSlug }),
            };

            if (isGuest) {
                writePublicApplicationDraft({ tenantSlug, applicationId: navigationState.applicationId, applicationIds });
                navigate(`/apply/${tenantSlug}/shipmentAndPickup`, { state: navigationState });
            } else if (roleTitleNormalized === "agent") {
                navigate('/userdashboard/shipmentAndPickup', { state: navigationState });
            } else {
                navigate('/home/shipmentAndPickup', { state: navigationState });
            }
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveClick = async () => {
        if (!validateProductSelection()) {
            return;
        }
        setLoading(true);
        try {
            await saveProducts();
            toast.success('Save in draft');
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Application'}
                Fontsize={30}
            />
            <div className="w-full " style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ marginTop: 10, paddingTop: 40, borderRadius: 14 }} className="sm:m-8 p-3 pt-4 sm:p-2 m-2">
                    <Stepper activeStep={APPLICATION_STEPS.HARDWARE - 1} />
                    {loading ? (
                        <div className="text-center w-full mx-auto my-20">
                            <Loader message="Loading..." subMessage="Please wait" />
                        </div>
                    ) : (
                        <div>
                            <div
                                style={{
                                    borderRadius: 8,
                                    backgroundColor: 'var(--dashboard-tab-box)',
                                    height: 40,
                                    borderColor: 'var(--dashboard-border)',
                                    borderWidth: 1,
                                }}
                                className="w-52 lg:w-96 max-w-96 mt-8 relative bg-[var(--scroll-thumb)] gap-2 items-center rounded-full flex-grow flex ml-4"
                            >
                                <HiSearch className="text-[22px] text-dashboard-card-text-primary-light dark:text-dashboard-card-text-primary-dark ml-3" />
                                <input
                                    type="text"
                                    placeholder="Search by Name"
                                    className="bg-transparent outline-none text-[14px] p-1 notranslate"
                                    style={{ width: 388, color: 'var(--dashboard-text-primary)' }}
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value.toLowerCase())}
                                />
                            </div>
                            <div className="mt-4 overflow-auto max-h-[calc(100vh-100px)] ml-4 mr-2">
                                {!sortedApplications.length || !hasCatalog ? (
                                    <NoDataFound title="No Data Found" description="No hardware found." />
                                ) : (
                                    applicationProductGroups.map(({ applicationId, solution, items, matchingCount }) => {
                                        const hasOwnHardware = hasOwnHardwareByApp[applicationId] ?? false;
                                        const selectedProductIds = selectedProductIdsByApp[applicationId] || [];
                                        const selectedHardwares = selectedHardwaresByApp[applicationId] || [];
                                        const serviceLabel = getServiceLabel(solution);
                                        const showingLimited = !searchText && matchingCount > MIN_VISIBLE_DEVICES;

                                        return (
                                            <div key={applicationId} className="mb-8">
                                                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 mb-4 pr-2">
                                                    <div style={{ flex: 1, minWidth: 200 }}>
                                                        <h2 style={{
                                                            fontWeight: 700,
                                                            fontSize: 22,
                                                            color: 'var(--sidebar-text-primary)',
                                                            marginBottom: 4,
                                                        }}>
                                                            {serviceLabel}
                                                        </h2>
                                                        <p style={{
                                                            fontWeight: 400,
                                                            fontSize: 14,
                                                            color: 'var(--dashboard-text-secondary)',
                                                            fontFamily: 'Nunito',
                                                            margin: 0,
                                                            lineHeight: 1.45,
                                                        }}>
                                                            {getServiceDescription(solution)}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => setInventoryAppId(applicationId)}
                                                            disabled={hasOwnHardware}
                                                            title="Browse all available devices"
                                                            style={{
                                                                color: 'var(--sidebar-text-selected)',
                                                                backgroundColor: 'var(--sidebar-selected-bg)',
                                                                border: 'none',
                                                                borderRadius: 10,
                                                                padding: '10px 14px',
                                                                fontSize: 15,
                                                                fontWeight: 600,
                                                                fontFamily: 'Nunito',
                                                                cursor: hasOwnHardware ? 'not-allowed' : 'pointer',
                                                                opacity: hasOwnHardware ? 0.5 : 1,
                                                            }}
                                                        >
                                                            Device Inventory
                                                        </button>
                                                        <label
                                                            htmlFor={`hasOwnHardware-${applicationId}`}
                                                            title="I already have the required hardware and do not need to purchase any"
                                                            className="flex items-center gap-3 cursor-pointer"
                                                            style={{
                                                                color: 'var(--dashboard-text-primary)',
                                                                fontSize: 15,
                                                                fontWeight: 600,
                                                                fontFamily: 'Nunito',
                                                                backgroundColor: 'var(--dashboard-tab-box)',
                                                                border: '1px solid var(--dashboard-border)',
                                                                borderRadius: 10,
                                                                padding: '10px 14px',
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                id={`hasOwnHardware-${applicationId}`}
                                                                checked={hasOwnHardware}
                                                                onChange={(e) => handleHasOwnHardwareChange(applicationId, e.target.checked)}
                                                                style={{
                                                                    width: 20,
                                                                    height: 20,
                                                                    accentColor: 'var(--dashboard-tab-active)',
                                                                    cursor: 'pointer',
                                                                    flexShrink: 0,
                                                                }}
                                                            />
                                                            <span>Already have hardware</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                {items.length === 0 ? (
                                                    <div
                                                        style={{
                                                            opacity: hasOwnHardware ? 0.5 : 1,
                                                            pointerEvents: hasOwnHardware ? 'none' : 'auto',
                                                        }}
                                                    >
                                                        <NoDataFound
                                                            title="No recommended devices"
                                                            description={`No matching hardware found for ${serviceLabel}. Open Device Inventory to browse all available devices.`}
                                                            actionLabel="Device Inventory"
                                                            onAction={() => setInventoryAppId(applicationId)}
                                                        />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                flexWrap: 'wrap',
                                                                gap: 16,
                                                                opacity: hasOwnHardware ? 0.5 : 1,
                                                                pointerEvents: hasOwnHardware ? 'none' : 'auto',
                                                            }}
                                                        >
                                                            {items.map((item) => (
                                                                <ProductItem
                                                                    key={`${applicationId}-${item.id}`}
                                                                    data={item}
                                                                    addToCart={(product, quantity) => handleAddToCart(applicationId, product, quantity)}
                                                                    isSelected={selectedProductIds.includes(item.id)}
                                                                    updateQuantity={(product, quantity) => handleUpdateQuantity(applicationId, product, quantity)}
                                                                    quantityFromParent={
                                                                        getActiveHardware(selectedHardwares).find(
                                                                            (hw) => String(getItemServiceId(hw)) === String(item.id)
                                                                        )?.quantity || 1
                                                                    }
                                                                />
                                                            ))}
                                                        </div>
                                                        <div
                                                            className="mt-4 flex flex-wrap items-center justify-between gap-3"
                                                            style={{
                                                                opacity: hasOwnHardware ? 0.5 : 1,
                                                                pointerEvents: hasOwnHardware ? 'none' : 'auto',
                                                            }}
                                                        >
                                                            <p style={{
                                                                fontWeight: 400,
                                                                fontSize: 13,
                                                                color: 'var(--dashboard-text-secondary)',
                                                                fontFamily: 'Nunito',
                                                                margin: 0,
                                                            }}>
                                                                {showingLimited
                                                                    ? `Showing ${MIN_VISIBLE_DEVICES} of ${matchingCount} devices for this service. Open Device Inventory to browse all devices.`
                                                                    : 'Need a different device? Open Device Inventory to browse the full catalog.'}
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => setInventoryAppId(applicationId)}
                                                                style={{
                                                                    color: 'var(--dashboard-tab-active)',
                                                                    backgroundColor: 'transparent',
                                                                    border: '1px solid var(--dashboard-tab-active)',
                                                                    borderRadius: 10,
                                                                    padding: '8px 14px',
                                                                    fontSize: 14,
                                                                    fontWeight: 600,
                                                                    fontFamily: 'Nunito',
                                                                    cursor: 'pointer',
                                                                    whiteSpace: 'nowrap',
                                                                }}
                                                            >
                                                                All Devices
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                    <div style={{ display: '' }} className="flex justify-between flex-wrap mr-6 mt-20 gap-3" >
                        <BottonCustom
                            backgroundColor={'var(--dashboard-card-bg2)'}
                            width={130}
                            title={'Previous'}
                            height={40}
                            color={'var(--dashboard-text-primary)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={handlePreviousClick}
                        />
                        <div className="flex gap-2 flex-row flex-wrap">
                            {!isGuest && (
                                <BottonCustom
                                    backgroundColor={'var(--sidebar-selected-bg)'}
                                    width={130}
                                    title={'Save'}
                                    height={40}
                                    color={'var(--sidebar-text-selected)'}
                                    fontSize={16}
                                    fontWeight={500}
                                    onClick={handleSaveClick}
                                />
                            )}
                            <BottonCustom
                                backgroundColor={'var(--sidebar-selected-bg)'}
                                width={130}
                                title={'Next'}
                                height={40}
                                color={'var(--sidebar-text-selected)'}
                                fontSize={16}
                                fontWeight={500}
                                onClick={handleButtonClick}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <DeviceInventoryModal
                isOpen={Boolean(inventoryAppId)}
                onClose={() => setInventoryAppId(null)}
                items={itemServicesList}
                serviceOptions={serviceOptions}
                selectedProductIds={selectedProductIdsByApp[inventoryAppId] || []}
                selectedHardwares={selectedHardwaresByApp[inventoryAppId] || []}
                getItemServiceId={getItemServiceId}
                getActiveHardware={getActiveHardware}
                onAddToCart={(item, quantity) => handleAddToCart(inventoryAppId, item, quantity)}
                onUpdateQuantity={(item, quantity) => handleUpdateQuantity(inventoryAppId, item, quantity)}
                serviceLabel={getServiceLabel(
                    sortedApplications.find((app) => String(app.applicationId) === String(inventoryAppId))?.solution
                )}
            />
        </div>
    );
};

export default ProductList;
