import {
    getRequestWithOutBody,
    putRequestWithBodyAndToken,
    getPublicRequest,
    postPublicRequest,
    putPublicRequest,
    postPublicFormData,
} from '../../../Api/fetch';
import { baseURl } from '../../../Config/systemConfig';

/**
 * Admin only: current public-application-link status for the logged-in tenant.
 * GET /api/application/public-link
 */
export const getPublicApplicationLinkStatus = (token) => {
    if (!token) throw new Error('token is required');
    return getRequestWithOutBody(`${baseURl}application/public-link`, token);
};

/**
 * Admin only: enable/revoke the public application link.
 * PUT /api/application/public-link
 */
export const setPublicApplicationLinkEnabled = (token, enabled) => {
    if (!token) throw new Error('token is required');
    return putRequestWithBodyAndToken(`${baseURl}application/public-link`, token, { enabled });
};

/**
 * Public, no-auth: tenant branding for the apply page.
 * GET /api/application/public/context
 */
export const getPublicApplicationContext = ({ tenantSlug }) => {
    const params = new URLSearchParams({ tenantSlug });
    return getPublicRequest(`${baseURl}application/public/context?${params.toString()}`);
};

/**
 * Public, no-auth: create/continue a step of the guest application wizard.
 * POST /api/application/public
 */
export const submitPublicApplicationStep = (payload) => {
    return postPublicRequest(`${baseURl}application/public`, payload);
};

/**
 * Public, no-auth: resume helper — current/next step for a stored applicationId.
 * GET /api/application/public/:id/progress
 */
export const getPublicApplicationProgress = ({ applicationId, tenantSlug }) => {
    const params = new URLSearchParams({ tenantSlug });
    return getPublicRequest(`${baseURl}application/public/${applicationId}/progress?${params.toString()}`);
};

/**
 * Public, no-auth: service/category list for Step 1.
 * GET /api/item-category/public
 */
export const getPublicItemCategories = ({ tenantSlug }) => {
    const params = new URLSearchParams({ tenantSlug });
    return getPublicRequest(`${baseURl}item-category/public?${params.toString()}`);
};

/**
 * Public, no-auth: uploads owner ID / bank letter / signature documents for guest
 * applications. Backend requires `tenantSlug` as a form field (not documented in
 * docs/public-merchant-application.txt, confirmed via a 422 "Tenant Slug field is
 * required" response) since there is no auth token to scope the upload to a tenant.
 * POST /api/files/public
 */
export const uploadPublicApplicationFile = (formData, tenantSlug) => {
    if (tenantSlug && !formData.has('tenantSlug')) {
        formData.append('tenantSlug', tenantSlug);
    }
    return postPublicFormData(`${baseURl}files/public`, formData);
};

/**
 * Public, no-auth: preference options for Preferences and Shipment & Pickup.
 * GET /api/application-preferences/public
 */
export const getPublicApplicationPreferences = ({ tenantSlug }) => {
    const params = new URLSearchParams({ tenantSlug });
    return getPublicRequest(`${baseURl}application-preferences/public?${params.toString()}`);
};

/**
 * Public, no-auth: plan options for Select Plan.
 * GET /api/price-plan/public
 */
export const getPublicPricePlans = ({ tenantSlug }) => {
    const params = new URLSearchParams({ tenantSlug });
    return getPublicRequest(`${baseURl}price-plan/public?${params.toString()}`);
};

/**
 * Public, no-auth: hardware/service catalog for Product List.
 * GET /api/item-services/public
 */
export const getPublicItemServices = ({ tenantSlug }) => {
    const params = new URLSearchParams({ tenantSlug });
    return getPublicRequest(`${baseURl}item-services/public?${params.toString()}`);
};

/**
 * Public, no-auth: agreement documents generated for a guest application.
 * GET /api/application/public/:id/agreement-documents
 */
export const getPublicAgreementDocuments = ({ applicationId, tenantSlug, categoryIds }) => {
    const params = new URLSearchParams({ tenantSlug });
    if (categoryIds !== undefined) {
        params.set('categoryIds', categoryIds ?? '');
    }
    return getPublicRequest(`${baseURl}application/public/${applicationId}/agreement-documents?${params.toString()}`);
};

/**
 * Public, no-auth: combined signed-agreement summary once every document is signed.
 * GET /api/application/public/:id/agreement-documents/summary
 */
export const getPublicAgreementSummary = ({ applicationId, tenantSlug, download = false }) => {
    const params = new URLSearchParams({ tenantSlug });
    if (download) {
        params.set('download', 'true');
    }
    return getPublicRequest(`${baseURl}application/public/${applicationId}/agreement-documents/summary?${params.toString()}`);
};

/**
 * Public, no-auth: finalizes the guest's electronic signature on one agreement document.
 * PUT /api/application/public/:id/agreement-documents/:agreementId/sign
 */
export const signPublicAgreementDocument = ({ applicationId, agreementId, tenantSlug, signatureFileUrl }) => {
    const params = new URLSearchParams({ tenantSlug });
    return putPublicRequest(
        `${baseURl}application/public/${applicationId}/agreement-documents/${agreementId}/sign?${params.toString()}`,
        { signatureFileUrl }
    );
};
