import * as React from 'react';
import { styled, alpha } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const DEFAULT_TRUNCATE_LENGTH = 25;

const truncateText = (text, maxLength = DEFAULT_TRUNCATE_LENGTH) => {
    if (!text || typeof text !== 'string') return text ?? '';
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
};

const TruncatedLabel = ({ text, maxLength = DEFAULT_TRUNCATE_LENGTH, className, style }) => {
    if (!text) return null;

    const displayText = truncateText(text, maxLength);
    const isTruncated = displayText !== text;

    const label = (
        <span className={className} style={style}>
            {displayText}
        </span>
    );

    if (!isTruncated) return label;

    return (
        <Tooltip
            title={text}
            arrow
            placement="top"
            enterDelay={300}
            PopperProps={{ sx: { zIndex: 1000001 } }}
        >
            {label}
        </Tooltip>
    );
};

const StyledMenu = styled(({ searchable, PopperProps, PaperProps, slotProps, ...props }) => (
    <Menu
        elevation={0}
        anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
        }}
        transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
        }}
        PopperProps={PopperProps}
        PaperProps={PaperProps}
        slotProps={slotProps}
        {...props}
        sx={{ zIndex: 1000000 }}
    />
))(({ theme, searchable }) => ({
    '& .MuiPaper-root': {
        borderRadius: 6,
        marginTop: 10,
        maxHeight: '250px',
        backgroundColor: 'var(--dashboard-tab-box)',
        color:
            'var(--dashboard-text-primary)',
        boxShadow:
            'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
        ...(searchable && {
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
        }),
        '& .MuiMenu-list': {
            padding: searchable ? 0 : '6px 0',
            ...(searchable && {
                overflowY: 'auto',
                flex: 1,
                minHeight: 0,
            }),
        },
        '& .MuiMenuItem-root': {
            maxWidth: '100%',
            overflow: 'hidden',
            '& .MuiSvgIcon-root': {
                fontSize: 18,
                color: theme.palette.text.secondary,
                marginRight: theme.spacing(1.5),
            },
            '&:active': {
                backgroundColor: alpha(
                    theme.palette.primary.main,
                    theme.palette.action.selectedOpacity,
                ),
            },
        },
    },
}));

const SearchTextField = styled(TextField)(({ theme }) => ({
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
    shouldForwardProp: (prop) =>
        !['newCreateInvoice', 'shareFile', 'addAgent', 'meetingLink', 'taskDetails', 'supportTicket', 'newCreateInvoicetable', 'maintainTicket', 'performanceReport', 'backgroundColor', 'border', 'ticketDetails', 'width', 'error'].includes(prop),
})(({ width, newCreateInvoice, addAgent, taskDetails, maintainTicket, ticketDetails, performanceReport, backgroundColor, border, newCreateInvoicetable, shareFile, meetingLink, supportTicket, error }) => ({
    width,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    textAlign: 'left',
    padding: newCreateInvoice || addAgent || meetingLink || taskDetails || supportTicket || maintainTicket ? '0 4px' : '0 10px',
    gap: newCreateInvoice || addAgent || meetingLink || taskDetails || supportTicket || shareFile || maintainTicket ? 0 : '10px',
    textTransform: 'none',
    borderRadius: newCreateInvoice || addAgent || meetingLink || taskDetails || supportTicket || shareFile || performanceReport || maintainTicket ? 4 : newCreateInvoicetable ? 4 : 8,
    color: 'var(--dashboard-text-primary)',
    backgroundColor: backgroundColor ? backgroundColor : 'var(--dashboard-tab-box)',
    border: error ? '1px solid #ef4444' : border || '1px solid var(--dashboard-box-border)',
    fontSize: ticketDetails ? 10 : newCreateInvoice || addAgent || meetingLink || taskDetails || supportTicket || shareFile || performanceReport || maintainTicket ? 11 :14,
    overflow: 'hidden', // Hide overflow
    textOverflow: 'ellipsis', // Add ellipsis for overflow text
    whiteSpace: 'nowrap', // Prevent text from wrapping
    '& img': {
        width: 24,
        height: 24,
    },
    '&:hover': {
        backgroundColor: 'var(--dashboard-tab-box)',
        border: error ? '1px solid #ef4444' : border ? border : newCreateInvoice || addAgent || meetingLink || taskDetails || supportTicket || shareFile ? '1px solid var(--sidebar-selected-bg)' : '2px solid var(--sidebar-selected-bg)',
    },
    '& .MuiButton-endIcon': {
        marginLeft: 'auto',
    },
    '&.MuiButton-contained': {
        boxShadow: 'none',
    },
}));


export default function DropdownMenu({ icon, menuItems, idSet, tickets, business, performanceReport, maintainTicket, businessType, projectFilter, newInvoice, newCreateInvoice, shareFile, newCreateInvoicetable, addAgent, meetingLink, taskDetails, supportTicket, handleRoleIdChange, invoiceStatus, inventory, defaultText, ticketDetails, addAgentRole, onSelect, customWidth, StatusWidth, backgroundColor, border, selectedValue, searchable, disabled, fullWidth, wrapText, error = false, truncateLength = DEFAULT_TRUNCATE_LENGTH, onSearchChange }) {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [selectedText, setSelectedText] = React.useState(selectedValue ? selectedValue : defaultText);
    const [searchQuery, setSearchQuery] = React.useState('');
    const open = Boolean(anchorEl);
    const hasAsyncSearch = typeof onSearchChange === 'function';

    /* Keeps the menu as wide as its button so long labels wrap instead of stretching */
    const constrainedWidth = (fullWidth || wrapText) && anchorEl ? `${anchorEl.offsetWidth}px` : null;
    
    // Calculate dropdown width based on the same conditions as the button
    const getDropdownWidth = () => {
        if (fullWidth && anchorEl) {
            return `${anchorEl.offsetWidth}px`;
        }

        let width;
        if (customWidth) width = '224px'; // w-56
        else if (ticketDetails) width = '192px'; // w-48
        else if (newCreateInvoice) width = '144px'; // w-36
        else if (maintainTicket) width = '100%'; // w-full
        else if (addAgent || performanceReport) width = '176px'; // w-44
        else if (newInvoice) width = '160px'; // w-40
        else if (invoiceStatus || supportTicket) width = '112px'; // w-28
        else if (business) width = '176px'; // w-44
        else if (businessType) width = '320px'; // w-80
        else if (StatusWidth || meetingLink) width = '256px'; // w-64
        else if (shareFile) width = '384px'; // w-96
        else if (inventory) width = '208px'; // w-52
        else width = '288px'; // w-72 default
        
        return width;
    };
    
    const handleClick = (event) => {
        if (disabled) return;
        setAnchorEl(event.currentTarget);
    };
    React.useEffect(() => {
        setSelectedText(selectedValue ? selectedValue : defaultText);
    }, [selectedValue, defaultText]);
    const handleClose = () => {
        setAnchorEl(null);
        setSearchQuery(''); // Reset search when menu closes
        if (hasAsyncSearch) onSearchChange('');
    };

    const handleSearchInputChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        if (hasAsyncSearch) onSearchChange(value);
    };

    const handleMenuItemClick = (item) => {
        setSelectedText(projectFilter ? item.name : item.text ? item.text : item.year ? item.year : item.month ? item.month : item?.title ? item.title : item?.name ? item?.name : item?.level ? item?.level : item?.type ? item?.type : null); // Update the selected text
        onSelect(projectFilter ? item : idSet ? item.id : shareFile ? item : item.value ? item?.value : item?.title ? item?.title : item?.name ? item?.name : item?.level ? item?.level : item?.type ? item?.type : null); // Step 2: Call onSelect with the selected value
        if (handleRoleIdChange) {
            handleRoleIdChange(item.id)
        }
        handleClose(); // Close the menu
    };

    // Helper function to get display text from item
    const getItemDisplayText = (item) => {
        const displayValue = projectFilter ? item.name : item.text ? item.text : item.year ? item.year : item.month ? item.month : item?.title ? item.title : item?.name ? item?.name : item?.level ? item?.level : item?.type ? item?.type : '';
        return displayValue !== null && displayValue !== undefined ? String(displayValue) : '';
    };

    // Client-side filter only when parent is not driving async search
    const filteredMenuItems = searchable && searchQuery && !hasAsyncSearch
        ? (menuItems || []).filter((item) => {
            const displayText = getItemDisplayText(item);
            return displayText && typeof displayText === 'string' && displayText.toLowerCase().includes(searchQuery.toLowerCase());
        })
        : (menuItems || []);

    const buttonClassName = fullWidth
        ? 'w-full max-w-full h-9 !mx-0'
        : `${newCreateInvoice || addAgent || meetingLink || taskDetails || supportTicket || performanceReport || maintainTicket ? 'h-7' : newCreateInvoicetable ? 'h-[35px]' : shareFile || business || businessType ? 'h-9' : tickets ? 'h-9' : 'h-10'} mx-1 ${customWidth ? 'w-56' : ticketDetails ? 'w-48' : newCreateInvoice ? 'w-36' : maintainTicket ? 'w-full sm:w-44' : addAgent || performanceReport ? 'w-44' : newInvoice ? 'w-40' : invoiceStatus || supportTicket ? 'w-28' : business ? 'w-44 sm:w-32' : businessType ? 'w-44 sm:w-80' : StatusWidth || meetingLink ? 'w-64' : shareFile ? 'w-96' : inventory ? 'w-52 md:w-64 sm:w-72' : addAgent ? 'w-full sm:w-72' : taskDetails ? 'w-full sm:w-20' : 'w-full sm:w-64 lg:w-72'}`;

    return (
        <div className={`${fullWidth ? 'w-full min-w-0' : ''} ${newCreateInvoicetable || addAgent || meetingLink || taskDetails || shareFile || supportTicket || business || businessType ? '' : 'mb-2'}`}>
            <CustomButton
                id="demo-customized-button"
                aria-controls={open ? 'demo-customized-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                variant="contained"
                disableElevation
                newCreateInvoice={newCreateInvoice}
                shareFile={shareFile}
                addAgent={addAgent}
                meetingLink={meetingLink}
                performanceReport={performanceReport}
                taskDetails={taskDetails}
                supportTicket={supportTicket}
                newCreateInvoicetable={newCreateInvoicetable}
                maintainTicket={maintainTicket}
                onClick={handleClick}
                endIcon={<KeyboardArrowDownIcon />}
                disabled={disabled}
                className={buttonClassName}
                style={fullWidth ? { width: '100%', maxWidth: '100%' } : undefined}
                // width={buttonWidth}
                backgroundColor={backgroundColor}
                border={border}
                error={error}
                ticketDetails={ticketDetails}
            >
                {icon && <img src={icon} alt="Status Icon" style={{ width: 16, height: 16, margin: 4, flexShrink: 0 }} />}
                <TruncatedLabel
                    text={selectedText}
                    maxLength={truncateLength}
                    style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}
                />
            </CustomButton>
            <StyledMenu
                id="demo-customized-menu"
                searchable={searchable}
                disableAutoFocus={searchable}
                disableAutoFocusItem={searchable}
                disableEnforceFocus={searchable}
                disableRestoreFocus={searchable}
                MenuListProps={{
                    'aria-labelledby': 'demo-customized-button',
                }}
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: fullWidth ? 'left' : 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: fullWidth ? 'left' : 'right',
                }}
                slotProps={{
                    paper: {
                        style: {
                            minWidth: getDropdownWidth(),
                            width: constrainedWidth || undefined,
                            maxWidth: constrainedWidth || undefined,
                        },
                        sx: (fullWidth || wrapText) ? {
                            '& .MuiMenuItem-root': {
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                            },
                        } : undefined,
                    },
                }}
                PaperProps={{
                    style: {
                        minWidth: getDropdownWidth(),
                        width: constrainedWidth || 'auto',
                        maxWidth: constrainedWidth || undefined,
                    },
                }}
            >
                {searchable && (
                    <div
                        style={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 1,
                            flexShrink: 0,
                            padding: '8px 12px',
                            backgroundColor: 'var(--dashboard-tab-box)',
                            borderBottom: '1px solid var(--sidebar-selected-bg)',
                        }}
                    >
                        <SearchTextField
                            fullWidth
                            size="small"
                            placeholder={hasAsyncSearch ? "Type to search..." : "Search..."}
                            value={searchQuery}
                            onChange={handleSearchInputChange}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </div>
                )}
                {filteredMenuItems.length === 0 ? (
                    <MenuItem disabled>
                        No data found
                    </MenuItem>
                ) : (
                    filteredMenuItems.map((item, index) => (
                    <MenuItem
                        key={index}
                        onClick={() => handleMenuItemClick(item)}
                        disableRipple
                        className="gap-3 items-center w-full"
                    >
                        {item.icon && <img src={item.icon} alt="Status Icon" style={{ width: 16, height: 16, flexShrink: 0 }} />}
                        <TruncatedLabel
                            text={getItemDisplayText(item)}
                            maxLength={truncateLength}
                            style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}
                        />
                    </MenuItem>
                    ))
                )}
            </StyledMenu>
        </div>
    );
}
