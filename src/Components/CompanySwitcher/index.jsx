import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckIcon from '@mui/icons-material/Check';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { toast } from 'react-toastify';
import { getRequestWithOutBody, invalidateGetCache } from '../../Api/fetch';
import { baseURl } from '../../Config/systemConfig';
import { applyAuthMeSession } from '../../Utils/applyAuthMeSession';
import { setTenantGroup } from '../../Store/Reducers/authSlice';
import {
    getActiveCompany,
    getTenantSwitchErrorMessage,
    normalizeTenantId,
    readStoredTenantGroup,
    returnToHomeTenant,
    writeActiveTenantId,
    syncStoredGroupActiveTenant,
} from '../../Utils/tenantGroup';

const CompanySwitcher = () => {
    const dispatch = useDispatch();
    const accessToken = useSelector((state) => state?.auth?.accessToken);
    const tenantGroup = useSelector((state) => state?.auth?.tenantGroup);
    const [anchorEl, setAnchorEl] = useState(null);
    const [switchingId, setSwitchingId] = useState(null);

    const companies = useMemo(
        () => (Array.isArray(tenantGroup?.companies) ? tenantGroup.companies : []),
        [tenantGroup],
    );
    const canSwitch = Boolean(tenantGroup?.canSwitch) && companies.length > 1;
    const activeCompany = getActiveCompany(tenantGroup);
    const activeTenantId = normalizeTenantId(tenantGroup?.activeTenantId);
    const homeTenantId = normalizeTenantId(tenantGroup?.homeTenantId);
    const label = activeCompany?.name || 'Company';
    const isSwitched = Boolean(activeTenantId && homeTenantId && activeTenantId !== homeTenantId);

    if (!canSwitch) return null;

    const open = Boolean(anchorEl);

    const handleSelect = async (company) => {
        const nextId = normalizeTenantId(company?.id);
        if (!nextId || !accessToken || nextId === activeTenantId || switchingId) {
            setAnchorEl(null);
            return;
        }

        const previousId = readPreviousOverride(homeTenantId, activeTenantId);
        setSwitchingId(nextId);
        setAnchorEl(null);

        if (nextId === homeTenantId) {
            returnToHomeTenant();
        } else {
            writeActiveTenantId(nextId);
            syncStoredGroupActiveTenant(nextId);
        }
        dispatch(setTenantGroup(readStoredTenantGroup()));

        try {
            invalidateGetCache();
            const result = await getRequestWithOutBody(`${baseURl}auth/me`, accessToken);
            applyAuthMeSession(dispatch, result);
            window.location.reload();
        } catch (error) {
            if (previousId) {
                writeActiveTenantId(previousId);
                syncStoredGroupActiveTenant(previousId);
            } else {
                returnToHomeTenant();
            }
            setSwitchingId(null);
            toast.error(getTenantSwitchErrorMessage(error));
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={(event) => setAnchorEl(event.currentTarget)}
                disabled={Boolean(switchingId)}
                title={isSwitched ? `Working in ${label}` : 'Switch company'}
                className="inline-flex items-center min-w-0 max-w-[88px] sm:max-w-[140px] xl:max-w-[200px]"
                style={{
                    height: 36,
                    gap: 4,
                    padding: '0 8px',
                    borderRadius: 8,
                    border: '1px solid rgba(0,0,0,0.12)',
                    backgroundColor: isSwitched ? 'rgba(12, 121, 247, 0.08)' : 'var(--dashboard-tab-box)',
                    color: 'var(--navbar-text)',
                    cursor: switchingId ? 'wait' : 'pointer',
                    flexShrink: 1,
                }}
            >
                <span
                    style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: 13,
                        fontWeight: 600,
                        textAlign: 'left',
                        minWidth: 0,
                        flex: 1,
                    }}
                >
                    {switchingId ? 'Switching…' : label}
                </span>
                <KeyboardArrowDownIcon sx={{ fontSize: 18, flexShrink: 0, opacity: 0.8 }} />
            </button>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                sx={{ zIndex: 1000000 }}
                PaperProps={{
                    sx: {
                        mt: 1,
                        minWidth: 220,
                        maxWidth: 320,
                        maxHeight: 320,
                        backgroundColor: 'var(--dashboard-tab-box)',
                        color: 'var(--dashboard-text-primary)',
                    },
                }}
            >
                {companies.map((company) => {
                    const companyId = normalizeTenantId(company.id);
                    const selected = companyId === activeTenantId;
                    const isHome = companyId === homeTenantId;
                    const disabled = company.isActive === false && !selected;

                    return (
                        <MenuItem
                            key={company.id}
                            disabled={disabled}
                            selected={selected}
                            onClick={() => handleSelect(company)}
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 1,
                                opacity: disabled ? 0.5 : 1,
                            }}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {company.name || `Company #${company.id}`}
                                {isHome ? ' (Home)' : ''}
                                {disabled ? ' (Blocked)' : ''}
                            </span>
                            {selected ? <CheckIcon sx={{ fontSize: 16, color: '#0C79F7' }} /> : null}
                        </MenuItem>
                    );
                })}
            </Menu>
        </>
    );
};

const readPreviousOverride = (homeTenantId, activeTenantId) => {
    if (!shouldKeepPrevious(homeTenantId, activeTenantId)) return null;
    return activeTenantId;
};

const shouldKeepPrevious = (homeTenantId, activeTenantId) =>
    Boolean(activeTenantId && homeTenantId && activeTenantId !== homeTenantId);

export default CompanySwitcher;
