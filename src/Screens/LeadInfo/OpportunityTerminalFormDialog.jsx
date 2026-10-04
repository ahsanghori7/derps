import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import CrmDynamicField from '../../Components/CrmDynamicField';
import Heading from '../../Components/Heading';
import {
    definitionHasRenderableFields,
    fetchOpportunityFormSubmissionByDefinition,
    fetchPublishedStageFormDefinition,
    findFormSubmissionForDefinition,
    getFieldValueKey,
    getFormDefinitionId,
    getPipelineStageFormMeta,
    getRenderableSections,
    isHeadingField,
    mapApiDefinitionToFormState,
    mapOpportunityRecordToFormValues,
    normalizeFieldType,
    saveOpportunityFormSubmission,
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

export default function OpportunityTerminalFormDialog({
    open = false,
    stageValue = null,
    opportunityId,
    accessToken,
    opportunityRecord = null,
    opportunityForms = [],
    onClose,
    onConfirm,
    submitting = false,
}) {
    const tabKey = stageValue;
    const stageMeta = getPipelineStageFormMeta(tabKey);
    const isLost = stageValue === 'closed_lost';
    const confirmLabel = isLost ? 'Closed Lost' : 'Closed Won';

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formDefinition, setFormDefinition] = useState(null);
    const [formValues, setFormValues] = useState({});
    const [fieldErrors, setFieldErrors] = useState({});

    const sections = useMemo(
        () => getRenderableSections(formDefinition || {}),
        [formDefinition]
    );

    const hasFields = useMemo(
        () => definitionHasRenderableFields(formDefinition),
        [formDefinition]
    );

    const loadForm = useCallback(async () => {
        if (!open || !tabKey || !accessToken || !opportunityId) {
            setFormDefinition(null);
            setFormValues({});
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const apiItem = await fetchPublishedStageFormDefinition(tabKey, accessToken);

            if (!apiItem) {
                setFormDefinition(null);
                setFormValues({});
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

            setFormDefinition(mapped);
            setFormValues(values);
        } catch (error) {
            toast.error(error.message || 'Failed to load form');
            setFormDefinition(null);
            setFormValues({});
        } finally {
            setLoading(false);
        }
    }, [open, tabKey, accessToken, opportunityId, opportunityRecord, opportunityForms]);

    useEffect(() => {
        if (open) {
            loadForm();
        }
    }, [open, loadForm]);

    useEffect(() => {
        if (!open) {
            setFormDefinition(null);
            setFormValues({});
            setFieldErrors({});
            setSaving(false);
        }
    }, [open]);

    const clearFieldError = (key) => {
        setFieldErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const updateFieldValue = (field, nextValue) => {
        const key = getFieldValueKey(field);
        if (!key) return;
        setFormValues((prev) => ({ ...prev, [key]: nextValue }));
        clearFieldError(key);
    };

    const handleConfirm = async () => {
        const { errors, invalidFieldKeys } = getDynamicFormValidation(sections, formValues);
        setFieldErrors(invalidFieldKeys);
        if (errors.length > 0) {
            showValidationErrors(errors);
            return;
        }

        setSaving(true);
        try {
            if (hasFields && formDefinition) {
                const formDefinitionId = getFormDefinitionId(formDefinition);
                if (!formDefinitionId) {
                    toast.error('Stage form definition not found');
                    return;
                }

                await saveOpportunityFormSubmission({
                    opportunityId,
                    formDefinitionId,
                    sections,
                    formValues,
                    token: accessToken,
                });
            }

            const stageUpdated = await onConfirm?.(stageValue);
            if (stageUpdated === false) {
                throw new Error('Failed to update opportunity stage');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to save form');
        } finally {
            setSaving(false);
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

    const dialogTitle = stageMeta?.label || 'Complete Stage';
    const isBusy = loading || saving || submitting;

    return (
        <Dialog
            open={open}
            onClose={isBusy ? undefined : onClose}
            maxWidth="sm"
            fullWidth
            disableEnforceFocus
            sx={{ zIndex: 9999 }}
            PaperProps={{ sx: { borderRadius: '12px' } }}
        >
            <DialogTitle sx={{ fontWeight: 700, color: '#181818', pb: 1 }}>
                {dialogTitle}
            </DialogTitle>
            <DialogContent dividers sx={{ minHeight: 120 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={32} />
                    </Box>
                ) : !formDefinition ? (
                    <Typography sx={{ color: '#666', fontSize: 14, py: 2, textAlign: 'center' }}>
                        No published form found for {dialogTitle}.
                    </Typography>
                ) : hasFields ? (
                    <div className="flex flex-col gap-6 pt-1">
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
                ) : (
                    <Typography sx={{ color: '#666', fontSize: 14, py: 2, textAlign: 'center' }}>
                        No fields configured. You can proceed to mark this opportunity as {dialogTitle}.
                    </Typography>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                <Button
                    onClick={onClose}
                    disabled={isBusy}
                    sx={{ textTransform: 'none' }}
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleConfirm}
                    disabled={isBusy || loading}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        backgroundColor: isLost ? '#EF4444' : '#10B981',
                        '&:hover': {
                            backgroundColor: isLost ? '#DC2626' : '#059669',
                        },
                    }}
                >
                    {saving || submitting ? 'Updating...' : confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
