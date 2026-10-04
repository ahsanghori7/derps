export function DashboardBox({
  title,
  number,
  description,
  headerBg,
  contentBg,
}) {
  return (
    <div className="flex flex-col h-[113px] w-[280px]">
      {/* Header */}
      <div className={`${headerBg} rounded-t-2xl px-6 py-3`}>
        <h3 className="font-semibold text-gray-800 text-[17px]">{title}</h3>
      </div>

      {/* Content */}
      <div
        className={`${contentBg} rounded-b-2xl px-6 py-2 flex flex-col gap-1 flex-1`}
      >
        <div className="text-[22px] font-bold text-gray-900">{number}</div>

        {/* Prevent height growth */}
        <p className="text-[#202224B2] text-[14px] line-clamp-2">
          {description}
        </p>
      </div>
    </div>
  )
}
