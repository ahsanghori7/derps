import { getOverrideTenantId } from "./tenantGroup";

// 🔹 Utility to format contact number
export const formatContactNumber = (value) => {
    if (!value) return "";
  
    // Remove non-numeric characters
    value = value.replace(/\D/g, "");
  
    // Limit to 10 digits
    if (value.length > 10) {
      value = value.substring(0, 10);
    }
  
    // Apply formatting
    if (value.length > 6) {
      return `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
    } else if (value.length > 3) {
      return `(${value.substring(0, 3)}) ${value.substring(3)}`;
    } else if (value.length > 0) {
      return `(${value}`;
    }
  
    return value;
  };

  export const taxFormats = {
          SSN: {
              regex: /\D/g, // remove non-digits
              maxLength: 9,
              format: (val) => {
                  // Format: XXX-XX-XXXX
                  if (val.length > 3 && val.length <= 5) {
                      return val.slice(0, 3) + "-" + val.slice(3);
                  } else if (val.length > 5) {
                      return val.slice(0, 3) + "-" + val.slice(3, 5) + "-" + val.slice(5);
                  }
                  return val;
              }
          },
          EIN: {
              regex: /\D/g,
              maxLength: 9,
              format: (val) => {
                  // Format: XX-XXXXXXX
                  if (val.length > 2) {
                      return val.slice(0, 2) + "-" + val.slice(2);
                  }
                  return val;
              }
          },
          ITIN: {
              regex: /\D/g,
              maxLength: 9,
              format: (val) => {
                  // Format: XXX-XX-XXXX (same as SSN, but different use case)
                  if (val.length > 3 && val.length <= 5) {
                      return val.slice(0, 3) + "-" + val.slice(3);
                  } else if (val.length > 5) {
                      return val.slice(0, 3) + "-" + val.slice(3, 5) + "-" + val.slice(5);
                  }
                  return val;
              }
          }
      };

/**
 * tenantId from Login `mergedUserDetails` (stored in localStorage `userDetails`,
 * re-hydrated into Redux by Sidebar / UserSidebar on app load).
 */
export const resolveHomeTenantId = (userDetails) => {
  const id =
    userDetails?.tenantId ??
    userDetails?.tenantID ??
    userDetails?.tenant_id ??
    userDetails?.tenant?.id ??
    userDetails?.tenant?.tenantId ??
    userDetails?.tenant?.tenantID;
  return id != null && String(id).trim() !== "" ? String(id) : "";
};

export const resolveTenantId = (userDetails) => {
  const override = getOverrideTenantId();
  if (override) return override;
  return resolveHomeTenantId(userDetails);
};

export const getTenantIdFromSession = (userDetailsFromRedux) => {
  const override = getOverrideTenantId();
  if (override) return override;
  const fromRedux = resolveHomeTenantId(userDetailsFromRedux);
  if (fromRedux) return fromRedux;
  try {
    return resolveHomeTenantId(JSON.parse(localStorage.getItem("userDetails") || "{}"));
  } catch (_) {
    return "";
  }
};

/** Default Dolphin Merchants support / invoice phone (with extension). */
export const DEFAULT_TENANT_PHONE = "888-696-1049 Ext. 101";

export const isDolphinMerchantsTenant = (tenantOrName) => {
  const name =
    typeof tenantOrName === "string"
      ? tenantOrName
      : tenantOrName?.name ?? tenantOrName?.tenant?.name;
  const normalized = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return (
    normalized === "dolphin merchants" ||
    normalized === "dolphin merchant services" ||
    normalized === "dolphin merchant system"
  );
};

/**
 * Phone for invoices / email signatures from `userData.tenant.phone`.
 * Dolphin Merchants tenants keep the historical display number.
 */
export const getTenantPhone = (userDetailsOrTenant, options = {}) => {
  const { withDirectPrefix = false, digitsOnly = false } = options;
  const tenant =
    userDetailsOrTenant?.tenant ??
    (userDetailsOrTenant?.phone != null || userDetailsOrTenant?.name != null
      ? userDetailsOrTenant
      : null);

  let phone = isDolphinMerchantsTenant(tenant)
    ? DEFAULT_TENANT_PHONE
    : String(tenant?.phone || "").trim() || DEFAULT_TENANT_PHONE;

  if (digitsOnly) {
    phone = phone.replace(/\D/g, "");
  }

  if (withDirectPrefix && !digitsOnly) {
    return /^direct:\s*/i.test(phone) ? phone : `Direct: ${phone}`;
  }

  return phone;
};

/** Default Dolphin Merchants support email. */
export const DEFAULT_TENANT_EMAIL = "support@godms.com";

/**
 * Email for invoices / headers from `userData.tenant.email`.
 * Dolphin Merchants tenants keep the historical support address.
 */
export const getTenantEmail = (userDetailsOrTenant) => {
  const tenant =
    userDetailsOrTenant?.tenant ??
    (userDetailsOrTenant?.email != null || userDetailsOrTenant?.name != null
      ? userDetailsOrTenant
      : null);

  if (isDolphinMerchantsTenant(tenant)) {
    return DEFAULT_TENANT_EMAIL;
  }

  return String(tenant?.email || "").trim() || DEFAULT_TENANT_EMAIL;
};

/** Default Dolphin Merchants website. */
export const DEFAULT_TENANT_WEBSITE = "www.godms.com";

/**
 * Website for invoices / signatures from `userData.tenant.website`.
 * Dolphin Merchants tenants keep the historical site.
 * Returns "" when empty so callers can hide the field.
 */
export const getTenantWebsite = (userDetailsOrTenant) => {
  const tenant =
    userDetailsOrTenant?.tenant ??
    (userDetailsOrTenant?.website != null || userDetailsOrTenant?.name != null
      ? userDetailsOrTenant
      : null);

  if (isDolphinMerchantsTenant(tenant)) {
    return DEFAULT_TENANT_WEBSITE;
  }

  return String(tenant?.website || "").trim();
};

/** Default Dolphin Merchants street address (display string). */
export const DEFAULT_TENANT_ADDRESS = "850 Lee Street, Elk Grove Village, IL 60007";

/**
 * Format tenant.address object as "street, city, state, zip".
 * Accepts an address object or full userDetails with tenant.address.
 */
export const formatTenantAddress = (address) => {
  if (!address || typeof address !== "object") return "";
  const parts = [address.street, address.city, address.state, address.zip]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  return parts.join(", ");
};

/**
 * Address for invoices / signatures from `userData.tenant.address`.
 * Dolphin Merchants tenants keep the historical address.
 */
export const getTenantAddress = (userDetailsOrTenant) => {
  const tenant =
    userDetailsOrTenant?.tenant ??
    (userDetailsOrTenant?.address != null || userDetailsOrTenant?.name != null
      ? userDetailsOrTenant
      : null);

  if (isDolphinMerchantsTenant(tenant)) {
    return DEFAULT_TENANT_ADDRESS;
  }

  return formatTenantAddress(tenant?.address) || DEFAULT_TENANT_ADDRESS;
};

/** Structured Dolphin Merchants ship-from defaults (FedEx party shape). */
export const DEFAULT_SHIPPER_ADDRESS = {
  street: "850 Lee Street",
  city: "Elk Grove Village",
  state: "IL",
  postalCode: "60007",
  countryCode: "US",
  residential: false,
};

export const DEFAULT_SHIPPER_NAME = "Dolphin Merchant Services";

/** Digits-only phone for shipping APIs (drops Ext. and caps at 10). */
export const toShippingPhoneDigits = (phone) => {
  const withoutExt = String(phone || "").split(/ext\.?/i)[0];
  return withoutExt.replace(/\D/g, "").slice(0, 10);
};

/**
 * Ship-from contact + address from `userData.tenant`, same source as invoices.
 * Dolphin Merchants tenants keep the historical ship-from party.
 */
export const getDefaultShipperFromTenant = (userDetailsOrTenant) => {
  const tenant =
    userDetailsOrTenant?.tenant ??
    (userDetailsOrTenant?.name != null ||
    userDetailsOrTenant?.phone != null ||
    userDetailsOrTenant?.address != null
      ? userDetailsOrTenant
      : null);

  const isDolphin = isDolphinMerchantsTenant(tenant);
  const name = isDolphin
    ? DEFAULT_SHIPPER_NAME
    : String(tenant?.name || "").trim() || DEFAULT_SHIPPER_NAME;

  const rawAddress = tenant?.address;
  const street = String(rawAddress?.street || "").trim();
  const city = String(rawAddress?.city || "").trim();
  const state = String(rawAddress?.state || "").trim();
  const postalCode = String(
    rawAddress?.zip || rawAddress?.postalCode || ""
  ).trim();
  const hasCompleteAddress = Boolean(street && city && state && postalCode);

  const address =
    isDolphin || !hasCompleteAddress
      ? { ...DEFAULT_SHIPPER_ADDRESS }
      : {
          street,
          city,
          state,
          postalCode,
          countryCode: "US",
          residential: false,
        };

  const phoneDigits =
    toShippingPhoneDigits(getTenantPhone(userDetailsOrTenant)) ||
    toShippingPhoneDigits(DEFAULT_TENANT_PHONE);

  return {
    contact: {
      personName: name,
      company: name,
      phoneNumber: phoneDigits,
      email: getTenantEmail(userDetailsOrTenant),
    },
    address,
  };
};

/**
 * Ship-from party from GET /api/fedex/connection `shipper` (tenant sender* defaults).
 * Returns null when the connection has no usable shipper identity.
 */
export const getDefaultShipperFromFedexConnection = (connection) => {
  const shipper = connection?.shipper;
  if (!shipper) return null;

  const name = String(shipper.name || "").trim();
  const street = String(shipper.address1 || "").trim();
  const city = String(shipper.city || "").trim();
  const state = String(shipper.state || "").trim();
  const postalCode = String(shipper.zip || "").trim();
  const hasCompleteAddress = Boolean(street && city && state && postalCode);
  if (!name && !hasCompleteAddress) return null;

  return {
    contact: {
      personName: name || DEFAULT_SHIPPER_NAME,
      company: name || DEFAULT_SHIPPER_NAME,
      phoneNumber: toShippingPhoneDigits(shipper.phone),
      email: "",
    },
    address: hasCompleteAddress
      ? {
          street,
          city,
          state,
          postalCode,
          countryCode: "US",
          residential: false,
        }
      : { ...DEFAULT_SHIPPER_ADDRESS },
  };
};
