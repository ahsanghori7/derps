import PropTypes from 'prop-types';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { styled } from '@mui/material/styles';
import { GlobalStyles } from '@mui/material';
import dayjs from 'dayjs';
import Heading from '@components/Heading';

const StyledTimePicker = styled(TimePicker)(({ error }) => ({
    '& .MuiOutlinedInput-root': {
        borderRadius: 4,
        fontSize: 12,
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
        padding: '6px 10px',
    },
    '& .MuiSvgIcon-root': {
        color: 'var(--dashboard-text-primary)',
        width: '18px',
    },
    '& .MuiIconButton-root': {
        color: 'var(--dashboard-text-primary)',
    },
    '& .MuiInputAdornment-root .MuiButtonBase-root': {
        padding: '2px',
    },
}));

/**
 * Compact time picker used by the booking availability config UI.
 * Kept feature-local (rather than adding another context flag to the
 * shared CustomTimePicker) since it only needs one fixed compact style.
 */
const BookingTimePicker = ({
    label,
    value,
    onChange,
    required,
    error = false,
    fullWidth = true,
}) => {
    const dayjsValue = !value
        ? null
        : dayjs.isDayjs(value)
            ? value
            : dayjs(value?.toDate ? value.toDate() : value);
    const safeValue = dayjsValue?.isValid?.() ? dayjsValue : null;

    return (
        <div className={fullWidth ? 'w-full min-w-0' : ''}>
            <GlobalStyles
                styles={{
                    // Configure Booking Page modal uses zIndex 9999 — popper must be higher
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
            <Heading
                Fontweight={600}
                color="var(--fieldsTitle)"
                Heading={label}
                Fontsize={10}
                mb={2}
                required={!!required}
            />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <StyledTimePicker
                    value={safeValue}
                    onChange={onChange}
                    ampm={true}
                    error={error}
                    className={`${fullWidth ? 'w-full max-w-full' : 'w-full sm:w-72'} h-9`}
                    slotProps={{
                        textField: {
                            variant: 'outlined',
                            error: !!error,
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

BookingTimePicker.propTypes = {
    label: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.object, PropTypes.instanceOf(Date)]),
    onChange: PropTypes.func,
    required: PropTypes.bool,
    error: PropTypes.bool,
    fullWidth: PropTypes.bool,
};

export default BookingTimePicker;
