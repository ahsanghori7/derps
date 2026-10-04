import React from "react";

export default function AmountCard({
  title = "Amount",
  value = "$0.00",
  subtitle = "Overall Financial Standing",
  bgColor = '#E3F2FD',
  barColor = '#90CAF9',
  titleColor = '#1F2937',
  amountColor = '#111827',
  subtitleColor = '#6B7280',
  maxWidth = 320,
  style = {},
}) {
  return (
    <div style={{ borderRadius: 16, boxShadow: '0 6px 10px rgba(0,0,0,0.10)', marginBottom: 16, maxWidth, ...style }}>
      <div style={{
        background: bgColor,
        borderRadius: 12,
        padding: '8px 12px',
        position: 'relative'
      }}>
        <div style={{
          background: barColor,
          color: '#1F2937',
          opacity: .3,
          height: 10,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          margin: '-8px -12px 6px -12px'
        }} />
        <div style={{ fontSize: 14, color: titleColor, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: amountColor, marginTop: 6 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: subtitleColor, fontWeight: 600 }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}
