import PropTypes from 'prop-types';
import { formatShortDate } from '../../Utils/inventorySerialHelpers';

const AssignedByCell = ({ name, date, align = 'left' }) => {
  const displayName = name && name !== '—' ? name : '—';
  const displayDate = formatShortDate(date);

  return (
    <div style={{ textAlign: align }}>
      <div style={{ fontSize: 12, color: 'var(--sidebar-text-primary)', fontWeight: 500 }}>
        {displayName}
      </div>
      {displayName !== '—' && displayDate !== '—' ? (
        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
          {displayDate}
        </div>
      ) : null}
    </div>
  );
};

AssignedByCell.propTypes = {
  name: PropTypes.string,
  date: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  align: PropTypes.oneOf(['left', 'center', 'right']),
};

export default AssignedByCell;
