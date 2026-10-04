import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { toast } from 'react-toastify';
import Loader from '../../Components/Loader';
import CrmDynamicField from '../../Components/CrmDynamicField';
import Heading from '../../Components/Heading';
import {
    fetchLeadFormSubmissionByDefinition,
    fetchPublishedQualificationFormDefinition,
    findFormSubmissionForDefinition,
    getFieldValueKey,
    getFormDefinitionId,
    getRenderableSections,
    isHeadingField,
    mapApiDefinitionToFormState,
    mapLeadRecordToFormValues,
    normalizeFieldType,
    QUALIFICATION_TAB_KEY,
    saveLeadFormSubmission,
    getDynamicFormValidation,
} from '../SalesFormBuilder/formDefinitionApi';

const normalizeSubmissionList = (submission, definitionId) => {
    if (!submission) return [];

    const payload = submission?.data ?? submission;

    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        return [{ data: payload, formDefinitionId: definitionId }];
    }

    if (Array.isArray(payload)) return payload;

    return [];
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

export default function LeadQualificationForm({
    leadId,
    accessToken,
    leadRecord = null,
    leadForms = [],
    onMarkQualified,
    isUpdating = false,
}) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formDefinition, setFormDefinition] = useState(null);
    const [formValues, setFormValues] = useState({});
    const [fieldErrors, setFieldErrors] = useState({});

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

    const loadQualificationForm = useCallback(async () => {
        if (!accessToken || !leadId) {
            setFormDefinition(null);
            setFormValues({});
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const apiItem = await fetchPublishedQualificationFormDefinition(accessToken);

            if (!apiItem) {
                setFormDefinition(null);
                setFormValues({});
                return;
            }

            const mapped = mapApiDefinitionToFormState(apiItem, QUALIFICATION_TAB_KEY);
            const renderSections = getRenderableSections(mapped);
            const definitionId = getFormDefinitionId(mapped);

            let submissions = leadForms;

            const cachedSubmission = findFormSubmissionForDefinition(leadForms, definitionId);
            if (!cachedSubmission && definitionId) {
                try {
                    const remoteSubmission = await fetchLeadFormSubmissionByDefinition(
                        leadId,
                        definitionId,
                        accessToken
                    );
                    submissions = [
                        ...leadForms,
                        ...normalizeSubmissionList(remoteSubmission, definitionId),
                    ];
                } catch {
                    submissions = leadForms;
                }
            }

            const values = mapLeadRecordToFormValues(
                renderSections,
                leadRecord || {},
                submissions
            );

            setFormDefinition(mapped);
            setFormValues(values);
        } catch (error) {
            toast.error(error.message || 'Failed to load qualification form');
            setFormDefinition(null);
            setFormValues({});
        } finally {
            setLoading(false);
        }
    }, [accessToken, leadId, leadRecord, leadForms]);

    useEffect(() => {
        loadQualificationForm();
    }, [loadQualificationForm]);

    const clearFieldError = (key) => {
        setFieldErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const applyValidationResult = () => {
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

    const saveQualificationForm = async () => {
        const errors = applyValidationResult();
        if (errors.length > 0) {
            showValidationErrors(errors);
            return false;
        }

        const formDefinitionId = getFormDefinitionId(formDefinition);
        if (!formDefinitionId) {
            toast.error('Qualification form definition not found');
            return false;
        }

        setSubmitting(true);
        try {
            await saveLeadFormSubmission({
                leadId,
                formDefinitionId,
                sections,
                formValues,
                token: accessToken,
            });
            return true;
        } catch (error) {
            toast.error(error.message || 'Failed to save qualification form');
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    const handleMarkQualified = async () => {
        if (isUpdating || submitting) return;

        if (hasFields) {
            const errors = applyValidationResult();
            if (errors.length > 0) {
                showValidationErrors(errors);
                return;
            }

            const saved = await saveQualificationForm();
            if (!saved) return;
        }

        await onMarkQualified?.();
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

    const isBusy = submitting || isUpdating;

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
            <Typography
                variant="h6"
                sx={{ mb: 3, fontWeight: 700, color: 'var(--sidebar-text-primary)' }}
            >
                {formDefinition?.name || 'Qualification Form'}
            </Typography>

            {loading ? (
                <Box sx={{ py: 4 }}>
                    <Loader message="Loading qualification form..." subMessage="Please wait" />
                </Box>
            ) : !formDefinition || !hasFields ? (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                    <Typography sx={{ color: 'var(--dashboard-text-secondary)', fontSize: 14, mb: 1 }}>
                        No published qualification form found.
                    </Typography>
                    <Typography sx={{ color: 'var(--dashboard-text-secondary)', fontSize: 13 }}>
                        Configure and publish the Qualification form in Sales Form Builder.
                    </Typography>
                </Box>
            ) : (
                <>
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

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                        <Button
                            type="button"
                            variant="contained"
                            startIcon={<CheckCircleOutlineIcon />}
                            onClick={handleMarkQualified}
                            disabled={isBusy}
                            sx={{
                                backgroundColor: '#2e7d32',
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: '4px',
                                boxShadow: 'none',
                                minWidth: 190,
                                opacity: isBusy ? 0.7 : 1,
                                '&:hover': {
                                    backgroundColor: '#1b5e20',
                                    boxShadow: 'none',
                                },
                            }}
                        >
                            {isBusy ? 'Saving...' : 'Mark as Qualified'}
                        </Button>
                    </Box>
                </>
            )}
        </Box>
    );
}
