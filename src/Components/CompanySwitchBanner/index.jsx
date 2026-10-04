import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { getRequestWithOutBody, invalidateGetCache } from '../../Api/fetch';
import { baseURl } from '../../Config/systemConfig';
import { applyAuthMeSession } from '../../Utils/applyAuthMeSession';
import { setTenantGroup } from '../../Store/Reducers/authSlice';
import {
    getActiveCompany,
    getHomeCompany,
    getTenantSwitchErrorMessage,
    isCompanySwitched,
    normalizeTenantId,
    readStoredTenantGroup,
    returnToHomeTenant,
} from '../../Utils/tenantGroup';

const BANNER_OFFSET_VAR = '--company-switch-banner-offset';

const companyLabel = (company) => {
    const name = String(company?.name || '').trim();
    if (name) return name;
    const slug = String(company?.slug || '').trim();
    return slug;
};

const CompanySwitchBanner = () => {
    const dispatch = useDispatch();
    const accessToken = useSelector((state) => state?.auth?.accessToken);
    const tenantGroup = useSelector((state) => state?.auth?.tenantGroup);
    const userData = useSelector((state) => state?.userData?.userDetails);
    const [returning, setReturning] = useState(false);
    const bannerRef = useRef(null);

    const isSwitched = isCompanySwitched(tenantGroup);
    const activeCompany = getActiveCompany(tenantGroup);
    const homeCompany = getHomeCompany(tenantGroup);
    const homeTenantId = normalizeTenantId(tenantGroup?.homeTenantId);
    const userTenantId = normalizeTenantId(
        userData?.tenantId ?? userData?.tenant?.id ?? userData?.tenant?.tenantId,
    );
    const loggedInTenantName = String(userData?.tenant?.name || '').trim();
    const activeName = companyLabel(activeCompany) || 'this company';
    const homeName = companyLabel(homeCompany)
        || (userTenantId && userTenantId === homeTenantId ? loggedInTenantName : '')
        || 'your home company';

    useEffect(() => {
        const root = document.documentElement;
        if (!isSwitched) {
            root.style.removeProperty(BANNER_OFFSET_VAR);
            return undefined;
        }

        const banner = bannerRef.current;
        const applyOffset = () => {
            const height = banner?.offsetHeight || 0;
            root.style.setProperty(BANNER_OFFSET_VAR, `${height}px`);
        };

        applyOffset();
        if (!banner || typeof ResizeObserver === 'undefined') {
            return () => root.style.removeProperty(BANNER_OFFSET_VAR);
        }

        const observer = new ResizeObserver(applyOffset);
        observer.observe(banner);
        return () => {
            observer.disconnect();
            root.style.removeProperty(BANNER_OFFSET_VAR);
        };
    }, [isSwitched, activeName, homeName]);

    if (!isSwitched) return null;

    const handleSwitchBack = async () => {
        if (returning || !accessToken) return;
        setReturning(true);
        returnToHomeTenant();
        dispatch(setTenantGroup(readStoredTenantGroup()));
        try {
            invalidateGetCache();
            const result = await getRequestWithOutBody(`${baseURl}auth/me`, accessToken);
            applyAuthMeSession(dispatch, result);
            window.location.reload();
        } catch (error) {
            setReturning(false);
            toast.error(getTenantSwitchErrorMessage(error));
        }
    };

    return (
        <div
            ref={bannerRef}
            role="status"
            aria-live="polite"
            className="company-switch-banner"
        >
            <p className="company-switch-banner__message">
                <AlertTriangle
                    className="company-switch-banner__icon"
                    size={16}
                    strokeWidth={2.25}
                    aria-hidden="true"
                />
                <span className="company-switch-banner__copy">
                    <span className="company-switch-banner__label">Switched company: </span>
                    You are viewing <span className="company-switch-banner__name">{activeName}</span>.
                    {' '}Data on this screen belongs to this company, not {homeName}.
                </span>
            </p>
            <button
                type="button"
                className="company-switch-banner__action"
                onClick={handleSwitchBack}
                disabled={returning}
            >
                {returning ? 'Switching…' : 'Switch back'}
            </button>
        </div>
    );
};

export default CompanySwitchBanner;
