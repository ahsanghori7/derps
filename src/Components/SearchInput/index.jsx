import React, { useState, useEffect, useRef } from 'react';
import { styled, alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import ClearIcon from '@mui/icons-material/Clear';
import Paper from '@mui/material/Paper';
import UserProfileAvatar from '../UserProfileAvatar';

const StyledTextField = styled(TextField, {
    shouldForwardProp: (prop) => prop !== 'techInstallation' && prop !== 'fieldError',
})(({ theme, techInstallation, fieldError }) => ({
    borderRadius: 4,
    color: 'var(--dashboard-text-primary)',
    '& .MuiInputBase-root': {
        fontSize: techInstallation ? 16 : 12,
        borderRadius: techInstallation ? 8 : 4,
        backgroundColor: 'var(--dashboard-tab-box)',
        border: fieldError ? '1px solid #ef4444' : '1px solid #D1D5DC',
        // boxShadow: fieldError ? '0 0 0 2px rgba(239,68,68,0.2)' : 'none',
        color: 'var(--dashboard-text-primary)',
        height: techInstallation ? '36px' : '28px',
    },
    '& .MuiOutlinedInput-notchedOutline': {
        border: 'none',
    },
}));

const StyledMenu = styled(Paper)(({ theme }) => ({
    position: 'absolute',
    zIndex: 10,
    borderRadius: 8,
    marginTop: 10,
    maxHeight: '250px',
    overflowY: 'auto',
    color: 'var(--dashboard-text-primary)',
    backgroundColor: 'var(--dashboard-tab-box)',
    // boxShadow: 'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
    '& .MuiMenuItem-root': {
        '&:active': {
            backgroundColor: alpha(
                theme.palette.primary.main,
                theme.palette.action.selectedOpacity,
            ),
        },
    },
}));

export default function SearchInput({ suggestions, onSelect, shareFile, addTicket, ticketDetails, StatusWidth, performanceReport, idSet, selectedValue, techInstallation, disabled, fieldError, onSearchTextChange, asyncSuggestions }) {
    const [searchText, setSearchText] = useState(selectedValue || '');
    const [filteredSuggestions, setFilteredSuggestions] = useState(suggestions || []);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const handleSearchChange = (event) => {
        if (disabled) return;
        const value = event.target.value;
        setSearchText(value);
        if (typeof onSearchTextChange === 'function') {
            onSearchTextChange(value);
        }
        if (!asyncSuggestions) {
            setFilteredSuggestions(
                (suggestions || []).filter((item) => {
                    const itemName = typeof item === 'object' && item !== null ? item.name : item;
                    return typeof itemName === 'string' && itemName.toLowerCase().includes(value.toLowerCase());
                })
            );
        }
        setMenuOpen(true);
    };

    const handleFocus = () => {
        if (disabled) return;
        setFilteredSuggestions(suggestions || []);
        setMenuOpen(true);
    };

    const handleClear = (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        if (disabled) return;
        setSearchText('');
        setFilteredSuggestions(suggestions || []);
        setMenuOpen(false);
        if (typeof onSearchTextChange === 'function') {
            onSearchTextChange('');
        }
        if (typeof onSelect === 'function' && !shareFile) {
            onSelect('');
        }
    };

    const handleSuggestionClick = (suggestion) => {
        if (typeof suggestion === 'object' && suggestion !== null) {
            setSearchText(suggestion.name);
            onSelect(idSet ? suggestion.id : shareFile ? suggestion :suggestion.name);
        } else {
            setSearchText(suggestion);
            onSelect(suggestion);
        }
        setMenuOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        setSearchText(selectedValue || '');
    }, [selectedValue]);

    useEffect(() => {
        setFilteredSuggestions(suggestions || []);
    }, [suggestions]);

    return (
        <div className={`${addTicket || techInstallation ? '' : 'mb-2'}`} style={{ position: 'relative', }}>
            <StyledTextField
                value={searchText}
                onChange={handleSearchChange}
                onFocus={handleFocus}
                placeholder="Search..."
                techInstallation={techInstallation}
                fieldError={fieldError}
                className={`${addTicket ? 'h-7 w-64' : shareFile ? 'h-9 w-96' : performanceReport ? 'w-44 h-7' : techInstallation ? 'w-44 sm:w-80 h-9' : 'h-7  w-36'}`}
                disabled={disabled}
                InputProps={{
                    endAdornment: (
                        <ClearIcon
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={handleClear}
                            style={{ cursor: 'pointer', fontSize: 14 }}
                        />
                    ),
                }}
            />
            {menuOpen && filteredSuggestions.length > 0 && (
                <StyledMenu ref={menuRef}>
                    {filteredSuggestions.map((suggestion, index) => (
                        <MenuItem
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className={`gap-3 items-center ${performanceReport ? 'w-44' : 'w-72'}`}
                            style={{
                                whiteSpace: 'normal',
                                overflow: 'visible',
                            }}
                        >
                            {shareFile && typeof suggestion === 'object' && suggestion !== null ? (
                                <span className="flex items-center gap-2">
                                    <UserProfileAvatar user={suggestion} size={24} />
                                    <span>{suggestion.name}</span>
                                </span>
                            ) : (
                                typeof suggestion === 'object' && suggestion !== null ? suggestion.name : suggestion
                            )}
                        </MenuItem>
                    ))}
                </StyledMenu>
            )}
        </div>
    );
}