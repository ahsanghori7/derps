import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Heading from '../../Components/Heading';
import { styled } from '@mui/material/styles';
import BottonWithIcon from '../../Components/ButtonWithIcon';
import addIcon from '../../assets/addIcon.png';
import Loader from '../../Components/Loader';
import DeleteConfirmationModal from '../../Components/DeleteModal';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { usePageTitle } from '../../Hooks/usePageTitle';
import { useNavigationBlocker } from '../../Hooks/useNavigationBlocker';
import { IoIosArrowBack } from 'react-icons/io';
import { RiEdit2Line, RiDeleteBin6Line } from 'react-icons/ri';
import { FiShield, FiLock, FiChevronUp, FiChevronDown, FiCheck } from 'react-icons/fi';
import { Plus, X, GripVertical, Globe } from 'lucide-react';
import { toast } from 'react-toastify';
import DropdownMenu from '../../Components/dropdownMenu';
import {
    FIELD_TYPES,
    TYPE_BADGE_STYLES,
    supportsMaskValue,
    supportsSelectOptions,
    supportsRequired,
    supportsNumberValidation,
    normalizeFieldType,
    normalizeField,
    normalizeOptions,
    slugify,
    emptyFormState,
    createEmptyField,
    handleFieldTypeChange,
    buildFormDefinitionPayload,
    serializeFormStateForCompare,
    mapApiDefinitionToFormState,
    fetchFormDefinitionsForBuilder,
    fetchLeadFormDefinitionsForBuilder,
    fetchProposalFormDefinitionsForBuilder,
    fetchQuotationFormDefinitionsForBuilder,
    fetchQualificationFormDefinitionsForBuilder,
    fetchPipelineStageFormDefinitionsForBuilder,
    duplicateFormDefinition,
    buildUniqueDuplicateApiName,
    archiveFormDefinition,
    publishFormDefinition,
    saveFormDefinition,
    saveLeadFormDefinition,
    saveProposalFormDefinition,
    saveQuotationFormDefinition,
    saveQualificationFormDefinition,
    getFormDefinitionId,
    countFormStats,
    FORM_BUILDER_TABS,
    TAB_LABEL_MAP,
    getTabFetchParams,
    TAB_FORM_PURPOSE_MAP,
    applyFixedFormMeta,
    isProposalTab,
    isQuotationTab,
    isQualificationTab,
    isFixedMetaFormTab,
    isLeadsTab,
    isPipelineStageTab,
    createInitialFormStateByTab,
    createInitialSavedSnapshotsByTab,
    DEFAULT_LEAD_SECTION,
    conflictsWithDefaultLeadField,
    normalizeLeadWorkflow,
} from './formDefinitionApi';

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '5px',
    flexWrap: 'wrap',
    gap: 10,
});

const TOOLBAR_BUTTON_CLASS = '!mb-0 !mx-0 shrink-0 gap-2';

const HeaderWrapper2 = styled('div')({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
});

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const serializeFieldBuilderFields = (fields) =>
    JSON.stringify(fields.map((field) => normalizeField({ ...field })));

const reorderItems = (items, fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
        return items;
    }
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
};

const cloneFormState = (state) => JSON.parse(JSON.stringify(state));

/** Empty form (no sections) is allowed. Any existing section must have at least one field. */
const getEmptySectionsWithoutFields = (state) =>
    (state?.sections || []).filter((section) => !(section.fields?.length > 0));

const validateSectionsHaveFields = (state) => {
    const emptySections = getEmptySectionsWithoutFields(state);
    if (emptySections.length === 0) return true;

    const firstTitle = emptySections[0]?.title?.trim() || 'Untitled';
    if (emptySections.length === 1) {
        toast.error(`Add at least one field to "${firstTitle}"`);
    } else {
        toast.error('Add at least one field to every section');
    }
    return false;
};

const serializeSettingsDraft = (draft) =>
    JSON.stringify({
        name: draft?.name?.trim() || '',
        description: draft?.description?.trim() || '',
        workflow: draft?.workflow || {},
    });

const applyFieldBuilderChanges = (formState, fieldBuilder, normalizedFields) => {
    const isStandalone = fieldBuilder.sectionId === STANDALONE_SECTION_ID;

    if (isStandalone) {
        if (fieldBuilder.replaceMode) {
            const remaining = formState.standaloneFields.filter(
                (field) => !fieldBuilder.editingFieldIds.includes(field.id)
            );
            return {
                ...formState,
                standaloneFields: [...remaining, ...normalizedFields],
            };
        }

        return {
            ...formState,
            standaloneFields: [...formState.standaloneFields, ...normalizedFields],
        };
    }

    return {
        ...formState,
        sections: formState.sections.map((section) => {
            if (section.id !== fieldBuilder.sectionId) return section;

            if (fieldBuilder.replaceMode) {
                const remaining = section.fields.filter(
                    (field) => !fieldBuilder.editingFieldIds.includes(field.id)
                );
                return {
                    ...section,
                    fields: [...remaining, ...normalizedFields],
                };
            }

            return {
                ...section,
                fields: [...section.fields, ...normalizedFields],
            };
        }),
    };
};

const STANDALONE_SECTION_ID = '__standalone__';

const applySectionDelete = (formState, sectionId) => ({
    ...formState,
    sections: formState.sections.filter((section) => section.id !== sectionId),
});

const applyFieldDelete = (formState, sectionId, fieldId) => {
    if (sectionId === STANDALONE_SECTION_ID) {
        return {
            ...formState,
            standaloneFields: formState.standaloneFields.filter((field) => field.id !== fieldId),
        };
    }

    return {
        ...formState,
        sections: formState.sections.map((section) =>
            section.id === sectionId
                ? { ...section, fields: section.fields.filter((field) => field.id !== fieldId) }
                : section
        ),
    };
};

const FIELD_TYPE_MENU_ITEMS = FIELD_TYPES.map(({ label, value }) => ({
    text: label,
    value,
}));

const FORM_STATUS_STYLES = {
    draft: { bg: '#FEF3C7', color: '#92400E', label: 'Draft' },
    published: { bg: '#DCFCE7', color: '#166534', label: 'Published' },
};

const StatusBanner = ({ variant, children }) => {
    const styles = {
        live: {
            backgroundColor: '#DCFCE7',
            border: '1px solid #86EFAC',
            color: '#166534',
        },
        draft: {
            backgroundColor: '#FEF3C7',
            border: '1px solid #FCD34D',
            color: '#92400E',
        },
    };
    const style = styles[variant] || styles.draft;

    return (
        <div
            className="mt-3 px-4 py-3 rounded-lg text-sm leading-relaxed"
            style={style}
        >
            {children}
        </div>
    );
};

const PublishVersionModal = ({
    isOpen,
    onClose,
    onConfirm,
    version,
    previousVersion,
    sectionCount,
    fieldCount,
    loading = false,
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000001 }}
        >
            <div
                className="w-full max-w-md p-5"
                style={{
                    backgroundColor: 'var(--dashboard-card-bg)',
                    borderRadius: 14,
                    boxShadow: '0 10px 35px rgba(0,0,0,0.18)',
                }}
            >
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={`Publish Version ${version ?? ''}?`}
                    Fontsize={22}
                />
                <p className="mt-3 text-sm" style={{ color: 'var(--dashboard-text-primary)' }}>
                    This will make your draft live.
                    {previousVersion != null && (
                        <> Version {previousVersion} will be archived and can be viewed in history.</>
                    )}
                </p>

                <div
                    className="mt-4 p-4 rounded-xl text-sm space-y-2"
                    style={{ backgroundColor: '#DCFCE7', color: '#166534' }}
                >
                    <div className="flex justify-between">
                        <span>Sections</span>
                        <span className="font-semibold">{sectionCount}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Fields</span>
                        <span className="font-semibold">{fieldCount}</span>
                    </div>
                    {previousVersion != null && (
                        <div className="flex justify-between">
                            <span>Previous version archived</span>
                            <span className="font-semibold">v{previousVersion}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-lg font-medium"
                        style={{
                            border: '1px solid var(--dashboard-border)',
                            color: 'var(--dashboard-text-primary)',
                            backgroundColor: 'var(--dashboard-card-bg)',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-lg font-medium text-white"
                        style={{ backgroundColor: '#0FA958', opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? 'Publishing...' : 'Publish Now'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const FormStatusBadge = ({ status }) => {
    const normalized = String(status || 'draft').toLowerCase();
    const style = FORM_STATUS_STYLES[normalized] || {
        bg: '#F3F4F6',
        color: '#374151',
        label: normalized,
    };

    return (
        <span
            className="px-3 py-1 rounded-full text-xs font-semibold capitalize"
            style={{ backgroundColor: style.bg, color: style.color }}
        >
            {style.label}
        </span>
    );
};

const UnsavedChangesModal = ({ isOpen, onStay, onLeave, onSave, saving = false }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000000 }}
        >
            <div
                className="w-full max-w-md p-5"
                style={{
                    backgroundColor: 'var(--dashboard-card-bg)',
                    borderRadius: 14,
                    boxShadow: '0 10px 35px rgba(0,0,0,0.18)',
                }}
            >
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Unsaved Changes'}
                    Fontsize={22}
                />
                <p className="mt-3 text-sm" style={{ color: 'var(--dashboard-text-primary)' }}>
                    You have unsaved changes. Save your draft, stay on this tab, or leave without saving.
                </p>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onStay}
                        disabled={saving}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-lg font-medium"
                        style={{
                            border: '1px solid var(--dashboard-border)',
                            color: 'var(--dashboard-text-primary)',
                            backgroundColor: 'var(--dashboard-card-bg)',
                        }}
                    >
                        Stay on Page
                    </button>
                    <button
                        type="button"
                        onClick={onLeave}
                        disabled={saving}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-lg font-medium text-white"
                        style={{ backgroundColor: '#DC2626' }}
                    >
                        Leave Without Saving
                    </button>
                    {onSave && (
                        <button
                            type="button"
                            onClick={onSave}
                            disabled={saving}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-lg font-medium text-white"
                            style={{ backgroundColor: '#0FA958', opacity: saving ? 0.7 : 1 }}
                        >
                            {saving ? 'Saving...' : 'Save Draft'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const AddSectionModal = ({ isOpen, onClose, onSubmit, title, value, setValue, submitText = 'Save', loading = false }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50 px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        >
            <div
                className="w-full max-w-md p-5"
                style={{
                    backgroundColor: 'var(--dashboard-card-bg)',
                    borderRadius: 14,
                    boxShadow: '0 10px 35px rgba(0,0,0,0.18)',
                }}
            >
                <div className="flex items-center justify-between mb-5">
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={title}
                        Fontsize={22}
                    />
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                        style={{ color: 'var(--dashboard-text-primary)' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="mb-5">
                    <label
                        className="block mb-2 text-sm font-medium"
                        style={{ color: 'var(--dashboard-text-primary)' }}
                    >
                        Section Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Enter Section name"
                        className="w-full px-3 py-3 rounded-lg outline-none"
                        style={{
                            backgroundColor: 'rgba(67, 121, 238, 0.06)',
                            color: 'var(--dashboard-text-primary)',
                            border: '1px solid rgba(100, 153, 255, 0.45)',
                        }}
                    />
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={onSubmit}
                        disabled={loading}
                        className="px-6 py-2 rounded-lg font-medium"
                        style={{
                            backgroundColor: '#0C79F7',
                            color: '#fff',
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading ? 'Saving...' : submitText}
                    </button>
                </div>
            </div>
        </div>
    );
};

const FormSettingsModal = ({
    isOpen,
    onClose,
    onSubmit,
    formMeta,
    setFormMeta,
    loading = false,
    fixedFormMeta = false,
    showWorkflow = false,
}) => {
    if (!isOpen) return null;

    const updateWorkflow = (key, value) => {
        setFormMeta((prev) => ({
            ...prev,
            workflow: normalizeLeadWorkflow({ ...prev.workflow, [key]: value }),
        }));
    };

    return (
        <div
            className="fixed inset-0 flex items-center justify-center px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 999999 }}
        >
            <div
                className="w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{
                    backgroundColor: 'var(--dashboard-card-bg)',
                    borderRadius: 14,
                    boxShadow: '0 10px 35px rgba(0,0,0,0.18)',
                }}
            >
                <div className="flex items-center justify-between p-5 pb-3 shrink-0">
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={'Form Settings'}
                        Fontsize={22}
                    />
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-4">
                <div className="mb-4">
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Form Name <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        value={formMeta.name}
                        onChange={(e) => setFormMeta((prev) => ({ ...prev, name: e.target.value }))}
                        readOnly={fixedFormMeta}
                        className="w-full px-3 py-2.5 rounded-lg outline-none text-sm text-gray-900 dark:text-white"
                        style={{
                            backgroundColor: fixedFormMeta ? 'rgba(67, 121, 238, 0.03)' : 'rgba(67, 121, 238, 0.06)',
                            border: '1px solid rgba(100, 153, 255, 0.3)',
                            cursor: fixedFormMeta ? 'not-allowed' : 'text',
                        }}
                    />
                    {fixedFormMeta && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            API name: <span className="font-medium">{formMeta.apiName}</span>
                        </p>
                    )}
                </div>

                <div className="mb-4">
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <textarea
                        value={formMeta.description}
                        onChange={(e) => setFormMeta((prev) => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-lg outline-none text-sm resize-none text-gray-900 dark:text-white"
                        style={{ backgroundColor: 'rgba(67, 121, 238, 0.06)', border: '1px solid rgba(100, 153, 255, 0.3)' }}
                    />
                </div>

                <div className="p-4 rounded-xl mb-2" style={{ border: '1px solid var(--dashboard-border)', display: showWorkflow ? 'block' : 'none' }}>
                    <h4 className="font-semibold mb-3" style={{ color: 'var(--sidebar-text-primary)' }}>Workflow</h4>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <input
                                type="checkbox"
                                checked={Boolean(formMeta.workflow?.convertToApplication)}
                                onChange={(e) => updateWorkflow('convertToApplication', e.target.checked)}
                            />
                            Convert to application
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <input
                                type="checkbox"
                                checked={Boolean(formMeta.workflow?.createSupportTicket)}
                                onChange={(e) => updateWorkflow('createSupportTicket', e.target.checked)}
                            />
                            Create support ticket
                        </label>
                    </div>
                </div>
                </div>

                <div
                    className="flex justify-end gap-3 p-5 pt-3 border-t shrink-0"
                    style={{ borderColor: 'var(--dashboard-border)', backgroundColor: 'var(--dashboard-card-bg)' }}
                >
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300" style={{ border: '1px solid var(--dashboard-border)' }}>
                        Cancel
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={loading}
                        className="px-6 py-2 rounded-lg font-medium text-white"
                        style={{ backgroundColor: '#0C79F7', opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ContentShell = ({ children, className = '' }) => (
    <div
        className={`mt-4 rounded-[14px] overflow-hidden ${className}`}
        style={{
            backgroundColor: 'var(--dashboard-card-bg)',
            border: '1px solid var(--dashboard-border)',
        }}
    >
        {children}
    </div>
);

const EmptyFormState = ({ onCreateSection, readOnly = false }) => (
    <div className="flex flex-col items-center justify-center py-20 px-6">
        <div
            className="mb-4 flex items-center justify-center"
            style={{ width: 80, height: 80, color: 'var(--dashboard-text-secondary)' }}
        >
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="14" y="10" width="36" height="44" rx="4" stroke="currentColor" strokeWidth="2" />
                <path d="M22 22H42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M22 30H42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M22 38H34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="48" cy="16" r="8" fill="var(--dashboard-border)" stroke="currentColor" strokeWidth="1.5" />
                <text x="48" y="20" textAnchor="middle" fontSize="10" fill="var(--dashboard-text-secondary)">!</text>
            </svg>
        </div>
        <p className={`text-base font-medium${readOnly ? '' : ' mb-4'}`} style={{ color: 'var(--dashboard-text-secondary)' }}>
            You don&apos;t have any sections yet
        </p>
        {!readOnly && (
            <button
                type="button"
                onClick={onCreateSection}
                className="text-sm font-semibold"
                style={{ color: 'var(--dashboard-primary)' }}
            >
                + Create your first section
            </button>
        )}
    </div>
);

const TypeBadge = ({ type }) => {
    const normalizedType = normalizeFieldType(type);
    const style = TYPE_BADGE_STYLES[normalizedType] || {
        bg: 'var(--dashboard-badge-bg)',
        color: 'var(--dashboard-text-secondary)',
        label: normalizedType,
    };

    return (
        <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold"
            style={{ backgroundColor: style.bg, color: style.color }}
        >
            {style.icon && <span className="font-bold">{style.icon}</span>}
            {style.label}
        </span>
    );
};

const FieldBuilderCard = ({
    field,
    index,
    total,
    onChange,
    onRemove,
    onAddField,
    onMoveUp,
    onMoveDown,
    hideAddField = false,
}) => {
    const [optionInput, setOptionInput] = useState('');
    const fieldType = normalizeFieldType(field.type);
    const options = normalizeOptions(field.options);

    const updateLabel = (label) => {
        onChange({
            ...field,
            label,
            apiName: fieldType === 'heading' ? '' : slugify(label),
        });
    };

    const addOption = () => {
        const label = optionInput.trim();
        if (!label) return;
        const value = slugify(label);
        if (options.some((opt) => opt.value === value)) {
            toast.error('Option already exists');
            return;
        }
        onChange({ ...field, options: [...options, { label, value }] });
        setOptionInput('');
    };

    const removeOption = (value) => {
        onChange({ ...field, options: options.filter((o) => o.value !== value) });
    };

    return (
        <div
            className="p-3 sm:p-4 rounded-xl min-w-0"
            style={{
                backgroundColor: 'var(--dashboard-card-bg)',
                border: '1px solid rgba(100, 153, 255, 0.2)',
            }}
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex items-center gap-2 min-w-0">
                    <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: 'var(--dashboard-primary)' }}
                    >
                        {index + 1}
                    </span>
                    <span className="font-semibold" style={{ color: 'var(--dashboard-text-primary)' }}>
                        New Field
                    </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {total > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={onMoveUp}
                                disabled={index === 0}
                                className="p-1.5 rounded-lg disabled:opacity-40"
                                style={{ color: 'var(--dashboard-primary)', backgroundColor: 'rgba(67, 121, 238, 0.1)' }}
                                aria-label="Move field up"
                            >
                                <FiChevronUp size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={onMoveDown}
                                disabled={index === total - 1}
                                className="p-1.5 rounded-lg disabled:opacity-40"
                                style={{ color: 'var(--dashboard-primary)', backgroundColor: 'rgba(67, 121, 238, 0.1)' }}
                                aria-label="Move field down"
                            >
                                <FiChevronDown size={16} />
                            </button>
                        </>
                    )}
                    {!hideAddField && (
                        <button
                            type="button"
                            onClick={onAddField}
                            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap"
                            style={{ color: 'var(--dashboard-primary)', backgroundColor: 'rgba(67, 121, 238, 0.1)' }}
                        >
                            <Plus size={14} /> Add Field
                        </button>
                    )}
                    {index > 0 && (
                        <button
                            type="button"
                            onClick={onRemove}
                            className="p-1.5 rounded-lg"
                            style={{ color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="min-w-0">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--dashboard-text-primary)' }}>
                        Field Label <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateLabel(e.target.value)}
                        placeholder={fieldType === 'heading' ? 'e.g. Business details' : 'e.g. Owner name'}
                        className="w-full px-3 py-2.5 rounded-lg outline-none text-sm"
                        style={{
                            backgroundColor: 'rgba(67, 121, 238, 0.06)',
                            border: '1px solid rgba(100, 153, 255, 0.3)',
                            color: 'var(--dashboard-text-primary)',
                        }}
                    />
                </div>
                <div className="min-w-0 w-full">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--dashboard-text-primary)' }}>
                        Field Type <span className="text-red-500">*</span>
                    </label>
                    <DropdownMenu
                        menuItems={FIELD_TYPE_MENU_ITEMS}
                        selectedValue={FIELD_TYPES.find((t) => t.value === fieldType)?.label || 'Select field type'}
                        defaultText="Select field type"
                        onSelect={(value) => onChange(handleFieldTypeChange(field, value))}
                        backgroundColor="rgba(67, 121, 238, 0.06)"
                        border="1px solid rgba(100, 153, 255, 0.35)"
                        fullWidth
                    />
                </div>
            </div>

            {supportsSelectOptions(fieldType) && (
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--dashboard-text-primary)' }}>
                        Dropdown Options <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={optionInput}
                            onChange={(e) => setOptionInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addOption();
                                }
                            }}
                            placeholder="Add option"
                            className="w-full px-3 py-2.5 pr-10 rounded-lg outline-none text-sm"
                            style={{
                                backgroundColor: 'rgba(67, 121, 238, 0.06)',
                                border: '1px solid rgba(100, 153, 255, 0.3)',
                                color: 'var(--dashboard-text-primary)',
                            }}
                        />
                        <button
                            type="button"
                            onClick={addOption}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded"
                            style={{ color: 'var(--dashboard-primary)' }}
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                    {options.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {options.map((opt) => (
                                <span
                                    key={opt.value}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium"
                                    style={{ backgroundColor: 'rgba(67, 121, 238, 0.12)', color: 'var(--dashboard-primary)' }}
                                >
                                    {opt.label}
                                    <button type="button" onClick={() => removeOption(opt.value)} className="hover:opacity-70">
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {supportsNumberValidation(fieldType) && (
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--dashboard-text-primary)' }}>
                        Minimum Value
                    </label>
                    <input
                        type="number"
                        value={field.validation?.min ?? ''}
                        onChange={(e) => onChange({
                            ...field,
                            validation: {
                                ...field.validation,
                                min: e.target.value === '' ? '' : Number(e.target.value),
                            },
                        })}
                        placeholder="e.g. 0"
                        className="w-full px-3 py-2.5 rounded-lg outline-none text-sm"
                        style={{
                            backgroundColor: 'rgba(67, 121, 238, 0.06)',
                            border: '1px solid rgba(100, 153, 255, 0.3)',
                            color: 'var(--dashboard-text-primary)',
                        }}
                    />
                </div>
            )}

            {supportsRequired(fieldType) && (
            <div className={`flex flex-col sm:flex-row gap-3 ${supportsSelectOptions(fieldType) ? '' : 'flex-wrap'}`}>
                <button
                    type="button"
                    onClick={() => onChange({ ...field, required: !field.required })}
                    className={`flex items-center justify-center gap-2 rounded-xl font-medium text-sm transition-colors w-full sm:flex-1 ${supportsSelectOptions(fieldType) ? 'py-3' : 'py-2.5'}`}
                    style={{
                        border: field.required ? '1.5px solid #FCA5A5' : '1.5px solid var(--dashboard-border)',
                        backgroundColor: field.required ? '#FEF2F2' : 'transparent',
                        color: field.required ? '#DC2626' : 'var(--dashboard-text-secondary)',
                    }}
                >
                    <FiShield size={16} />
                    Required
                    {field.required && <FiCheck size={14} />}
                </button>
                {supportsMaskValue(fieldType) && (
                    <button
                        type="button"
                        onClick={() => onChange({ ...field, masked: !field.masked })}
                        className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-colors"
                        style={{
                            border: field.masked ? '1.5px solid #FDBA74' : '1.5px solid var(--dashboard-border)',
                            backgroundColor: field.masked ? '#FFF7ED' : 'transparent',
                            color: field.masked ? '#EA580C' : 'var(--dashboard-text-secondary)',
                        }}
                    >
                        <FiLock size={16} />
                        Mask
                        {field.masked && <FiCheck size={14} />}
                    </button>
                )}
            </div>
            )}
        </div>
    );
};

const FieldsTable = ({ fields, onEditField, onDeleteField, onReorderFields, readOnly = false }) => {
    const [draggingId, setDraggingId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);

    const handleDrop = (targetId) => {
        if (!draggingId || draggingId === targetId || !onReorderFields) return;

        const fromIndex = fields.findIndex((field) => field.id === draggingId);
        const toIndex = fields.findIndex((field) => field.id === targetId);
        if (fromIndex === -1 || toIndex === -1) return;

        onReorderFields(fromIndex, toIndex);
        setDraggingId(null);
        setDragOverId(null);
    };

    return (
    <div className="overflow-x-auto rounded-lg -mx-1 sm:mx-0" style={{ border: '1px solid var(--dashboard-border)' }}>
        <table className="w-full text-sm min-w-[640px]">
            <thead>
                <tr style={{ backgroundColor: 'var(--navbar-dropdown-hover)', color: 'var(--sidebar-text-selected)' }}>
                    <th className="px-3 py-3 w-8" />
                    <th className="px-3 py-3 text-left font-semibold">Label</th>
                    <th className="px-3 py-3 text-left font-semibold">Type</th>
                    <th className="px-3 py-3 text-center font-semibold">Required</th>
                    <th className="px-3 py-3 text-center font-semibold">Masked</th>
                    <th className="px-3 py-3 text-left font-semibold">Options</th>
                    {!readOnly && <th className="px-3 py-3 text-center font-semibold">Actions</th>}
                </tr>
            </thead>
            <tbody>
                {fields.map((field) => (
                    <tr
                        key={field.id}
                        draggable={Boolean(onReorderFields) && !readOnly}
                        onDragStart={() => setDraggingId(field.id)}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverId(field.id);
                        }}
                        onDragLeave={() => {
                            if (dragOverId === field.id) setDragOverId(null);
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            handleDrop(field.id);
                        }}
                        onDragEnd={() => {
                            setDraggingId(null);
                            setDragOverId(null);
                        }}
                        className="border-t"
                        style={{
                            borderColor: 'var(--dashboard-border)',
                            backgroundColor: dragOverId === field.id
                                ? 'rgba(67, 121, 238, 0.08)'
                                : 'var(--dashboard-card-bg)',
                            opacity: draggingId === field.id ? 0.55 : 1,
                            cursor: onReorderFields && !readOnly ? 'grab' : 'default',
                        }}
                    >
                        <td className="px-3 py-3" style={{ color: 'var(--dashboard-text-secondary)' }}>
                            {!readOnly && (
                                <GripVertical size={16} className={onReorderFields ? 'cursor-grab active:cursor-grabbing' : ''} />
                            )}
                        </td>
                        <td className="px-3 py-3 font-medium" style={{ color: 'var(--dashboard-text-primary)' }}>
                            {field.label}
                        </td>
                        <td className="px-3 py-3">
                            <TypeBadge type={field.type} />
                        </td>
                        <td className="px-3 py-3 text-center">
                            {field.required ? (
                                <span
                                    className="inline-flex items-center justify-center w-6 h-6 rounded-full"
                                    style={{ backgroundColor: '#FCE7F3', color: '#DB2777' }}
                                >
                                    <FiCheck size={14} />
                                </span>
                            ) : (
                                <span className="text-gray-400">—</span>
                            )}
                        </td>
                        <td className="px-3 py-3 text-center">
                            {supportsMaskValue(normalizeFieldType(field.type)) && field.masked ? (
                                <FiLock size={16} style={{ color: '#EA580C' }} className="inline" />
                            ) : (
                                <span className="text-gray-400">—</span>
                            )}
                        </td>
                        <td className="px-3 py-3">
                            {supportsSelectOptions(normalizeFieldType(field.type)) && normalizeOptions(field.options).length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {normalizeOptions(field.options).map((opt) => (
                                        <span
                                            key={opt.value}
                                            className="px-2 py-0.5 rounded text-xs"
                                            style={{ backgroundColor: 'rgba(67, 121, 238, 0.12)', color: '#0C79F7' }}
                                        >
                                            {opt.label}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-gray-400">—</span>
                            )}
                        </td>
                        {!readOnly && (
                            <td className="px-3 py-3">
                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onEditField(field)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                    >
                                        <RiEdit2Line size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDeleteField(field.id)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <RiDeleteBin6Line size={16} />
                                    </button>
                                </div>
                            </td>
                        )}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
    );
};

const EmptyFieldsPlaceholder = ({ onAddField, label = 'Add the first field to this section' }) => (
    <button
        type="button"
        onClick={onAddField}
        className="w-full flex flex-col items-center justify-center py-14 rounded-lg border-2 border-dashed cursor-pointer hover:border-blue-300 transition-colors"
        style={{ borderColor: '#D1D5DB', color: '#9CA3AF', backgroundColor: 'var(--dashboard-card-bg)' }}
    >
        <Plus size={24} style={{ color: '#0C79F7', marginBottom: 8 }} />
        <span className="text-sm">{label}</span>
    </button>
);

const DefaultFieldsCard = ({ fields }) => (
    <div
        className="mb-4 rounded-xl overflow-hidden"
        style={{
            backgroundColor: 'var(--dashboard-card-bg)',
            border: '1px solid rgba(100, 153, 255, 0.2)',
        }}
    >
        <div className="px-3 sm:px-4 py-3 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <h3 className="text-base sm:text-lg font-bold break-words" style={{ color: 'var(--sidebar-text-primary)' }}>
                Default Fields
            </h3>
            <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--dashboard-text-secondary)' }}>
                Built-in fields on the Add Lead page. Shown for reference only — not saved with your form definition.
            </p>
        </div>
        <div className="p-3 sm:p-4">
            <FieldsTable fields={fields} readOnly />
        </div>
    </div>
);

const StandaloneFieldsCard = ({ title, fields, onAddField, onEditField, onDeleteField, onReorderFields, readOnly = false }) => (
    <div
        className="mb-4 rounded-xl overflow-hidden"
        style={{
            backgroundColor: 'var(--dashboard-card-bg)',
            border: '1px solid rgba(0,0,0,0.06)',
        }}
    >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-3 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <h3 className="text-base sm:text-lg font-bold break-words" style={{ color: 'var(--sidebar-text-primary)' }}>
                {title}
            </h3>
            {!readOnly && (
                <button
                    type="button"
                    onClick={onAddField}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 self-start sm:self-auto"
                    style={{ color: '#0C79F7', backgroundColor: 'rgba(67, 121, 238, 0.1)' }}
                >
                    <Plus size={14} /> Add Field
                </button>
            )}
        </div>
        <div className="p-3 sm:p-4">
            {fields.length === 0 ? (
                readOnly ? (
                    <div className="py-10 text-center text-sm text-gray-400">No fields in this section</div>
                ) : (
                    <EmptyFieldsPlaceholder onAddField={onAddField} label="Add your first field" />
                )
            ) : (
                <FieldsTable
                    fields={fields}
                    onEditField={onEditField}
                    onDeleteField={onDeleteField}
                    onReorderFields={onReorderFields}
                    readOnly={readOnly}
                />
            )}
        </div>
    </div>
);

const SectionCard = ({
    section,
    onAddField,
    onEditSection,
    onDeleteSection,
    onToggleCollapse,
    onEditField,
    onDeleteField,
    onReorderFields,
    readOnly = false,
}) => {
    const hasFields = section.fields?.length > 0;

    return (
        <div
            className="mb-4 last:mb-0 rounded-xl overflow-hidden"
            style={{
                backgroundColor: 'var(--dashboard-tab-box)',
                border: '1px solid rgba(100, 153, 255, 0.15)',
            }}
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-3 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                <h3 className="text-base sm:text-lg font-bold break-words min-w-0" style={{ color: 'var(--sidebar-text-primary)' }}>
                    {section.title}
                </h3>
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap shrink-0">
                    {!readOnly && (
                        <>
                            <button
                                type="button"
                                onClick={() => onAddField(section.id)}
                                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap"
                                style={{ color: '#0C79F7', backgroundColor: 'rgba(67, 121, 238, 0.1)' }}
                            >
                                <Plus size={14} /> Add Field
                            </button>
                            <button type="button" onClick={() => onEditSection(section)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                <RiEdit2Line size={18} />
                            </button>
                            <button type="button" onClick={() => onDeleteSection(section.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                <RiDeleteBin6Line size={18} />
                            </button>
                        </>
                    )}
                    <button type="button" onClick={() => onToggleCollapse(section.id)} className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg">
                        {section.collapsed ? <FiChevronDown size={18} /> : <FiChevronUp size={18} />}
                    </button>
                </div>
            </div>

            {!section.collapsed && (
                <div className="p-3 sm:p-4">
                    {!hasFields ? (
                        readOnly ? (
                            <div className="py-10 text-center text-sm text-gray-400">No fields in this section</div>
                        ) : (
                            <EmptyFieldsPlaceholder onAddField={() => onAddField(section.id)} />
                        )
                    ) : (
                        <FieldsTable
                            fields={section.fields}
                            onEditField={(field) => onEditField(section.id, field)}
                            onDeleteField={(fieldId) => onDeleteField(section.id, fieldId)}
                            onReorderFields={(fromIndex, toIndex) => onReorderFields(section.id, fromIndex, toIndex)}
                            readOnly={readOnly}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

const SalesFormBuilder = () => {
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const { tab: tabParam } = useParams();
    const navigate = useNavigate();

    usePageTitle('Sales Setup', location);

    const [activeTab, setActiveTab] = useState('leads');
    const [formStateByTab, setFormStateByTab] = useState(createInitialFormStateByTab);
    const [sectionModal, setSectionModal] = useState({ open: false, editingId: null, title: '' });
    const [sectionName, setSectionName] = useState('');
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    const [settingsDraft, setSettingsDraft] = useState(emptyFormState('leads'));

    const [fieldBuilder, setFieldBuilder] = useState(null);
    const [deleteModal, setDeleteModal] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [duplicating, setDuplicating] = useState(false);
    const [discarding, setDiscarding] = useState(false);
    const [publishModalOpen, setPublishModalOpen] = useState(false);
    const [discardDraftModalOpen, setDiscardDraftModalOpen] = useState(false);
    const [publishedFormMetaByTab, setPublishedFormMetaByTab] = useState(() =>
        FORM_BUILDER_TABS.reduce((acc, { key }) => {
            acc[key] = { definitionId: null, version: null };
            return acc;
        }, {})
    );
    const [formVersionsByTab, setFormVersionsByTab] = useState({});
    const [viewModeByTab, setViewModeByTab] = useState({});
    const loadedTabsRef = useRef(new Set());
    const [savedSnapshotByTab, setSavedSnapshotByTab] = useState(createInitialSavedSnapshotsByTab);
    const [baselineFormStateByTab, setBaselineFormStateByTab] = useState(createInitialFormStateByTab);
    const [settingsInitialSnapshot, setSettingsInitialSnapshot] = useState(null);
    const [leaveConfirm, setLeaveConfirm] = useState(null);

    const formState = formStateByTab[activeTab] || emptyFormState(activeTab);
    const sections = formState.sections;
    const standaloneFields = formState.standaloneFields;
    const hasSections = sections.length > 0;
    const allowStandaloneFields = !hasSections;
    const hasFormContent = hasSections || standaloneFields.length > 0;

    const tabLabel = TAB_LABEL_MAP[activeTab] || 'Form';
    const publishedFormMeta = publishedFormMetaByTab[activeTab] || { definitionId: null, version: null };
    const activeViewMode = viewModeByTab[activeTab] || (formState.status === 'published' ? 'published' : 'draft');
    const tabFormVersions = formVersionsByTab[activeTab];
    const hasDraftAndPublished = Boolean(tabFormVersions?.draft && tabFormVersions?.published);

    const isPublishedLive = activeViewMode === 'published' || formState.status === 'published';
    const isDraftEditing = activeViewMode === 'draft' && formState.status === 'draft' && Boolean(formState.definitionId);
    const isProposalFormTab = isProposalTab(activeTab);
    const isQuotationFormTab = isQuotationTab(activeTab);
    const isQualificationFormTab = isQualificationTab(activeTab);
    const isFixedMetaFormTabActive = isFixedMetaFormTab(activeTab);
    const isFormLocked = isPublishedLive;
    const isNewForm = !formState.definitionId;
    const formStats = useMemo(() => countFormStats(formState), [formState]);
    const nextPublishVersion = useMemo(() => {
        if (formState.version != null) return Number(formState.version);
        if (publishedFormMeta.version != null) return Number(publishedFormMeta.version) + 1;
        return 1;
    }, [formState.version, publishedFormMeta.version]);

    const isAnyTabDirty = useMemo(
        () =>
            Object.keys(formStateByTab).some((tab) => {
                const current = formStateByTab[tab] || emptyFormState(tab);
                return serializeFormStateForCompare(current, tab) !== savedSnapshotByTab[tab];
            }),
        [formStateByTab, savedSnapshotByTab]
    );

    const isFieldBuilderDirty = useMemo(() => {
        if (!fieldBuilder) return false;
        return fieldBuilder.initialFieldsSnapshot !== serializeFieldBuilderFields(fieldBuilder.fields);
    }, [fieldBuilder]);

    const isSettingsDirty = useMemo(() => {
        if (!settingsModalOpen || !settingsInitialSnapshot) return false;
        return serializeSettingsDraft(settingsDraft) !== settingsInitialSnapshot;
    }, [settingsModalOpen, settingsDraft, settingsInitialSnapshot]);

    const hasUnsavedChanges = isAnyTabDirty || isFieldBuilderDirty || isSettingsDirty;

    // Handle URL parameters for tab navigation
    useEffect(() => {
        if (tabParam && FORM_BUILDER_TABS.some(({ key }) => key === tabParam)) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    const applyLoadedFormState = (tab, mapped, publishedMeta = { definitionId: null, version: null }, viewMode = null) => {
        const snapshot = serializeFormStateForCompare(mapped, tab);
        const baseline = cloneFormState(mapped);
        setFormStateByTab((prev) => ({
            ...prev,
            [tab]: mapped,
        }));
        setSavedSnapshotByTab((prev) => ({
            ...prev,
            [tab]: snapshot,
        }));
        setBaselineFormStateByTab((prev) => ({
            ...prev,
            [tab]: baseline,
        }));
        setPublishedFormMetaByTab((prev) => ({
            ...prev,
            [tab]: publishedMeta,
        }));
        if (viewMode) {
            setViewModeByTab((prev) => ({
                ...prev,
                [tab]: viewMode,
            }));
        }
    };

    const invalidateTabCache = (tab) => {
        loadedTabsRef.current.delete(tab);
    };

    const resolveFormViewFromVersions = (tab, versions, preferredMode = null) => {
        const { draft, published } = versions;
        const defaultMode = draft ? 'draft' : published ? 'published' : 'draft';
        const requested = preferredMode ?? viewModeByTab[tab] ?? defaultMode;

        if (requested === 'draft' && draft) {
            return {
                mapped: draft,
                viewMode: 'draft',
                publishedMeta: published
                    ? {
                        definitionId: getFormDefinitionId(published),
                        version: published.version ?? null,
                    }
                    : {
                        definitionId: draft.sourceDefinitionId ?? null,
                        version: null,
                    },
            };
        }

        if (published) {
            return {
                mapped: published,
                viewMode: 'published',
                publishedMeta: {
                    definitionId: getFormDefinitionId(published),
                    version: published.version ?? null,
                },
            };
        }

        if (draft) {
            return {
                mapped: draft,
                viewMode: 'draft',
                publishedMeta: { definitionId: draft.sourceDefinitionId ?? null, version: null },
            };
        }

        return null;
    };

    const applyFormVersionsForTab = (tab, versions, preferredMode = null) => {
        setFormVersionsByTab((prev) => ({
            ...prev,
            [tab]: versions,
        }));

        const resolved = resolveFormViewFromVersions(tab, versions, preferredMode);
        if (resolved) {
            applyLoadedFormState(tab, resolved.mapped, resolved.publishedMeta, resolved.viewMode);
            return;
        }

        const empty = emptyFormState(tab);
        applyLoadedFormState(tab, empty, { definitionId: null, version: null }, 'draft');
    };

    const loadFormDefinition = async (tab) => {
        if (!accessToken) return;
        setLoading(true);
        try {
            let draft = null;
            let published = null;

            if (isProposalTab(tab)) {
                ({ draft, published } = await fetchProposalFormDefinitionsForBuilder(accessToken));
            } else if (tab === 'leads') {
                ({ draft, published } = await fetchLeadFormDefinitionsForBuilder(accessToken));
            } else if (isQuotationTab(tab)) {
                ({ draft, published } = await fetchQuotationFormDefinitionsForBuilder(accessToken));
            } else if (isQualificationTab(tab)) {
                ({ draft, published } = await fetchQualificationFormDefinitionsForBuilder(accessToken));
            } else if (isPipelineStageTab(tab)) {
                ({ draft, published } = await fetchPipelineStageFormDefinitionsForBuilder(tab, accessToken));
            } else {
                const { entityType, matchName, apiName } = getTabFetchParams(tab);
                ({ draft, published } = await fetchFormDefinitionsForBuilder(
                    entityType,
                    accessToken,
                    {
                        matchName,
                        apiName,
                        entityType,
                        formPurpose: TAB_FORM_PURPOSE_MAP[tab] ?? null,
                    }
                ));
            }

            // No draft → show published live form (default sales flow)
            if (!draft && published) {
                const mapped = mapApiDefinitionToFormState(published, tab);
                applyFormVersionsForTab(tab, { draft: null, published: mapped }, 'published');
                return;
            }

            const draftMapped = draft ? mapApiDefinitionToFormState(draft, tab) : null;
            const publishedMapped = published ? mapApiDefinitionToFormState(published, tab) : null;

            if (draftMapped || publishedMapped) {
                applyFormVersionsForTab(tab, {
                    draft: draftMapped,
                    published: publishedMapped,
                });
                return;
            }

            const empty = emptyFormState(tab);
            applyLoadedFormState(tab, empty, { definitionId: null, version: null }, 'draft');
        } catch (error) {
            toast.error(error.message || 'Failed to load form definition');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!accessToken) return;

        if (loadedTabsRef.current.has(activeTab)) {
            setFieldBuilder(null);
            return;
        }

        loadFormDefinition(activeTab).finally(() => {
            loadedTabsRef.current.add(activeTab);
        });
        setFieldBuilder(null);
    }, [activeTab, accessToken]);

    useEffect(() => {
        if (!hasUnsavedChanges) return undefined;

        const handleBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const handleNavigationBlock = useCallback((tx) => {
        toast.warn('You have unsaved changes');
        setLeaveConfirm({
            type: 'route',
            onConfirm: () => {
                setLeaveConfirm(null);
                tx.retry();
            },
            onCancel: () => {
                setLeaveConfirm(null);
                tx.reset?.();
            },
            onSave: isDraftEditing
                ? async () => {
                    const saved = await commitFormState(formState, { silent: true });
                    if (saved) {
                        setLeaveConfirm(null);
                        tx.retry();
                    }
                }
                : null,
        });
    }, [formState, isDraftEditing]);

    useNavigationBlocker(hasUnsavedChanges, handleNavigationBlock);

    const requestTabChange = (targetTab) => {
        if (targetTab === activeTab) return;

        const finishTabChange = (tabBeingLeft) => {
            setFormStateByTab((prev) => ({
                ...prev,
                [tabBeingLeft]: cloneFormState(baselineFormStateByTab[tabBeingLeft] || emptyFormState(tabBeingLeft)),
            }));
            setFieldBuilder(null);
            setSettingsModalOpen(false);
            setSettingsInitialSnapshot(null);
            setActiveTab(targetTab);
            setLeaveConfirm(null);
            // Update URL path when tab changes
            navigate(`/home/salesFormBuilder/${targetTab}`);
        };

        if (hasUnsavedChanges) {
            const tabBeingLeft = activeTab;
            setLeaveConfirm({
                type: 'tab',
                onConfirm: () => finishTabChange(tabBeingLeft),
                onSave: isDraftEditing
                    ? async () => {
                        const saved = await commitFormState(formState, { silent: true });
                        if (saved) finishTabChange(tabBeingLeft);
                    }
                    : null,
            });
            return;
        }

        setFieldBuilder(null);
        setActiveTab(targetTab);
        // Update URL path when tab changes
        navigate(`/home/salesFormBuilder/${targetTab}`);
    };

    const switchFormViewMode = (mode) => {
        const versions = formVersionsByTab[activeTab];
        if (!versions) return;
        applyFormVersionsForTab(activeTab, versions, mode);
        setFieldBuilder(null);
    };

    const requestFormViewMode = (mode) => {
        if (mode === activeViewMode) return;

        if (hasUnsavedChanges) {
            setLeaveConfirm({
                type: 'viewMode',
                onConfirm: () => {
                    switchFormViewMode(mode);
                    setLeaveConfirm(null);
                },
            });
            return;
        }

        switchFormViewMode(mode);
    };

    const handleLeaveConfirmSave = async () => {
        if (!leaveConfirm?.onSave) return;
        await leaveConfirm.onSave();
    };

    const requestCloseFieldBuilder = () => {
        if (isFieldBuilderDirty) {
            setLeaveConfirm({
                type: 'fieldBuilder',
                onConfirm: () => {
                    setFieldBuilder(null);
                    setLeaveConfirm(null);
                },
            });
            return;
        }

        setFieldBuilder(null);
    };

    const updateFormState = (updater) => {
        setFormStateByTab((prev) => {
            const current = prev[activeTab] || emptyFormState(activeTab);
            const next = typeof updater === 'function' ? updater(current) : updater;
            return { ...prev, [activeTab]: next };
        });
    };

    const updateSections = (updater) => {
        updateFormState((prev) => ({
            ...prev,
            sections: typeof updater === 'function' ? updater(prev.sections) : updater,
        }));
    };

    const updateStandaloneFields = (updater) => {
        updateFormState((prev) => ({
            ...prev,
            standaloneFields: typeof updater === 'function' ? updater(prev.standaloneFields) : updater,
        }));
    };

    const handleReorderStandaloneFields = (fromIndex, toIndex) => {
        updateStandaloneFields((prev) => reorderItems(prev, fromIndex, toIndex));
    };

    const handleReorderSectionFields = (sectionId, fromIndex, toIndex) => {
        updateSections((prev) =>
            prev.map((section) =>
                section.id === sectionId
                    ? { ...section, fields: reorderItems(section.fields, fromIndex, toIndex) }
                    : section
            )
        );
    };

    const moveFieldInBuilder = (fieldId, direction) => {
        setFieldBuilder((prev) => {
            if (!prev) return prev;
            const currentIndex = prev.fields.findIndex((field) => field.id === fieldId);
            const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
            if (currentIndex === -1 || targetIndex < 0 || targetIndex >= prev.fields.length) return prev;

            return {
                ...prev,
                fields: reorderItems(prev.fields, currentIndex, targetIndex),
            };
        });
    };

    const openSettingsModal = () => {
        const draft = {
            name: formState.name,
            entityType: formState.entityType,
            description: formState.description,
            workflow: { ...formState.workflow },
        };
        setSettingsDraft(draft);
        setSettingsInitialSnapshot(serializeSettingsDraft(draft));
        setSettingsModalOpen(true);
    };

    const requestCloseSettingsModal = () => {
        if (isSettingsDirty) {
            setLeaveConfirm({
                type: 'settings',
                onConfirm: () => {
                    setSettingsModalOpen(false);
                    setSettingsInitialSnapshot(null);
                    setLeaveConfirm(null);
                },
            });
            return;
        }

        setSettingsModalOpen(false);
        setSettingsInitialSnapshot(null);
    };

    const saveSettings = async () => {
        if (!settingsDraft.name?.trim()) {
            toast.error('Form name is required');
            return;
        }

        const trimmedName = settingsDraft.name.trim();
        const nextState = applyFixedFormMeta(activeTab, {
            ...formState,
            name: trimmedName,
            apiName: formState.definitionId && formState.apiName ? formState.apiName : slugify(trimmedName),
            description: settingsDraft.description?.trim() || '',
            workflow: normalizeLeadWorkflow(settingsDraft.workflow),
        });

        const saved = await commitFormState(nextState, { successMessage: 'Form settings updated' });
        if (saved) {
            setSettingsModalOpen(false);
            setSettingsInitialSnapshot(null);
        }
    };

    const handleCreateNewVersion = async () => {
        if (!formState.definitionId || !isFormLocked) return;

        setDuplicating(true);
        try {
            const uniqueApiName = buildUniqueDuplicateApiName(formState.apiName, activeTab);
            const result = await duplicateFormDefinition(formState.definitionId, accessToken, {
                apiName: uniqueApiName,
                sourceApiName: formState.apiName,
                tab: activeTab,
                sourcePayload: buildFormDefinitionPayload(formState, activeTab),
            });
            const duplicated = result?.data ?? result;
            const mapped = mapApiDefinitionToFormState(duplicated, activeTab);
            const publishedMapped = formVersionsByTab[activeTab]?.published
                ?? cloneFormState(formState);

            applyFormVersionsForTab(activeTab, {
                draft: mapped,
                published: publishedMapped,
            }, 'draft');

            toast.success(result?.message || 'Draft version created. You can now edit safely.');
        } catch (error) {
            toast.error(error.message || 'Failed to create new version');
        } finally {
            setDuplicating(false);
        }
    };

    const handleDiscardDraft = async () => {
        if (!isDraftEditing || !formState.definitionId) return;

        setDiscarding(true);
        try {
            await archiveFormDefinition(formState.definitionId, accessToken);
            setDiscardDraftModalOpen(false);
            setFieldBuilder(null);
            invalidateTabCache(activeTab);
            await loadFormDefinition(activeTab);
            loadedTabsRef.current.add(activeTab);
            toast.success('Draft discarded');
        } catch (error) {
            toast.error(error.message || 'Failed to discard draft');
        } finally {
            setDiscarding(false);
        }
    };

    const handlePublishForm = async () => {
        if (!formState.definitionId) {
            toast.error('Please save the form before publishing');
            return;
        }

        if (!formState.name?.trim()) {
            toast.error('Please set form name in Form Settings');
            setSettingsModalOpen(true);
            return;
        }

        if (!validateSectionsHaveFields(formState)) return;

        setPublishing(true);
        try {
            if (hasUnsavedChanges) {
                const saved = await commitFormState(formState, { silent: true });
                if (!saved) return;
            }

            const archiveId = publishedFormMeta.definitionId;
            const result = await publishFormDefinition(formState.definitionId, accessToken);

            if (archiveId && archiveId !== formState.definitionId) {
                try {
                    await archiveFormDefinition(archiveId, accessToken);
                } catch (archiveError) {
                    console.error('Failed to archive previous version:', archiveError);
                }
            }

            setPublishModalOpen(false);
            setFieldBuilder(null);
            invalidateTabCache(activeTab);
            await loadFormDefinition(activeTab);
            loadedTabsRef.current.add(activeTab);
            toast.success(result?.message || 'Form published successfully');
        } catch (error) {
            toast.error(error.message || 'Failed to publish form');
        } finally {
            setPublishing(false);
        }
    };

    const requestPublishForm = () => {
        if (!formState.definitionId) {
            toast.error('Please save the form before publishing');
            return;
        }
        if (!validateSectionsHaveFields(formState)) return;
        setPublishModalOpen(true);
    };

    const commitFormState = async (nextState, { successMessage, silent = false } = {}) => {
        if (!nextState.name?.trim()) {
            toast.error('Please set form name in Form Settings');
            setSettingsModalOpen(true);
            setSettingsDraft({
                name: nextState.name,
                entityType: nextState.entityType,
                description: nextState.description,
                workflow: { ...nextState.workflow },
            });
            return false;
        }

        setSaving(true);
        try {
            const stateToSave = applyFixedFormMeta(activeTab, nextState);
            const result = isProposalFormTab
                ? await saveProposalFormDefinition(stateToSave, accessToken)
                : activeTab === 'leads'
                    ? await saveLeadFormDefinition(stateToSave, accessToken)
                    : isQuotationFormTab
                    ? await saveQuotationFormDefinition(stateToSave, accessToken)
                    : isQualificationFormTab
                        ? await saveQualificationFormDefinition(stateToSave, accessToken)
                        : await saveFormDefinition(
                    buildFormDefinitionPayload(stateToSave, activeTab),
                    accessToken,
                    stateToSave.definitionId
                );
            const saved = result?.data ?? result;
            const definitionId = getFormDefinitionId(saved) ?? getFormDefinitionId(stateToSave);

            const savedState = applyFixedFormMeta(activeTab, {
                ...stateToSave,
                definitionId,
                status: saved?.status ?? stateToSave.status,
                name: saved?.name ?? stateToSave.name,
                apiName: saved?.apiName ?? stateToSave.apiName,
                description: saved?.description ?? stateToSave.description,
            });

            updateFormState(() => savedState);
            const savedSnapshot = serializeFormStateForCompare(savedState, activeTab);
            setSavedSnapshotByTab((prev) => ({
                ...prev,
                [activeTab]: savedSnapshot,
            }));
            setBaselineFormStateByTab((prev) => ({
                ...prev,
                [activeTab]: cloneFormState(savedState),
            }));
            setFormVersionsByTab((prev) => ({
                ...prev,
                [activeTab]: {
                    draft: savedState.status === 'draft' ? savedState : prev[activeTab]?.draft ?? null,
                    published: savedState.status === 'published'
                        ? savedState
                        : prev[activeTab]?.published ?? null,
                },
            }));

            if (successMessage && !silent) {
                toast.success(result?.message || successMessage);
            }
            return true;
        } catch (error) {
            toast.error(error.message || 'Failed to save form definition');
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleSaveFormDefinition = async () => {
        if (!validateSectionsHaveFields(formState)) return;

        await commitFormState(formState, {
            successMessage: isDraftEditing ? 'Draft saved successfully' : 'Form definition saved successfully',
        });
    };

    const openAddSectionModal = (editingSection = null) => {
        setSectionName(editingSection?.title || '');
        setSectionModal({ open: true, editingId: editingSection?.id || null, title: editingSection ? 'Edit Section' : 'Add Section' });
    };

    const closeSectionModal = () => {
        setSectionModal({ open: false, editingId: null, title: '' });
        setSectionName('');
    };

    const saveSection = async () => {
        if (!sectionName.trim()) {
            toast.error('Section name is required');
            return;
        }

        const successMessage = sectionModal.editingId ? 'Section updated' : 'Section created';
        let nextState;

        if (sectionModal.editingId) {
            nextState = {
                ...formState,
                sections: sections.map((s) =>
                    s.id === sectionModal.editingId ? { ...s, title: sectionName.trim() } : s
                ),
            };
        } else {
            nextState = {
                ...formState,
                sections: [
                    ...sections,
                    {
                        id: `section_${slugify(sectionName.trim()) || createId()}`,
                        title: sectionName.trim(),
                        collapsed: false,
                        fields: [],
                    },
                ],
            };
        }

        const saved = await commitFormState(nextState, { successMessage });
        if (saved) {
            closeSectionModal();
        }
    };

    const openFieldBuilder = (sectionId, existingFields = null, replaceMode = false) => {
        const isStandalone = sectionId === STANDALONE_SECTION_ID;
        const section = isStandalone ? null : sections.find((s) => s.id === sectionId);

        if (!isStandalone && !section) return;

        const fields = existingFields || [createEmptyField()];

        setFieldBuilder({
            sectionId,
            sectionTitle: isStandalone ? tabLabel : section.title,
            fields,
            replaceMode,
            editingFieldIds: existingFields ? existingFields.map((f) => f.id) : [],
            initialFieldsSnapshot: serializeFieldBuilderFields(fields),
        });
    };

    const openStandaloneFieldBuilder = (existingFields = null, replaceMode = false) => {
        if (sections.length > 0) return;
        openFieldBuilder(STANDALONE_SECTION_ID, existingFields, replaceMode);
    };

    const closeFieldBuilder = () => requestCloseFieldBuilder();

    const validateFields = (fields) => {
        for (const field of fields) {
            const fieldType = normalizeFieldType(field.type);

            if (!field.label.trim()) {
                toast.error('All fields must have a label');
                return false;
            }
            if (fieldType === 'heading') continue;
            if (isLeadsTab(activeTab) && conflictsWithDefaultLeadField(field)) {
                toast.error(`"${field.label.trim()}" is already a default lead field`);
                return false;
            }
            if (supportsSelectOptions(fieldType) && normalizeOptions(field.options).length === 0) {
                toast.error(`"${field.label}" needs at least one select option`);
                return false;
            }
        }
        return true;
    };

    const saveFields = async () => {
        if (!fieldBuilder) return;
        if (!validateFields(fieldBuilder.fields)) return;

        const normalizedFields = fieldBuilder.fields.map((field) =>
            normalizeField({ ...field, label: field.label.trim() })
        );
        const nextState = applyFieldBuilderChanges(formState, fieldBuilder, normalizedFields);
        const successMessage = fieldBuilder.replaceMode
            ? 'Field updated'
            : `Added ${fieldBuilder.fields.length} field${fieldBuilder.fields.length > 1 ? 's' : ''}`;

        const saved = await commitFormState(nextState, { successMessage });
        if (saved) {
            setFieldBuilder(null);
        }
    };

    const handleDeleteSection = (sectionId) => {
        setDeleteModal({ type: 'section', sectionId });
    };

    const handleDeleteField = (sectionId, fieldId) => {
        setDeleteModal({ type: 'field', sectionId, fieldId });
    };

    const handleDeleteStandaloneField = (fieldId) => {
        setDeleteModal({ type: 'field', sectionId: STANDALONE_SECTION_ID, fieldId });
    };

    const confirmDelete = async () => {
        if (!deleteModal) return;

        let nextState = formState;
        let successMessage = 'Field deleted';

        if (deleteModal.type === 'section') {
            nextState = applySectionDelete(formState, deleteModal.sectionId);
            successMessage = 'Section deleted';
        } else {
            nextState = applyFieldDelete(formState, deleteModal.sectionId, deleteModal.fieldId);
        }

        const saved = await commitFormState(nextState, { successMessage });
        if (saved) {
            setDeleteModal(null);
        }
    };

    const toggleCollapse = (sectionId) => {
        updateSections((prev) =>
            prev.map((s) => (s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s))
        );
    };

    const renderFieldBuilderView = () => (
        <ContentShell className="p-3 sm:p-6 min-h-[calc(100vh-180px)]">
            <div className="flex items-center gap-2 mb-4 sm:mb-6 min-w-0" style={{ position: 'relative', zIndex: 20 }}>
                <button
                    type="button"
                    onClick={closeFieldBuilder}
                    aria-label="Go back"
                    className="flex items-center justify-center shrink-0 p-1"
                    style={{ color: '#64748B', cursor: 'pointer' }}
                >
                    <IoIosArrowBack size={20} />
                </button>
                <h2 className="text-base sm:text-lg font-bold truncate" style={{ color: 'var(--sidebar-text-primary)' }}>
                    {fieldBuilder.sectionTitle}
                </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8 min-w-0">
                {fieldBuilder.fields.map((field, index) => (
                    <FieldBuilderCard
                        key={field.id}
                        field={field}
                        index={index}
                        total={fieldBuilder.fields.length}
                        onChange={(updated) => {
                            setFieldBuilder((prev) => ({
                                ...prev,
                                fields: prev.fields.map((f) => (f.id === field.id ? updated : f)),
                            }));
                        }}
                        onRemove={() => {
                            setFieldBuilder((prev) => ({
                                ...prev,
                                fields: prev.fields.filter((f) => f.id !== field.id),
                            }));
                        }}
                        onAddField={() => {
                            setFieldBuilder((prev) => ({
                                ...prev,
                                fields: [...prev.fields, createEmptyField()],
                            }));
                        }}
                        onMoveUp={() => moveFieldInBuilder(field.id, 'up')}
                        onMoveDown={() => moveFieldInBuilder(field.id, 'down')}
                        hideAddField={fieldBuilder.replaceMode}
                    />
                ))}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--dashboard-border)' }}>
                <button
                    type="button"
                    onClick={closeFieldBuilder}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-lg font-medium"
                    style={{
                        border: '1px solid var(--dashboard-border)',
                        color: 'var(--dashboard-text-primary)',
                        backgroundColor: 'var(--dashboard-card-bg)',
                        cursor: 'pointer',
                    }}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={saveFields}
                    disabled={saving}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white"
                    style={{ backgroundColor: '#0C79F7', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
                >
                    <FiCheck size={16} />
                    {saving
                        ? 'Saving...'
                        : fieldBuilder.replaceMode
                            ? 'Update Field'
                            : `Add ${fieldBuilder.fields.length} Field${fieldBuilder.fields.length > 1 ? 's' : ''}`}
                </button>
            </div>
        </ContentShell>
    );

    return (
        <div className="min-h-screen overflow-x-hidden" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: '8px 10px' }}>
            {!fieldBuilder && (
                <>
                    <HeaderWrapper>
                        <div className="flex items-center gap-3 flex-wrap">
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Sales Setup'}
                                Fontsize={30}
                            />
                            {formState.definitionId && (
                                <FormStatusBadge status={formState.status} />
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                            {isFormLocked && (
                                <BottonWithIcon
                                    backgroundColor={'#0C79F7'}
                                    icon={addIcon}
                                    title={duplicating ? 'Creating...' : 'Create New Version'}
                                    height={40}
                                    color={'var(--sidebar-text-selected)'}
                                    fontSize={16}
                                    fontWeight={500}
                                    borderRadius={8}
                                    disabled={duplicating || loading}
                                    onClick={handleCreateNewVersion}
                                    className={TOOLBAR_BUTTON_CLASS}
                                />
                            )}

                            {isDraftEditing && (
                                <>
                                    <BottonWithIcon
                                        backgroundColor={'var(--dashboard-card-bg)'}
                                        svg={<X size={16} />}
                                        title={discarding ? 'Discarding...' : 'Discard Draft'}
                                        height={40}
                                        color={'#DC2626'}
                                        fontSize={16}
                                        fontWeight={500}
                                        border={'1px solid var(--dashboard-border)'}
                                        borderRadius={8}
                                        disabled={discarding || publishing || loading}
                                        onClick={() => setDiscardDraftModalOpen(true)}
                                        className={TOOLBAR_BUTTON_CLASS}
                                    />
                                    <BottonWithIcon
                                        backgroundColor={'#0FA958'}
                                        svg={<Globe size={16} />}
                                        title={publishing ? 'Publishing...' : 'Publish Now'}
                                        height={40}
                                        color={'#fff'}
                                        fontSize={16}
                                        fontWeight={500}
                                        borderRadius={8}
                                        disabled={publishing || loading || saving}
                                        onClick={requestPublishForm}
                                        className={TOOLBAR_BUTTON_CLASS}
                                    />
                                </>
                            )}

                            {!isFormLocked && (
                                <BottonWithIcon
                                    backgroundColor={'transparent'}
                                    title={'Form Settings'}
                                    height={40}
                                    color={'#0C79F7'}
                                    fontSize={16}
                                    fontWeight={500}
                                    border={'1px solid #0C79F7'}
                                    borderRadius={8}
                                    onClick={openSettingsModal}
                                    className={TOOLBAR_BUTTON_CLASS}
                                />
                            )}

                            {isNewForm && (
                                <>
                                    <BottonWithIcon
                                        backgroundColor={hasUnsavedChanges ? '#0FA958' : 'transparent'}
                                        title={saving ? 'Saving...' : 'Save Form'}
                                        height={40}
                                        color={hasUnsavedChanges ? '#fff' : '#0C79F7'}
                                        fontSize={16}
                                        fontWeight={500}
                                        border={hasUnsavedChanges ? 'none' : '1px solid #0C79F7'}
                                        borderRadius={8}
                                        disabled={saving || loading || !hasUnsavedChanges}
                                        onClick={handleSaveFormDefinition}
                                        className={TOOLBAR_BUTTON_CLASS}
                                    />
                                    {formState.definitionId && (
                                        <BottonWithIcon
                                            backgroundColor={'#0FA958'}
                                            title={publishing ? 'Publishing...' : 'Publish'}
                                            height={40}
                                            color={'#fff'}
                                            fontSize={16}
                                            fontWeight={500}
                                            borderRadius={8}
                                            disabled={publishing || loading || saving || hasUnsavedChanges}
                                            onClick={requestPublishForm}
                                            className={TOOLBAR_BUTTON_CLASS}
                                        />
                                    )}
                                </>
                            )}

                            {isFixedMetaFormTabActive && !isNewForm && !isFormLocked && !isDraftEditing && (
                                <BottonWithIcon
                                    backgroundColor={hasUnsavedChanges ? '#0FA958' : 'transparent'}
                                    title={saving ? 'Saving...' : 'Save Form'}
                                    height={40}
                                    color={hasUnsavedChanges ? '#fff' : '#0C79F7'}
                                    fontSize={16}
                                    fontWeight={500}
                                    border={hasUnsavedChanges ? 'none' : '1px solid #0C79F7'}
                                    borderRadius={8}
                                    disabled={saving || loading || !hasUnsavedChanges}
                                    onClick={handleSaveFormDefinition}
                                    className={TOOLBAR_BUTTON_CLASS}
                                />
                            )}

                            {!isFormLocked && (
                                <BottonWithIcon
                                    backgroundColor={'#0C79F7'}
                                    icon={addIcon}
                                    title={'Add Section'}
                                    height={40}
                                    color={'var(--sidebar-text-selected)'}
                                    fontSize={16}
                                    fontWeight={500}
                                    borderRadius={8}
                                    onClick={() => openAddSectionModal()}
                                    className={TOOLBAR_BUTTON_CLASS}
                                />
                            )}
                        </div>
                    </HeaderWrapper>

                    {hasDraftAndPublished && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => requestFormViewMode('draft')}
                                className="px-4 py-2 rounded-lg text-sm font-medium"
                                style={{
                                    backgroundColor: activeViewMode === 'draft' ? '#FEF3C7' : 'var(--dashboard-card-bg)',
                                    color: activeViewMode === 'draft' ? '#92400E' : 'var(--dashboard-text-primary)',
                                    border: `1px solid ${activeViewMode === 'draft' ? '#FCD34D' : 'var(--dashboard-border)'}`,
                                }}
                            >
                                Edit Draft
                            </button>
                            <button
                                type="button"
                                onClick={() => requestFormViewMode('published')}
                                className="px-4 py-2 rounded-lg text-sm font-medium"
                                style={{
                                    backgroundColor: activeViewMode === 'published' ? '#DCFCE7' : 'var(--dashboard-card-bg)',
                                    color: activeViewMode === 'published' ? '#166534' : 'var(--dashboard-text-primary)',
                                    border: `1px solid ${activeViewMode === 'published' ? '#86EFAC' : 'var(--dashboard-border)'}`,
                                }}
                            >
                                View Live (Published)
                            </button>
                        </div>
                    )}

                    {isFormLocked && (
                        <StatusBanner variant="live">
                            This form configuration is live and active. Fields and sections are locked.
                            Click <strong>Create New Version</strong> to make a draft copy you can safely edit without affecting the live form.
                        </StatusBanner>
                    )}

                    {isDraftEditing && (
                        <StatusBanner variant="draft">
                            <strong>Draft in progress.</strong> You&apos;re editing a draft. All changes here are staged and won&apos;t go live until you click <strong>Publish Now</strong>. Discard to revert all changes.
                        </StatusBanner>
                    )}

                    <HeaderWrapper2 className="flex space-x-2 sm:space-x-4 border-b mt-3 border-gray-200 dark:border-gray-600 overflow-x-auto">
                        {FORM_BUILDER_TABS.map(({ key, label }) => (
                            <button
                                key={key}
                                type="button"
                                className={`pb-2 px-4 text-sm font-medium whitespace-nowrap ${activeTab === key
                                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-300 hover:text-[#0C79F7] dark:hover:text-blue-400'
                                    }`}
                                onClick={() => requestTabChange(key)}
                            >
                                {label}
                            </button>
                        ))}
                    </HeaderWrapper2>
                </>
            )}

            {loading ? (
                <div className="text-center w-full mx-auto mt-8">
                    <Loader message="Loading form..." subMessage="Please wait" />
                </div>
            ) : fieldBuilder ? (
                renderFieldBuilderView()
            ) : !hasFormContent ? (
                <ContentShell className="p-3 sm:p-4">
                    {isLeadsTab(activeTab) && (
                        <DefaultFieldsCard fields={DEFAULT_LEAD_SECTION.fields} />
                    )}
                    <EmptyFormState
                        onCreateSection={() => openAddSectionModal()}
                        readOnly={isFormLocked}
                    />
                </ContentShell>
            ) : (
                <ContentShell className="p-3 sm:p-4">
                    {isLeadsTab(activeTab) && (
                        <DefaultFieldsCard fields={DEFAULT_LEAD_SECTION.fields} />
                    )}
                    {allowStandaloneFields && standaloneFields.length > 0 && (
                        <StandaloneFieldsCard
                            title={`${tabLabel} Fields`}
                            fields={standaloneFields}
                            onAddField={() => openStandaloneFieldBuilder()}
                            onEditField={(field) => openStandaloneFieldBuilder([{ ...field }], true)}
                            onDeleteField={handleDeleteStandaloneField}
                            onReorderFields={handleReorderStandaloneFields}
                            readOnly={isFormLocked}
                        />
                    )}
                    {sections.map((section) => (
                        <SectionCard
                            key={section.id}
                            section={section}
                            onAddField={(id) => openFieldBuilder(id)}
                            onEditSection={openAddSectionModal}
                            onDeleteSection={handleDeleteSection}
                            onToggleCollapse={toggleCollapse}
                            onEditField={(sectionId, field) => openFieldBuilder(sectionId, [{ ...field }], true)}
                            onDeleteField={handleDeleteField}
                            onReorderFields={handleReorderSectionFields}
                            readOnly={isFormLocked}
                        />
                    ))}
                </ContentShell>
            )}

            <AddSectionModal
                isOpen={sectionModal.open}
                onClose={closeSectionModal}
                title={sectionModal.title}
                value={sectionName}
                setValue={setSectionName}
                submitText="Save"
                onSubmit={saveSection}
            />

            <FormSettingsModal
                isOpen={settingsModalOpen}
                onClose={requestCloseSettingsModal}
                formMeta={settingsDraft}
                setFormMeta={setSettingsDraft}
                loading={saving}
                onSubmit={saveSettings}
                fixedFormMeta={isFixedMetaFormTabActive}
                showWorkflow={isLeadsTab(activeTab)}
            />

            <DeleteConfirmationModal
                open={Boolean(deleteModal)}
                title="Confirm Delete"
                subtitle={deleteModal?.type === 'section' ? 'Are you sure you want to delete this section?' : 'Are you sure you want to delete this field?'}
                entityName=""
                warningMessage="This action cannot be undone."
                onCancel={() => setDeleteModal(null)}
                onDelete={confirmDelete}
                isLoading={saving}
            />

            <UnsavedChangesModal
                isOpen={Boolean(leaveConfirm)}
                saving={saving}
                onStay={() => {
                    leaveConfirm?.onCancel?.();
                    setLeaveConfirm(null);
                }}
                onLeave={() => leaveConfirm?.onConfirm?.()}
                onSave={leaveConfirm?.onSave ? handleLeaveConfirmSave : null}
            />

            <PublishVersionModal
                isOpen={publishModalOpen}
                onClose={() => setPublishModalOpen(false)}
                onConfirm={handlePublishForm}
                version={nextPublishVersion}
                previousVersion={publishedFormMeta.version}
                sectionCount={formStats.sectionCount}
                fieldCount={formStats.fieldCount}
                loading={publishing}
            />

            <DeleteConfirmationModal
                open={discardDraftModalOpen}
                title="Discard Draft?"
                subtitle="This will delete your draft and restore the live form. All unsaved changes will be lost."
                entityName=""
                warningMessage="This action cannot be undone."
                onCancel={() => setDiscardDraftModalOpen(false)}
                onDelete={handleDiscardDraft}
            />
        </div>
    );
};

export default SalesFormBuilder;
