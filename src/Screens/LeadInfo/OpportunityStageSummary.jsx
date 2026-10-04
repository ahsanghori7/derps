import React, { useMemo, useState } from 'react';
import { Box, Grid, Typography, Chip, Link, Button, CircularProgress } from '@mui/material';
import {
    CheckCircle,
    Cancel,
    DescriptionOutlined,
    EmailOutlined,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
    getFieldValueKey,
    isHeadingField,
    normalizeFieldType,
    normalizeOptions,
    parseDateValue,
    sendOpportunityAgreementEmail,
} from '../SalesFormBuilder/formDefinitionApi';

const STAGE_THEMES = {
    closed_won: {
        backgroundColor: '#ECFDF5',
        borderColor: '#A7F3D0',
        titleColor: '#065F46',
        labelColor: '#047857',
        header: '🎉 Deal Won!',
    },
    closed_lost: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
        titleColor: '#991B1B',
        labelColor: '#B91C1C',
        header: 'Closed Lost',
    },
};

const isEmptyValue = (type, value) => {
    if (value === null || value === undefined || value === '') return true;
    if (type === 'checkbox') return false;
    if (Array.isArray(value)) return value.length === 0;
    return false;
};

const formatCurrency = (value) => {
    const num = Number(String(value).replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(num)) return String(value);
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num);
};

const formatDateDisplay = (value) => {
    const parsed = parseDateValue(value);
    if (!parsed) return String(value);
    return parsed.format('MMM D, YYYY');
};

const getOptionLabel = (field, value) => {
    const options = normalizeOptions(field.options);
    const match = options.find(
        (opt) => String(opt.value) === String(value) || String(opt.label) === String(value)
    );
    return match?.label ?? String(value);
};

const isBlockFieldType = (type) => type === 'textarea' || type === 'file';

const isListFieldType = (type) => type === 'multiselect';

const categorizeFields = (sections = []) => {
    const gridFields = [];
    const blockFields = [];
    const headings = [];

    sections.forEach((section) => {
        (section.fields || []).forEach((field) => {
            const type = normalizeFieldType(field.type);
            if (isHeadingField(type)) {
                headings.push(field.label);
                return;
            }

            const key = getFieldValueKey(field);
            if (!key) return;

            if (isBlockFieldType(type) || isListFieldType(type)) {
                blockFields.push(field);
            } else {
                gridFields.push(field);
            }
        });
    });

    return { gridFields, blockFields, headings };
};

const OpportunityStageSummary = ({
    stageConfig,
    sections = [],
    formValues = {},
    title,
    extraGridFields = [],
    opportunityId,
    accessToken,
}) => {
    const tabKey = stageConfig?.tabKey;
    const theme = STAGE_THEMES[tabKey] || null;
    const isClosedWon = tabKey === 'closed_won';
    const [isSendingAgreement, setIsSendingAgreement] = useState(false);

    const { gridFields, blockFields } = useMemo(
        () => categorizeFields(sections),
        [sections]
    );

    const allGridFields = useMemo(
        () => [...gridFields, ...extraGridFields],
        [gridFields, extraGridFields]
    );

    const handleSendAgreement = async () => {
        if (!opportunityId || !accessToken || isSendingAgreement) return;

        setIsSendingAgreement(true);
        try {
            await sendOpportunityAgreementEmail(opportunityId, accessToken);
            toast.success('Agreement email sent successfully');
        } catch (error) {
            toast.error(error?.message || 'Failed to send agreement email');
        } finally {
            setIsSendingAgreement(false);
        }
    };

    const renderCheckboxValue = (value) => {
        const isYes = Boolean(value);
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                {isYes ? (
                    <CheckCircle sx={{ fontSize: 18, color: '#10B981' }} />
                ) : (
                    <Cancel sx={{ fontSize: 18, color: '#9CA3AF' }} />
                )}
                <Typography sx={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>
                    {isYes ? 'Yes' : 'No'}
                </Typography>
            </Box>
        );
    };

    const renderStatusBadge = (field, value) => {
        const label = getOptionLabel(field, value);
        const normalized = String(label).toLowerCase();
        const isPositive = normalized.includes('approv') || normalized.includes('yes') || normalized.includes('complete');

        return (
            <Chip
                icon={isPositive ? <CheckCircle sx={{ fontSize: '16px !important' }} /> : undefined}
                label={label}
                size="small"
                sx={{
                    mt: 0.5,
                    fontWeight: 600,
                    backgroundColor: isPositive ? '#D1FAE5' : '#F3F4F6',
                    color: isPositive ? '#059669' : '#374151',
                    '& .MuiChip-icon': { color: '#059669' },
                }}
            />
        );
    };

    const renderGridValue = (field) => {
        if (field?.renderValue) {
            return field.renderValue;
        }

        if (field?.displayValue !== undefined) {
            return (
                <Typography sx={{ fontWeight: 600, color: '#111827', fontSize: 15, mt: 0.5 }}>
                    {field.displayValue || '-'}
                </Typography>
            );
        }

        const type = normalizeFieldType(field.type);
        const key = getFieldValueKey(field);
        const value = formValues[key];

        if (isEmptyValue(type, value)) {
            return (
                <Typography sx={{ fontWeight: 600, color: '#111827', fontSize: 15, mt: 0.5 }}>
                    -
                </Typography>
            );
        }

        if (type === 'checkbox') return renderCheckboxValue(value);

        if (type === 'select' && /status|approval/i.test(field.label || '')) {
            return renderStatusBadge(field, value);
        }

        let display = String(value);

        if (type === 'date') {
            display = formatDateDisplay(value);
        } else if (type === 'number' && /amount|revenue|discount|price|cost/i.test(field.label || '')) {
            display = formatCurrency(value);
        } else if (type === 'select' || type === 'radio') {
            display = getOptionLabel(field, value);
        } else if (type === 'checkbox') {
            return renderCheckboxValue(value);
        }

        const isDiscount = /discount/i.test(field.label || '');
        const color = isDiscount ? '#D97706' : '#111827';

        return (
            <Typography sx={{ fontWeight: 600, color, fontSize: 15, mt: 0.5 }}>
                {display}
            </Typography>
        );
    };

    const renderBlockValue = (field) => {
        const type = normalizeFieldType(field.type);
        const key = getFieldValueKey(field);
        const value = formValues[key];
        const labelColor = theme?.labelColor || '#6B7280';

        if (type === 'file') {
            const files = Array.isArray(value) ? value : value ? [value] : [];
            if (!files.length) {
                return (
                    <Typography sx={{ color: '#9CA3AF', fontSize: 14 }}>-</Typography>
                );
            }

            return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {files.map((file, index) => {
                        const name = file?.name || file?.fileName || `Document ${index + 1}`;
                        const url = file?.url || file?.path;
                        return url ? (
                            <Link
                                key={`${name}-${index}`}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    fontWeight: 600,
                                    fontSize: 14,
                                }}
                            >
                                <DescriptionOutlined sx={{ fontSize: 18 }} />
                                View {name}
                            </Link>
                        ) : (
                            <Typography key={`${name}-${index}`} sx={{ fontWeight: 600, fontSize: 14 }}>
                                {name}
                            </Typography>
                        );
                    })}
                </Box>
            );
        }

        if (type === 'multiselect') {
            const items = Array.isArray(value) ? value : [];
            if (!items.length) {
                return (
                    <Typography sx={{ color: '#9CA3AF', fontSize: 14 }}>-</Typography>
                );
            }

            return (
                <Box component="ul" sx={{ m: 0, pl: 2.5, color: '#374151' }}>
                    {items.map((item, index) => (
                        <Typography
                            component="li"
                            key={`${item}-${index}`}
                            sx={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}
                        >
                            {getOptionLabel(field, item)}
                        </Typography>
                    ))}
                </Box>
            );
        }

        return (
            <Typography sx={{ color: '#374151', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {String(value)}
            </Typography>
        );
    };

    const displayTitle = theme?.header || title || stageConfig?.label || 'Stage Details';

    return (
        <Box
            sx={{
                backgroundColor: theme?.backgroundColor || '#fff',
                borderRadius: '12px',
                border: theme ? `1px solid ${theme.borderColor}` : 'none',
                boxShadow: theme ? 'none' : '0 2px 8px rgba(0,0,0,0.1)',
                p: 3,
                mb: 3,
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 2,
                    mb: 3,
                    flexWrap: 'wrap',
                }}
            >
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 700,
                        color: theme?.titleColor || '#181818',
                    }}
                >
                    {displayTitle}
                </Typography>

                {isClosedWon && opportunityId && accessToken ? (
                    <Button
                        variant="contained"
                        startIcon={
                            isSendingAgreement ? (
                                <CircularProgress size={16} color="inherit" />
                            ) : (
                                <EmailOutlined />
                            )
                        }
                        onClick={handleSendAgreement}
                        disabled={isSendingAgreement}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            backgroundColor: '#059669',
                            '&:hover': { backgroundColor: '#047857' },
                            '&.Mui-disabled': {
                                backgroundColor: '#A7F3D0',
                                color: '#065F46',
                            },
                        }}
                    >
                        {isSendingAgreement ? 'Sending...' : 'Send Agreement'}
                    </Button>
                ) : null}
            </Box>

            {allGridFields.length > 0 && (
                <Grid container spacing={3} sx={{ mb: blockFields.length ? 3 : 0 }}>
                    {allGridFields.map((field) => (
                        <Grid
                            item
                            xs={12}
                            sm={6}
                            md={allGridFields.length <= 3 ? 4 : 3}
                            key={field.id}
                        >
                            <Typography
                                variant="body2"
                                sx={{
                                    color: theme?.labelColor || '#6B7280',
                                    fontWeight: 500,
                                    fontSize: 13,
                                }}
                            >
                                {field.label}
                            </Typography>
                            {renderGridValue(field)}
                        </Grid>
                    ))}
                </Grid>
            )}

            {blockFields.map((field) => (
                <Box key={field.id} sx={{ mb: 2.5 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            color: theme?.labelColor || '#6B7280',
                            fontWeight: 600,
                            fontSize: 13,
                            mb: 0.75,
                        }}
                    >
                        {field.label}:
                    </Typography>
                    {renderBlockValue(field)}
                </Box>
            ))}

            {!allGridFields.length && !blockFields.length && !theme && (
                <Typography sx={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', py: 2 }}>
                    No saved data for this stage.
                </Typography>
            )}
        </Box>
    );
};

export default OpportunityStageSummary;
