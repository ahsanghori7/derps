import {
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Checkbox,
  Pagination,
  Box,
  Select,
  MenuItem,
  CircularProgress,
  Typography,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { getRequestWithOutBody } from '../../Api/fetch';
import { baseURl } from '../../Config/systemConfig';
import { toast } from 'react-toastify';

export default function TaxTable() {
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [taxData, setTaxData] = useState([]);
  const [journalId] = useState(1796); // Using the journalId from API example

  // Mock data for demonstration
  // const mockTaxData = [
  //   { id: 1, date: '1/18/2018', name: 'State Tax', amount: 90210.43 },
  //   { id: 2, date: '1/18/2018', name: 'Federal Tax', amount: 90210.43 },
  //   { id: 3, date: '1/18/2018', name: 'Sales Tax', amount: 90210.43 },
  //   { id: 4, date: '1/18/2018', name: 'Sales Tax', amount: 90210.43 },
  // ];

  useEffect(() => {
    fetchEntriesByJournal();
  }, [journalId]);

  const fetchEntriesByJournal = () => {
    setLoading(true);
    const accessToken = localStorage.getItem('accessToken');
    
    const url = `${baseURl}account-report/entries-by-journal?journalId=${journalId}`;
    
    getRequestWithOutBody(url, accessToken)
      .then((result) => {
        if (result && result.data && result.data.entries && Array.isArray(result.data.entries)) {
          // Transform API data to match table structure
          const transformedData = result.data.entries.map((item, index) => ({
            id: item.id || index + 1,
            date: item.date ? new Date(item.date).toLocaleDateString() : new Date().toLocaleDateString(),
            name: item.accountName || 'Tax Entry',
            amount: item.taxRate || 0
          }));
          setTaxData(transformedData);
        } else {
          // Fallback to mock data if API fails
          // setTaxData(mockTaxData);
        }
      })
      .catch((error) => {
        toast.error('Failed to fetch tax entries data');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelected(taxData.map((row) => row.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllSelected = selected.length === taxData.length;
  const totalAmount = taxData.reduce((sum, item) => sum + (item.amount || 0), 0);

  // Pagination calculations
  const totalPages = Math.ceil(taxData.length / rowsPerPage);
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = taxData.slice(startIndex, endIndex);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(1);
  };

  return (
    <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid var(--dashboard-box-border)', borderRadius: '14px 14px 0 0', backgroundColor: 'var(--dashboard-card-bg)' }}>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" padding="40px">
          <CircularProgress size={40} />
          <Typography variant="body1" sx={{ ml: 2 }}>Loading tax entries...</Typography>
        </Box>
      ) : (
        <Table>
          <TableHead sx={{ backgroundColor: 'var(--sidebar-selected-bg)' }}>
            <TableRow>
              {/* <TableCell
                sx={{
                  width: 50,
                  color: 'white',
                  fontWeight: 600,
                  padding: '8px',
                }}
              >
                <Checkbox
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  sx={{
                    color: 'white',
                    '&.Mui-checked': {
                      color: 'white',
                    },
                  }}
                />
              </TableCell> */}
              <TableCell
                sx={{
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '14px',
                  padding: '8px',
                }}
              >
                DATE
              </TableCell>
              <TableCell
                sx={{
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '14px',
                  padding: '8px',
                }}
              >
                TAX NAME
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '14px',
                  padding: '8px',
                }}
              >
                TAX AMOUNT
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row) => (
              <TableRow
                key={row.id}
                sx={{
                  backgroundColor: 'var(--table-cell-bg)',
                  borderBottom: '1px solid var(--dashboard-box-border)',
                  '&:hover': {
                    backgroundColor: 'var(--table-cell-hover)',
                  },
                }}
              >
                {/* <TableCell sx={{ width: 50, padding: '6px' }}>
                  <Checkbox
                    checked={selected.includes(row.id)}
                    onChange={() => handleSelectRow(row.id)}
                  />
                </TableCell> */}
                <TableCell sx={{ padding: '6px', color: 'var(--table-cell-text)' }}>
                  {row.date}
                </TableCell>
                <TableCell sx={{ padding: '6px', color: 'var(--table-cell-text)' }}>
                  {row.name}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ padding: '6px', color: 'var(--table-cell-text)' }}
                >
                  ${row.amount.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ backgroundColor: 'var(--table-cell-alt-bg)' }}>
              
              <TableCell
                sx={{
                  padding: '8px',
                  fontWeight: 600,
                  fontSize: '16px',
                  color: 'var(--table-cell-text)',
                  whiteSpace: 'nowrap',
                  minWidth: '150px'
                }}
              >
                Total Tax Liability
              </TableCell>
              <TableCell colSpan={1} sx={{ padding: '8px' }} />
              <TableCell
                align="right"
                sx={{
                  padding: '8px',
                  fontWeight: 600,
                  fontSize: '16px',
                  color: 'var(--table-cell-text)',
                }}
              >
                ${totalAmount.toFixed(2)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
      
      {/* Pagination Footer */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--dashboard-box-border)',
          backgroundColor: 'var(--dashboard-card-bg)',
          color: 'var(--table-cell-text)',
        }}
      >
        {/* <Select
          value={rowsPerPage}
          onChange={handleRowsPerPageChange}
          size="small"
          sx={{
            borderRadius: 2,
            color: 'var(--dashboard-text-primary)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--dashboard-box-border)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--dashboard-text-primary)',
            },
          }}
        >
          <MenuItem value={10}>10 per page</MenuItem>
          <MenuItem value={25}>25 per page</MenuItem>
          <MenuItem value={50}>50 per page</MenuItem>
        </Select> */}

        {/* <Pagination
          count={totalPages}
          page={page}
          onChange={handlePageChange}
          variant="outlined"
          sx={{
            '& .MuiPaginationItem-root': {
              color: 'var(--dashboard-text-primary)',
              borderColor: 'var(--dashboard-text-primary)',
            },
            '& .Mui-selected': {
              backgroundColor: '#2E2E2E',   // ⬅ Your selected page bg
              color: 'var(--dashboard-bg)',                             // Optional: white text on bg
              '&:hover': {
                backgroundColor: 'var(--dashboard-bg)',
                color: 'var(--dashboard-text-primary)' // Optional: keep bg on hover
              },
            },
          }}
        /> */}
      </Box>
    </TableContainer>
  );
}
