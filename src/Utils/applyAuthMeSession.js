import {
    setCategories,
    setModuleCodes,
    setScopes,
    setTenantFeatures,
    setTenantGroup,
} from '../Store/Reducers/authSlice';
import { getRequestWithOutBody, invalidateGetCache } from '../Api/fetch';
import { baseURl } from '../Config/systemConfig';
import {
    applyChosenTenantToGroup,
    clearActiveTenantId,
    isSwitchedTenantBlockedError,
    isTenantSwitchDeniedError,
    readActiveTenantId,
    writeStoredTenantGroup,
} from './tenantGroup';

const toArray = (value) => (Array.isArray(value) ? value : []);

export const applyAuthMeSession = (dispatch, mePayload) => {
    const meData = mePayload?.data ?? mePayload ?? {};

    const finalScopes =
        meData?.user?.permissions?.length > 0
            ? meData.user.permissions
            : (meData?.scopes ?? meData?.permissions ?? []);

    if (Array.isArray(finalScopes)) {
        localStorage.setItem('scopes', JSON.stringify(finalScopes));
        dispatch(setScopes(finalScopes));
    }

    if (Array.isArray(meData?.categories)) {
        localStorage.setItem('categories', JSON.stringify(meData.categories));
        dispatch(setCategories(meData.categories));
    }

    if (Array.isArray(meData?.moduleCodes)) {
        dispatch(setModuleCodes(meData.moduleCodes));
    }

    const nextTenantFeatures = toArray(meData?.tenantFeatures);
    dispatch(setTenantFeatures(nextTenantFeatures));

    const group = applyChosenTenantToGroup(meData?.group);
    writeStoredTenantGroup(group);
    dispatch(setTenantGroup(group));
    invalidateGetCache();

    return { meData, group };
};

export const fetchAndApplyAuthMe = async (dispatch, token) => {
    if (!token || !dispatch) return null;

    const hadOverride = Boolean(readActiveTenantId());

    try {
        const result = await getRequestWithOutBody(`${baseURl}auth/me`, token);
        return applyAuthMeSession(dispatch, result);
    } catch (error) {
        const shouldRetryHome =
            hadOverride &&
            (isTenantSwitchDeniedError(error) || isSwitchedTenantBlockedError(error));

        if (!shouldRetryHome) throw error;

        clearActiveTenantId();
        const result = await getRequestWithOutBody(`${baseURl}auth/me`, token);
        return applyAuthMeSession(dispatch, result);
    }
};
