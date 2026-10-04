import { getRequestWithOutBody } from '../Api/fetch';
import { baseURl } from '../Config/systemConfig';

// Canonical `currentStep` values (1–6): Services → Plan → Information → Hardware → Shipment → Submit.
export const APPLICATION_STEPS = {
    SERVICES: 1,
    PLAN: 2,
    INFORMATION: 3,
    HARDWARE: 4,
    SHIPMENT: 5,
    SUBMIT: 6,
};

const MAX_WIZARD_STEP = APPLICATION_STEPS.SUBMIT;

const WIZARD_ROUTES_BY_STEP = {
    [APPLICATION_STEPS.SERVICES]: 'userActivations',
    [APPLICATION_STEPS.PLAN]: 'selectPlan',
    [APPLICATION_STEPS.INFORMATION]: 'applicationInformation',
    [APPLICATION_STEPS.HARDWARE]: 'productList',
    [APPLICATION_STEPS.SHIPMENT]: 'shipmentAndPickup',
    [APPLICATION_STEPS.SUBMIT]: 'submitApplication',
};

// Old 9-step drafts may still carry 7–9; the API treats them as aliases.
const LEGACY_STEP_ALIASES = {
    7: APPLICATION_STEPS.INFORMATION,
    8: APPLICATION_STEPS.SHIPMENT,
    9: APPLICATION_STEPS.SUBMIT,
};

// Old per-screen routes now render the merged Information step.
const LEGACY_INFORMATION_ROUTES = [
    'businessInformation',
    'ownershipInformation',
    'financialInformation',
    'preferences',
];

const STEP_BY_ROUTE = {
    ...Object.fromEntries(
        Object.entries(WIZARD_ROUTES_BY_STEP).map(([step, route]) => [route, Number(step)])
    ),
    ...Object.fromEntries(
        LEGACY_INFORMATION_ROUTES.map((route) => [route, APPLICATION_STEPS.INFORMATION])
    ),
};

const getBasePath = (isAgent, tenantSlug) =>
    tenantSlug ? `/apply/${tenantSlug}` : (isAgent ? '/userdashboard' : '/home');

export const isAgentRole = (roleTitle) =>
    String(roleTitle || '').toLowerCase() === 'agent';

export const isGuestSession = (location) =>
    Boolean(location?.state?.tenantSlug);

export const isApplicationDraft = (application) =>
    String(application?.status || '').toLowerCase() === 'draft';

export const getApplicationWizardRoute = (currentStep) => {
    const step = Math.round(Number(currentStep));
    const aliased = LEGACY_STEP_ALIASES[step] ?? step;
    const normalized = Number.isFinite(aliased) && aliased >= 1
        ? Math.min(MAX_WIZARD_STEP, aliased)
        : 1;
    return WIZARD_ROUTES_BY_STEP[normalized] || 'userActivations';
};

export const getWizardPath = (step, isAgent, tenantSlug) =>
    `${getBasePath(isAgent, tenantSlug)}/${getApplicationWizardRoute(step)}`;

export const goToWizardStep = (navigate, { step, roleTitle, state, tenantSlug } = {}) => {
    navigate(getWizardPath(step, isAgentRole(roleTitle), tenantSlug), { state: state || {} });
};

export const goToPreviousWizardStep = (navigate, { pathname, roleTitle, state, tenantSlug } = {}) => {
    const route = String(pathname || '')
        .split('/')
        .filter(Boolean)
        .pop();
    const currentStep = STEP_BY_ROUTE[route] || 2;
    goToWizardStep(navigate, {
        step: Math.max(1, currentStep - 1),
        roleTitle,
        state,
        tenantSlug: tenantSlug || state?.tenantSlug,
    });
};

export const buildApplicationWizardState = (row) => {
    const applicationId = row?.id || row?.applicationId || null;
    const solutions = Array.isArray(row?.solutions)
        ? row.solutions.filter(Boolean)
        : row?.solution
            ? [row.solution]
            : [];
    const solution = solutions[0] || null;
    const categoryId = row?.categoryId || row?.itemCategoryId || null;

    return {
        itemData: row,
        applicationId,
        applicationIds: applicationId ? [applicationId] : [],
        applications: applicationId
            ? [{
                applicationId,
                solution,
                categoryId,
            }]
            : [],
        firstStep: {
            solutions,
            categoryIds: categoryId ? [categoryId] : [],
            categoryIdBySolution: solution && categoryId
                ? { [solution]: categoryId }
                : {},
        },
    };
};

export const buildApplicationOpenNavigation = (
    row,
    { isAgent = false, returnTo } = {}
) => {
    const prefix = getBasePath(isAgent);
    const fallbackReturnTo = isAgent
        ? `${prefix}/userApplicationList`
        : `${prefix}/adminApplication`;

    if (!isApplicationDraft(row)) {
        return {
            path: `${prefix}/editApplication`,
            state: {
                itemData: row,
                returnTo: returnTo || fallbackReturnTo,
            },
        };
    }

    return {
        path: `${prefix}/${getApplicationWizardRoute(row?.currentStep)}`,
        state: buildApplicationWizardState(row),
    };
};

export const openApplicationFromList = async (
    navigate,
    row,
    { isAgent = false, returnTo, event, accessToken } = {}
) => {
    let application = row;
    const applicationId = row?.id || row?.applicationId;

    if (isApplicationDraft(row) && applicationId && accessToken) {
        try {
            const result = await getRequestWithOutBody(
                `${baseURl}application/${applicationId}`,
                accessToken
            );
            if (result?.data) {
                application = { ...row, ...result.data };
            }
        } catch {
            // keep the list row if the latest fetch fails
        }
    }

    const nav = buildApplicationOpenNavigation(application, { isAgent, returnTo });
    const wantsNewTab = Boolean(event && (event.metaKey || event.ctrlKey));

    if (wantsNewTab && !isApplicationDraft(application)) {
        try {
            sessionStorage.setItem('newTabApplicationData', JSON.stringify(application));
        } catch {
            // ignore quota / private mode
        }
        window.open(nav.path, '_blank');
        return;
    }

    navigate(nav.path, { state: nav.state });
};
