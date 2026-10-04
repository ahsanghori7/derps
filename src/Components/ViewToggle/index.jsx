import React from 'react';

const IconTable = ({ active }) => (
  <div className="flex items-center gap-2">
    {/* Check icon */}
    {active && (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17L4 12" stroke={active ? '#0B2A3C' : '#0B2A3C'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    )}
    {/* Three lines icon */}
    <div className={`flex flex-col gap-0.5 ${active ? '' : ''}`}>
      <span className="block h-[2px] w-4 bg-[#0B2A3C] rounded" />
      <span className="block h-[2px] w-4 bg-[#0B2A3C] rounded" />
      <span className="block h-[2px] w-4 bg-[#0B2A3C] rounded" />
    </div>
  </div>
);

const IconGrid = () => (
  <div className="grid grid-cols-2 gap-0.5">
    {[...Array(4)].map((_, i) => (
      <span key={i} className="block h-2 w-2 bg-[#0B2A3C] rounded-sm" />
    ))}
  </div>
);

const ViewToggle = ({ value = 'grid', onChange }) => {
  const isTable = value === 'table';
  const isGrid = value === 'grid';

  return (
    <div className="inline-flex items-center rounded-full ring-1 ring-gray-300 shadow-sm overflow-hidden">
      {/* Left: Table */}
      <button
        type="button"
        onClick={() => onChange?.('table')}
        aria-pressed={isTable}
        className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
          isTable ? 'bg-[#CAE7FF] text-[#0B2A3C]' : 'bg-white/0 text-[#0B2A3C] hover:bg-gray-50'
        }`}
        style={{ borderRight: '1px solid #D1D5DB' }}
      >
        <IconTable active={isTable} />
      </button>

      {/* Right: Grid */}
      <button
        type="button"
        onClick={() => onChange?.('grid')}
        aria-pressed={isGrid}
        className={`flex items-center justify-center px-5 py-2 text-sm font-medium transition-colors ${
          isGrid ? 'bg-[#CAE7FF] text-[#0B2A3C]' : 'bg-white/0 text-[#0B2A3C] hover:bg-gray-50'
        }`}
      >
        <IconGrid />
      </button>
    </div>
  );
};

export default ViewToggle;
