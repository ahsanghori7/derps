import { useCallback, useEffect, useMemo, useState } from 'react';
import Heading from '../../Components/Heading';
import { styled } from '@mui/material/styles';
import { IoIosArrowBack } from 'react-icons/io';
import BottonCustom from '../../Components/ButtonCustom';
import DropdownMenu from '../../Components/dropdownMenu';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import Loader from '../../Components/Loader';
import CrmDynamicField from '../../Components/CrmDynamicField';
import { getRequestWithOutBody, getRequestWithOutBodyCached } from '../../Api/fetch';
import { baseURl } from '../../Config/systemConfig';
import {
    buildInitialFormValues,
    createLead,
    createLeadFormSubmission,
    DEFAULT_LEAD_SECTION,
    DEFAULT_LEAD_SERVICE_OPTIONS,
    fetchLeadById,
    fetchPublishedLeadFormDefinition,
    getDynamicLeadSections,
    getFieldValueKey,
    getFormDefinitionId,
    getRenderableSections,
    isHeadingField,
    isSystemLeadField,
    mapApiDefinitionToFormState,
    mapLeadRecordToFormValues,
    mergeAddLeadSections,
    normalizeFieldType,
    saveLeadFormSubmission,
    updateLead,
    getDynamicFormValidation,
} from '../SalesFormBuilder/formDefinitionApi';

const ASSIGN_TO_FIELD_KEY = '__assignTo__';

const SectionTabs = styled('div')({
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'nowrap',
    overflowX: 'auto',
    borderBottom: '1px solid #E5E7EB',
    marginBottom: 24,
});

const AddLeads = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
    const navigate = useNavigate();
    const location = useLocation();
    const editLeadId = location.state?.mode === 'edit' ? location.state?.leadId : null;
    const isEditMode = Boolean(editLeadId);

    const isAdmin = (userData?.roleTitle || '').toLowerCase() === 'admin'
        || (userData?.roleTitle || '').toLowerCase() === 'human resource';

    const [formDefinition, setFormDefinition] = useState(null);
    const [formValues, setFormValues] = useState({});
    const [activeSectionId, setActiveSectionId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [createdLeadId, setCreatedLeadId] = useState(null);
    const [maxReachedTabIndex, setMaxReachedTabIndex] = useState(0);
    const [userList, setUserList] = useState([]);
    const [selectedAgentId, setSelectedAgentId] = useState(
        () => (userData?.id ? String(userData.id) : '')
    );
    const [fieldErrors, setFieldErrors] = useState({});
    const [serviceOptions, setServiceOptions] = useState(DEFAULT_LEAD_SERVICE_OPTIONS);

    const defaultLeadSection = useMemo(
        () => ({
            ...DEFAULT_LEAD_SECTION,
            fields: (DEFAULT_LEAD_SECTION.fields || []).map((field) =>
                field.apiName === 'services'
                    ? { ...field, type: 'multiselect', options: serviceOptions }
                    : field
            ),
        }),
        [serviceOptions]
    );

    const dynamicSections = useMemo(
        () => getDynamicLeadSections(getRenderableSections(formDefinition || {})),
        [formDefinition]
    );

    const sections = useMemo(
        () => [defaultLeadSection, ...dynamicSections],
        [defaultLeadSection, dynamicSections]
    );

    const useTabLayout = dynamicSections.length > 1;

    const allTabSections = useMemo(
        () => (useTabLayout ? [defaultLeadSection, ...dynamicSections] : []),
        [useTabLayout, defaultLeadSection, dynamicSections]
    );

    const activeTabSection = useMemo(
        () => allTabSections.find((section) => section.id === activeSectionId) || defaultLeadSection,
        [allTabSections, activeSectionId, defaultLeadSection]
    );

    const activeTabIndex = useMemo(
        () => Math.max(0, allTabSections.findIndex((section) => section.id === activeTabSection.id)),
        [allTabSections, activeTabSection]
    );

    const isFirstTab = activeTabIndex === 0;
    const isLastTab = useTabLayout && activeTabIndex === allTabSections.length - 1;

    const hasDynamicFields = useMemo(
        () => dynamicSections.some((section) => (section.fields || []).some(
            (field) => !isHeadingField(normalizeFieldType(field.type))
        )),
        [dynamicSections]
    );

    const fetchUsers = useCallback(() => {
        if (!accessToken) return;

        getRequestWithOutBodyCached(`${baseURl}user`, accessToken)
            .then((result) => {
                const activeUsers = result?.data?.results?.filter((user) => user.status === 'active') || [];
                setUserList(activeUsers);
            })
            .catch(() => {});
    }, [accessToken]);

    const fetchServices = useCallback(() => {
        if (!accessToken) return;

        getRequestWithOutBody(`${baseURl}item-category/`, accessToken)
            .then((result) => {
                const list =
                    result?.data?.data
                    || result?.data?.results
                    || (Array.isArray(result?.data) ? result.data : [])
                    || [];
                const options = (Array.isArray(list) ? list : [])
                    .map((item) => {
                        const label = item.title || item.name || '';
                        return {
                            label,
                            value: label,
                        };
                    })
                    .filter((opt) => opt.label && opt.value);

                if (options.length) {
                    setServiceOptions(options);
                }
            })
            .catch(() => {});
    }, [accessToken]);

    useEffect(() => {
        fetchUsers();
        fetchServices();
    }, [fetchUsers, fetchServices]);

    const resolveAgentId = () => (isAdmin ? selectedAgentId : userData?.id);

    const clearFieldError = (key) => {
        setFieldErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const applyValidationResult = (sectionsToValidate, includeAssignTo = false) => {
        const { errors, invalidFieldKeys } = getDynamicFormValidation(sectionsToValidate, formValues);
        const nextFieldErrors = { ...invalidFieldKeys };

        if (includeAssignTo && isAdmin && !selectedAgentId) {
            nextFieldErrors[ASSIGN_TO_FIELD_KEY] = true;
            errors.push('Assign To is required');
        }

        setFieldErrors(nextFieldErrors);
        return errors;
    };

    const validateAssignTo = () => {
        if (isAdmin && !selectedAgentId) {
            setFieldErrors((prev) => ({ ...prev, [ASSIGN_TO_FIELD_KEY]: true }));
            return false;
        }
        return true;
    };

    useEffect(() => {
        if (!accessToken) return;

        const loadForm = async () => {
            setLoading(true);
            try {
                const apiItem = await fetchPublishedLeadFormDefinition(accessToken);
                const mapped = mapApiDefinitionToFormState(apiItem, 'leads');
                const renderSections = mergeAddLeadSections(getRenderableSections(mapped));
                setFormDefinition(mapped);

                let initialValues = buildInitialFormValues(renderSections);

                if (isEditMode) {
                    const { lead, forms } = await fetchLeadById(editLeadId, accessToken);
                    if (!lead) {
                        throw new Error('Lead not found');
                    }
                    initialValues = mapLeadRecordToFormValues(renderSections, lead, forms);
                    setCreatedLeadId(editLeadId);
                    const agentId = lead?.agentId ?? lead?.agent?.id ?? '';
                    setSelectedAgentId(agentId ? String(agentId) : '');
                } else if (userData?.id) {
                    setSelectedAgentId(String(userData.id));
                }

                setFormValues(initialValues);
                const dynamicOnly = getDynamicLeadSections(renderSections);
                const tabSections =
                    dynamicOnly.length > 1 ? [DEFAULT_LEAD_SECTION, ...dynamicOnly] : [];

                setActiveSectionId(
                    dynamicOnly.length > 1
                        ? DEFAULT_LEAD_SECTION.id
                        : dynamicOnly[0]?.id || null
                );
                setMaxReachedTabIndex(
                    isEditMode && tabSections.length > 1 ? tabSections.length - 1 : 0
                );
            } catch (error) {
                toast.error(error.message || 'Failed to load lead form');
                const fallbackSections = mergeAddLeadSections([]);
                setFormDefinition(null);
                setFormValues(buildInitialFormValues(fallbackSections));
                setActiveSectionId(null);
                setCreatedLeadId(null);
                setMaxReachedTabIndex(0);
            } finally {
                setLoading(false);
            }
        };

        loadForm();
    }, [accessToken, editLeadId, isEditMode]);

    useEffect(() => {
        if (isEditMode || !userData?.id) return;
        setSelectedAgentId((prev) => prev || String(userData.id));
    }, [isEditMode, userData?.id]);

    const updateFieldValue = (field, nextValue) => {
        const key = getFieldValueKey(field);
        if (!key) return;
        setFormValues((prev) => ({ ...prev, [key]: nextValue }));
        clearFieldError(key);
    };

    const showValidationErrors = (errors) => {
        toast.error(
            <div>
                Please fix the following errors:
                <ul className="list-disc pl-4 mt-1">
                    {errors.map((error) => (
                        <li key={error}>{error}</li>
                    ))}
                </ul>
            </div>
        );
    };

    const handleSubmit = async () => {
        const errors = applyValidationResult(sections, isAdmin);
        if (errors.length > 0) {
            showValidationErrors(errors);
            return;
        }

        setSubmitting(true);
        try {
            const formDefinitionId = getFormDefinitionId(formDefinition);
            const agentId = resolveAgentId();

            if (isEditMode) {
                await updateLead({
                    leadId: editLeadId,
                    formValues,
                    token: accessToken,
                    agentId,
                });

                if (hasDynamicFields) {
                    if (!formDefinitionId) {
                        toast.error('Lead form definition not found');
                        return;
                    }

                    await saveLeadFormSubmission({
                        leadId: editLeadId,
                        formDefinitionId,
                        sections,
                        formValues,
                        token: accessToken,
                    });
                }

                toast.success('Lead updated successfully');
                navigate(-1);
                return;
            }

            if (hasDynamicFields) {
                if (!formDefinitionId) {
                    toast.error('Lead form definition not found');
                    return;
                }

                const result = await createLeadFormSubmission({
                    formDefinitionId,
                    sections,
                    formValues,
                    token: accessToken,
                    agentId,
                });

                toast.success(result.message || 'Lead created successfully');
            } else {
                await createLead({
                    formValues,
                    token: accessToken,
                    agentId,
                });
                toast.success('Lead created successfully');
            }

            navigate(-1);
        } catch (error) {
            toast.error(error.message || 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    const handleTabNext = async () => {
        const currentSection = allTabSections[activeTabIndex];
        const errors = applyValidationResult([currentSection], isFirstTab && isAdmin);
        if (errors.length > 0) {
            showValidationErrors(errors);
            return;
        }

        setSubmitting(true);
        try {
            const agentId = resolveAgentId();

            if (isFirstTab && !createdLeadId && !isEditMode) {
                const { leadId } = await createLead({
                    formValues,
                    token: accessToken,
                    agentId,
                });
                setCreatedLeadId(leadId);
                toast.success('Lead details saved');
            }

            if (isLastTab) {
                if (!validateAssignTo()) {
                    showValidationErrors(['Assign To is required']);
                    return;
                }

                const formDefinitionId = getFormDefinitionId(formDefinition);
                if (hasDynamicFields && !formDefinitionId) {
                    toast.error('Lead form definition not found');
                    return;
                }

                const leadId = isEditMode
                    ? editLeadId
                    : createdLeadId || (await createLead({
                        formValues,
                        token: accessToken,
                        agentId,
                    })).leadId;

                if (isEditMode) {
                    await updateLead({
                        leadId,
                        formValues,
                        token: accessToken,
                        agentId,
                    });
                }

                if (hasDynamicFields) {
                    const result = await saveLeadFormSubmission({
                        leadId,
                        formDefinitionId,
                        sections,
                        formValues,
                        token: accessToken,
                    });

                    toast.success(
                        result?.message
                            || (isEditMode ? 'Lead updated successfully' : 'Lead created successfully')
                    );
                } else {
                    toast.success(isEditMode ? 'Lead updated successfully' : 'Lead created successfully');
                }

                navigate(-1);
                return;
            }

            const nextIndex = activeTabIndex + 1;
            setActiveSectionId(allTabSections[nextIndex].id);
            setMaxReachedTabIndex((prev) => Math.max(prev, nextIndex));
        } catch (error) {
            toast.error(error.message || 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    const handleTabBack = () => {
        if (activeTabIndex <= 0) return;
        setActiveSectionId(allTabSections[activeTabIndex - 1].id);
    };

    const handleTabClick = (section, index) => {
        if (index <= maxReachedTabIndex) {
            setActiveSectionId(section.id);
        }
    };

    const renderAssignToField = () => {
        if (!isAdmin) return null;

        return (
            <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48 shrink-0">
                    <Heading
                        Fontweight={500}
                        color={'var(--sidebar-text-primary)'}
                        Heading={'Assign To'}
                        Fontsize={16}
                        required={true}
                    />
                </div>
                <div className="w-full sm:w-80 min-w-0">
                    <DropdownMenu
                        menuItems={userList}
                        idSet={true}
                        searchable={true}
                        fullWidth={true}
                        defaultText={'Select Agent'}
                        error={Boolean(fieldErrors[ASSIGN_TO_FIELD_KEY])}
                        onSelect={(val) => {
                            setSelectedAgentId(val);
                            clearFieldError(ASSIGN_TO_FIELD_KEY);
                        }}
                        selectedValue={userList?.find((u) => String(u?.id) === String(selectedAgentId))?.name || ''}
                    />
                </div>
            </div>
        );
    };

    const renderSectionFields = (section) => {
        const fields = (section?.fields || []).filter((field) => !isSystemLeadField(field));
        const groups = [];
        let currentGroup = [];

        fields.forEach((field) => {
            if (isHeadingField(normalizeFieldType(field.type))) {
                if (currentGroup.length) {
                    groups.push({ type: 'fields', items: currentGroup });
                    currentGroup = [];
                }
                groups.push({ type: 'heading', label: field.label });
                return;
            }
            currentGroup.push(field);
        });

        if (currentGroup.length) {
            groups.push({ type: 'fields', items: currentGroup });
        }

        return groups.map((group, index) => {
            if (group.type === 'heading') {
                return (
                    <Heading
                        key={`heading-${index}`}
                        Fontweight={600}
                        color={'var(--sidebar-text-primary)'}
                        Heading={`${group.label}:`}
                        Fontsize={16}
                    />
                );
            }

            return (
                <div key={`fields-${index}`} className="flex flex-col gap-4">
                    {group.items.map((field) => (
                        <CrmDynamicField
                            key={field.id}
                            field={field}
                            value={formValues[getFieldValueKey(field)]}
                            onChange={(nextValue) => updateFieldValue(field, nextValue)}
                            error={Boolean(fieldErrors[getFieldValueKey(field)])}
                        />
                    ))}
                </div>
            );
        });
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
                        marginTop: 4,
                    }}
                >
                    <IoIosArrowBack size={18} color="var(--dashboard-text-secondary)" />
                </Button>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={isEditMode ? 'Edit Lead' : 'Add Lead'}
                    Fontsize={30}
                />
            </div>

            <div className="w-full" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ borderRadius: 14 }} className="sm:m-2 p-3 sm:p-4 m-2">
                    {loading ? (
                        <div className="py-16">
                            <Loader
                                message={isEditMode ? 'Loading lead...' : 'Loading lead form...'}
                                subMessage="Please wait"
                            />
                        </div>
                    ) : (
                        <>
                            {useTabLayout ? (
                                <>
                                    <SectionTabs>
                                        {allTabSections.map((section, index) => {
                                            const isAccessible = index <= maxReachedTabIndex;
                                            const isActive = activeTabSection.id === section.id;

                                            return (
                                                <button
                                                    key={section.id}
                                                    type="button"
                                                    disabled={!isAccessible}
                                                    className={`pb-2 px-4 text-sm font-medium whitespace-nowrap shrink-0 ${
                                                        isActive
                                                            ? 'border-b-2 border-blue-600 text-blue-600'
                                                            : isAccessible
                                                                ? 'text-gray-600 hover:text-[#0C79F7]'
                                                                : 'text-gray-400 cursor-not-allowed'
                                                    }`}
                                                    onClick={() => handleTabClick(section, index)}
                                                >
                                                    {section.title}
                                                </button>
                                            );
                                        })}
                                    </SectionTabs>

                                    <div className="flex flex-col gap-4">
                                        {renderSectionFields(activeTabSection)}
                                        {activeTabSection.id === defaultLeadSection.id && renderAssignToField()}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-4 mb-6">
                                        <Heading
                                            Fontweight={600}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={`${defaultLeadSection.title}:`}
                                            Fontsize={18}
                                        />
                                        {renderSectionFields(defaultLeadSection)}
                                        {renderAssignToField()}
                                    </div>

                                    {hasDynamicFields && dynamicSections.map((section) => (
                                        <div key={section.id} className="flex flex-col gap-4">
                                            <Heading
                                                Fontweight={600}
                                                color={'var(--sidebar-text-primary)'}
                                                Heading={`${section.title}:`}
                                                Fontsize={18}
                                            />
                                            {renderSectionFields(section)}
                                        </div>
                                    ))}
                                </>
                            )}
                        </>
                    )}

                    <div className="flex justify-end gap-3 mt-8 pt-4 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                        <BottonCustom
                            backgroundColor={'transparent'}
                            width={130}
                            title={'Cancel'}
                            height={40}
                            color={'var(--dashboard-text-primary)'}
                            fontSize={16}
                            fontWeight={500}
                            border={'1px solid var(--sidebar-selected-bg)'}
                            onClick={() => navigate(-1)}
                        />
                        {useTabLayout && activeTabIndex > 0 && (
                            <BottonCustom
                                backgroundColor={'transparent'}
                                width={130}
                                title={'Back'}
                                height={40}
                                color={'var(--dashboard-text-primary)'}
                                fontSize={16}
                                fontWeight={500}
                                border={'1px solid var(--sidebar-selected-bg)'}
                                onClick={handleTabBack}
                                disabled={submitting || loading}
                            />
                        )}
                        <BottonCustom
                            backgroundColor={'rgba(67, 121, 238, 1)'}
                            width={130}
                            title={
                                submitting
                                    ? 'Saving...'
                                    : (useTabLayout && !isLastTab
                                        ? 'Next'
                                        : (isEditMode ? 'Update' : 'Save'))
                            }
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={useTabLayout ? handleTabNext : handleSubmit}
                            disabled={submitting || loading}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddLeads;
