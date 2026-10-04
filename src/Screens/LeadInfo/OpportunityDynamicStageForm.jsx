import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Box, Typography, Button } from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import Loader from '../../Components/Loader';
import CrmDynamicField from '../../Components/CrmDynamicField';
import Heading from '../../Components/Heading';
import CustomDatePicker from '../../Components/CustomDatePicker';
import {
    getOpportunityStageFormConfig,
    fetchOpportunityFormSubmissionByDefinition,
    fetchPublishedStageFormDefinition,
    findFormSubmissionForDefinition,
    formSubmissionHasSavedData,
    getFieldValueKey,
    getFormDefinitionId,
    getRenderableSections,
    isHeadingField,
    isQuotationTab,
    isTerminalPipelineStageIndex,
    mapApiDefinitionToFormState,
    mapOpportunityRecordToFormValues,
    normalizeFieldType,
    extractQuotationNotesFromFormValues,
    fetchCrmQuotationByOpportunity,
    mapCrmQuotationLineItemsToState,
    parseQuotationValidUntilFromApi,
    formatDateForApi,
    pickPrimaryOpportunityQuotation,
    saveCrmQuotation,
    saveOpportunityFormSubmission,
    getDynamicFormValidation,
} from '../SalesFormBuilder/formDefinitionApi';
import OpportunityStageSummary from './OpportunityStageSummary';
import OpportunityQuotationProducts, {
    getDefaultQuotationProductsState,
    validateQuotationProductsLines,
} from './OpportunityQuotationProducts';

const formatQuotationValidUntilDisplay = (value) => {
    if (!value) return '—';
    const normalized = parseQuotationValidUntilFromApi(value) || formatDateForApi(value);
    if (!normalized) return value;
    const date = new Date(`${normalized}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const getQuotationValidUntilErrors = (validUntil) => {
    if (!String(validUntil || '').trim()) {
        return ['Valid Until is required'];
    }
    return [];
};

const normalizeSubmissionList = (submission, definitionId) => {
    if (!submission) return [];

    const payload = submission?.data ?? submission;

    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        return [{ data: payload, formDefinitionId: definitionId }];
    }

    if (Array.isArray(payload)) return payload;

    return [];
};

const OpportunityDynamicStageForm = forwardRef(({
    activeStage = 0,
    terminalOutcome = null,
    opportunityId,
    accessToken,
    opportunityRecord = null,
    opportunityForms = [],
    opportunityQuotations = [],
    onSubmissionSaved,
    onValidityChange,
    readOnly = false,
}, ref) => {
    const stageConfig = getOpportunityStageFormConfig(activeStage, terminalOutcome);
    const tabKey = stageConfig?.tabKey;
    const loadRequestRef = useRef(0);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formDefinition, setFormDefinition] = useState(null);
    const [formValues, setFormValues] = useState({});
    const [hasPersistedSubmission, setHasPersistedSubmission] = useState(false);
    const [quotationLines, setQuotationLines] = useState(
        () => getDefaultQuotationProductsState().lines
    );
    const [quotationValidUntil, setQuotationValidUntil] = useState('');
    const [quotationProductsShowErrors, setQuotationProductsShowErrors] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [savedQuotationId, setSavedQuotationId] = useState(null);
    const [savedQuotationStatus, setSavedQuotationStatus] = useState(null);
    const [isEditingQuotationProducts, setIsEditingQuotationProducts] = useState(false);

    const isQuotationStage = isQuotationTab(tabKey);

    const quotationId = useMemo(() => {
        if (savedQuotationId) return savedQuotationId;
        const primary = pickPrimaryOpportunityQuotation(opportunityQuotations);
        return primary?.id ?? primary?._id ?? null;
    }, [savedQuotationId, opportunityQuotations]);

    const quotationStatus = useMemo(() => {
        if (savedQuotationStatus) return savedQuotationStatus;
        const primary = pickPrimaryOpportunityQuotation(opportunityQuotations);
        return primary?.status ?? null;
    }, [savedQuotationStatus, opportunityQuotations]);

    const isQuotationAccepted = ['accepted', 'approved'].includes(
        String(quotationStatus || '').toLowerCase()
    );
    const canEditQuotationValidUntil = Boolean(quotationId)
        ? isEditingQuotationProducts && !isQuotationAccepted
        : !readOnly;

    const sections = useMemo(
        () => getRenderableSections(formDefinition || {}),
        [formDefinition]
    );

    const hasFields = useMemo(
        () => sections.some((section) =>
            (section.fields || []).some(
                (field) => !isHeadingField(normalizeFieldType(field.type))
            )
        ),
        [sections]
    );

    const quotationProductsErrors = useMemo(() => {
        if (!isQuotationStage) return [];
        return validateQuotationProductsLines(quotationLines);
    }, [isQuotationStage, quotationLines]);

    const quotationValidUntilErrors = useMemo(() => {
        if (!isQuotationStage) return [];
        return getQuotationValidUntilErrors(quotationValidUntil);
    }, [isQuotationStage, quotationValidUntil]);

    const hasSavedQuotationLines = useMemo(
        () =>
            quotationLines.some(
                (line) => line?.itemServiceId != null && line.itemServiceId !== ''
            ),
        [quotationLines]
    );

    const showValidUntilError =
        quotationProductsShowErrors && quotationValidUntilErrors.length > 0;

    const isFormValid = useMemo(() => {
        if (loading) return false;

        if (isTerminalPipelineStageIndex(activeStage) && hasPersistedSubmission) {
            return true;
        }

        if (isQuotationStage && (quotationProductsErrors.length > 0 || quotationValidUntilErrors.length > 0)) {
            return false;
        }

        if (!formDefinition || !hasFields) {
            return true;
        }

        return getDynamicFormValidation(sections, formValues).errors.length === 0;
    }, [
        loading,
        formDefinition,
        hasFields,
        sections,
        formValues,
        activeStage,
        hasPersistedSubmission,
        isQuotationStage,
        quotationProductsErrors,
        quotationValidUntilErrors,
    ]);

    useEffect(() => {
        if (quotationProductsErrors.length === 0 && quotationValidUntilErrors.length === 0) {
            setQuotationProductsShowErrors(false);
        }
    }, [quotationProductsErrors, quotationValidUntilErrors]);

    useEffect(() => {
        onValidityChange?.(isFormValid);
    }, [isFormValid, onValidityChange]);

    useEffect(() => {
        setFormDefinition(null);
        setFormValues({});
        setHasPersistedSubmission(false);
        const defaults = getDefaultQuotationProductsState();
        setQuotationLines(defaults.lines);
        setQuotationValidUntil('');
        setFieldErrors({});
        setSavedQuotationId(null);
        setSavedQuotationStatus(null);
        setLoading(Boolean(accessToken && tabKey && opportunityId));
    }, [tabKey, opportunityId, accessToken]);

    const persistQuotationStage = useCallback(async ({
        sectionsToSave = [],
        formValuesToSave = {},
    } = {}) => {
        const formDefinitionId = getFormDefinitionId(formDefinition);

        // Form definition is optional for quotation — products/services can still be saved.
        if (formDefinitionId) {
            await saveOpportunityFormSubmission({
                opportunityId,
                formDefinitionId,
                sections: sectionsToSave,
                formValues: formValuesToSave,
                token: accessToken,
            });
        }

        await saveCrmQuotation({
            opportunityId,
            quotationId,
            lines: quotationLines,
            notes: extractQuotationNotesFromFormValues(formValuesToSave),
            validUntil: quotationValidUntil,
            status: quotationStatus || 'draft',
            token: accessToken,
        }).then((result) => {
            const newId =
                result?.data?.id
                ?? result?.data?._id
                ?? result?.id
                ?? result?._id
                ?? quotationId
                ?? null;
            const newStatus =
                result?.data?.status
                ?? result?.status
                ?? quotationStatus
                ?? 'draft';
            if (newId) setSavedQuotationId(newId);
            if (newStatus) setSavedQuotationStatus(newStatus);
            return result;
        });
    }, [
        formDefinition,
        opportunityId,
        accessToken,
        quotationId,
        quotationStatus,
        quotationLines,
        quotationValidUntil,
    ]);

    const loadStageForm = useCallback(async () => {
        if (!accessToken || !tabKey || !opportunityId) {
            setFormDefinition(null);
            setFormValues({});
            setHasPersistedSubmission(false);
            setLoading(false);
            return;
        }

        const requestId = ++loadRequestRef.current;
        setLoading(true);

        const applyQuotationRecord = (quotation) => {
            if (!quotation || typeof quotation !== 'object') return [];

            const nextId = quotation.id ?? quotation._id ?? null;
            if (nextId) setSavedQuotationId(nextId);
            if (quotation.status) setSavedQuotationStatus(quotation.status);
            if (quotation.validUntil) {
                setQuotationValidUntil(
                    parseQuotationValidUntilFromApi(quotation.validUntil)
                );
            }

            return mapCrmQuotationLineItemsToState(
                quotation.lineItems ?? quotation.items ?? quotation.lines
            );
        };

        const hydrateQuotationStage = async () => {
            if (!isQuotationTab(tabKey)) return;

            const embeddedQuotation = pickPrimaryOpportunityQuotation(opportunityQuotations);
            const embeddedLines = applyQuotationRecord(embeddedQuotation);

            if (embeddedLines.length > 0) {
                setQuotationLines(embeddedLines);
                return;
            }

            try {
                const existingQuotation = await fetchCrmQuotationByOpportunity(
                    opportunityId,
                    accessToken
                );
                if (requestId !== loadRequestRef.current) return;

                const mappedLines = applyQuotationRecord(existingQuotation);
                setQuotationLines(
                    mappedLines.length > 0
                        ? mappedLines
                        : getDefaultQuotationProductsState().lines
                );
            } catch {
                if (requestId !== loadRequestRef.current) return;
                setQuotationLines(getDefaultQuotationProductsState().lines);
            }
        };

        try {
            const apiItem = await fetchPublishedStageFormDefinition(tabKey, accessToken);

            if (requestId !== loadRequestRef.current) return;

            if (!apiItem) {
                setFormDefinition(null);
                setFormValues({});
                setHasPersistedSubmission(false);
                // Quotation products/status still load even when stage form is unpublished.
                await hydrateQuotationStage();
                return;
            }

            const mapped = mapApiDefinitionToFormState(apiItem, tabKey);
            const renderSections = getRenderableSections(mapped);
            const definitionId = getFormDefinitionId(mapped);

            let submissions = opportunityForms;

            const cachedSubmission = findFormSubmissionForDefinition(opportunityForms, definitionId);
            if (!cachedSubmission && definitionId) {
                try {
                    const remoteSubmission = await fetchOpportunityFormSubmissionByDefinition(
                        opportunityId,
                        definitionId,
                        accessToken
                    );
                    submissions = [
                        ...opportunityForms,
                        ...normalizeSubmissionList(remoteSubmission, definitionId),
                    ];
                } catch {
                    submissions = opportunityForms;
                }
            }

            const values = mapOpportunityRecordToFormValues(
                renderSections,
                opportunityRecord || {},
                submissions
            );

            if (requestId !== loadRequestRef.current) return;

            const persistedSubmission = findFormSubmissionForDefinition(submissions, definitionId);

            setFormDefinition(mapped);
            setFormValues(values);
            setHasPersistedSubmission(
                isTerminalPipelineStageIndex(activeStage)
                && formSubmissionHasSavedData(persistedSubmission)
            );

            await hydrateQuotationStage();
        } catch (error) {
            if (requestId !== loadRequestRef.current) return;
            toast.error(error.message || 'Failed to load stage form');
            setFormDefinition(null);
            setFormValues({});
            setHasPersistedSubmission(false);
            await hydrateQuotationStage();
        } finally {
            if (requestId === loadRequestRef.current) {
                setLoading(false);
            }
        }
    }, [
        accessToken,
        tabKey,
        opportunityId,
        opportunityRecord,
        opportunityForms,
        opportunityQuotations,
        activeStage,
    ]);

    // Closed won/lost: always show themed summary (and Send Agreement) even if no stage form exists.
    const showSummaryView = readOnly
        || (isTerminalPipelineStageIndex(activeStage) && Boolean(terminalOutcome))
        || (isTerminalPipelineStageIndex(activeStage) && hasPersistedSubmission);

    useEffect(() => {
        loadStageForm();
    }, [loadStageForm, activeStage]);

    const clearFieldError = (key) => {
        setFieldErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const applyFieldValidation = () => {
        if (!hasFields) {
            setFieldErrors({});
            return [];
        }
        const { errors, invalidFieldKeys } = getDynamicFormValidation(sections, formValues);
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

    const collectSaveValidationErrors = useCallback(() => {
        const errors = applyFieldValidation();

        if (isQuotationStage) {
            errors.push(...validateQuotationProductsLines(quotationLines));
            errors.push(...getQuotationValidUntilErrors(quotationValidUntil));
        }

        return errors;
    }, [hasFields, sections, formValues, isQuotationStage, quotationLines, quotationValidUntil]);

    const validateQuotationProducts = useCallback(() => {
        if (!isQuotationStage) return true;

        const productErrors = validateQuotationProductsLines(quotationLines);
        const validUntilErrors = getQuotationValidUntilErrors(quotationValidUntil);
        if (productErrors.length > 0 || validUntilErrors.length > 0) {
            setQuotationProductsShowErrors(true);
            return false;
        }

        setQuotationProductsShowErrors(false);
        return true;
    }, [isQuotationStage, quotationLines, quotationValidUntil]);

    const handleQuotationSave = useCallback(async () => {
        const productErrors = validateQuotationProductsLines(quotationLines);
        const validUntilErrors = getQuotationValidUntilErrors(quotationValidUntil);
        const errors = [...productErrors, ...validUntilErrors];
        if (errors.length > 0) {
            setQuotationProductsShowErrors(true);
            showValidationErrors(errors);
            return false;
        }

        setQuotationProductsShowErrors(false);
        setSaving(true);

        try {
            await persistQuotationStage({
                sectionsToSave: hasFields ? sections : [],
                formValuesToSave: hasFields ? formValues : {},
            });
            toast.success('Quotation saved successfully');
            await onSubmissionSaved?.();
            return true;
        } catch (error) {
            toast.error(error.message || 'Failed to save quotation');
            return false;
        } finally {
            setSaving(false);
        }
    }, [
        quotationLines,
        quotationValidUntil,
        persistQuotationStage,
        hasFields,
        sections,
        formValues,
        onSubmissionSaved,
    ]);

    const handleSave = async () => {
        const errors = collectSaveValidationErrors();

        if (errors.length > 0) {
            showValidationErrors(errors);
            if (
                isQuotationStage
                && (
                    validateQuotationProductsLines(quotationLines).length > 0
                    || getQuotationValidUntilErrors(quotationValidUntil).length > 0
                )
            ) {
                setQuotationProductsShowErrors(true);
            }
            return false;
        }

        setQuotationProductsShowErrors(false);

        setSaving(true);
        try {
            if (isQuotationStage) {
                await persistQuotationStage({
                    sectionsToSave: hasFields ? sections : [],
                    formValuesToSave: hasFields ? formValues : {},
                });
            } else {
                const formDefinitionId = getFormDefinitionId(formDefinition);
                if (!formDefinitionId) {
                    throw new Error('Stage form definition not found');
                }

                await saveOpportunityFormSubmission({
                    opportunityId,
                    formDefinitionId,
                    sections: hasFields ? sections : [],
                    formValues: hasFields ? formValues : {},
                    token: accessToken,
                });
            }

            toast.success(`${stageConfig.label} saved successfully`);
            if (isTerminalPipelineStageIndex(activeStage)) {
                setHasPersistedSubmission(true);
            }
            await onSubmissionSaved?.();
            return true;
        } catch (error) {
            toast.error(error.message || 'Failed to save stage form');
            return false;
        } finally {
            setSaving(false);
        }
    };

    const validateAndSave = useCallback(async () => {
        if (loading) {
            toast.error('Please wait for the form to load');
            return false;
        }

        if (isTerminalPipelineStageIndex(activeStage) && hasPersistedSubmission) {
            return true;
        }

        if (!formDefinition || !hasFields) {
            if (!isQuotationStage) {
                return true;
            }

            if (!validateQuotationProducts()) {
                const productErrors = [
                    ...validateQuotationProductsLines(quotationLines),
                    ...getQuotationValidUntilErrors(quotationValidUntil),
                ];
                if (productErrors.length > 0) {
                    showValidationErrors(productErrors);
                }
                return false;
            }

            setSaving(true);
            try {
                await persistQuotationStage({
                    sectionsToSave: [],
                    formValuesToSave: {},
                });
                await onSubmissionSaved?.();
                return true;
            } catch (error) {
                toast.error(error.message || 'Failed to save stage form');
                return false;
            } finally {
                setSaving(false);
            }
        }

        const errors = applyFieldValidation();
        if (errors.length > 0) {
            showValidationErrors(errors);
            if (
                isQuotationStage
                && (
                    validateQuotationProductsLines(quotationLines).length > 0
                    || getQuotationValidUntilErrors(quotationValidUntil).length > 0
                )
            ) {
                setQuotationProductsShowErrors(true);
            }
            return false;
        }

        if (!validateQuotationProducts()) {
            const productErrors = [
                ...validateQuotationProductsLines(quotationLines),
                ...getQuotationValidUntilErrors(quotationValidUntil),
            ];
            if (productErrors.length > 0) {
                showValidationErrors(productErrors);
            }
            return false;
        }

        setSaving(true);
        try {
            if (isQuotationStage) {
                await persistQuotationStage({
                    sectionsToSave: sections,
                    formValuesToSave: formValues,
                });
            } else {
                const formDefinitionId = getFormDefinitionId(formDefinition);
                if (!formDefinitionId) {
                    throw new Error('Stage form definition not found');
                }

                await saveOpportunityFormSubmission({
                    opportunityId,
                    formDefinitionId,
                    sections,
                    formValues,
                    token: accessToken,
                });
            }

            if (isTerminalPipelineStageIndex(activeStage)) {
                setHasPersistedSubmission(true);
            }
            await onSubmissionSaved?.();
            return true;
        } catch (error) {
            toast.error(error.message || 'Failed to save stage form');
            return false;
        } finally {
            setSaving(false);
        }
    }, [
        loading,
        formDefinition,
        hasFields,
        sections,
        formValues,
        opportunityId,
        accessToken,
        onSubmissionSaved,
        stageConfig?.label,
        activeStage,
        hasPersistedSubmission,
        isQuotationStage,
        persistQuotationStage,
        validateQuotationProducts,
        quotationLines,
        quotationValidUntil,
    ]);

    useImperativeHandle(ref, () => ({
        validateAndSave,
        isFormValid: () => isFormValid,
        isLoading: () => loading,
    }), [validateAndSave, isFormValid, loading]);

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

    const renderQuotationValidUntilField = () => (
        <div className="flex items-center gap-x-6 flex-wrap">
            <div className="w-48 shrink-0">
                <Heading
                    Fontweight={500}
                    color="var(--sidebar-text-primary)"
                    Heading="Valid Until"
                    Fontsize={16}
                    required
                />
            </div>
            <div className="w-full sm:w-80 min-w-0 overflow-hidden">
                {canEditQuotationValidUntil ? (
                    <>
                        <CustomDatePicker
                            value={quotationValidUntil || null}
                            onChange={(selectedDate) =>
                                setQuotationValidUntil(formatDateForApi(selectedDate) || '')
                            }
                            minDate={dayjs()}
                            disabled={!canEditQuotationValidUntil}
                            fullWidth
                            fieldError={showValidUntilError}
                        />
                        {showValidUntilError ? (
                            <Typography
                                sx={{
                                    display: 'block',
                                    mt: 0.5,
                                    fontSize: 12,
                                    color: '#EF4444',
                                    fontWeight: 500,
                                }}
                            >
                                Valid Until is required
                            </Typography>
                        ) : null}
                    </>
                ) : (
                    <Typography
                        sx={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: 'var(--dashboard-text-primary)',
                            py: 0.75,
                        }}
                    >
                        {formatQuotationValidUntilDisplay(quotationValidUntil)}
                    </Typography>
                )}
            </div>
        </div>
    );

    const quotationValidUntilSummaryField = useMemo(() => {
        if (!isQuotationStage) return null;

        if (canEditQuotationValidUntil) {
            return {
                id: 'quotation-valid-until',
                label: 'Valid Until *',
                renderValue: (
                    <Box sx={{ mt: 0.5, maxWidth: 280, width: '100%', minWidth: 0, overflow: 'hidden' }}>
                        <CustomDatePicker
                            value={quotationValidUntil || null}
                            onChange={(selectedDate) =>
                                setQuotationValidUntil(formatDateForApi(selectedDate) || '')
                            }
                            minDate={dayjs()}
                            fullWidth
                            fieldError={showValidUntilError}
                        />
                        {showValidUntilError ? (
                            <Typography
                                sx={{
                                    display: 'block',
                                    mt: 0.5,
                                    fontSize: 12,
                                    color: '#EF4444',
                                    fontWeight: 500,
                                }}
                            >
                                Valid Until is required
                            </Typography>
                        ) : null}
                    </Box>
                ),
            };
        }

        return {
            id: 'quotation-valid-until',
            label: 'Valid Until',
            displayValue: formatQuotationValidUntilDisplay(quotationValidUntil),
        };
    }, [isQuotationStage, canEditQuotationValidUntil, quotationValidUntil, showValidUntilError]);

    if (!stageConfig) return null;

    if (showSummaryView) {
        if (loading) {
            return (
                <Box
                    sx={{
                        backgroundColor: 'var(--dashboard-card-bg)',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        p: 3,
                        mb: 3,
                    }}
                >
                    <Box sx={{ py: 4 }}>
                        <Loader
                            message={`Loading ${stageConfig.label.toLowerCase()} details...`}
                            subMessage="Please wait"
                        />
                    </Box>
                </Box>
            );
        }

        return (
            <>
                <OpportunityStageSummary
                    stageConfig={stageConfig}
                    sections={sections}
                    formValues={formValues}
                    title={formDefinition?.name || `${stageConfig.label} Details`}
                    opportunityId={opportunityId}
                    accessToken={accessToken}
                    extraGridFields={
                        quotationValidUntilSummaryField
                            ? [quotationValidUntilSummaryField]
                            : []
                    }
                />
                {isQuotationStage && (hasSavedQuotationLines || quotationId) ? (
                    <Box sx={{ mb: 3 }}>
                        <OpportunityQuotationProducts
                            lines={quotationLines}
                            onLinesChange={setQuotationLines}
                            validUntil={quotationValidUntil}
                            onValidUntilChange={setQuotationValidUntil}
                            readOnly={readOnly}
                            quotationId={quotationId}
                            quotationStatus={quotationStatus}
                            terminalOutcome={terminalOutcome}
                            onStatusChange={setSavedQuotationStatus}
                            onRefresh={onSubmissionSaved}
                            onSave={handleQuotationSave}
                            isSaving={saving}
                            onEditingChange={setIsEditingQuotationProducts}
                        />
                    </Box>
                ) : null}
            </>
        );
    }

    return (
        <>
            <Box
                sx={{
                    backgroundColor: 'var(--dashboard-card-bg)',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    p: 3,
                    mb: 3,
                }}
            >
                <Typography
                    variant="h6"
                    sx={{ mb: 3, fontWeight: 700, color: 'var(--sidebar-text-primary)' }}
                >
                    {formDefinition?.name || stageConfig.name || `${stageConfig.label} Information`}
                </Typography>

                {loading ? (
                    <Box sx={{ py: 4 }}>
                        <Loader
                            message={`Loading ${stageConfig.label.toLowerCase()} form...`}
                            subMessage="Please wait"
                        />
                    </Box>
                ) : (
                    <>
                        {formDefinition && hasFields ? (
                            <div className="flex flex-col gap-6">
                                {sections.map((section) => (
                                    <div key={section.id} className="flex flex-col gap-4">
                                        {sections.length > 1 && section.title ? (
                                            <Typography
                                                sx={{ fontWeight: 600, color: '#374151', fontSize: 15 }}
                                            >
                                                {section.title}
                                            </Typography>
                                        ) : null}
                                        {renderSectionFields(section)}
                                    </div>
                                ))}
                            </div>
                        ) : !isQuotationStage ? (
                            <Box sx={{ py: 3, textAlign: 'center' }}>
                                <Typography sx={{ color: '#666', fontSize: 14, mb: 1 }}>
                                    No published form found for {stageConfig.name} ({stageConfig.apiName}).
                                </Typography>
                                <Typography sx={{ color: '#999', fontSize: 13 }}>
                                    Configure and publish the {stageConfig.label} form in Sales Form Builder.
                                </Typography>
                            </Box>
                        ) : null}

                        {isQuotationStage ? (
                            <Box sx={{ mt: hasFields ? 3 : 0 }}>
                                {renderQuotationValidUntilField()}
                            </Box>
                        ) : null}

                        {(hasFields || isQuotationStage) && formDefinition && !isQuotationStage ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-end',
                                    mt: 3,
                                    gap: 1,
                                }}
                            >
                                <Button
                                    variant="contained"
                                    startIcon={<SaveOutlinedIcon />}
                                    onClick={handleSave}
                                    disabled={saving}
                                    sx={{
                                        backgroundColor: '#1976d2',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderRadius: '4px',
                                        boxShadow: 'none',
                                        opacity: saving ? 0.7 : 1,
                                        '&:hover': {
                                            backgroundColor: '#1565c0',
                                            boxShadow: 'none',
                                        },
                                    }}
                                >
                                    {saving ? 'Saving...' : 'Save Data'}
                                </Button>
                            </Box>
                        ) : null}
                    </>
                )}
            </Box>

            {!loading && isQuotationStage ? (
                <Box sx={{ mb: 3 }}>
                    <OpportunityQuotationProducts
                        lines={quotationLines}
                        onLinesChange={setQuotationLines}
                        validUntil={quotationValidUntil}
                        onValidUntilChange={setQuotationValidUntil}
                        showItemErrors={quotationProductsShowErrors}
                        readOnly={readOnly}
                        quotationId={quotationId}
                        quotationStatus={quotationStatus}
                        terminalOutcome={terminalOutcome}
                        onStatusChange={setSavedQuotationStatus}
                        onRefresh={onSubmissionSaved}
                        onSave={handleQuotationSave}
                        isSaving={saving}
                        onEditingChange={setIsEditingQuotationProducts}
                    />

                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            mt: 3,
                            gap: 1,
                        }}
                    >
                        {quotationProductsShowErrors ? (
                            <Typography
                                sx={{
                                    color: '#EF4444',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    textAlign: 'right',
                                }}
                            >
                                {quotationProductsErrors.length > 0 && quotationValidUntilErrors.length > 0
                                    ? 'Please fill Valid Until, and select a product/service with unit price greater than 0 for each line.'
                                    : quotationValidUntilErrors.length > 0
                                        ? 'Please select Valid Until date.'
                                        : 'Please select a product or service and enter a unit price greater than 0 for each line item.'}
                            </Typography>
                        ) : null}
                        <Button
                            variant="contained"
                            startIcon={<SaveOutlinedIcon />}
                            onClick={handleSave}
                            disabled={saving}
                            sx={{
                                backgroundColor: '#1976d2',
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: '4px',
                                boxShadow: 'none',
                                opacity: saving ? 0.7 : 1,
                                '&:hover': {
                                    backgroundColor: '#1565c0',
                                    boxShadow: 'none',
                                },
                            }}
                        >
                            {saving ? 'Saving...' : 'Save Data'}
                        </Button>
                    </Box>
                </Box>
            ) : null}
        </>
    );
});

OpportunityDynamicStageForm.displayName = 'OpportunityDynamicStageForm';

export default OpportunityDynamicStageForm;
