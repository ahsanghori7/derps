import { useEffect, useMemo, useState } from 'react';
import Heading from '../../Components/Heading';
import { styled } from '@mui/material/styles';
import { IoIosArrowBack } from 'react-icons/io';
import BottonCustom from '../../Components/ButtonCustom';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import Loader from '../../Components/Loader';
import CrmDynamicField from '../../Components/CrmDynamicField';
import { usePageTitle } from '../../Hooks/usePageTitle';
import {
    buildInitialFormValues,
    createOpportunityFormSubmission,
    fetchPublishedOpportunityMainFormDefinition,
    getFieldValueKey,
    getFormDefinitionId,
    getRenderableSections,
    isHeadingField,
    mapApiDefinitionToFormState,
    normalizeFieldType,
    getDynamicFormValidation,
} from '../SalesFormBuilder/formDefinitionApi';

const SectionTabs = styled('div')({
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'nowrap',
    overflowX: 'auto',
    borderBottom: '1px solid #E5E7EB',
    marginBottom: 24,
});

const NewOpportunity = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();
    const location = useLocation();
    const recordType = location.state?.recordType || 'Credit Card Processing';

    const [formDefinition, setFormDefinition] = useState(null);
    const [formValues, setFormValues] = useState({});
    const [activeSectionId, setActiveSectionId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [maxReachedTabIndex, setMaxReachedTabIndex] = useState(0);
    const [fieldErrors, setFieldErrors] = useState({});

    const pageTitle = formDefinition?.name || 'New Opportunity';
    usePageTitle(pageTitle, location);

    const sections = useMemo(
        () => getRenderableSections(formDefinition || {}),
        [formDefinition]
    );

    const useTabLayout = sections.length > 1;

    const allTabSections = useMemo(
        () => (useTabLayout ? sections : []),
        [useTabLayout, sections]
    );

    const activeTabSection = useMemo(
        () => allTabSections.find((section) => section.id === activeSectionId) || sections[0] || null,
        [allTabSections, activeSectionId, sections]
    );

    const activeTabIndex = useMemo(
        () => Math.max(0, allTabSections.findIndex((section) => section.id === activeTabSection?.id)),
        [allTabSections, activeTabSection]
    );

    const isLastTab = useTabLayout && activeTabIndex === allTabSections.length - 1;

    const activeDynamicSection = useMemo(
        () => sections[0] || null,
        [sections]
    );

    const hasDynamicFields = useMemo(
        () => sections.some((section) => (section.fields || []).some(
            (field) => !isHeadingField(normalizeFieldType(field.type))
        )),
        [sections]
    );

    useEffect(() => {
        if (!accessToken) return;

        const loadForm = async () => {
            setLoading(true);
            try {
                const apiItem = await fetchPublishedOpportunityMainFormDefinition(accessToken);
                const mapped = mapApiDefinitionToFormState(apiItem, 'opportunities');
                const renderSections = getRenderableSections(mapped);
                setFormDefinition(mapped);
                setFormValues(buildInitialFormValues(renderSections));
                setActiveSectionId(renderSections[0]?.id || null);
                setMaxReachedTabIndex(0);
            } catch (error) {
                toast.error(error.message || 'Failed to load opportunity form');
                setFormDefinition(null);
                setFormValues({});
                setActiveSectionId(null);
            } finally {
                setLoading(false);
            }
        };

        loadForm();
    }, [accessToken]);

    const clearFieldError = (key) => {
        setFieldErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const applyValidationResult = (sectionsToValidate) => {
        const { errors, invalidFieldKeys } = getDynamicFormValidation(sectionsToValidate, formValues);
        setFieldErrors(invalidFieldKeys);
        return errors;
    };

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
        const errors = applyValidationResult(sections);
        if (errors.length > 0) {
            showValidationErrors(errors);
            return;
        }

        setSubmitting(true);
        try {
            const formDefinitionId = getFormDefinitionId(formDefinition);

            if (!formDefinitionId) {
                toast.error('Opportunity form definition not found');
                return;
            }

            const result = await createOpportunityFormSubmission({
                recordType,
                formDefinitionId,
                sections,
                formValues,
                token: accessToken,
            });

            toast.success(result?.message || 'Opportunity created successfully');
            navigate(-1);
        } catch (error) {
            toast.error(error.message || 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    const handleTabNext = async () => {
        const currentSection = allTabSections[activeTabIndex];
        const errors = applyValidationResult([currentSection]);
        if (errors.length > 0) {
            showValidationErrors(errors);
            return;
        }

        if (!isLastTab) {
            const nextIndex = activeTabIndex + 1;
            setActiveSectionId(allTabSections[nextIndex].id);
            setMaxReachedTabIndex((prev) => Math.max(prev, nextIndex));
            return;
        }

        setSubmitting(true);
        try {
            const formDefinitionId = getFormDefinitionId(formDefinition);
            if (!formDefinitionId) {
                toast.error('Opportunity form definition not found');
                return;
            }

            const result = await createOpportunityFormSubmission({
                recordType,
                formDefinitionId,
                sections,
                formValues,
                token: accessToken,
            });

            toast.success(result?.message || 'Opportunity created successfully');
            navigate(-1);
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

    const renderSectionFields = (section) => {
        const fields = section?.fields || [];
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
                <div>
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={pageTitle}
                        Fontsize={30}
                    />
                    <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6B7280' }}>
                        Record Type: {recordType}
                    </p>
                </div>
            </div>

            <div className="w-full" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ borderRadius: 14 }} className="sm:m-2 p-3 sm:p-4 m-2">
                    {loading ? (
                        <div className="py-16">
                            <Loader
                                message="Loading opportunity form..."
                                subMessage="Please wait"
                            />
                        </div>
                    ) : (
                        <>
                            {useTabLayout ? (
                                <>
                                    {!hasDynamicFields ? (
                                        <div className="py-8 text-center text-sm" style={{ color: '#6B7280' }}>
                                            No opportunity form fields found. Please configure the form in Sales Form Builder.
                                        </div>
                                    ) : (
                                        <>
                                            <SectionTabs>
                                        {allTabSections.map((section, index) => {
                                            const isAccessible = index <= maxReachedTabIndex;
                                            const isActive = activeTabSection?.id === section.id;

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
                                        {activeTabSection && renderSectionFields(activeTabSection)}
                                    </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    {!hasDynamicFields ? (
                                        <div className="py-8 text-center text-sm" style={{ color: '#6B7280' }}>
                                            No opportunity form fields found. Please configure the form in Sales Form Builder.
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-4">
                                            {activeDynamicSection && (
                                                <Heading
                                                    Fontweight={600}
                                                    color={'var(--sidebar-text-primary)'}
                                                    Heading={`${activeDynamicSection.title}:`}
                                                    Fontsize={18}
                                                />
                                            )}
                                            {activeDynamicSection && renderSectionFields(activeDynamicSection)}
                                        </div>
                                    )}
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
                                    : (useTabLayout && !isLastTab ? 'Next' : 'Save')
                            }
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={useTabLayout ? handleTabNext : handleSubmit}
                            disabled={submitting || loading || !hasDynamicFields}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewOpportunity;
