import { useNavigate, useLocation } from 'react-router-dom';
import Heading from '../../Components/Heading';
import { useState, useEffect } from 'react';
import { Button, Box, Typography, CircularProgress } from '@mui/material';
import { IoIosArrowBack } from 'react-icons/io';
import MemoTable from '../../Components/MemoTable';
import { toast } from 'react-toastify';
import { getRequestWithOutBody } from '../../Api/fetch';
import { baseURl } from '../../Config/systemConfig';

const StateTax = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [stateTaxData, setStateTaxData] = useState([]);
    const [selectedRowIds, setSelectedRowIds] = useState([]);
    const [accountId, setAccountId] = useState(null);
    const [taxName, setTaxName] = useState('State Tax'); // Dynamic tax name for heading

    // Mock data for State Tax details
    // const mockStateTaxData = [
    //     { 
    //         id: 1, 
    //         type: 'Sales Tax', 
    //         number: 'ST-2024-001', 
    //         createDate: '2024-01-15', 
    //         dueDate: '2024-02-15', 
    //         taxName: 'State Sales Tax', 
    //         taxRate: '8.5%'
    //     },
    //     { 
    //         id: 2, 
    //         type: 'Income Tax', 
    //         number: 'IT-2024-002', 
    //         createDate: '2024-01-20', 
    //         dueDate: '2024-04-15', 
    //         taxName: 'State Income Tax', 
    //         taxRate: '6.2%'
    //     },
    //     { 
    //         id: 3, 
    //         type: 'Property Tax', 
    //         number: 'PT-2024-003', 
    //         createDate: '2024-02-10', 
    //         dueDate: '2024-03-10', 
    //         taxName: 'State Property Tax', 
    //         taxRate: '1.2%'
    //     },
    //     { 
    //         id: 4, 
    //         type: 'Sales Tax', 
    //         number: 'ST-2024-004', 
    //         createDate: '2024-02-15', 
    //         dueDate: '2024-03-15', 
    //         taxName: 'State Sales Tax', 
    //         taxRate: '8.5%'
    //     },
    //     { 
    //         id: 5, 
    //         type: 'Business Tax', 
    //         number: 'BT-2024-005', 
    //         createDate: '2024-03-05', 
    //         dueDate: '2024-04-05', 
    //         taxName: 'State Business Tax', 
    //         taxRate: '4.8%'
    //     },
    // ];

    useEffect(() => {
        // Get accountId and taxName from navigation state or query params
        const stateAccountId = location.state?.accountId;
        const stateTaxName = location.state?.taxName;
        const queryAccountId = new URLSearchParams(location.search).get('accountId');
        
        if (stateAccountId) {
            setAccountId(stateAccountId);
            if (stateTaxName) {
                setTaxName(stateTaxName);
            }
        } else if (queryAccountId) {
            setAccountId(parseInt(queryAccountId));
        }
    }, [location]);

    useEffect(() => {
        if (accountId) {
            fetchJournalSubByAccounts();
        }
    }, [accountId, startDate, endDate]);

    const fetchJournalSubByAccounts = () => {
        setLoading(true);
        const accessToken = localStorage.getItem('accessToken');
        
        // Build query parameters
        const queryParams = new URLSearchParams();
        queryParams.append('accountIds', accountId);
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);
        
        const url = `${baseURl}account-report/journal-sub-by-accounts?${queryParams.toString()}`;
        
        getRequestWithOutBody(url, accessToken)
            .then((result) => {
                if (result && result.data && Array.isArray(result.data)) {
                    // Transform API data to match table structure
                    const transformedData = result.data.map((item, index) => ({
                        id: item.journalId || index + 1,
                        type: 'Tax',
                        number: `JNL-${item.journalId}`,
                        date: item.date, // Use exact date from API
                        taxName: item.taxName || 'Tax Entry',
                        amount: item.amount || 0
                    }));
                    setStateTaxData(transformedData);
                } else {
                    // Fallback to mock data if API fails
                    // setStateTaxData(mockStateTaxData);
                }
            })
            .catch((error) => {
                toast.error('Failed to fetch tax details data');
                // Fallback to mock data
                // setStateTaxData(mockStateTaxData);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const columns = [
        { id: 'type', label: 'Type', align: 'center' },
        { id: 'number', label: 'Number', align: 'center' },
        { id: 'date', label: 'Date', align: 'center' },
        { id: 'taxName', label: 'Tax Name', align: 'center' },
        { id: 'amount', label: 'Amount', align: 'center' },
        // { id: 'action', label: 'Actions', align: 'center' },
    ];

    const tableData = stateTaxData.map(item => ({
        ...item,
        amount: `$${(item.amount || 0).toFixed(2)}` // Format amount as currency
    }));

    const handleBack = () => {
        navigate('/home/taxReports');
    };

    const handleClear = () => {
        setStartDate('');
        setEndDate('');
    };

    const handleSelectionChange = (selectedIds) => {
        setSelectedRowIds(selectedIds);
    };

    // const handleDeleteSelected = () => {
    //     if (selectedRowIds.length === 0) {
    //         toast.error('Please select rows to delete');
    //         return;
    //     }
        
    //     const updatedStateTaxData = stateTaxData.filter(item => 
    //         !selectedRowIds.includes(item.id)
    //     );
    //     setStateTaxData(updatedStateTaxData);
    //     setSelectedRowIds([]);
    //     toast.success(`Deleted ${selectedRowIds.length} tax record(s)`);
    // };

    // const handleActionClick = (row, action) => {
    //     if (action === 'edit') {
    //         toast.info(`Edit functionality for ${row.number}`);
    //     } else if (action === 'delete') {
    //         const updatedData = stateTaxData.filter(item => item.id !== row.id);
    //         setStateTaxData(updatedData);
    //         toast.success(`Deleted tax record ${row.number}`);
    //     }
    // };

    return (
        <div className="min-h-screen" style={{ 
            marginTop: -65, 
            backgroundColor: 'var(--dashboard-bg)', 
            padding: 10 
        }}>
            {/* Header with Back Button and Title */}
            <div className="flex items-center gap-1 mb-6">
                <Button
                    onClick={handleBack}
                    sx={{
                        minWidth: 'auto',
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        }
                    }}
                >
                    <IoIosArrowBack size={18} color="var(--dashboard-text-primary)" />
                </Button>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={taxName}
                    Fontsize={30}
                />
            </div>

            {/* Date Filters */}
            <div className="flex justify-start items-end gap-3 flex-wrap mb-6">
                <div style={{ minWidth: 180 }}>
                    <label style={{ 
                        fontSize: 12, 
                        fontWeight: 600, 
                        color: 'var(--dashboard-text-primary)',
                        display: 'block',
                        marginBottom: '4px'
                    }}>
                        Start Date
                    </label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full"
                        style={{
                            border: '1px solid var(--dashboard-box-border)',
                            borderRadius: 8,
                            backgroundColor: 'var(--dashboard-tab-box)',
                            height: 40,
                            padding: '8px 12px',
                            color: 'var(--dashboard-text-primary)'
                        }}
                    />
                </div>

                <div style={{ minWidth: 180 }}>
                    <label style={{ 
                        fontSize: 12, 
                        fontWeight: 600, 
                        color: 'var(--dashboard-text-primary)',
                        display: 'block',
                        marginBottom: '4px'
                    }}>
                        End Date
                    </label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full"
                        style={{
                            border: '1px solid var(--dashboard-box-border)',
                            borderRadius: 8,
                            backgroundColor: 'var(--dashboard-tab-box)',
                            height: 40,
                            padding: '8px 12px',
                            color: 'var(--dashboard-text-primary)'
                        }}
                    />
                </div>

                <Button
                    onClick={handleClear}
                    sx={{
                        backgroundColor: '#6B7280',
                        color: 'white',
                        height: 40,
                        minWidth: 120,
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: 16,
                        '&:hover': {
                            backgroundColor: '#4B5563',
                        }
                    }}
                >
                    Clear
                </Button>
            </div>

            {/* State Tax Table */}
            <div>
                {selectedRowIds.length > 0 && (
                    <div className="flex justify-end mb-4">
                        <Button
                            onClick={handleDeleteSelected}
                            sx={{
                                backgroundColor: '#EF4444',
                                color: 'white',
                                height: 40,
                                minWidth: 120,
                                textTransform: 'none',
                                fontWeight: 500,
                                fontSize: 16,
                                '&:hover': {
                                    backgroundColor: '#DC2626',
                                }
                            }}
                        >
                            Delete ({selectedRowIds.length})
                        </Button>
                    </div>
                )}
                
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" padding="40px">
                        <CircularProgress size={40} />
                        <Typography variant="body1" sx={{ ml: 2 }}>Loading tax data...</Typography>
                    </Box>
                ) : (
                    <MemoTable
                        columns={columns}
                        data={tableData}
                        // showCheckbox={true}
                        onSelectionChange={handleSelectionChange}
                        disableRowClick={true}
                        // actionOptions={(row) => [
                        //     { label: 'Edit', value: 'edit' },
                        //     { label: 'Delete', value: 'delete' }
                        // ]}
                        // onActionOptionClick={handleActionClick}
                        accountingTable={true}
                    />
                )}
            </div>
        </div>
    );
};

export default StateTax;
