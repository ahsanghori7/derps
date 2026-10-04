import React from 'react';
import Heading from '../Heading';

const TableInput = ({
    label,
    labelFontWeight = 500,
    labelColor = 'var(--fieldsTitle)',
    labelFontSize = 12,
    inputType = 'text',
    inputPlaceholder,
    inputValue,
    onInputChange,
    customWidth,
    ticketDetails,
    StatusWidth,
    address,
    addAgent,
    disabled,
    customerInfo,
    maintainTraining,
    createInvoice,
    isDecimal = false,
    amountWidth,
    required = false, // Add required prop
    quantityWidth,
    min,
    step,
    // inputClassName = 'mt-2 h-10 p-3 w-72',
    inputStyle = { border: '1px solid var(--sidebar-selected-bg)', fontSize: 12, borderRadius: 4, backgroundColor: 'var(--dashboard-bg)' },
    showTaxExempt = false // New prop to conditionally show tax exempt text
}) => {
    // Append ' (T)' to the input value if showTaxExempt is true
    const displayValue = showTaxExempt ? `${inputValue} (T)` : inputValue;

    return (
        <div className='mx-1'>
            {required ?
                <div className="flex">
                    <Heading
                        Fontweight={labelFontWeight}
                        color={labelColor}
                        Heading={label}
                        Fontsize={labelFontSize}
                    />
                    {required && <span style={{ color: 'red' }}>*</span>} {/* Conditionally render asterisk */}
                </div> :
                <Heading
                    Fontweight={labelFontWeight}
                    color={labelColor}
                    Heading={label}
                    Fontsize={labelFontSize}
                />}
            <input
                type={showTaxExempt ? 'text' : (isDecimal ? 'number' : inputType)}
                step={step != null ? step : (isDecimal ? '0.01' : undefined)}
                placeholder={inputPlaceholder}
                value={displayValue}
                onChange={onInputChange}
                className={`  h-7 p-3 ${customWidth ? 'w-56' : ticketDetails ? 'w-full' : amountWidth ? 'w-24' : quantityWidth ? 'w-20' : StatusWidth ? 'w-64' : address ? 'w-full' : addAgent ? 'w-full sm:w-72' : createInvoice ? 'w-32' : customerInfo ? 'w-full sm:w-52' : maintainTraining ? 'w-full sm:w-80' : 'w-full sm:w-72'}`}
                style={inputStyle}
                disabled={disabled}
                min={min != null ? String(min) : (inputType === 'number' ? '0' : undefined)}
            />
        </div>
    );
};

export default TableInput;