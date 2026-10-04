import React from 'react';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { styled } from '@mui/material/styles';
import { GlobalStyles } from '@mui/material';
import Heading from '../Heading';
import InputAdornment from "@mui/material/InputAdornment";
import Typography from "@mui/material/Typography";
import dayjs from 'dayjs';

const StyledTimePicker = styled(TimePicker)(({ newCreateInvoice, addAgent, addEvent, createEvent, meetingLink, editApplication, techInstallation, error }) => ({
    '& .MuiOutlinedInput-root': {
        borderRadius: newCreateInvoice || addAgent || addEvent || meetingLink || createEvent ? 4 : 8,
        fontSize: newCreateInvoice || addAgent || addEvent || meetingLink || editApplication || techInstallation || createEvent ? 12 : 14,
        backgroundColor: 'var(--dashboard-tab-box)',
        color: 'var(--dashboard-text-primary)',
        '& fieldset': {
            border: error ? '1px solid #ef4444' : '1px solid var(--dashboard-box-border)',
        },
        '&:hover fieldset': {
            borderColor: error ? '#ef4444' : 'var(--dashboard-tab-active)',
        },
        '&.Mui-focused fieldset': {
            borderColor: error ? '#ef4444' : 'var(--dashboard-tab-active)',
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
        padding: newCreateInvoice || addAgent || addEvent || meetingLink || createEvent ? '6px 10px' : '10px 14px',
    },
    '& .MuiSvgIcon-root': {
        color: 'var(--dashboard-text-primary)',
        width: newCreateInvoice || addAgent || addEvent || meetingLink || createEvent ? '18px' : '24px',
    },
    '& .MuiIconButton-root': {
        color: 'var(--dashboard-text-primary)',
    },
    '& .MuiInputAdornment-root .MuiButtonBase-root': {
        padding: newCreateInvoice || addAgent || addEvent || meetingLink || createEvent ? '2px' : '8px',
    },
}));

const CustomTimePicker = ({
    label,
    value,
    onChange,
    labelFontWeight = 600,
    labelColor = 'var(--fieldsTitle)',
    labelFontSize = 10,
    newCreateInvoice,
    addAgent,
    createEvent,
    addEvent,
    customWidth,
    required,
    meetingLink,
    innerLabel,
    techInstallation = false,
    editApplication,
    fullWidth,
    error = false,
    fieldError = false,
}) => {
    const dayjsValue = !value
        ? null
        : dayjs.isDayjs(value)
            ? value
            : dayjs(value?.toDate ? value.toDate() : value);
    const safeValue = dayjsValue?.isValid?.() ? dayjsValue : null;

    return (
        <div className={fullWidth ? 'w-full min-w-0' : meetingLink || techInstallation || createEvent ? '' : 'mx-1'}>
            <GlobalStyles
                styles={{
                    // Create/Edit Event modal uses zIndex 9999 — popper must be higher
                    '.MuiPickersPopper-root': {
                        zIndex: '100000 !important',
                        '& .MuiPaper-root': {
                            backgroundColor: 'var(--dashboard-tab-box)',
                            color: 'var(--dashboard-text-primary)',
                        },
                        '& .MuiTypography-root, & .MuiClockNumber-root': {
                            color: 'var(--dashboard-text-primary)',
                        },
                        '& .MuiClock-pin, & .MuiClockPointer-root': {
                            backgroundColor: 'var(--dashboard-tab-active)',
                        },
                        '& .MuiClockPointer-thumb': {
                            borderColor: 'var(--dashboard-tab-active)',
                        },
                    },
                }}
            />
            {required ? (
                <div className="flex">
                    <Heading
                        Fontweight={labelFontWeight}
                        color={labelColor}
                        Heading={label}
                        Fontsize={labelFontSize}
                        mb={2}
                        required={true}
                    />
                    {/* <span style={{ color: 'red', marginBottom: -8 }}>*</span> */}
                </div>
            ) : (
                <Heading
                    Fontweight={labelFontWeight}
                    color={labelColor}
                    Heading={label}
                    Fontsize={labelFontSize}
                    mb={2}
                />
            )}
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <StyledTimePicker
                    value={safeValue}
                    onChange={onChange}
                    ampm={true}
                    newCreateInvoice={newCreateInvoice}
                    addAgent={addAgent}
                    meetingLink={meetingLink}
                    editApplication={editApplication}
                    addEvent={addEvent}
                    createEvent={createEvent}
                    techInstallation={techInstallation}
                    error={error}
                    className={`${fullWidth ? 'w-full max-w-full' : customWidth ? 'w-56' : newCreateInvoice ? 'w-36' : addAgent ? 'w-full sm:w-44' : addEvent ? 'w-full sm:w-24' : createEvent ? 'w-full sm:w-56' : meetingLink ? 'w-full sm:w-64' : editApplication ? 'w-44 sm:w-44' : techInstallation ? 'w-36' : 'w-full sm:w-72'} ${newCreateInvoice ? 'h-6' : fullWidth ? 'h-9' : meetingLink ? 'h-7' : editApplication || techInstallation ? 'h-9' : 'h-10'}`}
                    slotProps={{
                        textField: {
                            variant: 'outlined',
                            InputLabelProps: { shrink: !techInstallation },
                            error: !!(fieldError || error),
                            helperText: typeof error === 'string' ? error : '',
                            InputProps: techInstallation
                                ? {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                                                {innerLabel.replace("*", "")}
                                            </Typography>
                                        </InputAdornment>
                                    ),
                                }
                                : {},
                        },
                        popper: {
                            disablePortal: false,
                            sx: { zIndex: 100000 },
                        },
                    }}
                />
            </LocalizationProvider>
        </div>
    );
};

export default CustomTimePicker;
