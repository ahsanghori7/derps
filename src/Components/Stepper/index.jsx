import React from 'react';

const steps = [
  'Processing Solution',
  'Plans',
  'Information',
  'Hardware & Pay',
  'Shipping & Payment',
  'Submit Application',
];

export default function HorizontalLinearAlternativeLabelStepper({ activeStep }) {
  const stepWidthPercentage = 100 / steps.length;
  const lineMargin = stepWidthPercentage / 2;

  return (
    <div style={{ width: '100%', marginBottom: '40px', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
        {/* Connector Line */}
        <div style={{
          position: 'absolute',
          top: '18px', // centered with the 36px circle height
          left: `${lineMargin}%`,
          right: `${lineMargin}%`,
          height: '1.5px',
          backgroundColor: 'var(--dashboard-border)',
          zIndex: 0
        }} />

        {steps.map((label, index) => {
          const stepNum = String(index + 1).padStart(2, '0');
          const isActive = index === activeStep;
          const isCompleted = index < activeStep;
          const isCurrentOrCompleted = isActive || isCompleted;

          // Color tokens from the design
          const activeBlue = 'var(--dashboard-tab-active)';
          const defaultGrey = 'var(--dashboard-tab-text-inactive)';
          const circleBorderColor = isCurrentOrCompleted ? activeBlue : 'var(--dashboard-border)';
          const textColor = isCurrentOrCompleted ? activeBlue : defaultGrey;

          return (
            <div key={label} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              zIndex: 1,
              position: 'relative'
            }}>
              {/* Circle */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--dashboard-card-bg, #ffffff)',
                border: `1.5px solid ${circleBorderColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: textColor,
                fontSize: '13px',
                fontWeight: isCurrentOrCompleted ? '600' : '500',
                fontFamily: 'Nunito, sans-serif',
                transition: 'all 0.2s ease',
              }}>
                {stepNum}
              </div>
              {/* Label */}
              <div style={{
                marginTop: '10px',
                color: textColor,
                fontSize: '11px',
                fontWeight: isCurrentOrCompleted ? '600' : '400',
                textAlign: 'center',
                fontFamily: 'Nunito, sans-serif',
                maxWidth: '90px',
                lineHeight: '1.3'
              }}>
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

