import * as React from 'react';
import { styled, alpha } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';

const StyledMenu = styled((props) => (
    <Menu
        elevation={0}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableAutoFocus
        disableAutoFocusItem
        disableEnforceFocus
        disableRestoreFocus
        {...props}
    />
))(({ theme }) => ({
    '& .MuiPaper-root': {
        borderRadius: 8,
        maxHeight: '250px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--dashboard-tab-box)',
        color: 'var(--dashboard-text-primary)',
        boxShadow:
            'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
        '& .MuiMenu-list': {
            padding: 0,
            overflowY: 'auto',
            flex: 1,
            minHeight: 0,
        },
        '& .MuiMenuItem-root': {
            '&:active': {
                backgroundColor: alpha(
                    theme.palette.primary.main,
                    theme.palette.action.selectedOpacity,
                ),
            },
        },
    },
}));

const SearchTextField = styled(TextField)(() => ({
    '& .MuiOutlinedInput-root': {
        backgroundColor: 'var(--dashboard-tab-box)',
        color: 'var(--dashboard-text-primary)',
        fontSize: 12,
        padding: '4px 8px',
        '& fieldset': {
            borderColor: 'var(--sidebar-selected-bg)',
        },
        '&:hover fieldset': {
            borderColor: 'var(--sidebar-selected-bg)',
        },
        '&.Mui-focused fieldset': {
            borderColor: 'var(--sidebar-selected-bg)',
        },
    },
    '& .MuiInputAdornment-root .MuiSvgIcon-root': {
        fontSize: 16,
        color: 'var(--dashboard-text-primary)',
    },
}));

const CustomButton = styled(Button, {
    shouldForwardProp: (prop) => !['error', 'formField', 'fullWidth', 'addAgent'].includes(prop),
})(({ error, formField, fullWidth, addAgent }) => ({
    width: fullWidth ? '100%' : undefined,
    minHeight: addAgent ? 28 : (formField ? 46 : 36),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    textAlign: 'left',
    padding: formField ? '12px' : '0 10px',
    textTransform: 'none',
    borderRadius: formField ? 8 : 4,
    color: 'var(--dashboard-text-primary)',
    backgroundColor: 'var(--dashboard-tab-box)',
    border: error ? '1px solid #ef4444' : '1px solid #D1D5DC',
    boxShadow: 'none',
    fontSize: formField ? 14 : 12,
    fontWeight: 400,
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    '&:hover': {
        backgroundColor: 'var(--dashboard-tab-box)',
        borderColor: error ? '#ef4444' : '#0C79F7',
        boxShadow: 'none',
    },
    '& .MuiButton-endIcon': {
        marginLeft: 'auto',
        marginRight: 0,
        color: 'var(--dashboard-text-primary)',
    },
    '& .MuiButton-endIcon > *:nth-of-type(1)': {
        fontSize: formField ? 20 : 18,
    },
    '&.MuiButton-contained': {
        boxShadow: 'none',
    },
}));

export default function MultiSelectDropdown({
    icon,
    menuItems,
    onChange,
    selectedValue,
    meetingLink,
    eventScreen = false,
    fullWidth = false,
    defaultText = 'Select Items',
    error = false,
    formField = false,
    addAgent = false,
    singleSelect = false,
}) {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [selectedItems, setSelectedItems] = React.useState([]);
    const [searchText, setSearchText] = React.useState('');

    const open = Boolean(anchorEl);
    const inputRef = React.useRef();

    React.useEffect(() => {
        if (open && inputRef.current) {
            inputRef.current.focus();
        }
    }, [open]);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    React.useEffect(() => {
        if (Array.isArray(selectedValue)) {
            setSelectedItems(selectedValue);
        }
    }, [selectedValue]);

    const handleClose = () => {
        setAnchorEl(null);
    };

    const getEffectiveId = (item) => item.user?.id ?? item.id;

    const handleToggle = (item) => {
        if (singleSelect) {
            const itemId = getEffectiveId(item);
            const isAlreadySelected = selectedItems.some(i => getEffectiveId(i) === itemId);
            const newSelectedItems = isAlreadySelected ? [] : [item];
            setSelectedItems(newSelectedItems);
            if (onChange) onChange(newSelectedItems);
            handleClose();
            return;
        }

        const itemId = getEffectiveId(item);

        const isOldItem = selectedItems.find(i => getEffectiveId(i) === itemId);

        let newSelectedItems;

        if (isOldItem) {
            if (isOldItem.user) {
                // Toggle isDeleted
                newSelectedItems = selectedItems.map(i => {
                    if (getEffectiveId(i) === itemId) {
                        const currentlyDeleted = i.user.isDeleted === true;
                        return {
                            ...i,
                            user: {
                                ...i.user,
                                isDeleted: !currentlyDeleted,
                            },
                        };
                    }
                    return i;
                });
            } else {
                // Remove if already selected
                newSelectedItems = selectedItems.filter(i => getEffectiveId(i) !== itemId);
            }
        } else {
            // Add new item
            newSelectedItems = [...selectedItems, item];
        }

        setSelectedItems(newSelectedItems);
        if (onChange) onChange(newSelectedItems);
    };

    const handleSelectAll = () => {
        const newSelectedItems = [...selectedItems];

        filteredMenuItems.forEach((item) => {
            const itemId = getEffectiveId(item);
            const existingIndex = newSelectedItems.findIndex(i => getEffectiveId(i) === itemId);

            if (existingIndex === -1) {
                newSelectedItems.push(item);
            } else if (newSelectedItems[existingIndex].user?.isDeleted) {
                newSelectedItems[existingIndex] = {
                    ...newSelectedItems[existingIndex],
                    user: {
                        ...newSelectedItems[existingIndex].user,
                        isDeleted: false,
                    },
                };
            }
        });

        setSelectedItems(newSelectedItems);
        if (onChange) onChange(newSelectedItems);
    };

    const handleClearAll = () => {
        const newSelectedItems = selectedItems
            .map((i) => {
                const isFiltered = filteredMenuItems.some(item => getEffectiveId(item) === getEffectiveId(i));
                if (!isFiltered) return i;
                if (i.user) {
                    return { ...i, user: { ...i.user, isDeleted: true } };
                }
                return null;
            })
            .filter(Boolean);

        setSelectedItems(newSelectedItems);
        if (onChange) onChange(newSelectedItems);
    };

    const renderItemLabel = (item) => {
        if (item?.user?.name) return item.user.name; // when user object exists
        if (item?.name) return item.name;
        return item.text || item.title || item.name || item.year || item.month || item.value || '';
    };

    const getButtonText = () => {
        const activeItems = selectedItems.filter(
            item => !(item.user?.isDeleted === true)
        );

        if (activeItems.length === 0) return defaultText;
        if (activeItems.length === 1) return renderItemLabel(activeItems[0]);
        return `${renderItemLabel(activeItems[0])} + ${activeItems.length - 1} selected`;
    };

    const isItemChecked = (item) => {
        const itemId = getEffectiveId(item);
        return selectedItems.some(i =>
            getEffectiveId(i) === itemId && !(i.user?.isDeleted)
        );
    };

    const buttonClassName = fullWidth
        ? 'w-full max-w-full !mx-0'
        : `${eventScreen ? 'w-full' : meetingLink ? 'w-64' : 'w-44'}`;

    const filteredMenuItems = menuItems
        .filter(item => {
            const label = renderItemLabel(item).toLowerCase();
            return label.includes(searchText.toLowerCase());
        })
        .sort((a, b) => {
            const aChecked = isItemChecked(a);
            const bChecked = isItemChecked(b);
            // Selected items first
            if (aChecked && !bChecked) return -1;
            if (!aChecked && bChecked) return 1;
            // Maintain original order for items with same checked status
            return 0;
        });

    return (
        <div className={fullWidth ? 'w-full min-w-0' : ''}>
            <CustomButton
                onClick={handleClick}
                variant="contained"
                disableElevation
                endIcon={<KeyboardArrowDownIcon />}
                className={buttonClassName}
                error={error}
                formField={formField}
                addAgent={addAgent}
                fullWidth={fullWidth}
            >
                {icon && <img src={icon} alt="icon" style={{ width: 16, height: 16 }} />}
                <span
                    style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        textAlign: 'left',
                        color: selectedItems.filter((item) => !(item.user?.isDeleted === true)).length
                            ? 'var(--dashboard-text-primary)'
                            : undefined,
                        opacity: selectedItems.filter((item) => !(item.user?.isDeleted === true)).length
                            ? 1
                            : 0.7,
                    }}
                >
                    {getButtonText()}
                </span>
            </CustomButton>
            {typeof error === 'string' && error && (
                <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4, marginBottom: 0 }}>
                    {error}
                </p>
            )}
            <StyledMenu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                sx={{ zIndex: 100000 }}
                slotProps={{
                    paper: {
                        sx: {
                            minWidth: anchorEl?.clientWidth,
                            zIndex: 100000,
                        },
                    },
                }}
            >
                <div
                    style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        flexShrink: 0,
                        padding: '6px 12px',
                        backgroundColor: 'var(--dashboard-tab-box)',
                        borderBottom: '1px solid var(--sidebar-selected-bg)',
                    }}
                >
                    <SearchTextField
                        placeholder="Search..."
                        size="small"
                        inputRef={inputRef}
                        fullWidth
                        variant="outlined"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                    />
                    {!singleSelect && menuItems.length > 1 && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                marginTop: 6,
                                fontSize: 12,
                            }}
                        >
                            <span
                                role="button"
                                tabIndex={0}
                                onClick={handleSelectAll}
                                style={{ color: '#0C79F7', cursor: 'pointer' }}
                            >
                                All
                            </span>
                            <span style={{ color: 'var(--dashboard-text-primary)', opacity: 0.5 }}>/</span>
                            <span
                                role="button"
                                tabIndex={0}
                                onClick={handleClearAll}
                                style={{ color: '#0C79F7', cursor: 'pointer' }}
                            >
                                Clear
                            </span>
                        </div>
                    )}
                </div>
                {filteredMenuItems
                    .map((item, index) => (
                        <MenuItem
                            key={getEffectiveId(item) ?? index}
                            onClick={() => handleToggle(item)}
                            className="gap-2 w-full"
                        >
                            <Checkbox
                                checked={isItemChecked(item)}
                                // MenuItem already toggles — avoid double-toggle on checkbox click
                                tabIndex={-1}
                                disableRipple
                                size="small"
                            />
                            {renderItemLabel(item)}
                        </MenuItem>
                    ))}
            </StyledMenu>

        </div>
    );
}
