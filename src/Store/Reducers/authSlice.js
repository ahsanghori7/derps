// authSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { EMPTY_TENANT_GROUP, normalizeTenantGroup, TENANT_GROUP_STORAGE_KEY, writeStoredTenantGroup } from "../../Utils/tenantGroup";

const safeParse = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const storedToken = localStorage.getItem("accessToken");
const tenantLogo = localStorage.getItem("tenantLogo");
const authSlice = createSlice({
  name: "auth",
  initialState: {
    accessToken: storedToken || null,
    tenantLogo: tenantLogo || null,
    scopes: safeParse("scopes", []),
    moduleCodes: safeParse("moduleCodes", []),
    categories: safeParse("categories", []),
    tenantFeatures: safeParse("tenantFeatures", []),
    auditLogModules: safeParse("auditLogModules", []),
    tenantGroup: normalizeTenantGroup(safeParse(TENANT_GROUP_STORAGE_KEY, EMPTY_TENANT_GROUP)),
  },
  reducers: {
    setAccessToken: (state, action) => {
      state.accessToken = action.payload;
      localStorage.setItem("accessToken", action.payload);
    },
    clearAccessToken: (state) => {
      state.accessToken = null;
      localStorage.removeItem("accessToken");
    },
    setScopes: (state, action) => {
      state.scopes = action.payload;
    },
    setTenantLogo: (state, action) => {
      state.tenantLogo = action.payload;
    },
    setCategories: (state, action) => {
      state.categories = action.payload;
      localStorage.setItem("categories", JSON.stringify(action.payload));
    },
    setModuleCodes: (state, action) => {
      state.moduleCodes = action.payload;
      localStorage.setItem("moduleCodes", JSON.stringify(action.payload));
    },
    setTenantFeatures: (state, action) => {
      state.tenantFeatures = Array.isArray(action.payload) ? action.payload : [];
      localStorage.setItem("tenantFeatures", JSON.stringify(state.tenantFeatures));
    },
    setAuditLogModules: (state, action) => {
      state.auditLogModules = Array.isArray(action.payload) ? action.payload : [];
      localStorage.setItem("auditLogModules", JSON.stringify(state.auditLogModules));
    },
    setTenantGroup: (state, action) => {
      state.tenantGroup = normalizeTenantGroup(action.payload);
      writeStoredTenantGroup(state.tenantGroup);
    },
    clearTenantGroup: (state) => {
      state.tenantGroup = { ...EMPTY_TENANT_GROUP };
      writeStoredTenantGroup(state.tenantGroup);
    },
  },
});

export const {
  setAccessToken,
  clearAccessToken,
  setScopes,
  setTenantLogo,
  setCategories,
  setModuleCodes,
  setTenantFeatures,
  setAuditLogModules,
  setTenantGroup,
  clearTenantGroup,
} = authSlice.actions;
export default authSlice.reducer;
