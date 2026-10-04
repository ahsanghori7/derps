import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {
    deleteRequest,
    getPublicRequest,
    getRequestWithOutBody,
    postPublicRequest,
    postRequestWithBodyAndToken,
    postRequestWithFormData,
    putRequestWithBodyAndToken,
} from '../../Api/fetch';
import { baseURl } from '../../Config/systemConfig';

dayjs.extend(customParseFormat);

export const ALLOWED_API_FIELD_TYPES = [
    'text',
    'textarea',
    'number',
    'email',
    'phone',
    'select',
    'multiselect',
    'radio',
    'checkbox',
    'date',
    'datetime',
    'file',
    'heading',
];

export const FIELD_TYPES = [
    { label: 'Text', value: 'text' },
    { label: 'Textarea', value: 'textarea' },
    { label: 'Number', value: 'number' },
    { label: 'Email', value: 'email' },
    { label: 'Phone', value: 'phone' },
    { label: 'Dropdown', value: 'select' },
    { label: 'Multi Select', value: 'multiselect' },
    { label: 'Radio', value: 'radio' },
    { label: 'Checkbox', value: 'checkbox' },
    { label: 'Date', value: 'date' },
    { label: 'Time', value: 'datetime' },
    { label: 'File', value: 'file' },
];

export const TYPE_BADGE_STYLES = {
    heading: { bg: '#F3F4F6', color: '#374151', label: 'Heading' },
    text: { bg: '#EEF2FF', color: '#4338CA', label: 'Text', icon: 'T' },
    textField: { bg: '#EEF2FF', color: '#4338CA', label: 'Text', icon: 'T' },
    textarea: { bg: '#E0F2FE', color: '#075985', label: 'Textarea' },
    number: { bg: '#FCE7F3', color: '#9D174D', label: 'Number', icon: '#' },
    email: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Email' },
    phone: { bg: '#DBEAFE', color: '#1E40AF', label: 'Phone' },
    select: { bg: '#FEF3C7', color: '#92400E', label: 'Dropdown' },
    dropdown: { bg: '#FEF3C7', color: '#92400E', label: 'Dropdown' },
    multiselect: { bg: '#FEF3C7', color: '#B45309', label: 'Multi Select' },
    radio: { bg: '#FFEDD5', color: '#C2410C', label: 'Radio' },
    date: { bg: '#DCFCE7', color: '#166534', label: 'Date' },
    datePicker: { bg: '#DCFCE7', color: '#166534', label: 'Date' },
    datetime: { bg: '#DCFCE7', color: '#047857', label: 'Time' },
    time: { bg: '#F3E8FF', color: '#6B21A8', label: 'Time' },
    timePicker: { bg: '#F3E8FF', color: '#6B21A8', label: 'Time' },
    checkbox: { bg: '#E0E7FF', color: '#3730A3', label: 'Checkbox' },
    switch: { bg: '#D1FAE5', color: '#065F46', label: 'Checkbox' },
    file: { bg: '#F3E8FF', color: '#7C3AED', label: 'File' },
};

const LEGACY_UI_TYPE_MAP = {
    textField: 'text',
    dropdown: 'select',
    datePicker: 'date',
    timePicker: 'datetime',
    time: 'datetime',
    switch: 'checkbox',
};

export const slugify = (value = '') =>
    String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

export const isHeadingField = (type) => type === 'heading';
export const supportsMaskValue = (type) =>
    ['text', 'textField', 'email', 'phone', 'textarea', 'number'].includes(type);
export const supportsSelectOptions = (type) =>
    ['select', 'multiselect', 'radio', 'dropdown'].includes(type);
export const supportsRequired = (type) => !isHeadingField(type);
export const supportsApiName = (type) => !isHeadingField(type);
export const supportsNumberValidation = (type) => type === 'number';

export const normalizeFieldType = (type) => {
    if (!type) return 'text';
    if (LEGACY_UI_TYPE_MAP[type]) return LEGACY_UI_TYPE_MAP[type];
    if (ALLOWED_API_FIELD_TYPES.includes(type)) return type;
    return 'text';
};

export const toApiFieldType = (type) => normalizeFieldType(type);

export const normalizeOption = (option) => {
    if (typeof option === 'string') {
        const label = option.trim();
        return { label, value: slugify(label) || label };
    }
    const label = String(option?.label ?? option?.title ?? '').trim();
    const value = String(option?.value ?? slugify(label)).trim();
    return { label, value: value || slugify(label) };
};

export const normalizeOptions = (options = []) =>
    options.map(normalizeOption).filter((opt) => opt.label);

export const PROPOSAL_FORM_CONFIG = {
    name: 'Proposal Form',
    apiName: 'proposals_form',
    entityType: 'opportunity',
    schema: {
        schemaVersion: 1,
        sections: [
            {
                id: 'section_other_information',
                title: 'Other Information',
                fields: [
                    { type: 'text', apiName: 'order_number', label: 'Order Number', required: false },
                    { type: 'text', apiName: 'tracking_number', label: 'Tracking Number', required: false },
                ],
            },
            {
                id: 'section_additional_information',
                title: 'Additional Information',
                fields: [
                    { type: 'text', apiName: 'main_competitors', label: 'Main Competitors', required: false },
                    { type: 'text', apiName: 'current_genrators', label: 'Current Genrators', required: false },
                ],
            },
        ],
    },
};

export const PROPOSAL_TAB_KEY = 'proposal';

export const QUOTATION_FORM_CONFIG = {
    name: 'Quotation Form',
    apiName: 'quotation_form',
    entityType: 'opportunity',
    description: 'Quotation form for opportunities',
    schema: {
        schemaVersion: 1,
        sections: [
            {
                id: 'quotation',
                title: 'Quotation',
                fields: [
                    { type: 'text', apiName: 'quote_number', label: 'Quote Number', required: true },
                    { type: 'date', apiName: 'quote_date', label: 'Quote Date', required: true },
                    {
                        type: 'number',
                        apiName: 'quote_amount',
                        label: 'Quote Amount',
                        required: true,
                        validation: { min: 0 },
                    },
                    { type: 'date', apiName: 'valid_until', label: 'Valid Until', required: false },
                    { type: 'textarea', apiName: 'quote_notes', label: 'Notes', required: false },
                ],
            },
        ],
    },
};

export const QUOTATION_TAB_KEY = 'quotation';

export const QUALIFICATION_FORM_CONFIG = {
    name: 'Qualification Form',
    apiName: 'qualification_form',
    entityType: 'lead',
    description: 'Qualify lead before opportunity',
};

export const QUALIFICATION_TAB_KEY = 'qualification';

export const LEAD_FORM_CONFIG = {
    name: 'Lead Form',
    apiName: 'lead_form',
    entityType: 'lead',
};

export const PIPELINE_STAGE_TAB_KEYS = [
    PROPOSAL_TAB_KEY,
    QUOTATION_TAB_KEY,
    'negotiation',
    'closed_won',
    'closed_lost',
];

export const isPipelineStageTab = (tab) => PIPELINE_STAGE_TAB_KEYS.includes(tab);

export const isProposalTab = (tab) => tab === PROPOSAL_TAB_KEY;

export const isQuotationTab = (tab) => tab === QUOTATION_TAB_KEY;

export const isQualificationTab = (tab) => tab === QUALIFICATION_TAB_KEY;

export const isProposalFormState = (formState = {}, tab = null) =>
    isProposalTab(tab)
    || (tab == null && formState?.apiName === PROPOSAL_FORM_CONFIG.apiName);

export const isQuotationFormState = (formState = {}, tab = null) =>
    isQuotationTab(tab)
    || (tab == null && formState?.apiName === QUOTATION_FORM_CONFIG.apiName);

export const isQualificationFormState = (formState = {}, tab = null) =>
    isQualificationTab(tab)
    || (tab == null && formState?.apiName === QUALIFICATION_FORM_CONFIG.apiName);

export const isFixedMetaFormTab = (tab) =>
    isProposalTab(tab) || isQuotationTab(tab) || isQualificationTab(tab);

const getFormBuilderTabConfig = (tab) =>
    FORM_BUILDER_TABS.find(({ key }) => key === tab) ?? null;

export const applyFixedFormMeta = (tab, formState = {}) => {
    if (isProposalFormState(formState, tab)) {
        return {
            ...formState,
            name: PROPOSAL_FORM_CONFIG.name,
            apiName: PROPOSAL_FORM_CONFIG.apiName,
            entityType: PROPOSAL_FORM_CONFIG.entityType,
        };
    }

    if (isQuotationFormState(formState, tab)) {
        return {
            ...formState,
            name: QUOTATION_FORM_CONFIG.name,
            apiName: QUOTATION_FORM_CONFIG.apiName,
            entityType: QUOTATION_FORM_CONFIG.entityType,
            description: formState.description?.trim()
                ? formState.description
                : QUOTATION_FORM_CONFIG.description,
        };
    }

    if (isQualificationFormState(formState, tab)) {
        return {
            ...formState,
            name: QUALIFICATION_FORM_CONFIG.name,
            apiName: QUALIFICATION_FORM_CONFIG.apiName,
            entityType: QUALIFICATION_FORM_CONFIG.entityType,
            description: formState.description?.trim()
                ? formState.description
                : QUALIFICATION_FORM_CONFIG.description,
        };
    }

    if (isPipelineStageTab(tab)) {
        const config = getFormBuilderTabConfig(tab);
        if (config) {
            return {
                ...formState,
                name: config.name,
                apiName: config.apiName,
                entityType: OPPORTUNITY_PIPELINE_ENTITY_TYPE,
            };
        }
    }

    return formState;
};

export const FORM_BUILDER_TABS = [
    { key: 'leads', label: 'Leads', entityType: 'lead', name: 'Lead Form', apiName: 'lead_form' },
    {
        key: QUOTATION_TAB_KEY,
        label: 'Quotation',
        entityType: QUOTATION_FORM_CONFIG.entityType,
        name: QUOTATION_FORM_CONFIG.name,
        apiName: QUOTATION_FORM_CONFIG.apiName,
        fixedMeta: true,
    },
    {
        key: QUALIFICATION_TAB_KEY,
        label: 'Qualification',
        entityType: QUALIFICATION_FORM_CONFIG.entityType,
        name: QUALIFICATION_FORM_CONFIG.name,
        apiName: QUALIFICATION_FORM_CONFIG.apiName,
        fixedMeta: true,
    },
    /** `name` must match API row `name` (e.g. published list uses "Opportunity"). */
    { key: 'opportunities', label: 'Opportunity', entityType: 'opportunity', name: 'Opportunity', apiName: 'opportunity_form' },
    {
        key: PROPOSAL_TAB_KEY,
        label: 'Proposal',
        entityType: PROPOSAL_FORM_CONFIG.entityType,
        name: PROPOSAL_FORM_CONFIG.name,
        apiName: PROPOSAL_FORM_CONFIG.apiName,
        fixedMeta: true,
    },
    { key: 'negotiation', label: 'Negotiation', entityType: 'negotiation', name: 'Negotiation Form', apiName: 'negotiation_form' },
    { key: 'closed_won', label: 'Closed Won', entityType: 'closed_won', name: 'Closed Won Form', apiName: 'closed_won_form' },
    { key: 'closed_lost', label: 'Closed Lost', entityType: 'closed_lost', name: 'Closed Lost Form', apiName: 'closed_lost_form' },
];

/** formPurpose is only sent for lead entity forms (backend constraint). */
export const TAB_FORM_PURPOSE_MAP = {
    leads: 'intake',
    qualification: 'qualification',
};

/** All opportunity pipeline stage forms use this entityType in API. */
export const OPPORTUNITY_PIPELINE_ENTITY_TYPE = 'opportunity';

const FORM_BUILDER_TAB_MAP = Object.fromEntries(
    FORM_BUILDER_TABS.map((tab) => [tab.key, tab])
);

const buildPipelineStageConfig = (tabKey) => {
    const config = FORM_BUILDER_TAB_MAP[tabKey];
    if (!config) return null;

    return {
        tabKey,
        label: config.label,
        name: config.name,
        apiName: config.apiName,
        stageValue: tabKey,
    };
};

/** Opportunity detail pipeline — each stage maps to its own name + apiName. */
export const OPPORTUNITY_PIPELINE_STAGES = PIPELINE_STAGE_TAB_KEYS
    .map(buildPipelineStageConfig)
    .filter(Boolean);

/** Combined terminal step in the opportunity path UI (Closed Won / Lost share one tab). */
export const TERMINAL_STAGE_INDEX = 3;

export const OPPORTUNITY_PATH_STAGE_LABELS = [
    'Proposal',
    'Quotation',
    'Negotiation',
    'Closed Won / Lost',
];

/** Labels shown in the opportunity path stepper (3 steps). */
export const OPPORTUNITY_STAGES = OPPORTUNITY_PATH_STAGE_LABELS;

export const getOpportunityStageFormTabKey = (stageIndex, terminalOutcome = null) => {
    if (stageIndex === 0) return PROPOSAL_TAB_KEY;
    if (stageIndex === 1) return QUOTATION_TAB_KEY;
    if (stageIndex === 2) return 'negotiation';
    if (stageIndex === TERMINAL_STAGE_INDEX) {
        if (terminalOutcome === 'closed_won') return 'closed_won';
        if (terminalOutcome === 'closed_lost') return 'closed_lost';
        return null;
    }
    return null;
};

export const getOpportunityStageFormConfig = (stageIndex, terminalOutcome = null) => {
    const tabKey = getOpportunityStageFormTabKey(stageIndex, terminalOutcome);
    return tabKey ? buildPipelineStageConfig(tabKey) : null;
};

export const getPipelineStageFormMeta = (tabKey) => {
    const config = FORM_BUILDER_TAB_MAP[tabKey];
    if (!config || !isPipelineStageTab(tabKey)) return null;

    return {
        tabKey,
        label: config.label,
        name: config.name,
        apiName: config.apiName,
        stageValue: tabKey,
        entityType: OPPORTUNITY_PIPELINE_ENTITY_TYPE,
    };
};

export const getPipelineStageIndex = (stage) => {
    if (!stage) return 0;

    const normalized = String(stage).toLowerCase().replace(/[\s-]+/g, '_');

    if (
        normalized.includes('closed_lost')
        || (normalized.includes('lost') && !normalized.includes('won'))
    ) {
        return TERMINAL_STAGE_INDEX;
    }

    if (
        normalized.includes('closed_won')
        || (normalized.includes('won') && !normalized.includes('lost'))
    ) {
        return TERMINAL_STAGE_INDEX;
    }

    if (normalized.includes('negotiation')) return 2;
    if (normalized.includes('quotation')) return 1;
    if (normalized.includes('proposal')) return 0;

    const index = OPPORTUNITY_PIPELINE_STAGES.findIndex(({ stageValue, label, apiName }) => {
        const valueKey = stageValue.toLowerCase();
        const labelKey = label.toLowerCase().replace(/\s+/g, '_');
        const apiKey = String(apiName || '').toLowerCase().replace(/_form$/, '');
        return normalized.includes(valueKey)
            || valueKey.includes(normalized)
            || normalized.includes(labelKey)
            || labelKey.includes(normalized)
            || (apiKey && normalized.includes(apiKey));
    });

    if (index >= 0) {
        if (index >= TERMINAL_STAGE_INDEX) return TERMINAL_STAGE_INDEX;
        return index;
    }

    return 0;
};

export const getNextPipelineStageValue = (activeStageIndex) => {
    if (activeStageIndex === 0) return QUOTATION_TAB_KEY;
    if (activeStageIndex === 1) return 'negotiation';
    return null;
};

export const CLOSED_WON_STAGE_INDEX = TERMINAL_STAGE_INDEX;

export const CLOSED_LOST_STAGE_INDEX = TERMINAL_STAGE_INDEX;

/** `closed_won` | `closed_lost` when the deal has a terminal outcome, else null. */
export const getOpportunityTerminalOutcome = (record) => {
    const raw = record?.stage ?? record?.status ?? '';
    const normalized = String(raw).toLowerCase().replace(/[\s-]+/g, '_');

    if (
        normalized.includes('closed_lost')
        || (normalized.includes('lost') && !normalized.includes('won'))
    ) {
        return 'closed_lost';
    }

    if (
        normalized.includes('closed_won')
        || (normalized.includes('won') && !normalized.includes('lost'))
    ) {
        return 'closed_won';
    }

    return null;
};

/** Closed Won and Closed Lost share one path step — nothing to block. */
export const isOpportunityPipelineStepBlocked = () => false;

export const isTerminalPipelineStageIndex = (stageIndex) =>
    stageIndex === TERMINAL_STAGE_INDEX;

export const definitionHasRenderableFields = (formDefinition) => {
    if (!formDefinition) return false;
    const sections = getRenderableSections(formDefinition);
    return sections.some((section) =>
        (section.fields || []).some(
            (field) => !isHeadingField(normalizeFieldType(field.type))
        )
    );
};

const hasMeaningfulSubmissionValue = (value) => {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
};

/** True when a persisted form submission contains at least one saved field value. */
export const formSubmissionHasSavedData = (submission) => {
    if (!submission) return false;

    const data = submission?.data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        return Object.values(data).some(hasMeaningfulSubmissionValue);
    }

    return false;
};

export const findFormDefinitionByExactApiName = (items = [], apiName) => {
    if (!apiName) return null;
    return (Array.isArray(items) ? items : []).find((item) => item?.apiName === apiName) ?? null;
};

const matchesApiNameWithCopyFallback = (itemApi, wantApi) => {
    const item = String(itemApi ?? '');
    const want = String(wantApi ?? '');
    if (!want) return false;
    return item === want || item.startsWith(`${want}_`);
};

const matchesNameWithCopyFallback = (itemName, wantName) => {
    const item = String(itemName ?? '').trim();
    const want = String(wantName ?? '').trim();
    if (!want) return false;
    return item === want
        || item.startsWith(`${want} (`)
        || item.startsWith(`${want}(`);
};

const pickNewestFormDefinition = (items = []) =>
    [...items].sort((a, b) => {
        const aTime = new Date(a?.updatedAt || a?.publishedAt || 0).getTime();
        const bTime = new Date(b?.updatedAt || b?.publishedAt || 0).getTime();
        return bTime - aTime;
    })[0] ?? null;

/**
 * Find a CRM form definition by apiName/name with duplicated-copy fallbacks
 * (e.g. "Proposal Form (Copy)" / apiName "proposals_form_copy").
 */
export const findFormDefinitionWithCopyFallback = (
    items = [],
    { apiName, name, entityType = null, formPurpose, exclude } = {}
) => {
    const list = (Array.isArray(items) ? items : []).filter((item) => {
        if (entityType && item?.entityType !== entityType) return false;
        if (typeof exclude === 'function' && exclude(item)) return false;
        return true;
    });
    if (!list.length) return null;

    if (apiName) {
        const exact = findFormDefinitionByExactApiName(list, apiName);
        if (exact) return exact;

        const byApiPrefix = list.filter((item) =>
            matchesApiNameWithCopyFallback(item?.apiName, apiName)
        );
        if (byApiPrefix.length) return pickNewestFormDefinition(byApiPrefix);
    }

    if (name) {
        const byName = findFormDefinitionByExactName(list, name, entityType);
        if (byName) return byName;

        const want = String(name).trim();
        const byNamePrefix = list.filter((item) =>
            matchesNameWithCopyFallback(item?.name, want)
        );
        if (byNamePrefix.length) return pickNewestFormDefinition(byNamePrefix);
    }

    if (formPurpose) {
        const byPurpose = list.find((item) => item?.schema?.formPurpose === formPurpose) ?? null;
        if (byPurpose) return byPurpose;
    }

    return null;
};

/**
 * Lead entity forms (intake, qualification): apiName/name with copy fallbacks, then formPurpose.
 */
export const findFormDefinitionForLeadEntity = (
    items = [],
    { apiName, name, entityType = 'lead', formPurpose } = {}
) =>
    findFormDefinitionWithCopyFallback(items, { apiName, name, entityType, formPurpose });

/** Match CRM definition list rows by human-readable `name` (not apiName). */
export const findFormDefinitionByExactName = (items = [], expectedName, entityType = null) => {
    if (expectedName == null || String(expectedName).trim() === '') return null;
    const want = String(expectedName).trim();
    const list = (Array.isArray(items) ? items : []).filter(
        (item) => !entityType || item?.entityType === entityType
    );
    return list.find((item) => String(item?.name ?? '').trim() === want) ?? null;
};

const PIPELINE_STAGE_DEFINITION_NAMES = new Set(
    PIPELINE_STAGE_TAB_KEYS.map((key) => FORM_BUILDER_TAB_MAP[key]?.name).filter(Boolean)
);

const PIPELINE_STAGE_DEFINITION_API_NAMES = new Set(
    PIPELINE_STAGE_TAB_KEYS.map((key) => FORM_BUILDER_TAB_MAP[key]?.apiName).filter(Boolean)
);

const FIXED_OPPORTUNITY_FORM_DEFINITION_NAMES = new Set([
    ...PIPELINE_STAGE_DEFINITION_NAMES,
    QUOTATION_FORM_CONFIG.name,
]);

const FIXED_OPPORTUNITY_FORM_DEFINITION_API_NAMES = new Set([
    ...PIPELINE_STAGE_DEFINITION_API_NAMES,
    QUOTATION_FORM_CONFIG.apiName,
]);

export const isOpportunityPipelineStageDefinition = (item) => {
    if (!item) return false;
    const name = String(item.name ?? '').trim();
    const apiName = String(item.apiName ?? '').trim();

    if (PIPELINE_STAGE_DEFINITION_NAMES.has(name) || PIPELINE_STAGE_DEFINITION_API_NAMES.has(apiName)) {
        return true;
    }

    for (const fixedName of PIPELINE_STAGE_DEFINITION_NAMES) {
        if (matchesNameWithCopyFallback(name, fixedName)) return true;
    }

    for (const fixedApi of PIPELINE_STAGE_DEFINITION_API_NAMES) {
        if (matchesApiNameWithCopyFallback(apiName, fixedApi)) return true;
    }

    return false;
};

export const isFixedOpportunityEntityFormDefinition = (item) => {
    if (!item) return false;
    const name = String(item.name ?? '').trim();
    const apiName = String(item.apiName ?? '').trim();

    if (FIXED_OPPORTUNITY_FORM_DEFINITION_NAMES.has(name)
        || FIXED_OPPORTUNITY_FORM_DEFINITION_API_NAMES.has(apiName)) {
        return true;
    }

    for (const fixedName of FIXED_OPPORTUNITY_FORM_DEFINITION_NAMES) {
        if (matchesNameWithCopyFallback(name, fixedName)) return true;
    }

    for (const fixedApi of FIXED_OPPORTUNITY_FORM_DEFINITION_API_NAMES) {
        if (matchesApiNameWithCopyFallback(apiName, fixedApi)) return true;
    }

    return false;
};

/**
 * Main Opportunity tab (not pipeline stages / quotation): exact apiName/name first,
 * then duplicated copies (e.g. name "Opportunity (Copy)" / apiName "opportunity_form_copy_…").
 */
export const findOpportunityMainFormDefinition = (
    items = [],
    { apiName, name, entityType = OPPORTUNITY_PIPELINE_ENTITY_TYPE } = {}
) =>
    findFormDefinitionWithCopyFallback(items, {
        apiName,
        name,
        entityType,
        exclude: isFixedOpportunityEntityFormDefinition,
    });

export const TAB_ENTITY_MAP = Object.fromEntries(
    FORM_BUILDER_TABS.map(({ key, entityType }) => [key, entityType])
);

export const TAB_LABEL_MAP = Object.fromEntries(
    FORM_BUILDER_TABS.map(({ key, label }) => [key, label])
);

export const getTabFetchParams = (tab) => {
    const config = FORM_BUILDER_TAB_MAP[tab] || FORM_BUILDER_TABS[0];

    return {
        entityType: isPipelineStageTab(tab)
            ? OPPORTUNITY_PIPELINE_ENTITY_TYPE
            : config.entityType,
        /** Opportunity tab: pick list rows by API `name`. Leads tab: pick by `apiName` (see fetchFormDefinitionsForBuilder). */
        matchName: config.name ?? null,
        apiName: config.apiName ?? null,
    };
};

/** Application API field names required across the multi-step application flow. */
export const DEFAULT_REQUIRED_APPLICATION_FIELDS = [
    // Business Information
    'legalName',
    'businessName',
    'legalAddress',
    'legalState',
    'legalCity',
    'legalZipCode',
    'contactNumber',
    'dbaAddress',
    'businessState',
    'businessCity',
    'businessZipCode',
    'dbaPhoneNumber',
    'email',
    'businessType',
    'ownerShipType',
    'feinNumber',
    'productsDescription',
    'ebtFnsNumber',
    // Ownership Information
    'ownerFirstName',
    'ownerLastName',
    'date',
    'residentialAddress',
    'ownerShipState',
    'ownerShipCity',
    'ownerShipZip',
    'socialSecurityNumber',
    'ownerEmail',
    'ownerPhoneNumber',
    'dLFileUrl',
    // Financial Information
    'accountNumber',
    'routingNumber',
    'averageSale',
    'maxSale',
    'monthlySale',
    'bankLetterFileUrl',
    // Select Plan
    'plan',
    // Product List
    'hardware',
    // Shipment & Pickup — shipping
    'recipientName',
    'phoneNumber',
    'address',
    'state',
    'zipCode',
    'country',
    // Shipment & Pickup — pickup
    'pickupLocationName',
    'contactName',
    'pickupDate',
    // Shipment & Pickup — pay now
    'nameOnCard',
    'expiryDate',
    'cardNumber',
    'cvv',
    'billingAddress',
    // Shipment & Pickup — lease
    'leaseTerm',
    'monthlyPayment',
    'startDate',
];

export const DEFAULT_SUPPORT_TICKET_CATEGORY_ID = 3;

const DEFAULT_WORKFLOW = {
    convertToApplication: false,
    createSupportTicket: false,
    ticketCategoryId: null,
    requiredApplicationFields: [],
    fieldMappings: [],
};

export const normalizeLeadWorkflow = (workflow = {}) => {
    const next = { ...DEFAULT_WORKFLOW, ...workflow };

    if (next.convertToApplication) {
        next.requiredApplicationFields = [...DEFAULT_REQUIRED_APPLICATION_FIELDS];
    } else {
        next.requiredApplicationFields = [];
    }

    if (next.createSupportTicket) {
        next.ticketCategoryId = DEFAULT_SUPPORT_TICKET_CATEGORY_ID;
    } else {
        next.ticketCategoryId = null;
    }

    return next;
};

export const getDefaultFormMeta = (tab) => {
    const config = FORM_BUILDER_TAB_MAP[tab] || FORM_BUILDER_TABS[0];

    return {
        definitionId: null,
        name: config.name,
        apiName: config.apiName,
        entityType: isPipelineStageTab(tab)
            ? OPPORTUNITY_PIPELINE_ENTITY_TYPE
            : config.entityType,
        formPurpose: config.formPurpose ?? null,
        description: '',
        workflow: { ...DEFAULT_WORKFLOW },
    };
};

export const createInitialFormStateByTab = () =>
    FORM_BUILDER_TABS.reduce((acc, { key }) => {
        acc[key] = emptyFormState(key);
        return acc;
    }, {});

export const normalizeField = (field) => {
    const type = normalizeFieldType(field?.type || 'text');
    const label = String(field?.label ?? '').trim();
    const apiName = supportsApiName(type)
        ? (String(field?.apiName ?? '').trim() || slugify(label))
        : '';

    return {
        id: field?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type,
        label,
        apiName,
        required: Boolean(field?.required),
        masked: Boolean(field?.masked),
        options: normalizeOptions(field?.options),
        validation: field?.validation && typeof field.validation === 'object' ? { ...field.validation } : {},
    };
};

const mapConfigSectionToUi = (section, sectionIndex = 0) => ({
    id: section.id || `section_${sectionIndex}`,
    title: section.title || `Section ${sectionIndex + 1}`,
    collapsed: false,
    fields: (section.fields || []).map((field, fieldIndex) =>
        normalizeField({
            id: `field_${field.apiName || fieldIndex}`,
            ...field,
        })
    ),
});

export const DEFAULT_PROPOSAL_SECTIONS = PROPOSAL_FORM_CONFIG.schema.sections.map(mapConfigSectionToUi);

/** Proposal starts empty like other tabs until a definition exists in the API or the user adds sections. */
export const emptyFormState = (tab) =>
    applyFixedFormMeta(tab, {
        ...getDefaultFormMeta(tab),
        sections: [],
        standaloneFields: [],
    });

export const normalizeFormState = (state = {}) => ({
    definitionId: state.definitionId ?? null,
    status: state.status || 'draft',
    version: state.version ?? null,
    sourceDefinitionId: state.sourceDefinitionId ?? null,
    name: state.name || '',
    apiName: state.apiName || slugify(state.name),
    entityType: state.entityType || 'lead',
    formPurpose: state.formPurpose ?? null,
    description: state.description || '',
    workflow: normalizeLeadWorkflow(state.workflow),
    sections: (state.sections || []).map((section) => ({
        ...section,
        fields: (section.fields || []).map(normalizeField),
    })),
    standaloneFields: (state.standaloneFields || []).map(normalizeField),
});

const mapUiFieldToApi = (field) => {
    const type = toApiFieldType(field.type);

    if (isHeadingField(type)) {
        return { type: 'heading', label: field.label };
    }

    const apiField = {
        type,
        apiName: field.apiName || slugify(field.label),
        label: field.label,
        required: Boolean(field.required),
    };

    if (supportsSelectOptions(type)) {
        apiField.options = normalizeOptions(field.options);
    }

    if (supportsNumberValidation(type) && field.validation?.min != null && field.validation.min !== '') {
        apiField.validation = { min: Number(field.validation.min) };
    }

    if (field.masked) {
        apiField.masked = true;
    }

    return apiField;
};

const buildApiSections = (sections = [], standaloneFields = []) => {
    const apiSections = [];

    if (standaloneFields.length > 0) {
        apiSections.push({
            id: 'section_general',
            title: 'General',
            fields: standaloneFields.map(mapUiFieldToApi),
        });
    }

    sections.forEach((section) => {
        apiSections.push({
            id: section.id?.startsWith('section_') ? section.id : `section_${slugify(section.title) || 'untitled'}`,
            title: section.title,
            fields: (section.fields || []).map(mapUiFieldToApi),
        });
    });

    return apiSections;
};

export const serializeFormStateForCompare = (formState, tab = null) =>
    JSON.stringify(buildFormDefinitionPayload(formState, tab));

export const createInitialSavedSnapshotsByTab = () =>
    FORM_BUILDER_TABS.reduce((acc, { key }) => {
        acc[key] = serializeFormStateForCompare(emptyFormState(key), key);
        return acc;
    }, {});

export const buildFormDefinitionPayload = (formState, tab = null) => {
    const normalized = applyFixedFormMeta(tab, normalizeFormState(formState));
    const isProposal = isProposalFormState(normalized, tab);
    const isQuotation = isQuotationFormState(normalized, tab);
    const isQualification = isQualificationFormState(normalized, tab);
    const isPipelineStage = Boolean(tab && isPipelineStageTab(tab));
    const omitWorkflow = isProposal || isQuotation || isQualification || isPipelineStage;
    const storedApiName = String(normalized.apiName || '').trim();

    const schema = omitWorkflow
        ? {
            schemaVersion: 1,
            sections: buildApiSections(normalized.sections, normalized.standaloneFields),
        }
        : {
            schemaVersion: 1,
            sections: buildApiSections(normalized.sections, normalized.standaloneFields),
            workflow: normalized.workflow,
        };

    const payload = {
        name: isProposal
            ? PROPOSAL_FORM_CONFIG.name
            : isQuotation
                ? QUOTATION_FORM_CONFIG.name
                : isQualification
                    ? QUALIFICATION_FORM_CONFIG.name
                    : normalized.name.trim(),
        apiName: isProposal
            ? PROPOSAL_FORM_CONFIG.apiName
            : isQuotation
                ? QUOTATION_FORM_CONFIG.apiName
                : isQualification
                    ? QUALIFICATION_FORM_CONFIG.apiName
                    : (storedApiName || slugify(normalized.name)),
        entityType: isProposal || isQuotation || isPipelineStage
            ? OPPORTUNITY_PIPELINE_ENTITY_TYPE
            : normalized.entityType,
        description: normalized.description.trim(),
        schema,
    };

    // formPurpose only allowed on lead forms — not on opportunity pipeline stages
    if (payload.entityType === 'lead' && tab) {
        const formPurpose = TAB_FORM_PURPOSE_MAP[tab];
        if (formPurpose) {
            payload.schema.formPurpose = formPurpose;
        }
    }

    // inheritLeadFields only on the main Opportunity form — not leads, pipeline stages, etc.
    if (tab === 'opportunities') {
        payload.schema.inheritLeadFields = true;
    }

    return payload;
};

const mapApiFieldToUi = (field, index) => {
    if (field?.type === 'heading') {
        return normalizeField({
            id: `field_heading_${index}`,
            type: 'heading',
            label: field.label || '',
            required: false,
            masked: false,
            options: [],
        });
    }

    return normalizeField({
        id: `field_${field?.apiName || index}`,
        type: field?.type,
        label: field.label || '',
        apiName: field?.apiName,
        required: field.required,
        masked: field.masked,
        options: field.options || [],
        validation: field.validation || {},
    });
};

export const getRenderableSections = (formState = {}) => {
    const sections = [...(formState.sections || [])];

    if (formState.standaloneFields?.length) {
        sections.unshift({
            id: 'section_general',
            title: 'General',
            fields: formState.standaloneFields,
        });
    }

    return sections;
};

export const getFieldValueKey = (field) =>
    field?.apiName || slugify(field?.label || '');

export const getInitialFieldValue = (type) => {
    const normalized = normalizeFieldType(type);
    if (normalized === 'checkbox') return false;
    if (normalized === 'multiselect') return [];
    if (normalized === 'file') return [];
    return '';
};

export const isEmptyFieldValue = (type, value) => {
    const normalized = normalizeFieldType(type);
    if (normalized === 'checkbox') return !value;
    if (normalized === 'multiselect') return !Array.isArray(value) || value.length === 0;
    if (normalized === 'file') {
        if (Array.isArray(value)) return value.length === 0;
        return !value;
    }
    if (value === null || value === undefined) return true;
    return String(value).trim() === '';
};

export const getPhoneDigits = (value = '') => String(value).replace(/\D/g, '');

export const formatPhoneNumber = (value = '', maxDigits = 15) => {
    let digits = getPhoneDigits(value);
    if (digits.length > maxDigits) {
        digits = digits.slice(0, maxDigits);
    }

    if (digits.length > 6) {
        return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    }

    if (digits.length > 3) {
        return `(${digits.substring(0, 3)}) ${digits.substring(3)}`;
    }

    if (digits.length > 0) {
        return `(${digits}`;
    }

    return '';
};

export const getNumericValidationBound = (bound) => {
    if (bound == null || bound === '') return null;
    const parsed = Number(bound);
    return Number.isNaN(parsed) ? null : parsed;
};

export const hasDigitLengthValidation = (validation = {}) =>
    getNumericValidationBound(validation.min) != null
    || getNumericValidationBound(validation.max) != null;

export const sanitizeDigitInput = (value = '', validation = {}) => {
    let digits = getPhoneDigits(value);
    const max = getNumericValidationBound(validation.max);

    if (max != null && digits.length > max) {
        digits = digits.slice(0, max);
    }

    return digits;
};

export const getPhoneValidationBounds = (validation = {}) => ({
    min: getNumericValidationBound(validation.min) ?? 10,
    max: getNumericValidationBound(validation.max) ?? 15,
});

export const isValidPhoneValue = (value, validation = {}) => {
    const { min, max } = getPhoneValidationBounds(validation);
    const digits = getPhoneDigits(value);
    return digits.length >= min && digits.length <= max;
};

const isValidEmailValue = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

const DATE_API_FORMATS = ['YYYY-MM-DD', 'MM/DD/YYYY', 'M/D/YYYY', 'MM-DD-YYYY'];

export const parseDateValue = (value) => {
    const str = String(value ?? '').trim();
    if (!str) return null;

    const parsed = dayjs(str, DATE_API_FORMATS, true);
    return parsed.isValid() ? parsed : null;
};

export const formatDateForApi = (value) => {
    const parsed = parseDateValue(value);
    return parsed ? parsed.format('YYYY-MM-DD') : '';
};

export const isValidDateValue = (value) => Boolean(parseDateValue(value));

export const validateFieldValue = (field, value) => {
    const errors = [];
    const type = normalizeFieldType(field.type);
    const label = field.label || 'Field';

    if (isHeadingField(type)) return errors;

    if (field.required && isEmptyFieldValue(type, value)) {
        errors.push(`${label} is required`);
        return errors;
    }

    if (isEmptyFieldValue(type, value)) return errors;

    if (type === 'email' && !isValidEmailValue(value)) {
        errors.push(`${label} must be a valid email`);
    }

    if (type === 'phone') {
        const { min, max } = getPhoneValidationBounds(field.validation);
        const digitCount = getPhoneDigits(value).length;

        if (!isValidPhoneValue(value, field.validation)) {
            if (digitCount < min) {
                errors.push(`${label} must be at least ${min} digits`);
            } else if (digitCount > max) {
                errors.push(`${label} must be at most ${max} digits`);
            } else {
                errors.push(`${label} must be a valid phone number (${min}-${max} digits)`);
            }
        }
    }

    if (type === 'number') {
        const min = getNumericValidationBound(field.validation?.min);
        const max = getNumericValidationBound(field.validation?.max);
        const hasDigitBounds = min != null || max != null;

        if (hasDigitBounds) {
            const digitCount = getPhoneDigits(value).length;

            if (!digitCount) {
                errors.push(`${label} must be a valid number`);
            } else {
                if (min != null && digitCount < min) {
                    errors.push(`${label} must be at least ${min} digits`);
                }

                if (max != null && digitCount > max) {
                    errors.push(`${label} must be at most ${max} digits`);
                }
            }
        } else {
            const num = Number(value);
            if (Number.isNaN(num)) {
                errors.push(`${label} must be a valid number`);
            }
        }
    }

    if (type === 'date' && !isValidDateValue(value)) {
        errors.push(`${label} must be a valid date (YYYY-MM-DD)`);
    }

    return errors;
};

export const DEFAULT_ASSIGN_TO_FIELD_ID = 'default_assign_to';

export const isSystemLeadField = (field) => field?.id === DEFAULT_ASSIGN_TO_FIELD_ID;

export const buildInitialFormValues = (sections = []) => {
    const values = {};

    sections.forEach((section) => {
        (section.fields || []).forEach((field) => {
            if (isSystemLeadField(field)) return;
            if (isHeadingField(normalizeFieldType(field.type))) return;
            const key = getFieldValueKey(field);
            if (!key) return;
            values[key] = getInitialFieldValue(field.type);
        });
    });

    return values;
};

export const getDynamicFormValidation = (sections = [], values = {}) => {
    const errors = [];
    const invalidFieldKeys = {};

    sections.forEach((section) => {
        (section.fields || []).forEach((field) => {
            if (isSystemLeadField(field)) return;
            const key = getFieldValueKey(field);
            if (!key) return;

            const fieldErrors = validateFieldValue(field, values[key]);
            if (fieldErrors.length > 0) {
                errors.push(...fieldErrors);
                invalidFieldKeys[key] = true;
            }
        });
    });

    return { errors, invalidFieldKeys };
};

export const validateDynamicFormValues = (sections = [], values = {}) =>
    getDynamicFormValidation(sections, values).errors;

const LEGACY_LEAD_KEY_MAP = {
    full_name: 'fullName',
    owner_name: 'fullName',
    name: 'fullName',
    contact_email: 'email',
    email: 'email',
    phone_number: 'phoneNumber',
    phone: 'phoneNumber',
    contact_no: 'phoneNumber',
    business_name: 'businessName',
    comments: 'comments',
    comment: 'comments',
    services: 'services',
    service: 'services',
    address: 'address',
    designation: 'designation',
    website: 'website',
};

export const DEFAULT_LEAD_SERVICE_OPTIONS = [
    { label: 'ATM Solutions', value: 'ATM Solutions' },
    { label: 'Credit Card Processing', value: 'Credit Card Processing' },
    { label: 'Cash Advance', value: 'Cash Advance' },
    { label: 'Point-Of-Sale Solutions', value: 'Point-Of-Sale Solutions' },
    { label: 'EBT Processing', value: 'EBT Processing' },
    { label: 'AIRVAC Systems', value: 'AIRVAC Systems' },
    { label: 'Website Services', value: 'Website Services' },
    { label: 'ACH Processing', value: 'ACH Processing' },
];

const LEGACY_SERVICE_SLUG_TO_LABEL = {
    atm: 'ATM Solutions',
    'credit-card': 'Credit Card Processing',
    'cash-advance': 'Cash Advance',
    pos: 'Point-Of-Sale Solutions',
    ebt: 'EBT Processing',
    airvac: 'AIRVAC Systems',
    website: 'Website Services',
    'ach-processing': 'ACH Processing',
};

const resolveLeadServiceValue = (raw) => {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) return '';
    const slugKey = trimmed.toLowerCase();
    if (LEGACY_SERVICE_SLUG_TO_LABEL[slugKey]) return LEGACY_SERVICE_SLUG_TO_LABEL[slugKey];

    const byLabel = DEFAULT_LEAD_SERVICE_OPTIONS.find(
        (opt) => String(opt.label).toLowerCase() === slugKey || String(opt.value).toLowerCase() === slugKey
    );
    return byLabel?.value || trimmed;
};

export const DEFAULT_LEAD_SECTION = {
    id: 'section_default_lead',
    title: 'Lead Details',
    collapsed: false,
    isLegacySection: true,
    fields: [
        normalizeField({
            id: 'default_full_name',
            type: 'text',
            label: 'Full Name',
            apiName: 'full_name',
            required: true,
        }),
        normalizeField({
            id: 'default_email',
            type: 'email',
            label: 'Email',
            apiName: 'email',
            required: false,
        }),
        normalizeField({
            id: 'default_phone_number',
            type: 'phone',
            label: 'Phone Number',
            apiName: 'phone_number',
            required: false,
            validation: { max: 15 },
        }),
        normalizeField({
            id: 'default_business_name',
            type: 'text',
            label: 'Business Name',
            apiName: 'business_name',
            required: false,
        }),
        normalizeField({
            id: 'default_services',
            type: 'multiselect',
            label: 'Service',
            apiName: 'services',
            required: true,
            options: DEFAULT_LEAD_SERVICE_OPTIONS,
        }),
        normalizeField({
            id: 'default_comments',
            type: 'textarea',
            label: 'Comments',
            apiName: 'comments',
            required: true,
        }),
        normalizeField({
            id: DEFAULT_ASSIGN_TO_FIELD_ID,
            type: 'select',
            label: 'Assign To',
            apiName: 'assign_to',
            required: true,
        }),
    ],
};

export const isLegacyLeadSection = (section) =>
    section?.id === DEFAULT_LEAD_SECTION.id || Boolean(section?.isLegacySection);

export const isLeadsTab = (tab) => tab === 'leads';

const DEFAULT_LEAD_FIELD_API_NAMES = new Set(
    (DEFAULT_LEAD_SECTION.fields || [])
        .map((field) => String(field.apiName || '').trim().toLowerCase())
        .filter(Boolean)
);

const DEFAULT_LEAD_FIELD_LABELS = new Set(
    (DEFAULT_LEAD_SECTION.fields || [])
        .map((field) => String(field.label || '').trim().toLowerCase())
        .filter(Boolean)
);

export const conflictsWithDefaultLeadField = (field) => {
    const label = String(field?.label || '').trim().toLowerCase();
    const apiName = String(field?.apiName || slugify(field?.label || '')).trim().toLowerCase();

    if (label && DEFAULT_LEAD_FIELD_LABELS.has(label)) return true;
    if (apiName && DEFAULT_LEAD_FIELD_API_NAMES.has(apiName)) return true;

    return false;
};

export const getDynamicLeadSections = (sections = []) =>
    sections.filter((section) => !isLegacyLeadSection(section));

export const mergeAddLeadSections = (dynamicSections = []) => [
    DEFAULT_LEAD_SECTION,
    ...dynamicSections,
];

export const getFormDefinitionId = (formDefinition) =>
    formDefinition?.definitionId ?? formDefinition?.id ?? formDefinition?._id ?? null;

export const extractLeadId = (result) => {
    const raw = result?.data ?? result;

    return raw?.id
        ?? raw?._id
        ?? raw?.leadId
        ?? raw?.lead?.id
        ?? raw?.lead?._id
        ?? null;
};

export const buildLegacyLeadPayload = (formValues = {}) => {
    const payload = {};

    (DEFAULT_LEAD_SECTION.fields || []).forEach((field) => {
        const type = normalizeFieldType(field.type);
        const apiName = getFieldValueKey(field);
        if (!apiName) return;

        const legacyKey = LEGACY_LEAD_KEY_MAP[apiName];
        if (!legacyKey) return;

        const value = formValues[apiName];

        if (legacyKey === 'services') {
            const joined = Array.isArray(value)
                ? value.map((item) => String(item ?? '').trim()).filter(Boolean).join(', ')
                : String(value ?? '').trim();
            if (joined) payload.services = joined;
            return;
        }

        if (isEmptyFieldValue(type, value)) return;

        payload[legacyKey] = value;
    });

    return payload;
};

const normalizeStoredValueForField = (field, rawValue) => {
    const type = normalizeFieldType(field.type);

    if (rawValue === null || rawValue === undefined) {
        return getInitialFieldValue(field.type);
    }

    if (type === 'file') {
        if (Array.isArray(rawValue)) return rawValue;
        if (rawValue?.url) return [rawValue];
        return [];
    }

    if (type === 'multiselect') {
        let values = [];
        if (Array.isArray(rawValue)) values = rawValue;
        else if (typeof rawValue === 'string') {
            values = rawValue.split(',').map((item) => item.trim()).filter(Boolean);
        }

        if (getFieldValueKey(field) === 'services') {
            return values.map(resolveLeadServiceValue).filter(Boolean);
        }

        return values;
    }

    if (type === 'checkbox') {
        return Boolean(rawValue);
    }

    if (type === 'phone') {
        const { max: maxDigits } = getPhoneValidationBounds(field.validation);
        return formatPhoneNumber(String(rawValue), maxDigits);
    }

    return rawValue;
};

export const mapLeadRecordToFormValues = (sections = [], leadRecord = {}, formSubmissions = []) => {
    const values = buildInitialFormValues(sections);

    const submissionData = (Array.isArray(formSubmissions) ? formSubmissions : []).reduce((acc, submission) => {
        if (submission?.data && typeof submission.data === 'object') {
            return { ...acc, ...submission.data };
        }
        return acc;
    }, {});

    sections.forEach((section) => {
        (section.fields || []).forEach((field) => {
            if (isSystemLeadField(field)) return;
            const key = getFieldValueKey(field);
            if (!key) return;

            const type = normalizeFieldType(field.type);
            if (isHeadingField(type)) return;

            let rawValue;

            if (Object.prototype.hasOwnProperty.call(submissionData, key)) {
                rawValue = submissionData[key];
            } else {
                const legacyKey = LEGACY_LEAD_KEY_MAP[key];
                if (legacyKey && leadRecord[legacyKey] != null && leadRecord[legacyKey] !== '') {
                    rawValue = leadRecord[legacyKey];
                }
            }

            if (rawValue === undefined || rawValue === null) return;
            if (rawValue === '' && type !== 'checkbox') return;

            values[key] = normalizeStoredValueForField(field, rawValue);
        });
    });

    return values;
};

export const extractLeadResponse = (result) => {
    const payload = result?.data ?? result;
    if (!payload) return { lead: null, forms: [] };

    if (payload.lead) {
        return {
            lead: payload.lead,
            forms: payload.forms ?? payload.formSubmissions ?? [],
        };
    }

    const forms = payload.forms ?? payload.formSubmissions ?? [];
    const { forms: _forms, formSubmissions: _formSubmissions, ...leadFields } = payload;

    return {
        lead: Object.keys(leadFields).length ? leadFields : payload,
        forms: Array.isArray(forms) ? forms : [],
    };
};

export const fetchLeadById = async (leadId, token, { includeForms = true } = {}) => {
    if (!leadId) throw new Error('Lead ID is required');

    const query = includeForms ? '?includeForms=true' : '';
    const result = await getRequestWithOutBody(`${baseURl}lead/${leadId}${query}`, token);
    return extractLeadResponse(result);
};

const CRM_FILE_UPLOAD_TYPE = 'applications';

const isNativeFile = (file) =>
    typeof File !== 'undefined' && file instanceof File;

const isUploadedFileReference = (file) =>
    Boolean(file && typeof file === 'object' && !isNativeFile(file) && file.url);

export const normalizeFileReferenceForApi = (file) => {
    if (!file?.url) return null;

    return {
        url: file.url,
        name: file.name ?? file.originalname ?? '',
    };
};

export const extractUploadedFileReference = (result, fallbackName = '') => {
    const fileMeta =
        result?.data?.dLFileUrl
        ?? result?.data?.fileUrl
        ?? result?.data?.uploadedFiles
        ?? result?.data
        ?? {};

    return normalizeFileReferenceForApi({
        url: fileMeta?.url,
        name: fileMeta?.name ?? fileMeta?.originalname ?? fallbackName,
    });
};

export const uploadFileToApi = async ({
    file,
    token,
    uploadType = CRM_FILE_UPLOAD_TYPE,
}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', uploadType);

    const result = await postRequestWithFormData(`${baseURl}files`, token, formData);
    const reference = extractUploadedFileReference(result, file?.name);

    if (!reference?.url) {
        throw new Error(`Failed to upload ${file?.name || 'file'}`);
    }

    return reference;
};

export const resolveFileFieldValue = async ({
    files,
    token,
    uploadType = CRM_FILE_UPLOAD_TYPE,
}) => {
    const fileList = Array.isArray(files) ? files : files ? [files] : [];
    const resolved = [];

    for (const file of fileList) {
        if (isNativeFile(file)) {
            resolved.push(await uploadFileToApi({ file, token, uploadType }));
        } else if (isUploadedFileReference(file)) {
            const reference = normalizeFileReferenceForApi(file);
            if (reference) resolved.push(reference);
        }
    }

    return resolved;
};

export const resolveFormValuesWithUploadedFiles = async ({
    sections = [],
    formValues = {},
    token,
    uploadType = CRM_FILE_UPLOAD_TYPE,
}) => {
    const resolvedValues = { ...formValues };

    for (const section of sections) {
        for (const field of section.fields || []) {
            const type = normalizeFieldType(field.type);
            if (type !== 'file') continue;

            const key = getFieldValueKey(field);
            if (!key) continue;

            const rawValue = formValues[key];
            if (isEmptyFieldValue(type, rawValue)) {
                resolvedValues[key] = [];
                continue;
            }

            resolvedValues[key] = await resolveFileFieldValue({
                files: rawValue,
                token,
                uploadType,
            });
        }
    }

    return resolvedValues;
};

export const serializeFormSubmissionData = (sections = [], formValues = {}) => {
    const data = {};

    sections.forEach((section) => {
        (section.fields || []).forEach((field) => {
            const type = normalizeFieldType(field.type);
            if (isHeadingField(type)) return;

            const key = getFieldValueKey(field);
            if (!key) return;

            const rawValue = formValues[key];
            if (isEmptyFieldValue(type, rawValue)) return;

            if (type === 'number') {
                data[key] = Number(rawValue);
                return;
            }

            if (type === 'checkbox') {
                data[key] = Boolean(rawValue);
                return;
            }

            if (type === 'multiselect') {
                data[key] = Array.isArray(rawValue) ? rawValue : [];
                return;
            }

            if (type === 'date') {
                data[key] = formatDateForApi(rawValue);
                return;
            }

            if (type === 'file') {
                const files = Array.isArray(rawValue)
                    ? rawValue
                    : rawValue?.url
                        ? [rawValue]
                        : [];
                const reference = normalizeFileReferenceForApi(files[0]);
                if (reference) {
                    data[key] = reference;
                }
                return;
            }

            data[key] = rawValue;
        });
    });

    return data;
};

export const QUOTATION_TAX_RATE = 10.25;

const createQuotationLineId = () => (
    typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `line-${Date.now()}-${Math.random()}`
);

export const buildCrmQuotationLineItems = (lines = []) => {
    const normalizedLines = Array.isArray(lines) ? lines : [];

    return normalizedLines.map((line) => {
        const qty = Math.max(0, Number(line.quantity) || 0);
        const unitPrice = Math.max(0, Number(line.unitPrice) || 0);
        const subtotal = qty * unitPrice;
        const taxAmount = subtotal * (QUOTATION_TAX_RATE / 100);
        const payload = {
            inventoryItemId: line.itemServiceId,
            quantity: qty,
            unitPrice,
            taxAmount: Number(taxAmount.toFixed(2)),
        };

        const description = String(line.description || '').trim();
        if (description) {
            payload.description = description;
        }

        return payload;
    });
};

export const mapCrmQuotationLineItemsToState = (lineItems = []) => {
    const rows = Array.isArray(lineItems)
        ? lineItems
        : Array.isArray(lineItems?.lineItems)
            ? lineItems.lineItems
            : Array.isArray(lineItems?.items)
                ? lineItems.items
                : Array.isArray(lineItems?.lines)
                    ? lineItems.lines
                    : [];

    return rows.map((item) => ({
        id: createQuotationLineId(),
        itemServiceId: item.inventoryItemId ?? item.itemServiceId ?? item.itemId ?? null,
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice ?? 0,
        description: item.description ?? '',
    }));
};

export const formatQuotationValidUntilForApi = (value) => {
    const parsed = parseDateValue(value);
    if (!parsed) return null;

    return new Date(`${parsed.format('YYYY-MM-DD')}T23:59:59.000Z`).toISOString();
};

export const parseQuotationValidUntilFromApi = (value) => {
    if (!value) return '';
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
};

export const extractQuotationNotesFromFormValues = (formValues = {}) => {
    const preferredKeys = ['notes', 'quotation_notes', 'quote_notes', 'description', 'note'];
    for (const key of preferredKeys) {
        const value = formValues[key];
        if (value != null && String(value).trim() !== '') {
            return String(value).trim();
        }
    }

    const dynamicKey = Object.keys(formValues).find(
        (key) => /note/i.test(key) && formValues[key] != null && String(formValues[key]).trim() !== ''
    );

    return dynamicKey ? String(formValues[dynamicKey]).trim() : '';
};

export const buildCrmQuotationPayload = ({
    opportunityId,
    lines = [],
    notes = '',
    status = 'draft',
    validUntil = null,
}) => {
    const payload = {
        crmOpportunityId: Number(opportunityId),
        status,
        notes: notes || '',
        lineItems: buildCrmQuotationLineItems(lines),
    };

    const formattedValidUntil = formatQuotationValidUntilForApi(validUntil);
    if (formattedValidUntil) {
        payload.validUntil = formattedValidUntil;
    }

    return payload;
};

export const OPPORTUNITY_DETAIL_INCLUDE_QUERY = '?includeForms=true&includeQuotations=true';

export const extractOpportunityQuotations = (payload = {}) => {
    if (!payload || typeof payload !== 'object') return [];

    const raw =
        payload.quotations
        ?? payload.crmQuotations
        ?? payload.quotation
        ?? payload.opportunity?.quotations
        ?? payload.opportunity?.crmQuotations;

    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return [raw];
    return [];
};

export const pickPrimaryOpportunityQuotation = (quotations = []) => {
    const list = Array.isArray(quotations) ? quotations : [];
    return list.length ? list[0] : null;
};

export const fetchCrmQuotationByOpportunity = async (opportunityId, token) => {
    if (!opportunityId || !token) return null;

    const url = `${baseURl}crm-quotation?crmOpportunityId=${encodeURIComponent(opportunityId)}`;

    try {
        const result = await getRequestWithOutBody(url, token);
        const data = result?.data ?? result;

        if (Array.isArray(data)) {
            return data[0] ?? null;
        }

        if (Array.isArray(data?.results)) {
            return data.results[0] ?? null;
        }

        if (Array.isArray(data?.quotations)) {
            return data.quotations[0] ?? null;
        }

        // Quotation object may omit lineItems when listed; still return metadata.
        if (data && typeof data === 'object' && (data.id != null || data._id != null || Array.isArray(data.lineItems))) {
            return data;
        }

        return null;
    } catch {
        return null;
    }
};

export const saveCrmQuotation = async ({
    opportunityId,
    quotationId = null,
    lines = [],
    notes = '',
    status = 'draft',
    validUntil = null,
    token,
}) => {
    if (!opportunityId) throw new Error('Opportunity ID is required');
    if (!token) throw new Error('Access token is required');

    const payload = buildCrmQuotationPayload({
        opportunityId,
        lines,
        notes,
        status,
        validUntil,
    });

    // Existing quotation → update (PUT); first save → create (POST)
    if (quotationId) {
        return putRequestWithBodyAndToken(
            `${baseURl}crm-quotation/${encodeURIComponent(quotationId)}`,
            token,
            payload
        );
    }

    return postRequestWithBodyAndToken(`${baseURl}crm-quotation`, token, payload);
};

export const convertCrmQuotationToSalesOrder = async (quotationId, token) => {
    if (!quotationId) throw new Error('Quotation ID is required');
    if (!token) throw new Error('Access token is required');

    return postRequestWithBodyAndToken(
        `${baseURl}crm-quotation/${encodeURIComponent(quotationId)}/convert-to-sales-order`,
        token,
        {}
    );
};

export const convertCrmQuotationToInvoice = async (quotationId, token) => {
    if (!quotationId) throw new Error('Quotation ID is required');
    if (!token) throw new Error('Access token is required');

    return postRequestWithBodyAndToken(
        `${baseURl}crm-quotation/${encodeURIComponent(quotationId)}/convert-to-invoice`,
        token,
        {}
    );
};

export const sendCrmQuotationEmail = async (quotationId, token, options = {}) => {
    if (!quotationId) throw new Error('Quotation ID is required');
    if (!token) throw new Error('Access token is required');

    const link = options?.link || '/home/crmQuotation/view';

    return postRequestWithBodyAndToken(
        `${baseURl}crm-quotation/${encodeURIComponent(quotationId)}/send`,
        token,
        { link }
    );
};

/** POST /api/crm-opportunity/:id/send-agreement-email */
export const sendOpportunityAgreementEmail = async (opportunityId, token, body = {}) => {
    if (!opportunityId) throw new Error('Opportunity ID is required');
    if (!token) throw new Error('Access token is required');

    return postRequestWithBodyAndToken(
        `${baseURl}crm-opportunity/${encodeURIComponent(opportunityId)}/send-agreement-email`,
        token,
        body
    );
};

export const fetchPublicCrmQuotationByToken = async (shareToken, options = {}) => {
    if (!shareToken) throw new Error('Share token is required');

    const params = new URLSearchParams({ token: String(shareToken) });
    const result = await getPublicRequest(
        `${baseURl}crm-quotation/public/view?${params.toString()}`,
        options
    );
    return result?.data ?? result;
};

export const respondToPublicCrmQuotation = async ({
    shareToken,
    action,
    notes = '',
}) => {
    if (!shareToken) throw new Error('Share token is required');
    if (!action) throw new Error('Action is required');

    const normalizedAction = String(action).toLowerCase();
    const apiAction =
        normalizedAction === 'request-changes' || normalizedAction === 'negotiate'
            ? 'negotiate'
            : normalizedAction;

    if (!['accept', 'reject', 'negotiate'].includes(apiAction)) {
        throw new Error('action must be accept, reject, or negotiate');
    }

    const trimmedNotes = String(notes || '').trim();
    const body = {
        token: String(shareToken),
        action: apiAction,
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
    };

    const result = await postPublicRequest(
        `${baseURl}crm-quotation/public/respond`,
        body
    );
    return result?.data ?? result;
};

export const fetchCrmQuotationAuditLogs = async (quotationId, token) => {
    if (!quotationId) throw new Error('Quotation ID is required');
    if (!token) throw new Error('Access token is required');

    const params = new URLSearchParams({
        entityType: 'crm_quotation',
        entityId: String(quotationId),
    });

    const result = await getRequestWithOutBody(
        `${baseURl}audit-log?${params.toString()}`,
        token
    );

    const payload = result?.data ?? result;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.logs)) return payload.logs;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

export const buildFormSubmissionPayload = (sections, formValues = {}, additionalData = {}) => ({
    data: {
        ...serializeFormSubmissionData(sections, formValues),
        ...additionalData,
    },
});

export const createLead = async ({ formValues, token, agentId }) => {
    const legacyPayload = buildLegacyLeadPayload(formValues);
    if (agentId) {
        legacyPayload.agentId = agentId;
    }
    const createLeadResult = await postRequestWithBodyAndToken(
        `${baseURl}lead`,
        token,
        legacyPayload
    );
    const leadId = extractLeadId(createLeadResult);

    if (!leadId) {
        throw new Error('Failed to create lead');
    }

    return { leadId, result: createLeadResult };
};

export const updateLead = async ({ leadId, formValues, token, agentId }) => {
    if (!leadId) throw new Error('Lead ID is required');

    const legacyPayload = buildLegacyLeadPayload(formValues);
    if (agentId) {
        legacyPayload.agentId = agentId;
    }
    return putRequestWithBodyAndToken(`${baseURl}lead/${leadId}`, token, legacyPayload);
};

export const saveLeadFormSubmission = async ({
    leadId,
    formDefinitionId,
    sections,
    formValues,
    token,
}) => {
    if (!leadId) throw new Error('Lead ID is required');
    if (!formDefinitionId) throw new Error('Form definition ID is required');

    const dynamicSections = getDynamicLeadSections(sections);
    const resolvedFormValues = await resolveFormValuesWithUploadedFiles({
        sections: dynamicSections,
        formValues,
        token,
    });
    const submissionPayload = buildFormSubmissionPayload(dynamicSections, resolvedFormValues);
    const url = `${baseURl}crm-form-submission/entity/lead/${encodeURIComponent(leadId)}/form/${encodeURIComponent(formDefinitionId)}`;

    return putRequestWithBodyAndToken(url, token, submissionPayload);
};

export const createLeadFormSubmission = async ({
    formDefinitionId,
    sections,
    formValues,
    token,
    agentId,
}) => {
    const { leadId } = await createLead({ formValues, token, agentId });

    return saveLeadFormSubmission({
        leadId,
        formDefinitionId,
        sections,
        formValues,
        token,
    });
};

export const extractOpportunityId = (result) => {
    const raw = result?.data ?? result;

    return raw?.id
        ?? raw?._id
        ?? raw?.opportunityId
        ?? raw?.opportunity?.id
        ?? raw?.opportunity?._id
        ?? null;
};

export const createOpportunity = async ({ recordType, token }) => {
    const payload = recordType ? { name: recordType, recordType } : {};
    const createResult = await postRequestWithBodyAndToken(
        `${baseURl}crm-opportunity`,
        token,
        payload
    );
    const opportunityId = extractOpportunityId(createResult);

    if (!opportunityId) {
        throw new Error('Failed to create opportunity');
    }

    return { opportunityId, result: createResult };
};

export const publishedStageFormHasFields = async (tabKey, token) => {
    const apiItem = await fetchPublishedStageFormDefinition(tabKey, token);
    if (!apiItem) return false;
    const mapped = mapApiDefinitionToFormState(apiItem, tabKey);
    return definitionHasRenderableFields(mapped);
};

export const fetchPublishedStageFormDefinition = async (tabKey, token) => {
    const meta = getPipelineStageFormMeta(tabKey);
    if (!meta) return null;

    const entityType = OPPORTUNITY_PIPELINE_ENTITY_TYPE;
    const allPublished = await fetchAllFormDefinitionsByEntity(entityType, token, 'published');

    return findFormDefinitionWithCopyFallback(allPublished, {
        apiName: meta.apiName,
        name: meta.name,
        entityType,
    });
};

// Same lookup as fetchPublishedStageFormDefinition, but does NOT swallow fetch
// errors into an empty list — callers that must distinguish "no form configured"
// from "the lookup failed" (e.g. before permanently closing an opportunity)
// need this variant instead.
export const fetchPublishedStageFormDefinitionStrict = async (tabKey, token) => {
    const meta = getPipelineStageFormMeta(tabKey);
    if (!meta) return null;

    const entityType = OPPORTUNITY_PIPELINE_ENTITY_TYPE;
    const url = buildFormDefinitionQuery(entityType, { status: 'published' });
    const result = await getRequestWithOutBody(url, token);
    const raw = result?.data ?? result;
    const allPublished = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
            ? raw.data
            : Array.isArray(raw?.results)
                ? raw.results
                : raw?.schema
                    ? [raw]
                    : [];

    return findFormDefinitionWithCopyFallback(allPublished, {
        apiName: meta.apiName,
        name: meta.name,
        entityType,
    });
};

/**
 * Opportunity pipeline stages: draft + published lists, match by apiName/name with copy fallbacks.
 */
export const fetchPipelineStageFormDefinitionsForBuilder = async (tabKey, token) => {
    const meta = getPipelineStageFormMeta(tabKey);
    if (!meta?.name) return { draft: null, published: null };

    const entityType = OPPORTUNITY_PIPELINE_ENTITY_TYPE;
    const pickOpts = { apiName: meta.apiName, name: meta.name, entityType };

    const [allDraft, allPublished] = await Promise.all([
        fetchAllFormDefinitionsByEntity(entityType, token, 'draft'),
        fetchAllFormDefinitionsByEntity(entityType, token, 'published'),
    ]);

    return {
        draft: findFormDefinitionWithCopyFallback(allDraft, pickOpts),
        published: findFormDefinitionWithCopyFallback(allPublished, pickOpts),
    };
};

export const updateOpportunityStage = async (opportunityId, stage, token, extraFields = {}) => {
    if (!opportunityId) throw new Error('Opportunity ID is required');
    if (!stage) throw new Error('Stage is required');

    return putRequestWithBodyAndToken(
        `${baseURl}crm-opportunity/${encodeURIComponent(opportunityId)}`,
        token,
        { ...extraFields, stage }
    );
};

/** POST /api/lead/:id/convert — creates CRM account/contact (required before closed_won on some backends). */
export const convertLeadToCrm = async (leadId, token) => {
    if (!leadId) throw new Error('Lead ID is required');

    return postRequestWithBodyAndToken(
        `${baseURl}lead/${encodeURIComponent(leadId)}/convert`,
        token,
        {}
    );
};

export const pickOpportunityIdFromConvertResponse = (result) => {
    const data = result?.data ?? result;
    if (!data || typeof data !== 'object') return null;
    const raw =
        data.opportunityId
        ?? data.convertedOpportunityId
        ?? data.opportunity?.id
        ?? data.opportunity?._id;
    return raw != null && raw !== '' ? raw : null;
};

export const pickOpportunityIdFromLeadRecord = (lead) => {
    if (!lead || typeof lead !== 'object') return null;
    const raw =
        lead.convertedOpportunityId
        ?? lead.opportunityId
        ?? lead.opportunity?.id
        ?? lead.opportunity?._id;
    return raw != null && raw !== '' ? raw : null;
};

/** Build POST /api/crm-account body from merged lead + form submission fields. */
export const buildCrmAccountPayloadFromLead = (lead = {}) => {
    const name =
        String(lead.businessName || lead.company || lead.name || lead.fullName || '').trim() || 'Account';
    const website = String(lead.website || '').trim();
    const phone = String(lead.phoneNumber || lead.phone || lead.mobile || '').trim();
    const addressParts = [lead.address, lead.street, lead.city, lead.state, lead.postalCode, lead.country]
        .filter((p) => p != null && String(p).trim() !== '');
    const address = String(lead.address || '').trim() || addressParts.join(', ');
    return { name, website, phone, address };
};

/** Build POST /api/crm-account body from an opportunity record (company / contact fields). */
export const buildCrmAccountPayloadFromOpportunity = (record = {}) => {
    const name = String(
        record.crmAccount?.name
        || record.companyName
        || record.businessName
        || record.name
        || record.opportunityName
        || 'Account'
    ).trim() || 'Account';
    const website = String(record.website || '').trim();
    const phone = String(record.phone || record.phoneNumber || record.mobile || '').trim();
    const address = String(
        record.address
        || record.street
        || [record.city, record.state, record.postalCode, record.country].filter((p) => p != null && String(p).trim() !== '').join(', ')
        || ''
    ).trim();
    return { name, website, phone, address };
};

export const createCrmAccount = async (payload, token) =>
    postRequestWithBodyAndToken(`${baseURl}crm-account`, token, {
        name: String(payload.name || '').trim() || 'Account',
        website: payload.website != null ? String(payload.website).trim() : '',
        phone: payload.phone != null ? String(payload.phone).trim() : '',
        address: payload.address != null ? String(payload.address).trim() : '',
    });

export const extractCreatedCrmAccountId = (result) => {
    const data = result?.data ?? result;
    return data?.id ?? data?._id ?? null;
};

/** PUT /api/crm-opportunity/:id with only crmAccountId (manual link after POST crm-account). */
export const setOpportunityCrmAccountId = async (opportunityId, crmAccountId, token) => {
    if (!opportunityId) throw new Error('Opportunity ID is required');
    if (crmAccountId == null || crmAccountId === '') throw new Error('CRM account ID is required');

    return putRequestWithBodyAndToken(
        `${baseURl}crm-opportunity/${encodeURIComponent(opportunityId)}`,
        token,
        { crmAccountId }
    );
};

export const findFormSubmissionForDefinition = (submissions = [], definitionId) => {
    if (!definitionId) return null;
    const idStr = String(definitionId);

    return (Array.isArray(submissions) ? submissions : []).find((submission) => {
        const submissionDefinitionId =
            submission?.formDefinitionId
            ?? submission?.formDefinition?.id
            ?? submission?.definitionId
            ?? submission?.formId
            ?? null;

        return submissionDefinitionId != null && String(submissionDefinitionId) === idStr;
    }) ?? null;
};

export const saveOpportunityFormSubmission = async ({
    opportunityId,
    formDefinitionId,
    sections,
    formValues,
    token,
    additionalData = {},
}) => {
    if (!opportunityId) throw new Error('Opportunity ID is required');
    if (!formDefinitionId) throw new Error('Form definition ID is required');

    const resolvedFormValues = await resolveFormValuesWithUploadedFiles({
        sections,
        formValues,
        token,
    });
    const submissionPayload = buildFormSubmissionPayload(
        sections,
        resolvedFormValues,
        additionalData
    );
    const url = `${baseURl}crm-form-submission/entity/opportunity/${encodeURIComponent(opportunityId)}/form/${encodeURIComponent(formDefinitionId)}`;

    return putRequestWithBodyAndToken(url, token, submissionPayload);
};

/** PUT /api/crm-form-submission/entity/opportunity/{opportunityId}/form/{proposalFormId} */
export const saveProposalFormSubmission = ({
    opportunityId,
    proposalFormId,
    sections,
    formValues,
    token,
}) =>
    saveOpportunityFormSubmission({
        opportunityId,
        formDefinitionId: proposalFormId,
        sections,
        formValues,
        token,
    });

/** PUT /api/crm-form-submission/entity/opportunity/{opportunityId}/form/{quotationFormId} */
export const saveQuotationFormSubmission = ({
    opportunityId,
    quotationFormId,
    sections,
    formValues,
    token,
}) =>
    saveOpportunityFormSubmission({
        opportunityId,
        formDefinitionId: quotationFormId,
        sections,
        formValues,
        token,
    });

export const createOpportunityFormSubmission = async ({
    recordType,
    formDefinitionId,
    sections,
    formValues,
    token,
}) => {
    const { opportunityId } = await createOpportunity({ recordType, token });

    return saveOpportunityFormSubmission({
        opportunityId,
        formDefinitionId,
        sections,
        formValues,
        token,
    });
};

export const fetchLeadFormSubmission = async (leadId, token) => {
    const url = `${baseURl}crm-form-submission/entity/lead/${encodeURIComponent(leadId)}`;
    const result = await getRequestWithOutBody(url, token);
    return result?.data ?? result;
};

export const fetchLeadFormSubmissionByDefinition = async (leadId, formDefinitionId, token) => {
    const url = `${baseURl}crm-form-submission/entity/lead/${encodeURIComponent(leadId)}/form/${encodeURIComponent(formDefinitionId)}`;
    const result = await getRequestWithOutBody(url, token);
    return result?.data ?? result;
};

export const fetchOpportunityFormSubmissionByDefinition = async (opportunityId, formDefinitionId, token) => {
    const url = `${baseURl}crm-form-submission/entity/opportunity/${encodeURIComponent(opportunityId)}/form/${encodeURIComponent(formDefinitionId)}`;
    const result = await getRequestWithOutBody(url, token);
    return result?.data ?? result;
};

export const mapOpportunityRecordToFormValues = (sections = [], opportunityRecord = {}, formSubmissions = []) => {
    const values = buildInitialFormValues(sections);

    const submissionData = (Array.isArray(formSubmissions) ? formSubmissions : []).reduce((acc, submission) => {
        if (submission?.data && typeof submission.data === 'object') {
            return { ...acc, ...submission.data };
        }
        return acc;
    }, {});

    sections.forEach((section) => {
        (section.fields || []).forEach((field) => {
            const key = getFieldValueKey(field);
            if (!key) return;

            const type = normalizeFieldType(field.type);
            if (isHeadingField(type)) return;

            let rawValue;

            if (Object.prototype.hasOwnProperty.call(submissionData, key)) {
                rawValue = submissionData[key];
            } else if (opportunityRecord[key] != null && opportunityRecord[key] !== '') {
                rawValue = opportunityRecord[key];
            }

            if (rawValue === undefined || rawValue === null) return;
            if (rawValue === '' && type !== 'checkbox') return;

            values[key] = normalizeStoredValueForField(field, rawValue);
        });
    });

    return values;
};

export const fetchLeadsList = async ({ token, page = 1, limit = 25 } = {}) => {
    const params = new URLSearchParams({
        paginate: 'true',
        page: String(page),
        limit: String(limit),
    });

    const result = await getRequestWithOutBody(`${baseURl}lead?${params.toString()}`, token);
    const apiData = result?.data ?? result;
    const rows = apiData?.results ?? apiData?.data?.results ?? [];
    const totalRecords =
        apiData?.totalRecords ??
        apiData?.data?.totalRecords ??
        result?.totalRecords ??
        0;

    return {
        results: Array.isArray(rows) ? rows : [],
        totalRecords: Number(totalRecords) || 0,
    };
};

export const buildLeadPayload = (formDefinition, formValues = {}) => {
    const payload = {
        formDefinitionId:
            formDefinition?.definitionId ?? formDefinition?.id ?? formDefinition?._id ?? null,
        formData: { ...formValues },
    };

    Object.entries(formValues).forEach(([apiName, value]) => {
        const legacyKey = LEGACY_LEAD_KEY_MAP[apiName];
        if (legacyKey && payload[legacyKey] === undefined) {
            payload[legacyKey] = value;
        }
    });

    return payload;
};

export const mapApiDefinitionToFormState = (apiItem, tab) => {
    const defaults = emptyFormState(tab);

    if (!apiItem) return defaults;

    const schema = apiItem.schema || {};
    const sections = (schema.sections || []).map((section, sectionIndex) => ({
        id: section.id || `section_${sectionIndex}`,
        title: section.title || `Section ${sectionIndex + 1}`,
        collapsed: false,
        fields: (section.fields || []).map(mapApiFieldToUi),
    }));

    return applyFixedFormMeta(tab, normalizeFormState({
        definitionId: apiItem.id ?? apiItem._id ?? null,
        status: apiItem.status ?? defaults.status,
        version: apiItem.version ?? apiItem.versionNumber ?? null,
        sourceDefinitionId:
            apiItem.sourceDefinitionId
            ?? apiItem.sourceId
            ?? apiItem.parentDefinitionId
            ?? apiItem.duplicatedFromId
            ?? null,
        name: apiItem.name ?? defaults.name,
        apiName: apiItem.apiName ?? defaults.apiName,
        entityType: apiItem.entityType ?? defaults.entityType,
        formPurpose: schema.formPurpose ?? defaults.formPurpose ?? null,
        description: apiItem.description ?? '',
        workflow: schema.workflow ?? defaults.workflow,
        sections,
        standaloneFields: [],
    }));
};

const matchesFormDefinitionFilters = (item, { apiName } = {}) => {
    if (apiName && item?.apiName !== apiName) return false;
    return true;
};

export const pickBestFormDefinition = (items = [], { apiName, entityType } = {}) => {
    const list = (Array.isArray(items) ? items : []).filter(
        (item) => !entityType || item?.entityType === entityType
    );

    if (!list.length) return null;

    if (apiName) {
        return findFormDefinitionByExactApiName(list, apiName);
    }

    return [...list].sort((a, b) => {
        const aTime = new Date(a?.updatedAt || a?.publishedAt || 0).getTime();
        const bTime = new Date(b?.updatedAt || b?.publishedAt || 0).getTime();
        return bTime - aTime;
    })[0];
};

const parseFormDefinitionResponse = (result, filters = {}) => {
    const raw = result?.data ?? result;
    const hasStrictApiNameFilter = Boolean(filters.apiName);
    const useExactApiNameOnly = Boolean(filters.strictApiName && filters.apiName);

    const pickFromList = (list = []) => {
        if (!list.length) return null;

        const match = list.find((item) => matchesFormDefinitionFilters(item, filters));
        if (match) return match;

        if (useExactApiNameOnly) return null;
        if (hasStrictApiNameFilter) {
            return pickBestFormDefinition(list, filters);
        }

        return list[0] || null;
    };

    if (!raw) return null;

    if (Array.isArray(raw)) {
        return pickFromList(raw);
    }

    if (Array.isArray(raw.results)) {
        return pickFromList(raw.results);
    }

    if (raw.schema) {
        if (matchesFormDefinitionFilters(raw, filters)) return raw;
        if (useExactApiNameOnly) return null;
        return pickBestFormDefinition([raw], filters);
    }

    return null;
};

const buildFormDefinitionQuery = (entityType, { status, apiName } = {}) => {
    const params = new URLSearchParams({ entityType });
    if (status) params.set('status', status);
    if (apiName) params.set('apiName', apiName);
    return `${baseURl}crm-form-definition?${params.toString()}`;
};

export const fetchFormDefinitionByEntity = async (entityType, token, options = {}) => {
    const url = buildFormDefinitionQuery(entityType, options);

    try {
        const result = await getRequestWithOutBody(url, token);
        return parseFormDefinitionResponse(result, options);
    } catch {
        return null;
    }
};

export const fetchPublishedFormDefinitionByEntity = async (entityType, token, options = {}) => {
    const url = buildFormDefinitionQuery(entityType, { ...options, status: 'published' });

    try {
        const result = await getRequestWithOutBody(url, token);
        return parseFormDefinitionResponse(result, options);
    } catch {
        return null;
    }
};

export const fetchDraftFormDefinitionByEntity = async (entityType, token, options = {}) => {
    const url = buildFormDefinitionQuery(entityType, { ...options, status: 'draft' });

    try {
        const result = await getRequestWithOutBody(url, token);
        return parseFormDefinitionResponse(result, options);
    } catch {
        return null;
    }
};

const fetchAllFormDefinitionsByEntity = async (entityType, token, status) => {
    const url = buildFormDefinitionQuery(entityType, { status });

    try {
        const result = await getRequestWithOutBody(url, token);
        const raw = result?.data ?? result;

        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        if (Array.isArray(raw?.results)) return raw.results;
        if (raw?.schema) return [raw];
        return [];
    } catch {
        return [];
    }
};

/**
 * Leads + Opportunity main tabs: two GETs (`status=published` + `status=draft`, no query filters).
 * - **Lead** forms: exact match by `apiName` / `name` / `formPurpose` (no unrelated fallback).
 * - **Opportunity** main form: exact `apiName` / `name`, then duplicated-copy fallbacks.
 */
export const fetchFormDefinitionsForBuilder = async (entityType, token, options = {}) => {
    const fetchOptions = { ...options, entityType };
    const { matchName, apiName, formPurpose } = fetchOptions;

    const [allDraft, allPublished] = await Promise.all([
        fetchAllFormDefinitionsByEntity(entityType, token, 'draft'),
        fetchAllFormDefinitionsByEntity(entityType, token, 'published'),
    ]);

    if (entityType === 'lead') {
        const pickOpts = { apiName, name: matchName, entityType, formPurpose };
        return {
            draft: findFormDefinitionForLeadEntity(allDraft, pickOpts),
            published: findFormDefinitionForLeadEntity(allPublished, pickOpts),
        };
    }

    if (entityType === OPPORTUNITY_PIPELINE_ENTITY_TYPE) {
        const pickOpts = { apiName, name: matchName, entityType };
        return {
            draft: findOpportunityMainFormDefinition(allDraft, pickOpts),
            published: findOpportunityMainFormDefinition(allPublished, pickOpts),
        };
    }

    return {
        draft: findFormDefinitionByExactName(allDraft, matchName, entityType),
        published: findFormDefinitionByExactName(allPublished, matchName, entityType),
    };
};

export const fetchLeadFormDefinitionsForBuilder = async (token) =>
    fetchFormDefinitionsForBuilder('lead', token, {
        apiName: LEAD_FORM_CONFIG.apiName,
        matchName: LEAD_FORM_CONFIG.name,
        entityType: 'lead',
        formPurpose: TAB_FORM_PURPOSE_MAP.leads,
    });

export const fetchOpportunityFormDefinitionsForBuilder = async (token) => {
    const config = FORM_BUILDER_TAB_MAP.opportunities;
    return fetchFormDefinitionsForBuilder(OPPORTUNITY_PIPELINE_ENTITY_TYPE, token, {
        apiName: config?.apiName,
        matchName: config?.name,
        entityType: OPPORTUNITY_PIPELINE_ENTITY_TYPE,
    });
};

export const fetchPublishedOpportunityMainFormDefinition = async (token) => {
    const { published } = await fetchOpportunityFormDefinitionsForBuilder(token);
    return published;
};

/** Published lead intake form — apiName may differ after duplicate (match by formPurpose). */
export const fetchPublishedLeadFormDefinition = async (token) => {
    try {
        const result = await getRequestWithOutBody(
            buildFormDefinitionQuery(LEAD_FORM_CONFIG.entityType, {
                status: 'published',
                apiName: LEAD_FORM_CONFIG.apiName,
            }),
            token
        );
        const raw = result?.data ?? result;
        const list = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.results)
                ? raw.results
                : raw?.schema
                    ? [raw]
                    : [];

        return findFormDefinitionForLeadEntity(list, {
            apiName: LEAD_FORM_CONFIG.apiName,
            name: LEAD_FORM_CONFIG.name,
            entityType: LEAD_FORM_CONFIG.entityType,
            formPurpose: TAB_FORM_PURPOSE_MAP.leads,
        });
    } catch {
        return null;
    }
};

/** Published qualification form — matched by formPurpose (apiName may differ on API). */
export const fetchPublishedQualificationFormDefinition = async (token) => {
    try {
        const result = await getRequestWithOutBody(
            buildFormDefinitionQuery('lead', { status: 'published' }),
            token
        );
        const raw = result?.data ?? result;
        const list = Array.isArray(raw) ? raw : Array.isArray(raw?.results) ? raw.results : [];
        return findFormDefinitionForLeadEntity(list, {
            apiName: QUALIFICATION_FORM_CONFIG.apiName,
            name: QUALIFICATION_FORM_CONFIG.name,
            entityType: QUALIFICATION_FORM_CONFIG.entityType,
            formPurpose: TAB_FORM_PURPOSE_MAP.qualification,
        });
    } catch {
        return null;
    }
};

export const fetchProposalFormDefinitionsForBuilder = async (token) => {
    const { name, apiName } = PROPOSAL_FORM_CONFIG;
    const entityType = OPPORTUNITY_PIPELINE_ENTITY_TYPE;
    const pickOpts = { apiName, name, entityType };

    const [allDraft, allPublished] = await Promise.all([
        fetchAllFormDefinitionsByEntity(entityType, token, 'draft'),
        fetchAllFormDefinitionsByEntity(entityType, token, 'published'),
    ]);

    return {
        draft: findFormDefinitionWithCopyFallback(allDraft, pickOpts),
        published: findFormDefinitionWithCopyFallback(allPublished, pickOpts),
    };
};

export const fetchQuotationFormDefinitionsForBuilder = async (token) => {
    const { name, apiName } = QUOTATION_FORM_CONFIG;
    const entityType = OPPORTUNITY_PIPELINE_ENTITY_TYPE;
    const pickOpts = { apiName, name, entityType };

    const [allDraft, allPublished] = await Promise.all([
        fetchAllFormDefinitionsByEntity(entityType, token, 'draft'),
        fetchAllFormDefinitionsByEntity(entityType, token, 'published'),
    ]);

    return {
        draft: findFormDefinitionWithCopyFallback(allDraft, pickOpts),
        published: findFormDefinitionWithCopyFallback(allPublished, pickOpts),
    };
};

export const fetchQualificationFormDefinitionsForBuilder = async (token) =>
    fetchFormDefinitionsForBuilder(QUALIFICATION_FORM_CONFIG.entityType, token, {
        apiName: QUALIFICATION_FORM_CONFIG.apiName,
        matchName: QUALIFICATION_FORM_CONFIG.name,
        entityType: QUALIFICATION_FORM_CONFIG.entityType,
        formPurpose: TAB_FORM_PURPOSE_MAP.qualification,
    });

export const fetchPublishedProposalFormDefinition = async (token) => {
    const { published } = await fetchProposalFormDefinitionsForBuilder(token);
    return published;
};

export const fetchPublishedQuotationFormDefinition = async (token) => {
    const { published } = await fetchQuotationFormDefinitionsForBuilder(token);
    return published;
};

/** @deprecated Prefer fetchPublishedQuotationFormDefinition */
export const fetchQuotationFormDefinition = async (token) =>
    fetchPublishedQuotationFormDefinition(token);

export const fetchQualificationFormDefinition = async (token) =>
    fetchFormDefinitionByEntity(QUALIFICATION_FORM_CONFIG.entityType, token, {
        apiName: QUALIFICATION_FORM_CONFIG.apiName,
    });

export const buildProposalFormDefinitionPayload = (formState) =>
    buildFormDefinitionPayload(formState, PROPOSAL_TAB_KEY);

export const buildQuotationFormDefinitionPayload = (formState) =>
    buildFormDefinitionPayload(formState, QUOTATION_TAB_KEY);

export const buildQualificationFormDefinitionPayload = (formState) =>
    buildFormDefinitionPayload(formState, QUALIFICATION_TAB_KEY);

const saveFixedFormDefinition = async (tabKey, formConfig, formState, token) => {
    const state = applyFixedFormMeta(tabKey, formState);
    const payload = buildFormDefinitionPayload(state, tabKey);
    let definitionId = getFormDefinitionId(state);

    if (!definitionId) {
        const { entityType, apiName, name } = formConfig;

        const [allDraft, allPublished] = await Promise.all([
            fetchAllFormDefinitionsByEntity(entityType, token, 'draft'),
            fetchAllFormDefinitionsByEntity(entityType, token, 'published'),
        ]);

        const existing =
            findFormDefinitionByExactApiName(allDraft, apiName)
            || findFormDefinitionByExactName(allDraft, name, entityType)
            || findFormDefinitionByExactApiName(allPublished, apiName)
            || findFormDefinitionByExactName(allPublished, name, entityType);

        definitionId = getFormDefinitionId(existing);
    }

    return saveFormDefinition(payload, token, definitionId);
};

/**
 * If the tenant already has proposals_form (or a row named "Proposal Form") but the UI has no
 * definitionId, POST would fail with apiName uniqueness — resolve the existing id and PUT instead.
 */
export const saveProposalFormDefinition = async (formState, token) =>
    saveFixedFormDefinition(PROPOSAL_TAB_KEY, PROPOSAL_FORM_CONFIG, formState, token);

export const saveLeadFormDefinition = async (formState, token) =>
    saveFixedFormDefinition('leads', LEAD_FORM_CONFIG, formState, token);

export const saveQuotationFormDefinition = async (formState, token) =>
    saveFixedFormDefinition(QUOTATION_TAB_KEY, QUOTATION_FORM_CONFIG, formState, token);

export const saveQualificationFormDefinition = async (formState, token) =>
    saveFixedFormDefinition(QUALIFICATION_TAB_KEY, QUALIFICATION_FORM_CONFIG, formState, token);

/** Strip repeated backend duplicate suffixes (_copy, _copy_2, …) from a form apiName. */
export const stripDuplicateApiNameSuffix = (apiName = '') => {
    let value = String(apiName || '').trim().toLowerCase();
    if (!value) return 'form';

    let prev;
    do {
        prev = value;
        value = value.replace(/_copy(_\d+)?$/i, '');
    } while (value !== prev && value.length > 0);

    return value || 'form';
};

const FORM_DUPLICATE_API_NAME_MAX_LENGTH = 24;

/** ~6-char suffix — keeps apiName under backend length limits (e.g. opportunity_form_x3k2ab). */
const buildShortUniqueSuffix = () =>
    `${Date.now().toString(36).slice(-3)}${Math.random().toString(36).slice(2, 5)}`;

/** Build a short unique apiName for duplicated drafts. */
export const buildUniqueDuplicateApiName = (sourceApiName, tab = null) => {
    const tabConfig = tab ? FORM_BUILDER_TAB_MAP[tab] : null;
    const base = tabConfig?.apiName || stripDuplicateApiNameSuffix(sourceApiName);
    const suffix = buildShortUniqueSuffix();
    const maxBaseLength = FORM_DUPLICATE_API_NAME_MAX_LENGTH - suffix.length - 1;
    const trimmedBase = base.slice(0, Math.max(maxBaseLength, 4));
    return `${trimmedBase}_${suffix}`;
};

const fetchFormDefinitionById = async (definitionId, token) => {
    try {
        const result = await getRequestWithOutBody(
            `${baseURl}crm-form-definition/${encodeURIComponent(definitionId)}`,
            token
        );
        const raw = result?.data ?? result;
        return raw?.schema ? raw : null;
    } catch {
        return null;
    }
};

const createDuplicateFormDefinition = async (source, apiName, token) =>
    postRequestWithBodyAndToken(`${baseURl}crm-form-definition`, token, {
        name: source.name,
        apiName,
        entityType: source.entityType,
        description: source.description || '',
        schema: source.schema,
    });

export const duplicateFormDefinition = async (definitionId, token, options = {}) => {
    if (!definitionId) throw new Error('Form definition ID is required');

    const apiName = options.apiName
        || buildUniqueDuplicateApiName(options.sourceApiName, options.tab);
    const body = { apiName };

    try {
        return await postRequestWithBodyAndToken(
            `${baseURl}crm-form-definition/${encodeURIComponent(definitionId)}/duplicate`,
            token,
            body
        );
    } catch (error) {
        const source = options.sourcePayload ?? await fetchFormDefinitionById(definitionId, token);
        if (!source?.schema) throw error;

        return createDuplicateFormDefinition(source, apiName, token);
    }
};

export const archiveFormDefinition = async (definitionId, token) => {
    if (!definitionId) throw new Error('Form definition ID is required');

    return deleteRequest(
        `${baseURl}crm-form-definition/${encodeURIComponent(definitionId)}`,
        token
    );
};

export const countFormStats = (formState) => {
    const sectionCount = formState?.sections?.length || 0;
    const fieldCount =
        (formState?.sections || []).reduce((total, section) => total + (section.fields?.length || 0), 0)
        + (formState?.standaloneFields?.length || 0);

    return { sectionCount, fieldCount };
};

export const saveFormDefinition = async (payload, token, definitionId) => {
    if (definitionId) {
        const { apiName: _ignoredApiName, ...updatePayload } = payload;

        return putRequestWithBodyAndToken(
            `${baseURl}crm-form-definition/${definitionId}`,
            token,
            updatePayload
        );
    }

    return postRequestWithBodyAndToken(`${baseURl}crm-form-definition`, token, payload);
};

export const publishFormDefinition = async (definitionId, token) => {
    if (!definitionId) throw new Error('Form definition ID is required');

    return postRequestWithBodyAndToken(
        `${baseURl}crm-form-definition/${encodeURIComponent(definitionId)}/publish`,
        token,
        {}
    );
};

export const handleFieldTypeChange = (field, nextType) => ({
    ...field,
    type: normalizeFieldType(nextType),
    apiName: supportsApiName(nextType) ? slugify(field.label) : '',
    masked: supportsMaskValue(nextType) ? field.masked : false,
    options: supportsSelectOptions(nextType) ? field.options : [],
    required: supportsRequired(nextType) ? field.required : false,
    validation: supportsNumberValidation(nextType) ? field.validation : {},
});

export const createEmptyField = (type = 'text') =>
    normalizeField({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        label: '',
        type,
        required: false,
        masked: false,
        options: [],
        validation: {},
    });
