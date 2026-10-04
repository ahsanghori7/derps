import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { useNavigate } from 'react-router-dom';
import { Box, Pagination } from '@mui/material';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem'
import Heading from '../Heading';
import edit from "../../assets/edit.png";
import moment from 'moment';
import { getStatusChipTone, STATUS_CHIP_TONES, tableBodyFontSize, tableHeadCellStyle } from '../tableChrome';

const capitalizeFirst = (str) => {
  if (!str || typeof str !== 'string') return '-';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatStatusLabel = (status) => {
  if (!status || typeof status !== 'string') return '-';
  const normalized = status.trim().toLowerCase();
  if (normalized === 'assigned') return 'Assigned';
  if (normalized === 'available') return 'Available';
  if (normalized === 'not-completed') return 'Not Completed';
  return capitalizeFirst(status);
};

const StatusButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'status',
})(({ status }) => {
  const tone = getStatusChipTone(status);
  return {
    color: tone.color,
    backgroundColor: tone.backgroundColor,
    fontWeight: 500,
    width: '100px',
    border: 0,
    padding: '0px',
    fontSize: '10px',
  };
});

// Status cell component
const StatusTableCell = ({ status }) => (
  <TableCell align="center">
    <StatusButton variant="outlined" status={status}>
      {formatStatusLabel(status)}
    </StatusButton>
  </TableCell>
);
const IsActiveButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'isActive',
})(({ isActive }) => {
  const tone = isActive === true ? STATUS_CHIP_TONES.success : STATUS_CHIP_TONES.warning;
  return {
    color: tone.color,
    backgroundColor: tone.backgroundColor,
    fontWeight: 500,
    width: '100px',
    border: 0,
    padding: '0px',
    fontSize: '10px',
  };
});

const IsActiveTableCell = ({ isActive }) => (
  <TableCell align="center">
    <IsActiveButton variant="outlined" isActive={isActive}>
      {isActive === true ? 'Active' : 'Inactive'}
    </IsActiveButton>
  </TableCell>
);

// Styled components for table cells and rows
const CustomTableCell = styled(TableCell, {
  shouldForwardProp: (prop) => prop !== 'accountingTable',
})(({ theme, accountingTable }) => ({
  [`&.${tableCellClasses.head}`]: {
    ...tableHeadCellStyle,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: tableBodyFontSize,
    minWidth: 100,
    padding: accountingTable && '10px 8px',
    color: 'var(--table-cell-text)',
  },
}));

const CustomTableRow = styled(TableRow)(() => ({
  '& td': {
    backgroundColor: 'var(--table-cell-bg)',
    color: 'var(--table-cell-text)',
  },
  '&:nth-of-type(odd) td': {
    backgroundColor: 'var(--table-cell-alt-bg)',
  },
  '&:hover td': {
    backgroundColor: 'var(--table-cell-hover)',
    cursor: 'pointer',
  },
  '&:last-child td, &:last-child th': {
    border: 0,
  },
  cursor: 'pointer',
}));

const CustomTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: '14px', // Border radius for the entire table
  overflow: 'hidden', // Ensure that content does not overflow the rounded corners
}));

const CustomTableHeader = styled(TableHead)(({ theme, roles, categoryadd, editTicketType }) => ({
  position: 'sticky',
  top: 0,
  zIndex: 1,
  '& .MuiTableRow-root': {
    backgroundColor: 'var(--sidebar-selected-bg)',
    margin: 0, // Ensure no margin for header row
    // ...(roles ? {
    //     display: 'flex',
    //     justifyContent: 'space-between',
    // } : {}),
  },
  '& .MuiTableCell-root': {
    borderBottom: 'none',
    fontSize: 12,
    padding: roles || categoryadd || editTicketType ? '16px 50px' : '8px 8px',
    ...(roles || categoryadd || editTicketType ? {
      textAlign: 'center'
    } : {}),

  },
}));
const FooterWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'footerBackground',
})(({ theme, footerBackground }) => ({
  position: 'sticky',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: footerBackground || 'var(--dashboard-card-bg)',
  borderTop: '1px solid var(--dashboard-box-border)',
  padding: '4px 6px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderRadius: '0 0 14px 14px', // Rounded corners only at the bottom
}));


const StyledTableContainer = styled(TableContainer, {
  shouldForwardProp: (prop) => prop !== 'hasMaxHeight',
})(({ theme, hasMaxHeight }) => ({
  // maxHeight: '100vh', // Adjust this value as needed
  overflow: hasMaxHeight ? 'auto' : 'visible',
  borderRadius: '14px', // Border radius for the entire table
  '& thead': {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    backgroundColor: theme.palette.background.paper,
  },
  '@media (max-width: 768px)': {
    maxHeight: hasMaxHeight ? 'calc(100vh - 200px)' : 'auto',
    overflowX: 'auto',
    overflowY: hasMaxHeight ? 'auto' : 'visible',
  },
}));

// Main reusable table component
const AgentTable = ({ data, columns, trackerSetup, onSubmit, performanceReport, editAgent, page = 1,
  rowsPerPage = 25,
  totalCount = 0,
  onPageChange = () => { },
  onRowsPerPageChange = () => { },
  onRowClick,
  containerMaxHeight,
  accountingTable,
  actionLabel,
  onActionClick,
  footerBackground,
  paginationColor
}) => {
  const navigate = useNavigate();

  const handleRowClick = (row, event) => {
    if (typeof onRowClick === 'function') {
      onRowClick(row, event);
      return;
    }
    if (trackerSetup) {
      onSubmit(row)
    } else if (editAgent) {
      navigate('/home/addAgent', { state: { rowData: row } });
    } else if (performanceReport) {
      onRowClick(row); // ✅ handle normal click
    }
  };

  const pageCount = totalCount > 0
    ? Math.max(1, Math.ceil(totalCount / rowsPerPage))
    : 1;

  // If containerMaxHeight is explicitly false or null, disable maxHeight
  // If undefined (not passed), use default '70vh' behavior (original behavior)
  // Otherwise, use the provided value
  const hasMaxHeight = containerMaxHeight !== false && containerMaxHeight !== null;
  const maxHeightValue = containerMaxHeight === false || containerMaxHeight === null
    ? undefined
    : (containerMaxHeight || '70vh');

  return (
    <StyledTableContainer component={Paper} hasMaxHeight={hasMaxHeight} sx={hasMaxHeight ? { maxHeight: maxHeightValue } : {}} >
      <Table sx={{ minWidth: 700 }} aria-label="customized table" stickyHeader>
        <CustomTableHeader >
          <TableRow>
            {columns.map((column) => (
              <CustomTableCell key={column.id} align={column.align} accountingTable={accountingTable} >
                {column.label}
              </CustomTableCell>
            ))}
          </TableRow>
        </CustomTableHeader>
        <TableBody>
          {data.map((row) => (
            <CustomTableRow key={row.id} onClick={(event) => handleRowClick(row, event)}>
              {columns.map((column) => (
                typeof column?.displayCell === 'function' ? (
                  <CustomTableCell
                    key={column.id}
                    align={column.align}
                    accountingTable={accountingTable}
                  >
                    {column.displayCell(row, column)}
                  </CustomTableCell>
                ) : typeof column?.renderCell === 'function' ? (
                  <CustomTableCell
                    key={column.id}
                    align={column.align}
                    accountingTable={accountingTable}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {column.renderCell(row, column)}
                  </CustomTableCell>
                ) :
                column.id === 'status' || column.id === 'installationStatus' ? (
                  <StatusTableCell key={column.id} status={row[column.id]} />
                ) : column.id === 'isActive' ? (
                  <IsActiveTableCell key={column.id} isActive={row[column.id]} />
                ) : column.id === 'taskType' || column.id === 'Task Type' ? (
                  <CustomTableCell key={column.id} align={column.align} accountingTable={accountingTable}>
                    <Heading
                      Fontweight={700}
                      Fontsize={12}
                      color="Blue"
                      Heading={row[column.id]}
                      className="capitalize"
                    />
                  </CustomTableCell>
                ) : column.id === 'taskLevel' || column.id === 'Task Level' ? (
                  <CustomTableCell key={column.id} align={column.align} accountingTable={accountingTable}>
                    <Heading
                      Fontweight={700}
                      color="green"
                      Fontsize={12}
                      Heading={row[column.id]}
                      className="capitalize"
                    />
                  </CustomTableCell>
                ) : accountingTable && column.id === 'action' ? (
                  <div key={`action-${row.id}`} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (onActionClick) onActionClick(row); }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#0C79F7',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    >
                      {actionLabel || 'View Transaction'}
                    </button>
                  </div>
                ) : column.id === 'title' ? (
                  <CustomTableCell
                    key={column.id}
                    accountingTable={accountingTable}
                    align="left" // ✅ explicitly align left
                    style={{ textAlign: 'left', maxWidth: '300px', padding: '10px 80px' }} // ✅ extra safe
                  >
                    {capitalizeFirst(row?.title)}
                  </CustomTableCell>
                )
                  : column.id === 'estimatedDays' || column.id === 'allowedLateDays' ? (
                    <CustomTableCell key={column.id} align={column.align} accountingTable={accountingTable}>
                      <Heading
                        Fontsize={12}
                        Heading={row[column.id] + ' Days'}
                        className="capitalize"
                      />
                    </CustomTableCell>
                  ) : column.id === 'summary.potentialPoints' ? (
                    <CustomTableCell key={column.id} align={column.align} accountingTable={accountingTable}>
                      <Heading
                        Fontsize={12}
                        Heading={row.summary?.potentialPoints}
                        className="capitalize"
                      />
                    </CustomTableCell>
                  ) : column.id === 'project' ? (
                    <CustomTableCell key={column.id} align={column.align} accountingTable={accountingTable}>
                      <Heading
                        Fontsize={12}
                        Heading={row[column.id]?.name}
                        className="capitalize"
                      />
                    </CustomTableCell>
                  ) : column.id === 'endDate' ? (
                    <CustomTableCell key={column.id} align={column.align} accountingTable={accountingTable}>
                      {row[column.id] ? moment(row[column.id]).format("MMM DD, YYYY") : '-'}
                    </CustomTableCell>
                  ) : column.id === 'edit' ? (
                    <CustomTableCell key={column.id} align={column.align} accountingTable={accountingTable}>
                      <div style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={edit} alt="edit" style={{ width: 20, height: 20 }} />
                      </div>
                    </CustomTableCell>
                  ) : (
                    <CustomTableCell key={column.id} align={column.align} accountingTable={accountingTable}>
                      {row[column.id]}
                    </CustomTableCell>
                  )
              ))}
            </CustomTableRow>
          ))}
        </TableBody>
      </Table>
      <FooterWrapper footerBackground={footerBackground}>
        <Select
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
          size="small"
          style={{ borderRadius: 10, fontSize: 12 }}
          sx={paginationColor ? {
            '& .MuiSelect-select': { color: paginationColor },
            '& .MuiSvgIcon-root': { color: paginationColor }
          } : undefined}
        >
          <MenuItem value={5}>5</MenuItem>
          <MenuItem value={10}>10</MenuItem>
          <MenuItem value={25}>25</MenuItem>
          <MenuItem value={50}>50</MenuItem>
        </Select>
        <Pagination
          count={pageCount}
          page={page}
          onChange={(e, value) => onPageChange(value)}
          variant="outlined"
          size="small"
          sx={paginationColor ? { '& .MuiPaginationItem-root': { color: paginationColor } } : undefined}
        />
      </FooterWrapper>
    </StyledTableContainer>
  )
};

export default AgentTable;
