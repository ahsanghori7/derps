import React from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { styled } from '@mui/material/styles';
import dayjs from 'dayjs';
import { GlobalStyles } from '@mui/material';

const StyledDatePicker = styled(DatePicker, {
    shouldForwardProp: (prop) => !['newCreateInvoice', 'addAgent', 'supportTicket', 'monthYearOnly', 'addEvent', 'fieldError'].includes(prop),
})(({ theme, newCreateInvoice, addAgent, supportTicket, monthYearOnly, addEvent, fieldError }) => ({
    minWidth: 0,
    maxWidth: '100%',
    '& .MuiOutlinedInput-root': {
        borderRadius: newCreateInvoice || addAgent || supportTicket || addEvent ? 4 : 8,
        fontSize: newCreateInvoice || addAgent || supportTicket || addEvent ? 12 : 14,
        backgroundColor: 'var(--dashboard-tab-box)',
        color: 'var(--dashboard-text-primary)',
        overflow: 'hidden',
        '& fieldset': {
            border: fieldError ? '1px solid #ef4444' : '1px solid var(--dashboard-box-border)',
            // boxShadow: fieldError ? '0 0 0 2px rgba(239,68,68,0.2)' : 'none',
        },
        '&:hover fieldset': {
            borderColor: fieldError ? '#ef4444' : 'var(--dashboard-tab-active)',
        },
        '&.Mui-focused fieldset': {
            borderColor: fieldError ? '#ef4444' : 'var(--dashboard-tab-active)',
        },
        '&.Mui-disabled': {
            backgroundColor: 'var(--dashboard-tab-box)',
            '& fieldset': {
                borderColor: 'var(--dashboard-box-border)',
            },
            '& .MuiInputBase-input': {
                color: 'var(--dashboard-text-primary)',
            },
        },
    },
    '& .MuiInputBase-input': {
        padding: newCreateInvoice || addAgent || supportTicket || addEvent ? '6px 10px' : '10px 14px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    '& .MuiSvgIcon-root': {
        color: 'var(--dashboard-text-primary)',
        width: newCreateInvoice || addAgent || supportTicket || addEvent ? '18px' : '24px',
    },
    '& .MuiIconButton-root': {
        color: 'var(--dashboard-text-primary)',
    },
    '& .MuiInputAdornment-root .MuiButtonBase-root': {
        padding: newCreateInvoice || addAgent || addEvent || supportTicket ? '2px' : '8px',
    },
}));

const CustomDatePicker = ({
    value,
    onChange,
    createInvoice,
    label,
    newInvoice,
    supportTicket,
    newCreateInvoice,
    addAgent,
    monthYearOnly,
    addEvent,
    customWidth,
    inventory,
    disabled,
    singleInvoice,
    StatusWidth,
    maintainTraining,
    ownerInfo,
    bussiness,
    minDate,
    maxDate,
    fullWidth,
    style,
    placeholder,
    fieldError = false,
    error,
}) => {
    const handleInput = (event) => {
        const input = event.target;
        if (input.value.length >= 4) {
            input.value = input.value.slice(0, 4);
        }
    };

    const handleChange = (newValue) => {
        if (StatusWidth) {
            handleInput({ target: { value: newValue ? newValue.format('YYYY') : '' } });
        }
        if (monthYearOnly) {
            const month = newValue ? newValue.format('MM') : '';
            const year = newValue ? newValue.format('YYYY') : '';
            onChange(`${month}/${year}`);
        } else {
            onChange(newValue ? newValue.format('MM/DD/YYYY') : null);
        }
    };

    const widthClassName = fullWidth
        ? 'w-full max-w-full'
        : `${customWidth ? 'w-56' : createInvoice ? 'w-48' : newInvoice ? 'w-40' : newCreateInvoice ? 'w-36' : StatusWidth ? 'w-64' : singleInvoice ? 'w-52 md:w-64 sm:w-72' : inventory ? 'w-52 md:w-64 sm:w-72' : addAgent ? 'w-full sm:w-44' : bussiness ? 'w-44 sm:w-80' : ownerInfo || monthYearOnly ? 'w-44 sm:w-44' : supportTicket ? 'w-full sm:w-64' : addEvent ? '!w-full sm:w-20' : maintainTraining ? 'w-full sm:w-80' : 'w-full sm:w-72'}`;

    return (
        <>
            {/* Global styles for DatePicker dialog */}
            <GlobalStyles
                styles={{
                    '.MuiPickersPopper-root': {
                        zIndex: '100000 !important',
                        '& .MuiPaper-root': {
                            backgroundColor: 'var(--dashboard-tab-box)',
                            color: 'var(--dashboard-text-primary)',
                        },
                        '& .MuiTypography-root, .MuiPickersDay-root': {
                            color: 'var(--dashboard-text-primary)',
                        },
                        '& .MuiIconButton-root': {
                            color: 'var(--dashboard-text-primary)',
                        },
                        '& .Mui-selected': {
                            backgroundColor: 'var(--sidebar-selected-bg) !important',
                            color: 'var(--dashboard-tab-text-active) !important',
                        },
                    },
                }}
            />

            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <StyledDatePicker
                    views={monthYearOnly ? ['year', 'month'] : ['year', 'month', 'day']} // or any logic you prefer
                    value={value ? (monthYearOnly ? dayjs(value, 'MM/YYYY') : dayjs(value)) : null}
                    onChange={handleChange}
                    minDate={
                        monthYearOnly
                            ? dayjs().startOf('month')
                            : minDate
                                ? dayjs(minDate)
                                : undefined
                    }
                    slotProps={{
                        textField: {
                            variant: 'outlined',
                            InputLabelProps: { shrink: true },
                            error: !!(fieldError || error),
                            helperText: typeof error === 'string' ? error : '',
                            fullWidth: !!fullWidth,
                        },
                        inputProps: {
                            maxLength: 4,
                            onInput: handleInput,
                            placeholder: placeholder,
                        },
                        popper: {
                            disablePortal: false,
                            sx: { zIndex: 100000 },
                        },
                    }}
                    newCreateInvoice={newCreateInvoice}
                    fieldError={fieldError}
                    maxDate={maxDate && dayjs(maxDate)}
                    addAgent={addAgent}
                    supportTicket={supportTicket}
                    monthYearOnly={monthYearOnly}
                    addEvent={addEvent}
                    allowKeyboardControl={StatusWidth}
                    className={`${widthClassName} ${newCreateInvoice && !fullWidth ? 'h-6' : fullWidth || bussiness ? 'h-9' : 'h-10'}`}
                    sx={fullWidth ? { width: '100%', maxWidth: '100%', minWidth: 0 } : undefined}
                    style={style}
                    disabled={disabled}
                />
            </LocalizationProvider>
        </>
    );
};

export default CustomDatePicker;
