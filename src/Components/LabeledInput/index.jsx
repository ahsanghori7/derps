import React, { useState } from 'react';
import Heading from '../Heading';

const LabeledInput = ({
    label,
    newCreateInvoice,
    shippingLableInvoice,
    tracker,
    labelFontWeight = tracker ? 600 : 500,
    addAgent,
    bussiness,
    addressSmall,
    meetingLink,
    taskDetails,
    supportTicket,
    labelColor = 'var(--fieldsTitle)',
    labelFontSize = newCreateInvoice || shippingLableInvoice || addAgent || addressSmall || meetingLink || taskDetails || supportTicket ? 10 : tracker ? 12 : 16,
    inputType = 'text',
    inputPlaceholder,
    inputValue,
    onInputChange,
    customWidth,
    ticketDetails,
    StatusWidth,
    address,
    disabled,
    customerInfo,
    maintainTraining,
    createInvoice,
    shippingLable,
    invoicePage,
    rightIcon,
    cvv,
    newInvoice,
    isDecimal = false,
    required = false, // Add required prop
    error = false,
    onKeyDown,
    showDollar = false,
    eventScreen = false,
    // inputClassName = 'mt-2 h-10 p-3 w-72',
    inputStyle = {
        border: '1px solid var(--dashboard-box-border)',
        fontSize: newCreateInvoice || shippingLableInvoice || addressSmall || addAgent || meetingLink || taskDetails || tracker || supportTicket ? 12 : 14,
        borderRadius: newCreateInvoice || shippingLableInvoice || addAgent || meetingLink || taskDetails || tracker || supportTicket ? 4 : 'var(--chrome-radius)',
        backgroundColor: 'var(--dashboard-tab-box)', color: 'var(--dashboard-text-primary)'
    },
    ...restProps
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const { onFocus, onBlur, ...otherRestProps } = restProps;

    const resolvedInputStyle = {
        ...inputStyle,
        outline: 'none',
        transition: 'border-color 0.15s ease',
        boxSizing: 'border-box',
        ...(error
            ? { border: '1px solid #ef4444', boxShadow: 'none' }
            : isFocused
                ? { border: '1px solid var(--dashboard-tab-active)' }
                : {}),
    };

    const heightClass = eventScreen
        ? 'h-9'
        : newCreateInvoice || addAgent || meetingLink || taskDetails || tracker || supportTicket
            ? 'h-7'
            : shippingLableInvoice
                ? 'h-6'
                : addressSmall || bussiness || cvv
                    ? 'h-9'
                    : 'h-10';

    const widthClass = eventScreen
        ? 'w-full'
        : customWidth
            ? 'w-56'
            : invoicePage
                ? 'w-48'
                : newCreateInvoice
                    ? 'w-36'
                    : addAgent
                        ? 'w-44'
                        : taskDetails
                            ? 'w-20'
                            : shippingLableInvoice
                                ? 'w-20'
                                : ticketDetails
                                    ? 'w-full'
                                    : StatusWidth
                                        ? 'w-64'
                                        : newInvoice
                                            ? 'w-40'
                                            : address || addressSmall
                                                ? 'w-44 sm:w-96'
                                                : meetingLink
                                                    ? 'w-64'
                                                    : addAgent || tracker
                                                        ? 'w-full sm:w-44'
                                                        : createInvoice
                                                            ? 'w-32'
                                                            : customerInfo
                                                                ? 'w-full sm:w-52'
                                                                : maintainTraining || bussiness
                                                                    ? 'w-44 sm:w-80'
                                                                    : supportTicket || cvv
                                                                        ? 'w-28'
                                                                        : 'w-full sm:w-72';

    const paddingClass = newCreateInvoice || shippingLableInvoice || addAgent || meetingLink || taskDetails || tracker || supportTicket ? 'p-2' : 'p-3';

    return (
        <div className={`${eventScreen ? 'w-full' : newCreateInvoice || shippingLableInvoice || addAgent || meetingLink || taskDetails || supportTicket || tracker ? '' : 'mx1'}`}>
            {label ? (
                required ? (
                    <div className="flex">
                        <Heading
                            Fontweight={labelFontWeight}
                            color={labelColor}
                            Heading={label}
                            Fontsize={labelFontSize}
                            required={required}
                        />
                        {/* {required && <span style={{ color: 'red', marginBottom: -8 }}>*</span>} */}
                    </div>
                ) : (
                    <Heading
                        Fontweight={labelFontWeight}
                        color={labelColor}
                        Heading={label}
                        Fontsize={labelFontSize}
                    />
                )
            ) : null}
            <div className="relative w-full">
                {showDollar && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dashboard-text-secondary)]">
                        $
                    </span>
                )}
                <input
                    type="text" // Always use text type to avoid dropdown arrows
                    placeholder={inputPlaceholder}
                    value={inputValue}
                    onChange={onInputChange}
                    className={`${widthClass} ${showDollar ? 'pl-6' : ''} ${rightIcon ? 'pr-10' : ''} ${bussiness ? '' : 'mt-0.5'} ${heightClass} ${paddingClass} ${rightIcon ? 'overflow-hidden text-ellipsis' : ''}`}
                    style={resolvedInputStyle}
                    onKeyDown={onKeyDown}
                    onFocus={(e) => {
                        setIsFocused(true);
                        onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        onBlur?.(e);
                    }}
                    disabled={disabled}
                    {...otherRestProps}
                />
                {rightIcon && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <div className="pointer-events-auto flex items-center">
                            {rightIcon}
                        </div>
                    </div>
                )}
            </div>
            {typeof error === 'string' && error && (
                <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4, marginBottom: 0 }}>
                    {error}
                </p>
            )}
        </div>
    );
};

export default LabeledInput;
