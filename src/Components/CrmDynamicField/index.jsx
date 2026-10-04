import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import Heading from '../Heading';
import LabeledInput from '../LabeledInput';
import DropdownMenu from '../dropdownMenu';
import MultiSelectDropdown from '../MultiSelectDropdown';
import UploadFile from '../UploadFile';
import CustomTimePicker from '../CustomTimePicker';
import CustomDatePicker from '../CustomDatePicker';
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa';
import {
    formatDateForApi,
    formatPhoneNumber,
    getPhoneValidationBounds,
    hasDigitLengthValidation,
    isHeadingField,
    normalizeFieldType,
    normalizeOptions,
    sanitizeDigitInput,
    supportsSelectOptions,
} from '../../Screens/SalesFormBuilder/formDefinitionApi';

const fieldInputStyle = (error = false) => ({
    border: error ? '1px solid #ef4444' : '1px solid #D1D5DC',
    fontSize: 14,
    borderRadius: 8,
    backgroundColor: 'var(--dashboard-tab-box)',
    color: 'var(--sidebar-text-primary)',
});

const fieldControlClass = 'w-full sm:w-80 min-w-0';
const fieldRowClass = 'flex items-center gap-x-6 flex-wrap';
const fieldRowStartClass = 'flex items-start gap-x-6 flex-wrap';

const CrmDynamicField = ({ field, value, onChange, error = false }) => {
    const type = normalizeFieldType(field.type);
    const [showMasked, setShowMasked] = useState(false);

    const labelBlock = (
        <div className="w-48 shrink-0">
            <Heading
                Fontweight={500}
                color={'var(--sidebar-text-primary)'}
                Heading={field.label}
                Fontsize={16}
                required={field.required}
            />
        </div>
    );

    const options = useMemo(() => normalizeOptions(field.options), [field.options]);

    const menuItems = useMemo(
        () => options.map((opt) => ({
            text: opt.label,
            name: opt.label,
            value: opt.value,
            id: opt.value,
        })),
        [options]
    );

    if (isHeadingField(type)) {
        return null;
    }

    if (type === 'textarea') {
        return (
            <div className={fieldRowStartClass}>
                {labelBlock}
                <textarea
                    placeholder={`Enter ${field.label}`}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    className={`mt-1 p-3 ${fieldControlClass}`}
                    rows={3}
                    style={fieldInputStyle(error)}
                />
            </div>
        );
    }

    if (type === 'multiselect') {
        const selectedValues = Array.isArray(value) ? value : [];
        const normalizeMatch = (raw) => String(raw ?? '').trim().toLowerCase();
        const selectedLookup = new Set(selectedValues.map(normalizeMatch).filter(Boolean));
        const selectedItems = menuItems.filter((item) => {
            const valueKey = normalizeMatch(item.value);
            const labelKey = normalizeMatch(item.text || item.name);
            return selectedLookup.has(valueKey) || (labelKey && selectedLookup.has(labelKey));
        });

        return (
            <div className={fieldRowClass}>
                {labelBlock}
                <div className={fieldControlClass}>
                    <MultiSelectDropdown
                        menuItems={menuItems}
                        selectedValue={selectedItems}
                        defaultText={`--select ${field.label.toLowerCase()}--`}
                        fullWidth={true}
                        formField={true}
                        error={error}
                        onChange={(items) => {
                            const nextValues = (items || [])
                                .filter((item) => !(item.user?.isDeleted))
                                .map((item) => item.value ?? item.id);
                            onChange(nextValues);
                        }}
                    />
                </div>
            </div>
        );
    }

    if (type === 'radio') {
        return (
            <div className={fieldRowStartClass}>
                {labelBlock}
                <div className={`flex flex-col gap-2 ${fieldControlClass} ${error ? 'rounded-lg p-2' : ''}`} style={error ? { border: '1px solid #ef4444', borderRadius: 8 } : undefined}>
                    {options.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 text-sm">
                            <input
                                type="radio"
                                name={field.apiName || field.id}
                                checked={value === opt.value}
                                onChange={() => onChange(opt.value)}
                            />
                            {opt.label}
                        </label>
                    ))}
                </div>
            </div>
        );
    }

    if (supportsSelectOptions(type)) {
        const selectedLabel = options.find((opt) => opt.value === value)?.label || `--select ${field.label.toLowerCase()}--`;

        return (
            <div className={fieldRowClass}>
                {labelBlock}
                <div className={fieldControlClass}>
                    <DropdownMenu
                        menuItems={menuItems}
                        defaultText={`--select ${field.label.toLowerCase()}--`}
                        selectedValue={selectedLabel}
                        onSelect={onChange}
                        fullWidth={true}
                        error={error}
                    />
                </div>
            </div>
        );
    }

    if (type === 'checkbox') {
        return (
            <div className={fieldRowClass}>
                {labelBlock}
                <label
                    className={`flex items-center gap-2 text-sm ${fieldControlClass} ${error ? 'rounded-lg p-2' : ''}`}
                    style={error ? { border: '1px solid #ef4444', borderRadius: 8 } : undefined}
                >
                    <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => onChange(e.target.checked)}
                    />
                    Yes
                </label>
            </div>
        );
    }

    if (type === 'file') {
        const uploadedFiles = Array.isArray(value) ? value : value ? [value] : [];

        return (
            <div className={fieldRowStartClass}>
                {labelBlock}
                <div
                    style={{
                        backgroundColor: 'var(--dashboard-tab-box)',
                        border: error ? '1px solid #ef4444' : '1px solid rgba(100, 153, 255, 0.9)',
                        borderRadius: 7,
                    }}
                    className={`min-h-20 mt-1 pt-2 flex flex-col items-center ${fieldControlClass}`}
                >
                    <UploadFile
                        droppedFiles={uploadedFiles}
                        onFileChange={(files) => onChange(files?.length ? files : null)}
                        addTicket={true}
                    />
                </div>
            </div>
        );
    }

    if (type === 'datetime') {
        const datetimeValue = value
            ? typeof value === 'string'
                ? dayjs(value.includes('T') ? value : `2000-01-01T${value}`)
                : dayjs(value)
            : null;

        return (
            <div className={fieldRowClass}>
                {labelBlock}
                <div className={fieldControlClass}>
                    <CustomTimePicker
                        value={datetimeValue?.isValid() ? datetimeValue : null}
                        fullWidth={true}
                        error={error}
                        onChange={(newValue) =>
                            onChange(newValue ? dayjs(newValue).format('YYYY-MM-DDTHH:mm') : '')
                        }
                    />
                </div>
            </div>
        );
    }

    if (type === 'date') {
        return (
            <div className={fieldRowClass}>
                {labelBlock}
                <div className={fieldControlClass}>
                    <CustomDatePicker
                        value={value || null}
                        onChange={(selectedDate) => onChange(formatDateForApi(selectedDate))}
                        fullWidth={true}
                        error={error}
                    />
                </div>
            </div>
        );
    }

    if (type === 'phone') {
        const { max: maxDigits } = getPhoneValidationBounds(field.validation);

        return (
            <div className={fieldRowClass}>
                {labelBlock}
                <div className={fieldControlClass}>
                    <LabeledInput
                        inputPlaceholder="(123) 456-7890"
                        inputValue={value ?? ''}
                        inputType="tel"
                        onInputChange={(e) => onChange(formatPhoneNumber(e.target.value, maxDigits))}
                        eventScreen={true}
                        error={error}
                    />
                </div>
            </div>
        );
    }

    if (type === 'number' && hasDigitLengthValidation(field.validation)) {
        return (
            <div className={fieldRowClass}>
                {labelBlock}
                <div className={fieldControlClass}>
                    <LabeledInput
                        inputPlaceholder={`Enter ${field.label}`}
                        inputValue={value ?? ''}
                        inputType="tel"
                        onInputChange={(e) => onChange(sanitizeDigitInput(e.target.value, field.validation))}
                        eventScreen={true}
                        error={error}
                    />
                </div>
            </div>
        );
    }

    const isMasked = field.masked;
    const maskedInputType = showMasked ? 'text' : 'password';
    const resolvedInputType = isMasked
        ? maskedInputType
        : type === 'number'
            ? 'number'
            : type === 'email'
                ? 'email'
                : 'text';

    return (
        <div className={fieldRowClass}>
            {labelBlock}
            <div className={fieldControlClass}>
                <LabeledInput
                    inputPlaceholder={`Enter ${field.label}`}
                    inputValue={value ?? ''}
                    onInputChange={(e) => onChange(e.target.value)}
                    eventScreen={true}
                    inputType={resolvedInputType}
                    type={resolvedInputType}
                    error={error}
                    rightIcon={
                        isMasked ? (
                            <button
                                type="button"
                                onClick={() => setShowMasked((prev) => !prev)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                {showMasked ? <FaRegEyeSlash /> : <FaRegEye />}
                            </button>
                        ) : null
                    }
                />
            </div>
        </div>
    );
};

export default CrmDynamicField;
