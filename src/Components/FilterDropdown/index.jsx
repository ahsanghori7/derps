import React, { useMemo, useState } from "react";
import {
    Checkbox,
    FormControl,
    ListItemText,
    ListSubheader,
    MenuItem,
    Select,
    TextField,
} from "@mui/material";

const FilterDropdown = ({
    label,
    value,
    onChange,
    options,
    placeholder,
    minWidth,
    fullWidth = true,
    size = "small",
    placeholderValues = [""],
    searchable = false,
    searchPlaceholder = "Search...",
    multiple = false,
}) => {
    const safeOptions = Array.isArray(options) ? options : [];
    const [searchQuery, setSearchQuery] = useState("");

    const selectValue = multiple
        ? Array.isArray(value)
            ? value
            : value
                ? [value]
                : []
        : value;

    const filteredOptions = useMemo(() => {
        if (!searchable) return safeOptions;
        const q = searchQuery.trim().toLowerCase();
        if (!q) return safeOptions;

        return safeOptions.filter((opt) => {
            const labelStr = String(opt?.label ?? "").toLowerCase();
            const valueStr = String(opt?.value ?? "").toLowerCase();
            return labelStr.includes(q) || valueStr.includes(q);
        });
    }, [safeOptions, searchQuery, searchable]);

    const isSelected = (optValue) =>
        Array.isArray(selectValue) &&
        selectValue.some((v) => String(v) === String(optValue));

    return (
        <div style={{ minWidth: minWidth ?? 180 }}>
            {label ? (
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dashboard-text-primary)', display: 'block', marginBottom: 4 }}>
                    {label}
                </label>
            ) : null}
            <FormControl size={size} fullWidth={fullWidth}>
                <Select
                    displayEmpty
                    multiple={multiple}
                    value={selectValue}
                    onChange={(e) => onChange(e.target.value)}
                    sx={{
                        backgroundColor: 'var(--dashboard-tab-box)',
                        color: 'var(--dashboard-text-primary)',
                        '& .MuiSelect-icon': {
                            color: 'var(--dashboard-text-primary)',
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'var(--dashboard-box-border)',
                        },
                    }}
                    onClose={() => {
                        if (searchable) setSearchQuery("");
                    }}
                    MenuProps={{
                        autoFocus: !searchable,
                        PaperProps: {
                            sx: {
                                maxHeight: 320,
                                overflowY: 'auto',
                                backgroundColor: 'var(--dashboard-tab-box)',
                                color: 'var(--dashboard-text-primary)',
                            },
                        },
                        MenuListProps: searchable
                            ? { autoFocusItem: false }
                            : undefined,
                    }}
                    renderValue={(val) => {
                        if (multiple) {
                            const selected = Array.isArray(val) ? val : [];
                            if (selected.length === 0) return placeholder;
                            const labels = selected.map((v) => {
                                const found = safeOptions.find(
                                    (o) => String(o.value) === String(v),
                                );
                                return found?.label ?? String(v);
                            });
                            if (labels.length === 1) return labels[0];
                            return `${labels[0]} +${labels.length - 1}`;
                        }

                        const shouldShowPlaceholder = placeholderValues.some(
                            (v) => String(v) === String(val),
                        );
                        if (shouldShowPlaceholder) return placeholder;
                        const found = safeOptions.find(
                            (o) => String(o.value) === String(val),
                        );
                        return found?.label ?? String(val);
                    }}
                >
                    {searchable && (
                        <ListSubheader
                            sx={{ backgroundColor: 'var(--dashboard-tab-box)' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <TextField
                                size="small"
                                placeholder={searchPlaceholder}
                                fullWidth
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                                sx={{
                                    '& .MuiInputBase-root': {
                                        backgroundColor: 'var(--dashboard-tab-box)',
                                        color: 'var(--dashboard-text-primary)',
                                    },
                                    '& input::placeholder': {
                                        color: 'var(--dashboard-text-primary)',
                                        opacity: 0.65,
                                    },
                                }}
                            />
                        </ListSubheader>
                    )}

                    {filteredOptions.map((opt) => (
                        <MenuItem key={String(opt.value)} value={opt.value}>
                            {multiple ? (
                                <>
                                    <Checkbox
                                        size="small"
                                        checked={isSelected(opt.value)}
                                        tabIndex={-1}
                                        disableRipple
                                    />
                                    <ListItemText primary={opt.label} />
                                </>
                            ) : (
                                opt.label
                            )}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </div>
    );
};

export default FilterDropdown;
