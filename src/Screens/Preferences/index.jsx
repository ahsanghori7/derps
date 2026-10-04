import Heading from "../../Components/Heading"
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import LabeledInput from "../../Components/LabeledInput";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { getRequestWithOutBody, postRequestWithBodyAndToken } from "../../Api/fetch";
import { getPublicApplicationPreferences, submitPublicApplicationStep } from "../../features/applications/api/applicationPublicApi";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import DropdownMenu from "../../Components/dropdownMenu";
import CustomDatePicker from "../../Components/CustomDatePicker";
import { Switch } from "@headlessui/react";
import CustomTimePicker from "../../Components/CustomTimePicker"
import dayjs from "dayjs";
import { APPLICATION_STEPS, isGuestSession } from "../../Utils/applicationNavigation";
import { getPreferenceOptions, getMissingRequiredPreferences, isPreferenceRequired, isPreferenceValueFilled } from "../../Utils/preferenceExtra";

const SERVICE_OPTIONS = [
    { id: 1, text: 'ATM Solutions', value: 'atm' },
    { id: 2, text: 'Credit Card Processing', value: 'credit-card' },
    { id: 3, text: 'Cash Advance', value: 'cash-advance' },
    { id: 4, text: 'Point-Of-Sale Solutions', value: 'pos' },
    { id: 5, text: 'EBT Processing', value: 'ebt' },
    { id: 6, text: 'AIRVAC Systems', value: 'airvac' },
    { id: 7, text: 'Website Services', value: 'website' },
    { id: 8, text: 'ACH Processing', value: 'ach-processing' },
];

const getServiceLabel = (solution) => {
    const normalizedSolution = (solution || "").toLowerCase();
    return SERVICE_OPTIONS.find((option) => option.value === normalizedSolution)?.text || solution;
};

const sortByOrder = (items = []) =>
    [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const getFormName = (solution) => {
    const formNameMap = {
        'credit-card': 'credit-card1',
        'atm': 'atm1',
        'cash-advance': 'cash-advance1',
        'pos': 'pos1',
        'ebt': 'ebt1',
        'airvac': 'airvac1',
        'website': 'website1',
        'ach-processing': 'ach-processing1'
    };
    return formNameMap[(solution || "").toLowerCase()] || null;
};

// Per-service preferences section of the Information step (rendered by ApplicationInformation).
const Preferences = forwardRef((props, ref) => {
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
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
            || location.state?.sixthStep?.applicationId,
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
                || location.state?.sixthStep?.applicationId,
        };
    };

    const [loading, setLoading] = useState(false);
    const [fetchedDataByApp, setFetchedDataByApp] = useState({});
    const [preferencesDataByApp, setPreferencesDataByApp] = useState({});
    const [formValuesByApp, setFormValuesByApp] = useState({});
    const [showRequiredErrors, setShowRequiredErrors] = useState(false);

    const resolvedApplications = useMemo(() => {
        if (applications.length > 0) {
            return applications;
        }

        const fallbackId =
            applicationIds[0]
            || location.state?.applicationId
            || location.state?.sixthStep?.applicationId;

        const fallbackSolution =
            location.state?.sixthStep?.solution
            || Object.values(fetchedDataByApp)[0]?.solution;

        if (fallbackId && fallbackSolution) {
            return [{ applicationId: fallbackId, solution: fallbackSolution }];
        }

        return [];
    }, [applications, applicationIds, location.state?.applicationId, location.state?.sixthStep, fetchedDataByApp]);

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

    const hasAnyPreferences = sortedApplications.some(
        (app) => (preferencesDataByApp[app.applicationId] || []).length > 0
    );

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const idsToFetch = applicationIds.length
                    ? applicationIds
                    : [location.state?.applicationId || location.state?.sixthStep?.applicationId].filter(Boolean);

                const [preferencesResult, ...applicationResults] = await Promise.all([
                    isGuest
                        ? getPublicApplicationPreferences({ tenantSlug })
                        : getRequestWithOutBody(`${baseURl}application-preferences`, accessToken),
                    // No public equivalent of `GET application/:id` is documented yet, so a
                    // guest landing directly on this step starts with blank prefill data.
                    ...idsToFetch.map((id) => (
                        isGuest
                            ? Promise.resolve(null)
                            : getRequestWithOutBody(`${baseURl}application/${id}`, accessToken)
                    )),
                ]);

                const allPreferences = sortByOrder(Array.isArray(preferencesResult?.data) ? preferencesResult.data : []);
                const dataByApp = {};
                const initialFormValues = {};
                const initialPreferencesByApp = {};

                applicationResults.forEach((result, index) => {
                    const appId = idsToFetch[index];
                    const appData = result?.data;
                    if (!appData) return;

                    dataByApp[appId] = appData;
                    initialFormValues[appId] = appData?.preferences || {};

                    const solution = appData?.solution
                        || applications.find((app) => app.applicationId === appId)?.solution;
                    const formName = getFormName(solution);
                    initialPreferencesByApp[appId] = formName
                        ? sortByOrder(allPreferences.filter((item) => item.formName === formName))
                        : [];
                });

                setFetchedDataByApp(dataByApp);
                setFormValuesByApp(initialFormValues);
                setPreferencesDataByApp(initialPreferencesByApp);
            } catch (error) {
                // keep UI usable even if one fetch fails
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [accessToken, applicationIds, location.state?.applicationId, location.state?.sixthStep?.applicationId]);

    const updateFormValue = (applicationId, fieldName, value) => {
        setFormValuesByApp((prev) => ({
            ...prev,
            [applicationId]: {
                ...(prev[applicationId] || {}),
                [fieldName]: value,
            },
        }));
    };

    const renderPreferenceField = (applicationId, item) => {
        const formValues = formValuesByApp[applicationId] || {};
        const required = isPreferenceRequired(item?.extra);
        const fieldError = showRequiredErrors
            && required
            && !isPreferenceValueFilled(item?.preference, formValues[item.name]);

        if (item?.preference === "textField") {
            return (
                <div key={`${applicationId}-${item.name}`} className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={item?.name}
                            Fontsize={16}
                            required={required}
                        />
                    </div>
                    <LabeledInput
                        inputPlaceholder={item?.name}
                        inputValue={formValues[item.name] || ""}
                        onInputChange={(e) => updateFormValue(applicationId, item.name, e.target.value)}
                        bussiness={true}
                        error={fieldError}
                    />
                </div>
            );
        }

        if (item?.preference === "dropdown") {
            return (
                <div key={`${applicationId}-${item.name}`} className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--fieldsTitle)'}
                            Heading={item?.name}
                            Fontsize={16}
                            required={required}
                        />
                    </div>
                    <DropdownMenu
                        menuItems={getPreferenceOptions(item?.extra)}
                        businessType={true}
                        defaultText={item?.name}
                        onSelect={(selectedValue) => updateFormValue(applicationId, item.name, selectedValue)}
                        selectedValue={formValues[item.name] || ""}
                        error={fieldError}
                    />
                </div>
            );
        }

        if (item?.preference === "datePicker") {
            return (
                <div key={`${applicationId}-${item.name}`} className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--fieldsTitle)'}
                            Heading={item?.name}
                            Fontsize={16}
                            required={required}
                        />
                    </div>
                    <CustomDatePicker
                        label={item?.name}
                        onChange={(selectedDate) => updateFormValue(applicationId, item.name, selectedDate)}
                        value={formValues[item.name] || null}
                        bussiness={true}
                        error={fieldError}
                    />
                </div>
            );
        }

        if (item?.preference === "timePicker") {
            return (
                <div key={`${applicationId}-${item.name}`} className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--fieldsTitle)'}
                            Heading={item?.name}
                            Fontsize={16}
                            required={required}
                        />
                    </div>
                    <div className="w-44 sm:w-80">
                        <CustomTimePicker
                            value={formValues[item.name] ? dayjs(formValues[item.name]) : null}
                            fullWidth={true}
                            onChange={(newValue) => updateFormValue(applicationId, item.name, newValue)}
                            error={fieldError}
                        />
                    </div>
                </div>
            );
        }

        if (item?.preference === "switch") {
            return (
                <div key={`${applicationId}-${item.name}`} className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--fieldsTitle)'}
                            Heading={item?.name}
                            Fontsize={16}
                            required={required}
                        />
                    </div>
                    <Switch
                        checked={formValues[item.name] || false}
                        onChange={(checked) => updateFormValue(applicationId, item.name, checked)}
                        className="group relative flex h-7 w-14 cursor-pointer rounded-full bg-[var(--dashboard-tab-inactive)] p-1 transition-colors duration-200 ease-in-out focus:outline-none data-[focus]:outline-1 data-[focus]:outline-[#0FA958] data-[checked]:bg-[#0FA958]"
                    >
                        <span
                            aria-hidden="true"
                            className="pointer-events-none inline-block size-5 translate-x-0 rounded-full bg-[var(--sidebar-text-selected)] ring-0 shadow-lg transition duration-200 ease-in-out group-data-[checked]:translate-x-7"
                        />
                    </Switch>
                </div>
            );
        }

        return null;
    };

    const validatePreferences = () => {
        for (const { applicationId, solution } of sortedApplications) {
            const fields = preferencesDataByApp[applicationId] || [];
            const values = formValuesByApp[applicationId] || {};
            const missing = getMissingRequiredPreferences(fields, values);
            if (missing.length) {
                setShowRequiredErrors(true);
                const serviceLabel = getServiceLabel(solution);
                toast.error(
                    `Please fill required field${missing.length > 1 ? 's' : ''} for ${serviceLabel}: ${missing.join(', ')}`
                );
                return false;
            }
        }
        return true;
    };

    const savePreferences = async () => {
        if (resolvedApplications.length > 1) {
            await Promise.all(
                resolvedApplications.map((app) => {
                    const apiData = {
                        currentStep: APPLICATION_STEPS.INFORMATION,
                        preferences: formValuesByApp[app.applicationId] || {},
                        ...(isGuest ? { tenantSlug } : { agentId: userData?.id }),
                        applicationId: app.applicationId,
                    };
                    return isGuest
                        ? submitPublicApplicationStep(apiData)
                        : postRequestWithBodyAndToken(`${baseURl}application`, accessToken, apiData);
                })
            );
            return {
                currentStep: APPLICATION_STEPS.INFORMATION,
                ...(isGuest ? { tenantSlug } : { agentId: userData?.id }),
                applicationIds,
                message: "Preferences saved successfully",
            };
        }

        const primaryApp = resolvedApplications[0];
        const applicationId =
            primaryApp?.applicationId
            || applicationIds[0]
            || location.state?.sixthStep?.applicationId;

        const apiData = {
            currentStep: APPLICATION_STEPS.INFORMATION,
            preferences: formValuesByApp[applicationId] || {},
            ...(isGuest ? { tenantSlug } : { agentId: userData?.id }),
            ...getApplicationPayloadFields(applicationId),
        };
        const result = isGuest
            ? await submitPublicApplicationStep(apiData)
            : await postRequestWithBodyAndToken(`${baseURl}application`, accessToken, apiData);
        return { ...apiData, message: result.message };
    };

    useImperativeHandle(ref, () => ({
        validate: validatePreferences,
        save: savePreferences,
    }));

    if (loading) {
        return (
            <div className="text-center w-full mx-auto my-20">
                <Loader message="Loading..." subMessage="Please wait" />
            </div>
        );
    }

    // Services without configured preferences simply don't show this section.
    if (!sortedApplications.length || !hasAnyPreferences) return null;

    return (
        <div className="mt-10">
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Preferences'}
                Fontsize={22}
            />
            <p
                style={{
                    fontWeight: 400,
                    fontSize: 14,
                    color: 'var(--dashboard-text-secondary)',
                    fontFamily: 'Nunito',
                    marginTop: 4,
                    marginBottom: 20,
                    lineHeight: 1.45,
                }}
            >
                Review and complete the preference settings for each selected service.
            </p>

            <div className="flex flex-col gap-8">
                {sortedApplications.map(({ applicationId, solution }) => {
                    const preferencesData = preferencesDataByApp[applicationId] || [];
                    if (!preferencesData.length) return null;
                    const serviceLabel = getServiceLabel(solution);

                    return (
                        <div key={applicationId} className="mb-2">
                            <h2
                                style={{
                                    fontWeight: 700,
                                    fontSize: 22,
                                    color: 'var(--sidebar-text-primary)',
                                    marginBottom: 4,
                                    fontFamily: 'Nunito',
                                }}
                            >
                                {serviceLabel}
                            </h2>
                            <p
                                style={{
                                    fontWeight: 400,
                                    fontSize: 14,
                                    color: 'var(--dashboard-text-secondary)',
                                    fontFamily: 'Nunito',
                                    marginBottom: 14,
                                    lineHeight: 1.45,
                                }}
                            >
                                Configure {serviceLabel} options below.
                            </p>
                            <div className="flex flex-col gap-2">
                                {preferencesData.map((item) => renderPreferenceField(applicationId, item))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default Preferences;
